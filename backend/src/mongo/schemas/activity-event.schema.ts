import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityEventDocument = HydratedDocument<ActivityEvent>;

/**
 * Dashboard “recent activity” and audit trail (invoices, subs, agent actions).
 */
@Schema({ timestamps: true })
export class ActivityEvent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      'invoice_settled',
      'rebalance',
      'subscription',
      'report',
      'hire',
      'fire',
      'payment',
      'agent_action',
      'other',
    ],
  })
  kind: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  detail?: string;

  @Prop()
  amountLabel?: string;

  @Prop({ enum: ['in', 'out', 'neutral'] })
  direction?: string;

  @Prop()
  agentKey?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const ActivityEventSchema = SchemaFactory.createForClass(ActivityEvent);
ActivityEventSchema.index({ userId: 1, createdAt: -1 });
