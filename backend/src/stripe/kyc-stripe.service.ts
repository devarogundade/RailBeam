import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  stripeKycInputSchema,
  userKycStatusDocumentSchema,
  type ChatHistoryMessage,
  type UserKycStatus,
  type UserKycStatusDocument,
} from '@beam/stardorm-api-contract';
import type { AgentRichCard } from 'src/agent-reply/stardorm-agent-reply.schema';
import type { HandlerContext, HandlerMessage } from '../handlers/handler.types';
import { EmailNotificationsService } from '../email/email-notifications.service';
import { ConversationSyncService } from '../conversations-sync/conversation-sync.service';
import {
  ChatMessage,
  type ChatMessageDocument,
} from '../mongo/schemas/chat-message.schema';
import {
  KycStatus,
  type KycStatusDocument,
} from '../mongo/schemas/kyc-status.schema';
import { getStripe } from './stripe.client';

function mapVerificationSessionStatus(s: string): UserKycStatus {
  switch (s) {
    case 'verified':
      return 'verified';
    case 'processing':
      return 'processing';
    case 'requires_input':
      return 'requires_input';
    case 'canceled':
      return 'canceled';
    default:
      return 'pending';
  }
}

const KYC_STATUS_LABEL: Record<UserKycStatus, string> = {
  not_started: 'Not started',
  pending: 'Pending',
  processing: 'Processing',
  verified: 'Verified',
  requires_input: 'Action required',
  canceled: 'Canceled',
};

