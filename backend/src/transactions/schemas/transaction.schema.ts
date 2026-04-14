import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TransactionKind = 'onetime' | 'recurrent';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true, enum: ['onetime', 'recurrent'] })
  kind!: TransactionKind;

  /** EVM address (hex string). */
  @Prop({ required: true })
  merchant!: string;

  /** One-time only */
  @Prop()
  token?: string;

  /** One-time only: human amount string (UI amount, not base units). */
  @Prop()
  amount?: string;

  /** Optional description shown in checkout. */
  @Prop()
  description?: string;

  /** One-time only. */
  @Prop()
  splitPayment?: boolean;

  /** Recurrent only: subscription plan id (hex string). */
  @Prop()
  subscriptionId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

