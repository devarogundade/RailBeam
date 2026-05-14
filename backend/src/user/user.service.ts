import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { formatUnits, toUtf8String } from 'ethers';
import { Model, Types } from 'mongoose';
import {
  ChatMessage as StardormChatBubble,
  ChatMessageDocument,
} from 'src/mongo/schemas/chat-message.schema';
import {
  Conversation,
  ConversationDocument,
} from 'src/mongo/schemas/conversation.schema';
import {
  User,
  UserDocument,
  UserPreferences,
} from 'src/mongo/schemas/user.schema';
import { SubgraphService } from 'src/subgraph/subgraph.service';
import type { Agent as SubgraphRegistryAgent } from 'src/subgraph/types';
import { ChatMessage, OgComputeService } from 'src/og/og-compute.service';
import type { OgComputeChatResult } from 'src/og/og-compute.service';
import { OgStorageService } from 'src/og/og-storage.service';
import {
  STARDORM_AGENT_CAIP2_NETWORKS,
  buildAgentOutputContract,
  buildAgentToolCallingSystemPrompt,
  agentReplyFromChatCompletion,
  type AgentComputeReplyWithParams,
  type AgentRichCard,
} from 'src/agent-reply/stardorm-agent-reply.schema';
import { buildOpenAiHandlerTools } from 'src/agent-reply/stardorm-handler-tools';
import {
  HandlerActionId,
  HANDLER_ACTION_IDS,
  isHandlerActionId,
} from 'src/handlers/handler.types';
import { HandlersService } from 'src/handlers/handlers.service';
import {
  resolveStardormAgentKey,
  resolveStardormChainAgentId,
  stardormChatRichBlockSchema,
  isOnRampFormCtaParams,
  onRampTokensInputSchema,
  stripeKycInputSchema,
  createCreditCardInputSchema,
  type CreditCardPublic,
} from '@beam/stardorm-api-contract';
import {
  X402InputSchema,
  isX402CheckoutFormCtaParams,
} from 'src/handlers/handler-inputs.schema';
import { CreditCardsService } from 'src/credit-cards/credit-cards.service';
import { PaymentRequestsService } from 'src/payments/payment-requests.service';
import { OnRampService } from 'src/stripe/on-ramp.service';
import { KycStripeService } from 'src/stripe/kyc-stripe.service';
import type { MulterIncomingFile } from './multer-file.types';

