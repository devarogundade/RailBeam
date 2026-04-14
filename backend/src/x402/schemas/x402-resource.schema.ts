import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type X402ResourceKind = 'file' | 'link';
export type X402Currency = 'USDC';
export type X402Network = `${string}:${string}`;

/** Stored x402 price: decimal token amount + settlement asset (matches AssetAmount shape with numeric amount). */
@Schema({ _id: false })
export class X402AssetAmount {
  @Prop({ required: true })
  asset!: string;

  @Prop({ required: true, type: Number })
  amount!: number;

  @Prop({ type: Object })
  extra?: Record<string, unknown>;
}

export const X402AssetAmountSchema = SchemaFactory.createForClass(X402AssetAmount);

export type X402ResourceDocument = HydratedDocument<X402Resource>;

@Schema({ timestamps: true })
export class X402Resource {
  @Prop({ required: true, index: true })
  kind!: X402ResourceKind;

  @Prop({ type: X402AssetAmountSchema, required: true })
  assetAmount!: X402AssetAmount;

  @Prop({ required: true })
  currency!: X402Currency;

  /** CAIP-2 network id, e.g. eip155:84532 */
  @Prop({ required: true })
  network!: X402Network;

  /** Recipient address for x402 settlement */
  @Prop({ required: true })
  payTo!: string;

  /** Root hash of encrypted payload stored in 0G storage. */
  @Prop({ required: true, index: true })
  rootHash!: string;

  /** For kind=file */
  @Prop()
  filename?: string;

  /** For kind=file */
  @Prop()
  mimeType?: string;

  /** Optional hints (not secret). */
  @Prop()
  title?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const X402ResourceSchema = SchemaFactory.createForClass(X402Resource);
