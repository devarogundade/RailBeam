import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Contract, formatUnits, JsonRpcProvider, parseUnits, Wallet } from 'ethers';
import { Model, Types } from 'mongoose';
import {
  onRampRecordSchema,
  onRampTokensInputSchema,
  onRampRecordStatusSchema,
  type ChatHistoryMessage,
} from '@beam/stardorm-api-contract';
import type { OnRampRecord } from '@beam/stardorm-api-contract';
import type { HandlerContext, HandlerMessage } from '../handlers/handler.types';
import type { AgentRichCard } from 'src/agent-reply/stardorm-agent-reply.schema';
import { EmailNotificationsService } from '../email/email-notifications.service';
import { FinancialSnapshotsService } from '../mongo/financial-snapshots.service';
import { OnRamp, type OnRampDocument } from '../mongo/schemas/on-ramp.schema';
import {
  ChatMessage,
  type ChatMessageDocument,
} from '../mongo/schemas/chat-message.schema';
import { ConversationSyncService } from '../conversations-sync/conversation-sync.service';
import { getStripe } from './stripe.client';
import { rpcUrlForCaip2 } from './onramp-rpc';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;

/** Stripe Checkout requires absolute HTTPS URLs; fulfillment is driven by webhooks, not return navigation. */
const DEFAULT_ONRAMP_CHECKOUT_SUCCESS_URL = 'https://stripe.com/';
const DEFAULT_ONRAMP_CHECKOUT_CANCEL_URL = 'https://stripe.com/';

function isHttpsAbsoluteUrl(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === 'https:';
  } catch {
    return false;
  }
}

@Injectable()
export class OnRampService {
  private readonly log = new Logger(OnRampService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectModel(OnRamp.name) private readonly onRampModel: Model<OnRampDocument>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
    private readonly financialSnapshots: FinancialSnapshotsService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly conversationSync: ConversationSyncService,
  ) {}

  readonly id = 'on_ramp_tokens' as const;