function shortenMiddleText(s: string, maxLen = 42): string {
  const t = s.trim();
  if (t.length <= maxLen) return t;
  const head = Math.ceil((maxLen - 1) / 2);
  const tail = Math.floor((maxLen - 1) / 2);
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

/** Preserve execute-handler payload fields (e.g. Identity URL) when webhooks refresh status. */
function priorServerHandlerData(
  msg: ChatMessageDocument,
): Record<string, unknown> {
  const hr = msg.handlerResultData;
  if (!hr || typeof hr !== 'object') return {};
  const rec = hr as Record<string, unknown>;
  if (rec.kind !== 'server' || rec.data == null || typeof rec.data !== 'object') {
    return {};
  }
  return { ...(rec.data as Record<string, unknown>) };
}

export function kycReportRichCard(
  verificationSessionId: string,
  status: UserKycStatus,
): AgentRichCard {
  const sessionId = verificationSessionId.trim() || '—';
  const nextStep =
    status === 'verified'
      ? 'You are verified for Beam flows that require KYC.'
      : status === 'requires_input'
        ? 'Open the verification link and provide the requested information.'
        : status === 'processing'
          ? 'Stripe is reviewing your documents — no action needed right now.'
          : status === 'canceled'
            ? 'Start a new verification from chat if you still need KYC.'
            : 'Open the verification link below and complete capture.';
  return {
    type: 'report',
    title: 'Stripe Identity',
    rows: [
      {
        label: 'Session',
        value: shortenMiddleText(sessionId, 36),
      },
      { label: 'Status', value: KYC_STATUS_LABEL[status] ?? status },
      { label: 'Next step', value: nextStep },
    ],
  };
}

function kycStatusMessage(status: UserKycStatus): string {
  switch (status) {
    case 'verified':
      return 'Identity verification is complete.';
    case 'processing':
      return 'Stripe is reviewing your identity documents.';
    case 'requires_input':
      return 'Stripe needs more information to finish identity verification.';
    case 'canceled':
      return 'Identity verification was canceled.';
    default:
      return 'Your Stripe Identity session is ready. Complete document capture in the secure window; we update this message when Stripe finishes review.';
  }
}

@Injectable()
export class KycStripeService {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(KycStatus.name)
    private readonly kycModel: Model<KycStatusDocument>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly conversationSync: ConversationSyncService,
  ) {}

  readonly id = 'complete_stripe_kyc' as const;

  async getStatusDocument(wallet: string): Promise<UserKycStatusDocument> {
    const w = wallet.trim().toLowerCase();
    const doc = await this.kycModel.findOne({ walletAddress: w }).exec();
    if (!doc) {
      return userKycStatusDocumentSchema.parse({
        walletAddress: w,
        status: 'not_started',
      });
    }
    return userKycStatusDocumentSchema.parse({
      walletAddress: doc.walletAddress,
      status: doc.status,
      stripeVerificationSessionId: doc.stripeVerificationSessionId,
      lastStripeEventType: doc.lastStripeEventType,
      lastError: doc.lastError,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /** Links the agent reply bubble from `execute-handler` to this wallet's KYC row. */
  async linkSourceChatMessage(wallet: string, chatMessageId: string): Promise<void> {
    const w = wallet.trim().toLowerCase();
    const id = chatMessageId.trim();
    if (!Types.ObjectId.isValid(id)) return;
    await this.kycModel
      .updateOne({ walletAddress: w }, { $set: { sourceChatMessageId: id } })
      .exec();
  }

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const stripe = getStripe(this.config);
    if (!stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured (set STRIPE_SECRET_KEY).',
      );
    }
    const parsed = stripeKycInputSchema.safeParse(
      raw && typeof raw === 'object' ? raw : {},
    );
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const wallet = ctx.walletAddress.trim().toLowerCase();
    const appUrl =
      this.config.get<string>('APP_PUBLIC_URL')?.trim().replace(/\/$/, '') ||
      'http://localhost:5173';
    const returnPath = parsed.data.returnPath?.trim() || '/';
    const returnUrl = `${appUrl}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`;

    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { walletAddress: wallet },
      return_url: returnUrl,
    });

    const url = session.url;
    if (!url) {
      throw new BadRequestException(
        'Stripe did not return an Identity verification URL',
      );
    }

    await this.kycModel
      .findOneAndUpdate(
        { walletAddress: wallet },
        {
          $set: {
            status: 'pending',
            stripeVerificationSessionId: session.id,
            lastStripeEventType: 'identity.verification_session.created',
          },
          $setOnInsert: { walletAddress: wallet },
        },
        { upsert: true, new: true },
      )
      .exec();

    return {
      message:
        'Your Stripe Identity session is ready. Complete document capture in the secure window; we update your KYC status when Stripe finishes review.',
      data: {
        stripeIdentityVerificationUrl: url,
        verificationSessionId: session.id,
        kycStatus: 'pending' as const,
      },
    };
  }

  async applyVerificationSessionFromStripe(session: {
    id: string;
    status: string;
    metadata?: Record<string, string> | null;
  }): Promise<void> {
    const wallet =
      typeof session.metadata?.walletAddress === 'string'
        ? session.metadata.walletAddress.trim().toLowerCase()
        : '';
    if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
      return;
    }
    const prev = await this.kycModel.findOne({ walletAddress: wallet }).exec();
    const prevStatus = prev?.status;
    const status = mapVerificationSessionStatus(session.status);
    const updated = await this.kycModel
      .findOneAndUpdate(
        { walletAddress: wallet },
        {
          $set: {
            status,
            stripeVerificationSessionId: session.id,
            lastStripeEventType: `identity.verification_session.${session.status}`,
          },
          $setOnInsert: { walletAddress: wallet },
        },
        { upsert: true, new: true },
      )
      .exec();
    if (status === 'verified' && prevStatus !== 'verified') {
      this.emailNotifications.notifyKycVerified(wallet);
    }
    if (status === 'requires_input' && prevStatus !== 'requires_input') {
      this.emailNotifications.notifyKycActionRequired(wallet);
    }
    const messageId = updated?.sourceChatMessageId ?? prev?.sourceChatMessageId;
    if (messageId) {
      await this.syncSourceChatMessage(wallet, messageId, session.id, status);
    }
  }

  private async syncSourceChatMessage(
    wallet: string,
    chatMessageId: string,
    verificationSessionId: string,
    status: UserKycStatus,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(chatMessageId)) return;
    const msg = await this.chatMessageModel.findById(chatMessageId).exec();
    if (!msg) return;

    const rich = kycReportRichCard(verificationSessionId, status);
    const content = kycStatusMessage(status);
    const handlerResultData = {
      kind: 'server' as const,
      status:
        status === 'verified'
          ? ('completed' as const)
          : status === 'canceled'
            ? ('failed' as const)
            : ('completed' as const),
      data: {
        ...priorServerHandlerData(msg),
        kycStatus: status,
        verificationSessionId,
      },
      updatedAt: Date.now(),
    };

    await this.chatMessageModel.updateOne(
      { _id: msg._id },
      { $set: { content, rich, handlerResultData } },
    );

    const data = handlerResultData.data as Record<string, unknown>;
    const verificationUrlRaw =
      typeof data.stripeIdentityVerificationUrl === 'string'
        ? data.stripeIdentityVerificationUrl.trim()
        : '';
    const verificationUrl = /^https:\/\//i.test(verificationUrlRaw)
      ? verificationUrlRaw
      : null;
    const vsId =
      typeof data.verificationSessionId === 'string'
        ? data.verificationSessionId.trim()
        : null;
    const stripeIdentityFollowUp =
      verificationUrl && vsId
        ? ({
            kind: 'stripe_identity' as const,
            verificationUrl,
            verificationSessionId: vsId,
          })
        : undefined;

    const historyMsg: ChatHistoryMessage = {
      id: String(msg._id),
      role: msg.role === 'user' ? 'user' : 'agent',
      ...(msg.agentKey ? { agentKey: msg.agentKey } : {}),
      content,
      createdAt: typeof msg.createdAt === 'number' ? msg.createdAt : Date.now(),
      rich,
      ...(stripeIdentityFollowUp ? { followUp: stripeIdentityFollowUp } : {}),
      result: handlerResultData,
    };
    this.conversationSync.notifyWallet(wallet, {
      v: 1,
      op: 'thread_messages',
      conversationId: String(msg.conversationId),
      messages: [historyMsg],
    });
  }
}
