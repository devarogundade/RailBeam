import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OnRampDocument = HydratedDocument<OnRamp>;

@Schema({ timestamps: true, collection: 'onramps' })
export class OnRamp {
  @Prop({ required: true, index: true })
  walletAddress: string;

  @Prop({ required: true })
  recipientWallet: string;

  @Prop({ required: true })
  network: string;

  @Prop({ required: true })
  tokenAddress: string;

  @Prop({ required: true })
  tokenDecimals: number;

  @Prop({ required: true })
  tokenSymbol: string;

  @Prop({ required: true })
  tokenAmountWei: string;

  @Prop({ required: true })
  usdAmountCents: number;

  @Prop()
  usdValue?: number;

  @Prop({
    required: true,
    enum: [
      'pending_checkout',
      'pending_payment',
      'paid_pending_transfer',
      'fulfilled',
      'failed',
      'canceled',
    ],
    default: 'pending_checkout',
  })
  status: string;

  @Prop({ index: true, sparse: true })
  stripeCheckoutSessionId?: string;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  fulfillmentTxHash?: string;

  @Prop()
  errorMessage?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OnRampSchema = SchemaFactory.createForClass(OnRamp);
OnRampSchema.index({ stripeCheckoutSessionId: 1 }, { unique: true, sparse: true });
