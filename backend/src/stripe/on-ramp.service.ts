import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { Model, Types } from 'mongoose';
import {
  onRampRecordSchema,
  onRampTokensInputSchema,
} from '@beam/stardorm-api-contract';
import type { OnRampRecord } from '@beam/stardorm-api-contract';
import type { HandlerContext, HandlerMessage } from '../handlers/handler.types';
import { OnRamp, type OnRampDocument } from '../mongo/schemas/on-ramp.schema';
import { getStripe } from './stripe.client';
import { rpcUrlForCaip2 } from './onramp-rpc';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;

@Injectable()
export class OnRampService {
  private readonly log = new Logger(OnRampService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectModel(OnRamp.name) private readonly onRampModel: Model<OnRampDocument>,
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
      ...(doc.errorMessage ? { errorMessage: doc.errorMessage } : {}),
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

    const appUrl =
      this.config.get<string>('APP_PUBLIC_URL')?.trim().replace(/\/$/, '') ||
      'http://localhost:5173';

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

    const session = await stripe.checkout.sessions.create({
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
      success_url: `${appUrl}/chat?onRamp=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/chat?onRamp=canceled`,
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
      return;
    }

    const row = await this.onRampModel.findById(onRampId).exec();
    if (!row) {
      this.log.warn(`OnRamp ${onRampId} not found`);
      return;
    }
    if (row.status === 'fulfilled') return;

    const rpcUrl = rpcUrlForCaip2(row.network, this.config);
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(pk, provider);
    const c = new Contract(row.tokenAddress, ERC20_ABI, wallet);
    try {
      const tx = await c.transfer(row.recipientWallet, row.tokenAmountWei);
      const receipt = await tx.wait();
      await this.onRampModel
        .updateOne(
          { _id: row._id },
          {
            $set: {
              status: 'fulfilled',
              fulfillmentTxHash: receipt?.hash ?? tx.hash,
            },
          },
        )
        .exec();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`On-ramp fulfillment failed for ${onRampId}: ${msg}`);
      await this.onRampModel
        .updateOne(
          { _id: row._id },
          { $set: { status: 'failed', errorMessage: msg } },
        )
        .exec();
    }
  }

  async markCanceled(onRampId: string): Promise<void> {
    await this.onRampModel
      .updateOne(
        { _id: new Types.ObjectId(onRampId), status: { $ne: 'fulfilled' } },
        { $set: { status: 'canceled' } },
      )
      .exec();
  }
}