export type UserUploadResult = {
  rootHash: string;
  txHash?: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type PublicUser = {
  id: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
  activeAgentId: string;
  activeConversationId?: string;
  preferences: UserPreferences;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UpdateUserInput = {
  displayName?: string;
  email?: string | null;
  activeAgentId?: string;
  activeConversationId?: string | null;
  preferences?: Partial<UserPreferences>;
};

export type ConversationSummary = {
  id: string;
  agentKey: string;
  title?: string;
  lastMessageAt: Date;
  createdAt?: Date;
};

export type ChatTurnResult = OgComputeChatResult & {
  /** Final user-visible reply text (same as persisted agent bubble). */
  content: string;
  structured?: AgentComputeReplyWithParams;
};

/** Same discriminant as `ChatFollowUp` in `@beam/stardorm-api-contract` / chat history API. */
type ChatFollowUpPayload =
  | { kind: 'x402_checkout'; payPath: string; paymentRequestId: string }
  | { kind: 'tax_report_pdf'; attachmentId: string; name: string }
  | { kind: 'stripe_on_ramp'; checkoutUrl: string; onRampId: string }
  | {
      kind: 'stripe_identity';
      verificationUrl: string;
      verificationSessionId: string;
    }
  | {
      kind: 'credit_card_ready';
      creditCardId: string;
      dashboardPath: string;
    };

export type ChatThreadSnapshot = {
  conversationId: string;
  agentKey: string;
  messages: Array<{
    id: string;
    role: 'user' | 'agent';
    agentKey?: string;
    content: string;
    createdAt: number;
    attachments?: Array<{
      id: string;
      mimeType: string;
      name: string;
      hash: string;
      size?: string;
    }>;
    rich?: AgentRichCard;
    handlerCta?: { handler: HandlerActionId; params: Record<string, unknown> };
    followUp?: ChatFollowUpPayload;
    model?: string;
    verified?: boolean;
    chatId?: string;
    provider?: string;
  }>;
  hasMoreOlder: boolean;
  nextCursorOlder?: string;
};

const CHAT_MAX_FILES = 2;

function handlerCapabilitiesFromSubgraphAgent(
  agent: SubgraphRegistryAgent | null,
): HandlerActionId[] {
  if (!agent?.metadata?.length) return [];
  const row = agent.metadata.find((m) => m.key === 'handlerCapabilities');
  if (!row?.value?.trim()) return [];
  let s = row.value.trim();
  if (/^0x[0-9a-fA-F]+$/.test(s) && s.length >= 4 && s.length % 2 === 0) {
    try {
      s = toUtf8String(s);
    } catch {
      return [];
    }
  }
  return s
    .split(',')
    .map((x) => x.trim())
    .filter((x): x is HandlerActionId => isHandlerActionId(x));
}

function mergeHandlerSets(sets: Iterable<HandlerActionId[]>): HandlerActionId[] {
  const set = new Set<HandlerActionId>();
  for (const arr of sets) {
    for (const h of arr) set.add(h);
  }
  return HANDLER_ACTION_IDS.filter((h) => set.has(h));
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(StardormChatBubble.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    private readonly subgraph: SubgraphService,
    private readonly ogCompute: OgComputeService,
    private readonly ogStorage: OgStorageService,
    private readonly handlers: HandlersService,
    private readonly creditCards: CreditCardsService,
    private readonly paymentRequests: PaymentRequestsService,
    private readonly onRamp: OnRampService,
    private readonly kycStripe: KycStripeService,
  ) {}

  private normalizeWallet(wallet: string): string {
    const w = wallet.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(w)) {
      throw new BadRequestException('Invalid wallet address');
    }
    return w;
  }

  private async handlerCapabilitiesForCatalogKeys(
    keys: readonly string[],
    clientEvmChainId?: number,
  ): Promise<HandlerActionId[][]> {
    const out: HandlerActionId[][] = [];
    for (const raw of keys) {
      const id = resolveStardormChainAgentId(raw.trim());
      if (id == null) {
        out.push([]);
        continue;
      }
      let agent: SubgraphRegistryAgent | null = null;
      try {
        agent = await this.subgraph.getAgentByChainAgentId(
          id,
          clientEvmChainId,
        );
      } catch {
        agent = null;
      }
      out.push(handlerCapabilitiesFromSubgraphAgent(agent));
    }
    return out;
  }

  private async mergeHandlersForChatKeys(
    keys: readonly string[],
    clientEvmChainId?: number,
  ): Promise<HandlerActionId[]> {
    const perAgent = await this.handlerCapabilitiesForCatalogKeys(
      keys,
      clientEvmChainId,
    );
    return mergeHandlerSets(perAgent);
  }

  private async resolveCatalogAgentKeyForHandlerFromSubgraph(
    handler: HandlerActionId,
    candidateAgentKeys: readonly string[],
    clientEvmChainId?: number,
  ): Promise<string | null> {
    for (const key of candidateAgentKeys) {
      const id = resolveStardormChainAgentId(key.trim());
      if (id == null) continue;
      let agent: SubgraphRegistryAgent | null = null;
      try {
        agent = await this.subgraph.getAgentByChainAgentId(
          id,
          clientEvmChainId,
        );
      } catch {
        agent = null;
      }
      if (handlerCapabilitiesFromSubgraphAgent(agent).includes(handler))
        return key;
    }
    return null;
  }

  private richFromTaxData(
    data: Record<string, unknown> | undefined,
  ): AgentRichCard | undefined {
    if (!data) return undefined;
    const countryCode =
      typeof data.countryCode === 'string' ? data.countryCode : '—';
    const fmtMoney = (n: unknown) =>
      typeof n === 'number' && Number.isFinite(n)
        ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        : '—';
    const from =
      typeof data.from === 'string' ? data.from.slice(0, 10) : undefined;
    const to = typeof data.to === 'string' ? data.to.slice(0, 10) : undefined;
    const period =
      from && to ? `${from} → ${to}` : from ?? to ?? 'Reporting window';
    return {
      type: 'report',
      title: 'Tax summary',
      rows: [
        { label: 'Country', value: countryCode },
        { label: 'Period', value: period },
        { label: 'Income (est.)', value: fmtMoney(data.income) },
        { label: 'Expenses (est.)', value: fmtMoney(data.expenses) },
        { label: 'Taxes (est.)', value: fmtMoney(data.taxes) },
        { label: 'Net after tax', value: fmtMoney(data.netIncome) },
      ],
    };
  }

  private richFromX402Data(
    data: Record<string, unknown> | undefined,
  ): AgentRichCard | undefined {
    if (!data) return undefined;
    const payment = data.payment as Record<string, unknown> | undefined;
    const resource = data.resource as Record<string, unknown> | undefined;
    const title =
      typeof resource?.title === 'string' && resource.title
        ? resource.title
        : 'x402 payment';
    const amountRaw =
      typeof payment?.amount === 'string' ? payment.amount.trim() : '';
    const assetRaw =
      typeof payment?.asset === 'string' ? payment.asset.trim() : '';
    const networkRaw =
      typeof payment?.network === 'string' ? payment.network.trim() : '';
    const payToRaw =
      typeof payment?.payTo === 'string' ? payment.payTo.trim() : '';

    const decimalsRaw = data.decimals;
    const decimals =
      typeof decimalsRaw === 'number' &&
      Number.isInteger(decimalsRaw) &&
      decimalsRaw >= 0 &&
      decimalsRaw <= 36
        ? decimalsRaw
        : undefined;

    const weiDisplay =
      amountRaw && /^\d+$/.test(amountRaw)
        ? UserService.formatBase10Integer(amountRaw)
        : '—';

    const rows: Array<{ label: string; value: string }> = [];

    if (decimals != null && amountRaw && /^\d+$/.test(amountRaw)) {
      try {
        const human = UserService.trimDecimalZeros(
          formatUnits(BigInt(amountRaw), decimals),
        );
        rows.push({ label: 'Amount (token units)', value: human });
      } catch {
        // ignore invalid amount/decimals pair
      }
    }
    rows.push({
      label: rows.length > 0 ? 'Amount (wei)' : 'Amount (base units)',
      value: weiDisplay,
    });

    const tokenLabel =
      assetRaw && /^0x[a-fA-F0-9]{40}$/i.test(assetRaw)
        ? 'Token contract'
        : 'Asset';
    rows.push({
      label: tokenLabel,
      value: UserService.shortenAddressOrPassThrough(assetRaw || '—'),
    });

    rows.push({
      label: 'Network',
      value: UserService.shortenMiddleText(networkRaw || '—', 48),
    });
    rows.push({
      label: 'Pay to',
      value: payToRaw
        ? UserService.shortenHexAddress(payToRaw)
        : '—',
    });

    return {
      type: 'tx',
      title,
      rows,
    };
  }

  private richFromOnRampData(
    data: Record<string, unknown> | undefined,
  ): AgentRichCard | undefined {
    if (!data) return undefined;
    const tokenSymbol =
      typeof data.tokenSymbol === 'string' ? data.tokenSymbol : '—';
    const tokenAmountWei =
      typeof data.tokenAmountWei === 'string' ? data.tokenAmountWei.trim() : '';
    const recipient =
      typeof data.recipientWallet === 'string'
        ? data.recipientWallet.trim()
        : '';
    const network =
      typeof data.network === 'string' ? data.network.trim() : '—';
    const usdCentsRaw = data.usdAmountCents;
    const usdCents =
      typeof usdCentsRaw === 'number' && Number.isFinite(usdCentsRaw)
        ? usdCentsRaw
        : null;
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Token', value: tokenSymbol },
      {
        label: 'Amount (base units)',
        value:
          tokenAmountWei && /^\d+$/.test(tokenAmountWei)
            ? UserService.formatBase10Integer(tokenAmountWei)
            : '—',
      },
      { label: 'Network', value: UserService.shortenMiddleText(network, 48) },
      {
        label: 'Recipient',
        value: recipient
          ? UserService.shortenHexAddress(recipient)
          : '—',
      },
      {
        label: 'Card charge',
        value: usdCents != null ? `$${(usdCents / 100).toFixed(2)}` : '—',
      },
    ];
    return {
      type: 'tx',
      title: 'Stripe on-ramp',
      rows,
    };
  }

  private richFromKycData(
    data: Record<string, unknown> | undefined,
  ): AgentRichCard | undefined {
    if (!data) return undefined;
    const sessionId =
      typeof data.verificationSessionId === 'string'
        ? data.verificationSessionId
        : '—';
    return {
      type: 'report',
      title: 'Stripe Identity',
      rows: [
        { label: 'Session', value: UserService.shortenMiddleText(sessionId, 36) },
        {
          label: 'Next step',
          value: 'Open the verification link below and complete capture.',
        },
      ],
    };
  }

  private richFromCreditCardData(
    data: Record<string, unknown> | undefined,
  ): AgentRichCard | undefined {
    if (!data) return undefined;
    const first = typeof data.firstName === 'string' ? data.firstName : '';
    const last = typeof data.lastName === 'string' ? data.lastName : '';
    const line1 = typeof data.line1 === 'string' ? data.line1 : '';
    const line2 = typeof data.line2 === 'string' ? data.line2 : undefined;
    const city = typeof data.city === 'string' ? data.city : '';
    const region = typeof data.region === 'string' ? data.region : '';
    const postal = typeof data.postalCode === 'string' ? data.postalCode : '';
    const cc = typeof data.countryCode === 'string' ? data.countryCode : '';
    const cur = typeof data.currency === 'string' ? data.currency : 'USD';
    const last4 = typeof data.last4 === 'string' ? data.last4 : '????';
    const balRaw = data.balanceCents;
    const bal =
      typeof balRaw === 'number' && Number.isFinite(balRaw) ? balRaw : 0;
    const label =
      typeof data.cardLabel === 'string' && data.cardLabel.trim()
        ? data.cardLabel.trim()
        : undefined;
    const pan =
      typeof data.panDisplay === 'string' && data.panDisplay.trim()
        ? data.panDisplay.trim()
        : `•••• •••• •••• ${last4}`;
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Card', value: pan },
      { label: 'Cardholder', value: `${first} ${last}`.trim() || '—' },
      ...(label ? [{ label: 'Label', value: label }] : []),
      {
        label: 'Street',
        value: [line1, line2].filter(Boolean).join(', ') || '—',
      },
      {
        label: 'City / region / ZIP',
        value: [city, region, postal, cc].filter(Boolean).join(', ') || '—',
      },
      {
        label: 'Available balance',
        value: `${cur} ${(bal / 100).toFixed(2)}`,
      },
    ];
    return {
      type: 'credit_card',
      title: 'Virtual payment card · issued',
      rows,
    };
  }

  /** Thousands separators for a non-negative base-10 integer string (e.g. wei). */
  private static formatBase10Integer(raw: string): string {
    const digits = raw.replace(/\s+/g, '');
    if (!/^\d+$/.test(digits)) return raw;
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private static shortenHexAddress(addr: string, head = 6, tail = 4): string {
    const t = addr.trim();
    if (!t) return '—';
    if (!/^0x[a-fA-F0-9]{40}$/i.test(t)) {
      return UserService.shortenMiddleText(t, 28);
    }
    const lower = t.toLowerCase();
    return `${lower.slice(0, head)}…${lower.slice(-tail)}`;
  }

  /** Full-length `0x` address → compact middle ellipsis; otherwise return trimmed text (capped). */
  private static shortenAddressOrPassThrough(s: string, maxPassThrough = 24): string {
    const t = s.trim();
    if (!t) return '—';
    if (/^0x[a-fA-F0-9]{40}$/i.test(t)) {
      return UserService.shortenHexAddress(t);
    }
    if (t.length <= maxPassThrough) return t;
    return UserService.shortenMiddleText(t, maxPassThrough);
  }

  /** One-line ellipsis in the middle for long network ids / URLs. */
  private static shortenMiddleText(s: string, maxLen = 42): string {
    const t = s.trim();
    if (t.length <= maxLen) return t;
    const edge = Math.max(6, Math.floor((maxLen - 1) / 2));
    return `${t.slice(0, edge)}…${t.slice(-edge)}`;
  }

  private static trimDecimalZeros(s: string): string {
    if (!s.includes('.')) return s;
    return s.replace(/0+$/, '').replace(/\.$/, '');
  }

  private static jsonParamsEqual(a: unknown, b: unknown): boolean {
    try {
      return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    } catch {
      return false;
    }
  }

  private followUpFromPersistedMessage(row: {
    handlerResultData?: unknown;
    attachments?: unknown;
  }): ChatFollowUpPayload | undefined {
    const hr = row.handlerResultData;
    if (hr && typeof hr === 'object') {
      const d = hr as Record<string, unknown>;
      const creditCardId =
        typeof d.creditCardId === 'string' ? d.creditCardId : null;
      const dashboardPathRaw =
        typeof d.dashboardPath === 'string' ? d.dashboardPath : '/dashboard';
      const dashboardPath = dashboardPathRaw.startsWith('/')
        ? dashboardPathRaw
        : '/dashboard';
      if (creditCardId && Types.ObjectId.isValid(creditCardId)) {
        return {
          kind: 'credit_card_ready',
          creditCardId,
          dashboardPath,
        };
      }
      const payPath =
        typeof d.payPath === 'string' && d.payPath.startsWith('/pay/')
          ? d.payPath
          : null;
      const paymentRequestId =
        typeof d.paymentRequestId === 'string' ? d.paymentRequestId : null;
      if (payPath && paymentRequestId) {
        return {
          kind: 'x402_checkout',
          payPath,
          paymentRequestId,
        };
      }
      const checkoutUrl =
        typeof d.stripeCheckoutUrl === 'string' &&
        /^https:\/\//i.test(d.stripeCheckoutUrl)
          ? d.stripeCheckoutUrl
          : null;
      const onRampId = typeof d.onRampId === 'string' ? d.onRampId : null;
      if (checkoutUrl && onRampId) {
        return {
          kind: 'stripe_on_ramp',
          checkoutUrl,
          onRampId,
        };
      }
      const verificationUrl =
        typeof d.stripeIdentityVerificationUrl === 'string' &&
        /^https:\/\//i.test(d.stripeIdentityVerificationUrl)
          ? d.stripeIdentityVerificationUrl
          : null;
      const verificationSessionId =
        typeof d.verificationSessionId === 'string'
          ? d.verificationSessionId
          : null;
      if (verificationUrl && verificationSessionId) {
        return {
          kind: 'stripe_identity',
          verificationUrl,
          verificationSessionId,
        };
      }
    }
    const raw = row.attachments;
    if (!Array.isArray(raw)) return undefined;
    for (const a of raw) {
      if (!a || typeof a !== 'object') continue;
      const rec = a as Record<string, unknown>;
      const mime = typeof rec.mimeType === 'string' ? rec.mimeType : '';
      const id = rec.id != null ? String(rec.id) : '';
      if (mime === 'application/pdf' && id) {
        return {
          kind: 'tax_report_pdf',
          attachmentId: id,
          name:
            typeof rec.name === 'string' && rec.name.trim()
              ? rec.name
              : 'report.pdf',
        };
      }
    }
    return undefined;
  }

  private toPublic(doc: UserDocument): PublicUser {
    const o = doc.toObject({ versionKey: false });
    return {
      id: String(o._id),
      walletAddress: o.walletAddress,
      displayName: o.displayName,
      email: o.email,
      activeAgentId: o.activeAgentId ?? 'beam-default',
      ...(o.activeConversationId
        ? { activeConversationId: String(o.activeConversationId) }
        : {}),
      preferences: {
        autoRoutePrompts: o.preferences?.autoRoutePrompts ?? true,
        onchainReceipts: o.preferences?.onchainReceipts ?? true,
        emailNotifications: o.preferences?.emailNotifications ?? false,
        avatarPreset: o.preferences?.avatarPreset ?? 'male',
      },
      lastLoginAt: o.lastLoginAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async listMyCreditCards(walletAddress: string): Promise<{
    cards: CreditCardPublic[];
  }> {
    const wallet = this.normalizeWallet(walletAddress);
    const rows = await this.creditCards.listForWallet(wallet);
    return { cards: rows.map((r) => this.creditCards.toPublic(r)) };
  }

  async fundMyCreditCard(
    walletAddress: string,
    cardId: string,
    amountCents: number,
  ): Promise<CreditCardPublic> {
    const wallet = this.normalizeWallet(walletAddress);
    const doc = await this.creditCards.fund(wallet, cardId, amountCents);
    return this.creditCards.toPublic(doc);
  }

  async withdrawMyCreditCard(
    walletAddress: string,
    cardId: string,
    amountCents: number,
  ): Promise<CreditCardPublic> {
    const wallet = this.normalizeWallet(walletAddress);
    const doc = await this.creditCards.withdraw(wallet, cardId, amountCents);
    return this.creditCards.toPublic(doc);
  }

  /** Idempotent: ensures a Mongo user row exists for the wallet (same defaults as auth login). */
  async createUser(walletAddress: string): Promise<PublicUser> {
    const wallet = this.normalizeWallet(walletAddress);
    await this.userModel.updateOne(
      { walletAddress: wallet },
      {
        $setOnInsert: {
          walletAddress: wallet,
          activeAgentId: 'beam-default',
          preferences: {},
        },
      },
      { upsert: true },
    );
    const doc = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!doc) {
      throw new NotFoundException('User not found after create');
    }
    return this.toPublic(doc);
  }

  /** `id` is the wallet address (0x…), matching how clients key users in this app. */
  async getUser(id: string): Promise<PublicUser> {
    const wallet = this.normalizeWallet(id);
    const doc = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!doc) {
      throw new NotFoundException('User not found');
    }
    return this.toPublic(doc);
  }

  async getMe(walletAddress: string): Promise<PublicUser> {
    const wallet = this.normalizeWallet(walletAddress);
    const doc = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!doc) {
      return this.createUser(walletAddress);
    }
    return this.toPublic(doc);
  }

  async listMyPaymentRequests(walletAddress: string, limit: number) {
    const wallet = this.normalizeWallet(walletAddress);
    const items = await this.paymentRequests.listForWallet(wallet, limit);
    return { items };
  }

  async listMyOnRamps(walletAddress: string, limit: number) {
    const wallet = this.normalizeWallet(walletAddress);
    const items = await this.onRamp.listForWallet(wallet, limit);
    return { items };
  }

  async getMyKycStatus(walletAddress: string) {
    const wallet = this.normalizeWallet(walletAddress);
    return this.kycStripe.getStatusDocument(wallet);
  }

  async updateUser(
    walletAddress: string,
    patch: UpdateUserInput,
  ): Promise<PublicUser> {
    const wallet = this.normalizeWallet(walletAddress);
    const doc = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!doc) {
      throw new NotFoundException('User not found');
    }

    if (patch.displayName !== undefined) {
      const name = patch.displayName?.trim();
      doc.displayName = name?.length ? name : undefined;
    }
    if (patch.email !== undefined) {
      if (patch.email === null || patch.email === '') {
        doc.email = undefined;
      } else {
        const e = patch.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
          throw new BadRequestException('Invalid email');
        }
        doc.email = e;
      }
    }
    if (patch.activeAgentId !== undefined) {
      const aid = patch.activeAgentId?.trim();
      if (!aid) {
        throw new BadRequestException('activeAgentId cannot be empty');
      }
      doc.activeAgentId = aid;
    }
    if (patch.activeConversationId !== undefined) {
      if (
        patch.activeConversationId === null ||
        patch.activeConversationId === ''
      ) {
        doc.activeConversationId = undefined;
      } else {
        const cid = patch.activeConversationId.trim();
        if (!Types.ObjectId.isValid(cid)) {
          throw new BadRequestException('Invalid activeConversationId');
        }
        const owned = await this.conversationModel
          .findOne({
            _id: new Types.ObjectId(cid),
            userId: doc._id,
          })
          .exec();
        if (!owned) {
          throw new BadRequestException('Unknown conversation');
        }
        doc.activeConversationId = owned._id as Types.ObjectId;
      }
    }
    if (patch.preferences) {
      const p = patch.preferences;
      doc.preferences = {
        ...doc.preferences,
        ...(p.autoRoutePrompts !== undefined
          ? { autoRoutePrompts: p.autoRoutePrompts }
          : {}),
        ...(p.onchainReceipts !== undefined
          ? { onchainReceipts: p.onchainReceipts }
          : {}),
        ...(p.emailNotifications !== undefined
          ? { emailNotifications: p.emailNotifications }
          : {}),
        ...(p.avatarPreset !== undefined ? { avatarPreset: p.avatarPreset } : {}),
      };
    }

    await doc.save();
    return this.toPublic(doc);
  }

  private async multerFileToBuffer(file: MulterIncomingFile): Promise<Buffer> {
    if (file.buffer?.length) return file.buffer;
    if (file.path) {
      try {
        return await fs.readFile(file.path);
      } finally {
        await fs.unlink(file.path).catch(() => undefined);
      }
    }
    throw new BadRequestException('Invalid upload');
  }

  /** Upload a file (e.g. image) to 0G Storage for the authenticated user. */
  async uploadMeFile(
    walletAddress: string,
    file: MulterIncomingFile,
  ): Promise<UserUploadResult> {
    this.normalizeWallet(walletAddress);
    const buffer = await this.multerFileToBuffer(file);
    if (!buffer.length) {
      throw new BadRequestException('Empty file');
    }
    const { rootHash, txHash } = await this.ogStorage.uploadBuffer(buffer);
    return {
      rootHash,
      txHash,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  private static encodeConversationCursor(lm: number, id: string): string {
    return Buffer.from(JSON.stringify({ v: 1 as const, lm, id }), 'utf8').toString(
      'base64url',
    );
  }

  private static decodeConversationCursor(cursor: string): { lm: number; id: string } {
    try {
      const o = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { v?: unknown; lm?: unknown; id?: unknown };
      if (
        o.v !== 1 ||
        typeof o.lm !== 'number' ||
        typeof o.id !== 'string' ||
        !Types.ObjectId.isValid(o.id)
      ) {
        throw new Error('bad');
      }
      return { lm: o.lm, id: o.id };
    } catch {
      throw new BadRequestException('Invalid conversation cursor');
    }
  }

  private static encodeMessageCursor(t: number, id: string): string {
    return Buffer.from(JSON.stringify({ v: 1 as const, t, id }), 'utf8').toString(
      'base64url',
    );
  }

  private static decodeMessageCursor(cursor: string): { t: number; id: string } {
    try {
      const o = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { v?: unknown; t?: unknown; id?: unknown };
      if (
        o.v !== 1 ||
        typeof o.t !== 'number' ||
        typeof o.id !== 'string' ||
        !Types.ObjectId.isValid(o.id)
      ) {
        throw new Error('bad');
      }
      return { t: o.t, id: o.id };
    } catch {
      throw new BadRequestException('Invalid message cursor');
    }
  }

  private toConversationSummary(
    doc: ConversationDocument,
  ): ConversationSummary {
    const o = doc.toObject({ versionKey: false });
    return {
      id: String(o._id),
      agentKey: o.agentKey,
      ...(typeof o.title === 'string' && o.title.trim()
        ? { title: o.title.trim() }
        : {}),
      lastMessageAt: o.lastMessageAt ?? doc.createdAt ?? new Date(),
      createdAt: doc.createdAt,
    };
  }

  async listConversations(
    walletAddress: string,
    limit = 25,
    cursor?: string | null,
  ): Promise<{
    conversations: ConversationSummary[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const wallet = this.normalizeWallet(walletAddress);
    const user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!user) {
      return { conversations: [], hasMore: false };
    }
    const capped = Math.min(Math.max(limit, 1), 50);
    let filter: Record<string, unknown> = { userId: user._id };
    if (cursor?.trim()) {
      const { lm, id } = UserService.decodeConversationCursor(cursor.trim());
      const oid = new Types.ObjectId(id);
      filter = {
        userId: user._id,
        $or: [
          { lastMessageAt: { $lt: new Date(lm) } },
          { lastMessageAt: new Date(lm), _id: { $lt: oid } },
        ],
      };
    }
    const rows = await this.conversationModel
      .find(filter)
      .sort({ lastMessageAt: -1, _id: -1 })
      .limit(capped + 1)
      .exec();
    const hasMore = rows.length > capped;
    const page = hasMore ? rows.slice(0, capped) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? UserService.encodeConversationCursor(
            (last.lastMessageAt instanceof Date
              ? last.lastMessageAt
              : new Date(last.lastMessageAt ?? Date.now())
            ).getTime(),
            String(last._id),
          )
        : undefined;
    return {
      conversations: page.map((r) => this.toConversationSummary(r)),
      hasMore,
      ...(nextCursor ? { nextCursor } : {}),
    };
  }

  async createConversation(
    walletAddress: string,
    body: { title?: string; agentKey?: string },
  ): Promise<ConversationSummary> {
    const wallet = this.normalizeWallet(walletAddress);
    let user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!user) {
      await this.createUser(walletAddress);
      user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const agentKey =
      body.agentKey?.trim() || user.activeAgentId || 'beam-default';
    const title = body.title?.trim();
    const created = await this.conversationModel.create({
      userId: user._id,
      agentKey,
      ...(title ? { title } : {}),
      lastMessageAt: new Date(),
    });
    user.activeConversationId = created._id as Types.ObjectId;
    await user.save();
    return this.toConversationSummary(created);
  }

  async deleteConversation(
    walletAddress: string,
    conversationId: string,
  ): Promise<void> {
    const wallet = this.normalizeWallet(walletAddress);
    const user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const tid = conversationId?.trim();
    if (!tid || !Types.ObjectId.isValid(tid)) {
      throw new BadRequestException('Invalid conversationId');
    }
    const oid = new Types.ObjectId(tid);
    const conv = await this.conversationModel
      .findOne({ _id: oid, userId: user._id })
      .exec();
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    await this.chatMessageModel.deleteMany({ conversationId: oid }).exec();
    await this.conversationModel.deleteOne({ _id: oid }).exec();

    if (String(user.activeConversationId) === tid) {
      const next = await this.conversationModel
        .findOne({ userId: user._id })
        .sort({ lastMessageAt: -1 })
        .exec();
      user.activeConversationId = next
        ? (next._id as Types.ObjectId)
        : undefined;
      await user.save();
    }
  }

  private async resolveConversationForUser(
    user: UserDocument,
    explicitConversationId?: string | null,
  ): Promise<ConversationDocument> {
    const uid = user._id;
    const byId = async (id: Types.ObjectId) =>
      this.conversationModel.findOne({ _id: id, userId: uid }).exec();

    const tid = explicitConversationId?.trim();
    if (tid) {
      if (!Types.ObjectId.isValid(tid)) {
        throw new BadRequestException('Invalid conversationId');
      }
      const c = await byId(new Types.ObjectId(tid));
      if (!c) {
        throw new BadRequestException('Unknown conversation');
      }
      return c;
    }

    if (user.activeConversationId) {
      const c = await byId(user.activeConversationId as Types.ObjectId);
      if (c) return c;
    }

    const latest = await this.conversationModel
      .findOne({ userId: uid })
      .sort({ lastMessageAt: -1 })
      .exec();

    if (latest) {
      if (
        !user.activeConversationId ||
        String(user.activeConversationId) !== String(latest._id)
      ) {
        user.activeConversationId = latest._id as Types.ObjectId;
        await user.save();
      }
      return latest;
    }

    const created = await this.conversationModel.create({
      userId: uid,
      agentKey: user.activeAgentId ?? 'beam-default',
      lastMessageAt: new Date(),
    });
    user.activeConversationId = created._id as Types.ObjectId;
    await user.save();
    return created;
  }

  async chat(
    walletAddress: string,
    agentRef: bigint | number | string,
    userMessage: string,
    files: MulterIncomingFile[] = [],
    conversationId?: string | null,
    clientEvmChainId?: number,
  ): Promise<ChatTurnResult> {
    const wallet = this.normalizeWallet(walletAddress);
    const msg = userMessage?.trim() ?? '';
    if (!msg && files.length === 0) {
      throw new BadRequestException('message or at least one file is required');
    }
    if (files.length > CHAT_MAX_FILES) {
      throw new BadRequestException(`At most ${CHAT_MAX_FILES} files allowed`);
    }

    let user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!user) {
      await this.createUser(walletAddress);
      user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }

    /**
     * `agentRef` may be a numeric chain id (from `/users/me/chat`) or a
     * catalog `agentKey` (from `/agents/:agentKey/chat`). Normalize to both:
     * the canonical catalog `agentKey` is what we store everywhere so the
     * client can render the right name/avatar from the catalog.
     */
    const refStr =
      typeof agentRef === 'string' ? agentRef.trim() : String(agentRef);
    const chainId = resolveStardormChainAgentId(refStr);
    const agentKeyFromRef =
      /^\d+$/.test(refStr) || typeof agentRef !== 'string'
        ? chainId != null
          ? resolveStardormAgentKey(chainId)
          : null
        : refStr;
    const agentKey = agentKeyFromRef ?? (chainId != null ? String(chainId) : refStr);

    /**
     * Subgraph lookup is best-effort: if the indexer is down or the agent
     * has not been indexed yet, handler tools are unavailable until metadata syncs.
     */
    let onchainAgent: Awaited<
      ReturnType<SubgraphService['getAgentByChainAgentId']>
    > = null;
    if (chainId != null) {
      try {
        onchainAgent = await this.subgraph.getAgentByChainAgentId(
          chainId,
          clientEvmChainId,
        );
      } catch {
        onchainAgent = null;
      }
    }

    const activeSubscribedChainAgentIds =
      await this.subgraph.getActiveSubscribedChainAgentIdsForUser(
        wallet,
        clientEvmChainId,
      );
    const subscribedCatalogAgentKeys = [
      ...new Set(
        activeSubscribedChainAgentIds
          .map((id) => resolveStardormAgentKey(id))
          .filter((k): k is string => k != null),
      ),
    ];

    const allowedHandlers: HandlerActionId[] =
      await this.mergeHandlersForChatKeys(
        [agentKey, ...subscribedCatalogAgentKeys],
        clientEvmChainId,
      );

    const attachments: Array<{
      id: string;
      mimeType: string;
      name: string;
      hash: string;
      size?: string;
    }> = [];

    for (const file of files) {
      const buffer = await this.multerFileToBuffer(file);
      if (!buffer.length) {
        throw new BadRequestException('Empty file');
      }
      const { rootHash } = await this.ogStorage.uploadBuffer(buffer);
      attachments.push({
        id: randomUUID(),
        mimeType: file.mimetype || 'application/octet-stream',
        name: file.originalname || 'attachment',
        hash: rootHash,
        size: String(file.size),
      });
    }

    const conv = await this.resolveConversationForUser(user, conversationId);

    const userBubbleContent = msg || '';
    if (msg && !conv.title?.trim()) {
      conv.title = msg.slice(0, 80).trim();
      await conv.save();
    }
    await this.chatMessageModel.create({
      conversationId: conv._id,
      userId: user._id,
      role: 'user',
      agentKey,
      content: userBubbleContent,
      attachments: attachments.length ? attachments : undefined,
      createdAt: Date.now(),
    });

    const userLines: string[] = [];
    if (msg) userLines.push(msg);
    if (attachments.length) {
      userLines.push(
        '',
        '[User attached files — 0G Storage root hashes]',
        ...attachments.map(
          (a) => `- ${a.name} (${a.mimeType}, rootHash=${a.hash})`,
        ),
      );
    }
    const userContentForModel = userLines.join('\n') || '(file attachment)';

    const agentContext = {
      ...(onchainAgent ?? {
        agentKey,
        chainAgentId: chainId,
        note: 'Subgraph agent row unavailable for this chain id.',
      }),
      walletActiveSubscriptions: {
        chainAgentIds: activeSubscribedChainAgentIds,
        catalogAgentKeys: subscribedCatalogAgentKeys,
      },
    };
    const prompt: ChatMessage[] = [
      {
        role: 'system',
        content: [
          'You are Stardorm chat: answer using the following on-chain agent record as context.',
          STARDORM_AGENT_CAIP2_NETWORKS,
          JSON.stringify(agentContext),
        ].join('\n'),
      },
      { role: 'user', content: userContentForModel },
    ];

    const tools = buildOpenAiHandlerTools(allowedHandlers);
    const prependSystem =
      tools.length > 0
        ? buildAgentToolCallingSystemPrompt(allowedHandlers)
        : buildAgentOutputContract(allowedHandlers);
    const openAiConversationId =
      conv.inferenceConversationId?.trim() || undefined;
    const raw = await this.ogCompute.chat(prompt, {
      prependSystem,
      ...(openAiConversationId ? { openAiConversationId } : {}),
      ...(tools.length ? { tools, toolChoice: 'auto' as const } : {}),
    });
    if (raw.openAiConversationId?.trim()) {
      conv.inferenceConversationId = raw.openAiConversationId.trim();
      await conv.save();
    }
    const structured = agentReplyFromChatCompletion(
      raw.assistantMessage,
      allowedHandlers,
    );

    const assistant = raw.assistantMessage;
    const usedToolCalls =
      Array.isArray(assistant.tool_calls) &&
      assistant.tool_calls.some((tc) => tc.type === 'function');

    let agentKeyForAgentBubble = agentKey;
    if (usedToolCalls && structured.handler != null) {
      const resolved = await this.resolveCatalogAgentKeyForHandlerFromSubgraph(
        structured.handler,
        [agentKey, ...subscribedCatalogAgentKeys],
        clientEvmChainId,
      );
      if (resolved) agentKeyForAgentBubble = resolved;
    }

    const handlerCta =
      structured.handler != null
        ? {
            handler: structured.handler,
            params: JSON.parse(JSON.stringify(structured.params)) as Record<
              string,
              unknown
            >,
          }
        : undefined;

    await this.chatMessageModel.create({
      conversationId: conv._id,
      userId: user._id,
      role: 'agent',
      agentKey: agentKeyForAgentBubble,
      content: structured.text,
      rich: structured.rich,
      handlerCta,
      createdAt: Date.now(),
      model: raw.model,
      verified: raw.verified,
      chatId: raw.chatId,
      provider: raw.provider,
    });

    conv.agentKey = agentKey;
    conv.lastMessageAt = new Date();
    await conv.save();

    return {
      ...raw,
      content: structured.text,
      structured,
      attachments:
        attachments.length > 0
          ? attachments.map((a) => ({
              id: a.id,
              hash: a.hash,
              name: a.name,
              mimeType: a.mimeType,
            }))
          : undefined,
    };
  }

  async listChatMessages(
    walletAddress: string,
    limit = 40,
    conversationIdQuery?: string | null,
    cursor?: string | null,
  ): Promise<ChatThreadSnapshot> {
    const wallet = this.normalizeWallet(walletAddress);
    const user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!user) {
      return {
        conversationId: 'none',
        agentKey: 'beam-default',
        messages: [],
        hasMoreOlder: false,
      };
    }

    const pickConv = async (): Promise<ConversationDocument | null> => {
      const q = conversationIdQuery?.trim();
      if (q && Types.ObjectId.isValid(q)) {
        return this.conversationModel
          .findOne({ _id: new Types.ObjectId(q), userId: user._id })
          .exec();
      }
      if (user.activeConversationId) {
        const c = await this.conversationModel
          .findOne({
            _id: user.activeConversationId,
            userId: user._id,
          })
          .exec();
        if (c) return c;
      }
      return this.conversationModel
        .findOne({ userId: user._id })
        .sort({ lastMessageAt: -1 })
        .exec();
    };

    const conv = await pickConv();
    if (!conv) {
      return {
        conversationId: 'none',
        agentKey: user.activeAgentId ?? 'beam-default',
        messages: [],
        hasMoreOlder: false,
      };
    }

    const capped = Math.min(Math.max(limit, 1), 100);
    let filter: Record<string, unknown> = { conversationId: conv._id };
    if (cursor?.trim()) {
      const { t, id } = UserService.decodeMessageCursor(cursor.trim());
      const oid = new Types.ObjectId(id);
      filter = {
        conversationId: conv._id,
        $or: [{ createdAt: { $lt: t } }, { createdAt: t, _id: { $lt: oid } }],
      };
    }

    const rowsDesc = await this.chatMessageModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(capped + 1)
      .lean()
      .exec();

    const hasMoreOlder = rowsDesc.length > capped;
    const pageDesc = hasMoreOlder ? rowsDesc.slice(0, capped) : rowsDesc;
    const chronological = [...pageDesc].reverse();

    const messages = chronological.map((row) => {
      const id = String(row._id);
      const role: 'user' | 'agent' =
        row.role === 'user' || row.role === 'agent' ? row.role : 'agent';
      const atts = Array.isArray(row.attachments)
        ? row.attachments.map((a) => ({
            id: String(a.id),
            mimeType: String(a.mimeType),
            name: String(a.name),
            hash: String(a.hash),
            ...(a.size != null ? { size: String(a.size) } : {}),
          }))
        : undefined;
      const richParsed = row.rich
        ? stardormChatRichBlockSchema.safeParse(row.rich)
        : undefined;
      const rich =
        richParsed && richParsed.success ? richParsed.data : undefined;
      const handlerCta =
        row.handlerCta &&
        typeof row.handlerCta.handler === 'string' &&
        isHandlerActionId(row.handlerCta.handler) &&
        row.handlerCta.params != null &&
        typeof row.handlerCta.params === 'object'
          ? {
              handler: row.handlerCta.handler,
              params: row.handlerCta.params as Record<string, unknown>,
            }
          : undefined;
      const computeMeta =
        role === 'agent' &&
        (row.model != null ||
          row.verified != null ||
          row.chatId != null ||
          row.provider != null)
          ? {
              ...(typeof row.model === 'string' ? { model: row.model } : {}),
              ...(typeof row.verified === 'boolean'
                ? { verified: row.verified }
                : {}),
              ...(typeof row.chatId === 'string' ? { chatId: row.chatId } : {}),
              ...(typeof row.provider === 'string'
                ? { provider: row.provider }
                : {}),
            }
          : {};
      const followUp = this.followUpFromPersistedMessage(row);
      return {
        id,
        role,
        agentKey: row.agentKey,
        content: typeof row.content === 'string' ? row.content : '',
        createdAt: typeof row.createdAt === 'number' ? row.createdAt : Date.now(),
        ...(atts?.length ? { attachments: atts } : {}),
        ...(rich ? { rich } : {}),
        ...(handlerCta ? { handlerCta } : {}),
        ...(followUp ? { followUp } : {}),
        ...computeMeta,
      };
    });

    const oldest = chronological[0];
    const nextCursorOlder =
      hasMoreOlder && oldest && oldest._id != null
        ? UserService.encodeMessageCursor(
            typeof oldest.createdAt === 'number'
              ? oldest.createdAt
              : Date.now(),
            String(oldest._id),
          )
        : undefined;

    return {
      conversationId: String(conv._id),
      agentKey: conv.agentKey,
      messages,
      hasMoreOlder,
      ...(nextCursorOlder ? { nextCursorOlder } : {}),
    };
  }

  async executeHandler(
    walletAddress: string,
    body: {
      handler: HandlerActionId;
      params?: unknown;
      ctaMessageId?: string;
    },
    clientEvmChainId?: number,
  ): Promise<{
    message: string;
    attachments?: Array<{ rootHash: string; mimeType: string; name: string }>;
    data?: Record<string, unknown>;
    rich?: AgentRichCard;
  }> {
    if (!isHandlerActionId(body.handler)) {
      throw new BadRequestException('Invalid handler id');
    }
    const wallet = this.normalizeWallet(walletAddress);
    const user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ctaId = body.ctaMessageId?.trim();
    if (!ctaId || !Types.ObjectId.isValid(ctaId)) {
      throw new BadRequestException(
        'ctaMessageId is required: pass the chat message id that displayed the action button.',
      );
    }
    const ctaMsg = await this.chatMessageModel
      .findOne({
        _id: new Types.ObjectId(ctaId),
        userId: user._id,
      })
      .exec();
    if (!ctaMsg?.handlerCta) {
      throw new BadRequestException(
        'CTA message not found or this action was already completed.',
      );
    }
    const conv = await this.conversationModel
      .findOne({
        _id: ctaMsg.conversationId,
        userId: user._id,
      })
      .exec();
    if (!conv) {
      throw new BadRequestException('Conversation not found for this message');
    }
    if (ctaMsg.handlerCta.handler !== body.handler) {
      throw new BadRequestException('Handler does not match this chat action');
    }
    const storedParams = ctaMsg.handlerCta.params;
    const checkoutFormCta =
      body.handler === 'create_x402_payment' &&
      isX402CheckoutFormCtaParams(storedParams);
    const onRampFormCta =
      body.handler === 'on_ramp_tokens' && isOnRampFormCtaParams(storedParams);
    let execParams: unknown = body.params ?? {};
    if (checkoutFormCta) {
      const parsed = X402InputSchema.safeParse(execParams);
      if (!parsed.success) {
        throw new BadRequestException(parsed.error.flatten());
      }
      execParams = parsed.data;
    } else if (onRampFormCta) {
      const parsed = onRampTokensInputSchema.safeParse(execParams);
      if (!parsed.success) {
        throw new BadRequestException(parsed.error.flatten());
      }
      execParams = parsed.data;
    } else if (body.handler === 'complete_stripe_kyc') {
      const parsed = stripeKycInputSchema.safeParse(
        execParams && typeof execParams === 'object' ? execParams : {},
      );
      if (!parsed.success) {
        throw new BadRequestException(parsed.error.flatten());
      }
      execParams = parsed.data;
      if (!UserService.jsonParamsEqual(storedParams, execParams)) {
        throw new BadRequestException('Params do not match this chat action');
      }
    } else if (body.handler === 'create_credit_card') {
      const parsed = createCreditCardInputSchema.safeParse(execParams);
      if (!parsed.success) {
        throw new BadRequestException(parsed.error.flatten());
      }
      execParams = parsed.data;
      if (!UserService.jsonParamsEqual(storedParams, execParams)) {
        throw new BadRequestException('Params do not match this chat action');
      }
    } else if (!UserService.jsonParamsEqual(storedParams, execParams)) {
      throw new BadRequestException('Params do not match this chat action');
    }
    const issuingAgentKey = ctaMsg.agentKey ?? conv.agentKey ?? 'beam-default';

    const activeSubscribedChainAgentIds =
      await this.subgraph.getActiveSubscribedChainAgentIdsForUser(
        wallet,
        clientEvmChainId,
      );
    const subscribedCatalogAgentKeys = [
      ...new Set(
        activeSubscribedChainAgentIds
          .map((id) => resolveStardormAgentKey(id))
          .filter((k): k is string => k != null),
      ),
    ];
    const allowed = await this.mergeHandlersForChatKeys(
      [issuingAgentKey, ...subscribedCatalogAgentKeys],
      clientEvmChainId,
    );
    if (!allowed.includes(body.handler)) {
      throw new ForbiddenException(
        `This agent cannot run "${body.handler}". Hire the specialist from the marketplace and try again.`,
      );
    }

    const result = await this.handlers.dispatch(
      body.handler,
      execParams,
      {
        walletAddress: wallet,
        ...(clientEvmChainId != null ? { clientEvmChainId } : {}),
      },
    );
    const rich =
      body.handler === 'generate_tax_report'
        ? this.richFromTaxData(result.data)
        : body.handler === 'create_x402_payment'
          ? this.richFromX402Data(result.data)
          : body.handler === 'on_ramp_tokens'
            ? this.richFromOnRampData(result.data)
            : body.handler === 'complete_stripe_kyc'
              ? this.richFromKycData(result.data)
              : body.handler === 'create_credit_card'
                ? this.richFromCreditCardData(result.data)
                : undefined;
    const outAtt = result.attachments?.map((a) => ({
      id: randomUUID(),
      mimeType: a.mimeType,
      name: a.name,
      hash: a.rootHash,
    }));
    const persistAgentKey = issuingAgentKey;
    await this.chatMessageModel.create({
      conversationId: conv._id,
      userId: user._id,
      role: 'agent',
      agentKey: persistAgentKey,
      content: result.message,
      attachments: outAtt?.length ? outAtt : undefined,
      rich,
      handlerResultData: result.data,
      createdAt: Date.now(),
    });
    await this.chatMessageModel.updateOne(
      {
        _id: new Types.ObjectId(ctaId),
        userId: user._id,
        conversationId: conv._id,
      },
      { $unset: { handlerCta: '' } },
    );
    conv.lastMessageAt = new Date();
    await conv.save();
    return {
      message: result.message,
      attachments: result.attachments,
      data: result.data,
      rich,
    };
  }
}
