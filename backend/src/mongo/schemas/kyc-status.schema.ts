import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KycStatusDocument = HydratedDocument<KycStatus>;

@Schema({ timestamps: true, collection: 'kyc_statuses' })
export class KycStatus {
  @Prop({ required: true, unique: true, index: true })
  walletAddress: string;

  @Prop({
    required: true,
    enum: [
      'not_started',
      'pending',
      'processing',
      'verified',
      'requires_input',
      'canceled',
    ],
    default: 'not_started',
  })
  status: string;

  @Prop({ index: true, sparse: true })
  stripeVerificationSessionId?: string;

  /** Agent chat bubble created by `complete_stripe_kyc` (updated from Identity webhooks). */
  @Prop({ index: true, sparse: true })
  sourceChatMessageId?: string;

  @Prop()
  lastStripeEventType?: string;

  @Prop()
  lastError?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const KycStatusSchema = SchemaFactory.createForClass(KycStatus);