  toPublicRecord(doc: OnRampDocument): OnRampRecord {
    return onRampRecordSchema.parse({
      id: doc._id.toHexString(),
      status: doc.status,
      walletAddress: doc.walletAddress,
      recipientWallet: doc.recipientWallet,
      network: doc.network,
      tokenAddress: doc.tokenAddress,
      tokenDecimals: doc.tokenDecimals,
      tokenSymbol: doc.tokenSymbol,
      tokenAmountWei: doc.tokenAmountWei,
      usdAmountCents: doc.usdAmountCents,
      ...(doc.usdValue !== undefined ? { usdValue: doc.usdValue } : {}),
      ...(doc.stripeCheckoutSessionId
        ? { stripeCheckoutSessionId: doc.stripeCheckoutSessionId }
        : {}),
      ...(doc.stripePaymentIntentId
        ? { stripePaymentIntentId: doc.stripePaymentIntentId }
        : {}),
      ...(doc.fulfillmentTxHash
        ? { fulfillmentTxHash: doc.fulfillmentTxHash }
        : {}),
      ...(doc.status !== 'fulfilled' && doc.errorMessage
        ? { errorMessage: doc.errorMessage }
        : {}),
      ...(doc.createdAt ? { createdAt: doc.createdAt } : {}),
      ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {}),
    });
  }

  async listForWallet(
    wallet: string,
    limit: number,
    range?: { from?: Date; to?: Date },
  ): Promise<OnRampRecord[]> {
    const w = wallet.trim().toLowerCase();
    const time: { $gte?: Date; $lte?: Date } = {};
    if (range?.from) time.$gte = range.from;
    if (range?.to) time.$lte = range.to;
    const hasTime = Object.keys(time).length > 0;
    const docs = await this.onRampModel
      .find({
        walletAddress: w,
        ...(hasTime ? { createdAt: time } : {}),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return docs.map((d) => this.toPublicRecord(d));
  }

  /** Links the `execute-handler` agent bubble to this on-ramp row for webhook-driven refreshes. */
  async linkSourceChatMessage(onRampId: string, chatMessageId: string): Promise<void> {
    const oid = onRampId.trim();
    const mid = chatMessageId.trim();
    if (!Types.ObjectId.isValid(oid) || !Types.ObjectId.isValid(mid)) return;
    await this.onRampModel
      .updateOne(
        { _id: new Types.ObjectId(oid) },
        { $set: { sourceChatMessageId: mid } },
      )
      .exec();
  }

  /** Refreshes linked chat bubble content from the latest on-ramp Mongo row (Stripe + fulfillment). */
  async syncChatMessageFromStoredOnRamp(onRampId: string): Promise<void> {
    const oid = onRampId.trim();
    if (!Types.ObjectId.isValid(oid)) return;
    const doc = await this.onRampModel.findById(oid).exec();
    if (!doc?.sourceChatMessageId?.trim()) return;
    await this.applyOnRampToLinkedChat(doc);
  }


  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const stripe = getStripe(this.config);
    if (!stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured (set STRIPE_SECRET_KEY).',
      );
    }
    const parsed = onRampTokensInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    const buyer = ctx.walletAddress.trim().toLowerCase();

    const successUrlRaw =
      this.config.get<string>('ONRAMP_CHECKOUT_SUCCESS_URL')?.trim() ||
      DEFAULT_ONRAMP_CHECKOUT_SUCCESS_URL;
    const cancelUrlRaw =
      this.config.get<string>('ONRAMP_CHECKOUT_CANCEL_URL')?.trim() ||
      DEFAULT_ONRAMP_CHECKOUT_CANCEL_URL;
    if (!isHttpsAbsoluteUrl(successUrlRaw) || !isHttpsAbsoluteUrl(cancelUrlRaw)) {
      throw new BadRequestException(
        'ONRAMP_CHECKOUT_SUCCESS_URL and ONRAMP_CHECKOUT_CANCEL_URL must be absolute https URLs (or omit both to use defaults).',
      );
    }

    const doc = await this.onRampModel.create({
      walletAddress: buyer,
      recipientWallet: data.recipientWallet,
      network: data.network,
      tokenAddress: data.tokenAddress,
      tokenDecimals: data.tokenDecimals,
      tokenSymbol: data.tokenSymbol,
      tokenAmountWei: data.tokenAmountWei,
      usdAmountCents: data.usdAmountCents,
      ...(data.usdValue !== undefined ? { usdValue: data.usdValue } : {}),
      status: 'pending_checkout',
    });

    const onRampId = doc._id.toHexString();

    let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: data.usdAmountCents,
              product_data: {
                name: `On-ramp — ${data.tokenSymbol}`,
                description: `${data.network} · ${data.recipientWallet.slice(0, 10)}…`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: successUrlRaw,
        cancel_url: cancelUrlRaw,
        client_reference_id: onRampId,
        metadata: {
          beam_on_ramp: '1',
          onRampId,
        },
        payment_intent_data: {
          metadata: {
            beam_on_ramp: '1',
            onRampId,
          },
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Stripe checkout.sessions.create failed: ${msg}`);
      await this.onRampModel
        .updateOne(
          { _id: doc._id },
          { $set: { status: 'failed', errorMessage: msg } },
        )
        .exec();
      throw new ServiceUnavailableException(
        `Stripe could not start checkout: ${msg}`,
      );
    }

    const sessionId = session.id;
    const url = session.url;
    if (!sessionId || !url) {
      await this.onRampModel
        .updateOne(
          { _id: doc._id },
          {
            $set: {
              status: 'failed',
              errorMessage: 'Stripe did not return a checkout URL',
            },
          },
        )
        .exec();
      throw new BadRequestException('Stripe did not return a checkout URL');
    }

    await this.onRampModel
      .updateOne(
        { _id: doc._id },
        {
          $set: {
            stripeCheckoutSessionId: sessionId,
            status: 'pending_payment',
          },
        },
      )
      .exec();

    return {
      message:
        'Your Stripe checkout is ready. Complete payment in the secure window; once Stripe confirms, we send the tokens to your recipient from the Beam on-ramp treasury.',
      data: {
        stripeCheckoutUrl: url,
        onRampId,
        stripeCheckoutSessionId: sessionId,
        recipientWallet: data.recipientWallet,
        network: data.network,
        tokenSymbol: data.tokenSymbol,
        tokenAmountWei: data.tokenAmountWei,
        usdAmountCents: data.usdAmountCents,
        ...(data.usdValue !== undefined ? { usdValue: data.usdValue } : {}),
      },
    };
  }

  /**
   * Called from the Stripe webhook after `checkout.session.completed`.
   * Transfers `tokenAmountWei` of `tokenAddress` to `recipientWallet` using `ONRAMP_TREASURY_PRIVATE_KEY`.
   */
  async fulfillPaidOnRamp(onRampId: string): Promise<void> {
    if (!Types.ObjectId.isValid(onRampId)) {
      this.log.warn(`Invalid onRampId (skip fulfill): ${onRampId}`);
      return;
    }
    const row = await this.onRampModel.findById(onRampId).exec();

    const pk = this.config.get<string>('ONRAMP_TREASURY_PRIVATE_KEY')?.trim();
    if (!pk) {
      this.log.error('ONRAMP_TREASURY_PRIVATE_KEY is not set; cannot fulfill on-ramp');
      await this.onRampModel
        .updateOne(
          { _id: new Types.ObjectId(onRampId) },
          {
            $set: {
              status: 'failed',
              errorMessage: 'Treasury key not configured',
            },
          },
        )
        .exec();
      if (row) {
        this.emailNotifications.notifyOnRampFailed({
          walletAddress: row.walletAddress,
          tokenSymbol: row.tokenSymbol,
          usdAmountCents: row.usdAmountCents,
          reason: 'Treasury key not configured',
        });
      }
      await this.syncChatMessageFromStoredOnRamp(onRampId);
      return;
    }
    if (!row) {
      this.log.warn(`OnRamp ${onRampId} not found`);
      return;
    }
    if (row.status === 'fulfilled') return;

    const rpcUrl = rpcUrlForCaip2(row.network, this.config);
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(pk, provider);
    const c = new Contract(row.tokenAddress, ERC20_ABI, wallet);

    /** Testing only: set env `ONRAMP_TEST_TRANSFER_AMOUNT_HUMAN` (e.g. `0.0001`) to transfer that amount in token units instead of the order total. Stripe still charges the real USD from the Checkout line item. */
    const testHumanOverride = this.config
      .get<string>('ONRAMP_TEST_TRANSFER_AMOUNT_HUMAN')
      ?.trim();

    let transferAmountWei = row.tokenAmountWei;
    if (testHumanOverride?.length) {
      try {
        transferAmountWei = parseUnits(testHumanOverride, row.tokenDecimals).toString();
        this.log.warn(
          `ONRAMP_TEST_TRANSFER_AMOUNT_HUMAN="${testHumanOverride}": fulfilling ${onRampId} with ${transferAmountWei} wei (${row.tokenSymbol} decimals=${row.tokenDecimals}), not order amount ${row.tokenAmountWei}`,
        );
      } catch (e) {
        const hint = e instanceof Error ? e.message : String(e);
        this.log.error(
          `Invalid ONRAMP_TEST_TRANSFER_AMOUNT_HUMAN "${testHumanOverride}", using row tokenAmountWei: ${hint}`,
        );
      }
    }

    try {
      this.log.log(
        `On-ramp fulfill: treasury → recipient ${row.recipientWallet.slice(0, 10)}… token=${row.tokenSymbol} wei=${transferAmountWei}`,
      );
      const tx = await c.transfer(row.recipientWallet, transferAmountWei);
      const receipt = await tx.wait();
      await this.onRampModel
        .updateOne(
          { _id: row._id },
          {
            $set: {
              status: 'fulfilled',
              fulfillmentTxHash: receipt?.hash ?? tx.hash,
            },
            $unset: { errorMessage: 1 },
          },
        )
        .exec();
      const usd =
        row.usdValue ??
        (Number.isFinite(row.usdAmountCents) ? row.usdAmountCents / 100 : 0);
      let tokenHuman: number | undefined;
      try {
        const n = parseFloat(
          formatUnits(BigInt(transferAmountWei), row.tokenDecimals),
        );
        if (Number.isFinite(n)) tokenHuman = n;
      } catch {
        tokenHuman = undefined;
      }
      void this.financialSnapshots
        .recordOnRampFulfilled(row.walletAddress, usd, tokenHuman)
        .catch(() => {
          /* best-effort rollup */
        });
      this.emailNotifications.notifyOnRampFulfilled({
        walletAddress: row.walletAddress,
        tokenSymbol: row.tokenSymbol,
        tokenAmountWei: transferAmountWei,
        tokenDecimals: row.tokenDecimals,
        usdAmountCents: row.usdAmountCents,
        fulfillmentTxHash: receipt?.hash ?? tx.hash,
      });
      await this.syncChatMessageFromStoredOnRamp(onRampId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`On-ramp fulfillment failed for ${onRampId}: ${msg}`);
      const failUpdate = await this.onRampModel
        .updateOne(
          { _id: row._id, status: { $ne: 'fulfilled' } },
          { $set: { status: 'failed', errorMessage: msg } },
        )
        .exec();
      if (failUpdate.modifiedCount > 0) {
        this.emailNotifications.notifyOnRampFailed({
          walletAddress: row.walletAddress,
          tokenSymbol: row.tokenSymbol,
          usdAmountCents: row.usdAmountCents,
          reason: msg,
        });
      }
      await this.syncChatMessageFromStoredOnRamp(onRampId);
    }
  }

  async markCanceled(onRampId: string): Promise<void> {
    if (!Types.ObjectId.isValid(onRampId)) {
      this.log.warn(`Invalid onRampId (skip cancel): ${onRampId}`);
      return;
    }
    await this.onRampModel
      .updateOne(
        { _id: new Types.ObjectId(onRampId), status: { $ne: 'fulfilled' } },
        { $set: { status: 'canceled' } },
      )
      .exec();
    await this.syncChatMessageFromStoredOnRamp(onRampId);
  }

  /** Persist PaymentIntent id when Stripe includes it on the Checkout Session. */
  async linkStripePaymentIntent(
    onRampId: string,
    paymentIntentId: string,
  ): Promise<void> {
    const pi = paymentIntentId.trim();
    if (!Types.ObjectId.isValid(onRampId) || !pi) return;
    await this.onRampModel
      .updateOne(
        { _id: new Types.ObjectId(onRampId) },
        { $set: { stripePaymentIntentId: pi } },
      )
      .exec();
  }

  async markStripePaymentFailed(onRampId: string, reason: string): Promise<void> {
    if (!Types.ObjectId.isValid(onRampId)) return;
    const row = await this.onRampModel.findById(onRampId).exec();
    await this.onRampModel
      .updateOne(
        { _id: new Types.ObjectId(onRampId), status: { $ne: 'fulfilled' } },
        { $set: { status: 'failed', errorMessage: reason } },
      )
      .exec();
    if (row && row.status !== 'fulfilled') {
      this.emailNotifications.notifyOnRampFailed({
        walletAddress: row.walletAddress,
        tokenSymbol: row.tokenSymbol,
        usdAmountCents: row.usdAmountCents,
        reason,
      });
    }
    await this.syncChatMessageFromStoredOnRamp(onRampId);
  }

  private priorOnRampHandlerData(msg: ChatMessageDocument): Record<string, unknown> {
    const hr = msg.handlerResultData;
    if (!hr || typeof hr !== 'object') return {};
    const rec = hr as Record<string, unknown>;
    if (rec.kind !== 'server' || rec.data == null || typeof rec.data !== 'object') {
      return {};
    }
    return { ...(rec.data as Record<string, unknown>) };
  }

  private static readonly ON_RAMP_STATUS_LABEL: Record<string, string> = {
    pending_checkout: 'Awaiting checkout',
    pending_payment: 'Awaiting Stripe payment',
    paid_pending_transfer: 'Paid — sending tokens',
    fulfilled: 'Fulfilled',
    failed: 'Failed',
    canceled: 'Canceled',
  };

  private shortenMiddleText(s: string, maxLen = 42): string {
    const t = s.trim();
    if (t.length <= maxLen) return t;
    const head = Math.ceil((maxLen - 1) / 2);
    const tail = Math.floor((maxLen - 1) / 2);
    return `${t.slice(0, head)}…${t.slice(-tail)}`;
  }

  private shortenHexAddress(addr: string, head = 6, tail = 4): string {
    const t = addr.trim();
    if (/^0x[a-fA-F0-9]{40}$/i.test(t)) {
      const a = t.toLowerCase();
      return `${a.slice(0, head)}…${a.slice(-tail)}`;
    }
    return this.shortenMiddleText(t, 28);
  }

  private trimDecimalZeros(s: string): string {
    if (!/^\d+\.\d+$/.test(s)) return s;
    return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  private onRampBubbleContent(status: string, tokenSymbol: string): string {
    switch (status) {
      case 'fulfilled':
        return `On-ramp complete. Stripe charged your card and we sent ${tokenSymbol} from the Beam treasury on-chain.`;
      case 'failed':
        return `This on-ramp did not complete. Open Financial dashboard → On Ramp for details, or create a new checkout from chat.`;
      case 'canceled':
        return `Stripe checkout was not finished (canceled or expired). You can start a new on-ramp when ready.`;
      default:
        return `Your Stripe checkout is ready. Pay in the secure window; once Stripe confirms, we send ${tokenSymbol} to the recipient from the Beam treasury.`;
    }
  }

  private onRampTxRich(doc: OnRampDocument): AgentRichCard {
    const tokenSymbol = doc.tokenSymbol?.trim() || '—';
    const tokenAmountWei = doc.tokenAmountWei?.trim() ?? '';
    const recipient = doc.recipientWallet?.trim() ?? '';
    const network = doc.network?.trim() || '—';
    const usdCents = Number.isFinite(doc.usdAmountCents) ? doc.usdAmountCents : null;
    const td = doc.tokenDecimals;
    let amountDisplay = '—';
    if (tokenAmountWei && /^\d+$/.test(tokenAmountWei)) {
      if (
        typeof td === 'number' &&
        Number.isInteger(td) &&
        td >= 0 &&
        td <= 36
      ) {
        try {
          amountDisplay = this.trimDecimalZeros(
            formatUnits(BigInt(tokenAmountWei), td),
          );
        } catch {
          amountDisplay = '—';
        }
      }
    }
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Token', value: tokenSymbol },
      { label: `Amount (${tokenSymbol})`, value: amountDisplay },
      { label: 'Network', value: this.shortenMiddleText(network, 48) },
      {
        label: 'Recipient',
        value: recipient ? this.shortenHexAddress(recipient) : '—',
      },
      {
        label: 'Card charge',
        value: usdCents != null ? `$${(usdCents / 100).toFixed(2)}` : '—',
      },
      {
        label: 'Status',
        value:
          OnRampService.ON_RAMP_STATUS_LABEL[doc.status] ?? doc.status ?? '—',
      },
    ];
    if (doc.fulfillmentTxHash?.trim()) {
      rows.push({
        label: 'Fulfillment tx',
        value: this.shortenMiddleText(doc.fulfillmentTxHash.trim(), 28),
      });
    }
    if (doc.status !== 'fulfilled' && doc.errorMessage?.trim()) {
      rows.push({
        label: 'Error',
        value: this.shortenMiddleText(doc.errorMessage.trim(), 160),
      });
    }
    return {
      type: 'tx',
      title: 'Stripe on-ramp',
      rows,
    };
  }

  private async applyOnRampToLinkedChat(doc: OnRampDocument): Promise<void> {
    const chatMessageId = doc.sourceChatMessageId?.trim();
    if (!chatMessageId || !Types.ObjectId.isValid(chatMessageId)) return;
    const msg = await this.chatMessageModel.findById(chatMessageId).exec();
    if (!msg) return;

    const prior = this.priorOnRampHandlerData(msg);
    const checkoutUrlRaw =
      typeof prior.stripeCheckoutUrl === 'string'
        ? prior.stripeCheckoutUrl.trim()
        : '';
    const checkoutUrl = /^https:\/\//i.test(checkoutUrlRaw)
      ? checkoutUrlRaw
      : '';

    const data: Record<string, unknown> = {
      ...prior,
      onRampId: doc._id.toHexString(),
      onRampStatus: doc.status,
      tokenSymbol: doc.tokenSymbol,
      tokenAmountWei: doc.tokenAmountWei,
      recipientWallet: doc.recipientWallet,
      network: doc.network,
      tokenDecimals: doc.tokenDecimals,
      usdAmountCents: doc.usdAmountCents,
      ...(doc.usdValue !== undefined ? { usdValue: doc.usdValue } : {}),
      ...(doc.stripeCheckoutSessionId
        ? { stripeCheckoutSessionId: doc.stripeCheckoutSessionId }
        : {}),
      ...(doc.stripePaymentIntentId
        ? { stripePaymentIntentId: doc.stripePaymentIntentId }
        : {}),
      ...(doc.fulfillmentTxHash?.trim()
        ? { fulfillmentTxHash: doc.fulfillmentTxHash.trim() }
        : {}),
    };
    if (checkoutUrl) data.stripeCheckoutUrl = checkoutUrl;
    if (doc.status !== 'fulfilled' && doc.errorMessage?.trim()) {
      data.onRampErrorMessage = doc.errorMessage.trim();
    } else {
      delete data.onRampErrorMessage;
    }

    const content = this.onRampBubbleContent(doc.status, doc.tokenSymbol);
    const rich = this.onRampTxRich(doc);
    const serverStatus: 'completed' | 'failed' =
      doc.status === 'failed' || doc.status === 'canceled' ? 'failed' : 'completed';

    const handlerResultData = {
      kind: 'server' as const,
      status: serverStatus,
      data,
      updatedAt: Date.now(),
    };

    await this.chatMessageModel.updateOne(
      { _id: msg._id },
      { $set: { content, rich, handlerResultData } },
    );

    const statusParsed = onRampRecordStatusSchema.safeParse(doc.status);
    const stripeOnRampFollowUp =
      checkoutUrl
        ? {
            kind: 'stripe_on_ramp' as const,
            checkoutUrl,
            onRampId: doc._id.toHexString(),
            ...(statusParsed.success ? { onRampStatus: statusParsed.data } : {}),
            ...(doc.fulfillmentTxHash?.trim()
              ? { fulfillmentTxHash: doc.fulfillmentTxHash.trim() }
              : {}),
            ...(doc.network?.trim() ? { network: doc.network.trim() } : {}),
          }
        : undefined;

    const historyMsg: ChatHistoryMessage = {
      id: String(msg._id),
      role: msg.role === 'user' ? 'user' : 'agent',
      ...(msg.agentKey ? { agentKey: msg.agentKey } : {}),
      content,
      createdAt: typeof msg.createdAt === 'number' ? msg.createdAt : Date.now(),
      rich,
      ...(stripeOnRampFollowUp ? { followUp: stripeOnRampFollowUp } : {}),
      result: handlerResultData,
    };

    this.conversationSync.notifyWallet(doc.walletAddress, {
      v: 1,
      op: 'thread_messages',
      conversationId: String(msg.conversationId),
      messages: [historyMsg],
    });
  }
}
