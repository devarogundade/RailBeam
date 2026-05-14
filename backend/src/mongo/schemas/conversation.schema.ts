import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

/**
 * Chat thread for a user. Users may have many; `User.activeConversationId` selects the open one.
 * `agentKey` tracks the last agent used in that thread. Messages live in `ChatMessage`.
 */
@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  agentKey: string;

  @Prop()
  title?: string;

  /**
   * OpenAI server-side conversation id (`conv_*`) when using the Responses API
   * (`POST /v1/conversations` + `POST /v1/responses`) instead of chat completions.
   */
  @Prop()
  inferenceConversationId?: string;

  @Prop({ default: Date.now })
  lastMessageAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ userId: 1, lastMessageAt: -1 });
