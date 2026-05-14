import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CreditCardDocument = HydratedDocument<CreditCard>;

export const CREDIT_CARD_STATUSES = ['active', 'frozen'] as const;
export type CreditCardStatus = (typeof CREDIT_CARD_STATUSES)[number];

@Schema({ timestamps: true, collection: 'credit_cards' })
export class CreditCard {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  walletAddress: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ trim: true })
  cardLabel?: string;

  @Prop({ required: true, trim: true })
  line1: string;

  @Prop({ trim: true })
  line2?: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  region: string;

  @Prop({ required: true, trim: true })
  postalCode: string;

  @Prop({ required: true, uppercase: true, minlength: 2, maxlength: 2 })
  countryCode: string;

  @Prop({ required: true, default: 'USD', uppercase: true, minlength: 3, maxlength: 3 })
  currency: string;

  /** Available spend in minor units (e.g. USD cents). */
  @Prop({ required: true, default: 0, min: 0 })
  balanceCents: number;

  @Prop({ required: true, minlength: 4, maxlength: 4 })
  last4: string;

  /** Full PAN digits for in-app demo virtual cards (not a live issuer). Filled at creation or lazily on first reveal. */
  @Prop({ trim: true, minlength: 16, maxlength: 16 })
  pan?: string;

  @Prop({ trim: true, minlength: 3, maxlength: 4 })
  cardCvv?: string;

  @Prop({ min: 1, max: 12 })
  expiryMonth?: number;

  @Prop({ min: 2000, max: 2100 })
  expiryYear?: number;

  @Prop({ required: true, default: 'Visa' })
  networkBrand: string;

  @Prop({
    required: true,
    enum: CREDIT_CARD_STATUSES,
    default: 'active',
    index: true,
  })
  status: CreditCardStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;
}

export const CreditCardSchema = SchemaFactory.createForClass(CreditCard);
CreditCardSchema.index({ walletAddress: 1, createdAt: -1 });
