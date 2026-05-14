import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FinancialSnapshotDocument = HydratedDocument<FinancialSnapshot>;

/**
 * Time-bucketed KPIs for charts (revenue curve, spend by category) on the dashboard.
 */
@Schema({ timestamps: true })
export class FinancialSnapshot {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  /** Start of bucket in UTC (e.g. midnight for daily). */
  @Prop({ required: true })
  bucketStart: Date;

  @Prop({ required: true, enum: ['day', 'week', 'month'] })
  bucket: string;

  /** Optional fiat or display-unit revenue for the bucket. */
  @Prop()
  revenueUsd?: number;

  /** Native 0G treasury balance snapshot at end of bucket. */
  @Prop()
  walletBalance0g?: number;

  /** Sum of active agent monthly prices in 0G at snapshot time. */
  @Prop()
  monthlySpend0g?: number;

  /** Spend or usage attributed to marketplace categories (0G or abstract units). */
  @Prop({ type: Object, default: {} })
  spendByCategory: Record<string, number>;
}

export const FinancialSnapshotSchema = SchemaFactory.createForClass(FinancialSnapshot);
FinancialSnapshotSchema.index({ userId: 1, bucket: 1, bucketStart: -1 });
