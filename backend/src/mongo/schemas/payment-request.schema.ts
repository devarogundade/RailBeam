import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentRequestDocument = HydratedDocument<PaymentRequest>;

export const PAYMENT_REQUEST_TYPES = ['on-chain', 'x402'] as const;
export type PaymentRequestType = (typeof PAYMENT_REQUEST_TYPES)[number];

export const PAYMENT_REQUEST_STATUSES = [
  'pending',
  'paid',
  'expired',
  'cancelled',
] as const;
export type PaymentRequestStatus = (typeof PAYMENT_REQUEST_STATUSES)[number];

/** Optional file reference (same shape as chat attachments / 0G storage metadata). */
@Schema({ _id: false })
export class PaymentRequestAttachment {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  hash: string;

  @Prop()
  size?: string;
}

const PaymentRequestAttachmentSchema = SchemaFactory.createForClass(
  PaymentRequestAttachment,
);

/**
 * Checkout row for x402 or plain on-chain settlement.
 * `amount` is the smallest unit string (wei / base units) to match x402 `maxAmountRequired`.
 */
@Schema({ timestamps: true, collection: 'payment_requests' })
export class PaymentRequest {
  @Prop({ required: true, enum: PAYMENT_REQUEST_TYPES, index: true })
  type: PaymentRequestType;

  @Prop({
    required: true,
    enum: PAYMENT_REQUEST_STATUSES,
    default: 'pending',
    index: true,
  })
  status: PaymentRequestStatus;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: PaymentRequestAttachmentSchema, default: undefined })
  attachment?: PaymentRequestAttachment;

  /** Token contract `0x…` or sentinel `native` for the chain's native currency. */
  @Prop({ required: true })
  asset: string;

  /** Base-unit amount as decimal string (no floats). */
  @Prop({ required: true })
  amount: string;

  @Prop({ required: true, lowercase: true, trim: true })
  payTo: string;

  /** Chain id as string (e.g. `16602`) or a short network slug from the client. */
  @Prop({ required: true })
  network: string;

  @Prop()
  expiresAt?: Date;

  /** Client resource id for x402 (distinct from Mongo `_id`). */
  @Prop()
  resourceId?: string;

  @Prop()
  resourceUrl?: string;

  @Prop({ lowercase: true, trim: true })
  createdByWallet?: string;

  /** Optional ERC-20 decimals when `asset` is a contract; native ignores this. */
  @Prop({ min: 0, max: 36 })
  decimals?: number;

  /** Full handler payload for x402 clients (version, accepts, resource, …). */
  @Prop({ type: Object })
  x402Payload?: Record<string, unknown>;

  /** Recorded when the payer confirms settlement via POST `/payments/:id/pay`. */
  @Prop({ lowercase: true, trim: true })
  txHash?: string;

  @Prop({ lowercase: true, trim: true })
  paidByWallet?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentRequestSchema =
  SchemaFactory.createForClass(PaymentRequest);

PaymentRequestSchema.index({ expiresAt: 1 }, { sparse: true });
