import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  stripeKycInputSchema,
  userKycStatusDocumentSchema,
  type UserKycStatus,
  type UserKycStatusDocument,
} from '@beam/stardorm-api-contract';
import type { HandlerContext, HandlerMessage } from '../handlers/handler.types';
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

@Injectable()
export class KycStripeService {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(KycStatus.name)
    private readonly kycModel: Model<KycStatusDocument>,
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
    const returnPath = parsed.data.returnPath?.trim() || '/chat';
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
    const status = mapVerificationSessionStatus(session.status);
    await this.kycModel
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
        { upsert: true },
      )
      .exec();
  }
}
