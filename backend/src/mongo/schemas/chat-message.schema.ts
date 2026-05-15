import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ _id: false })
export class ChatRichRow {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  value: string;
}

const ChatRichRowSchema = SchemaFactory.createForClass(ChatRichRow);

@Schema({ _id: false })
export class X402SupportedAssetRow {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  decimals: number;

  @Prop({ required: true })
  address: string;

  @Prop()
  usdValue?: number;
}

const X402SupportedAssetRowSchema =
  SchemaFactory.createForClass(X402SupportedAssetRow);

@Schema({ _id: false })
export class X402NetworkOption {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  label: string;
}

const X402NetworkOptionSchema = SchemaFactory.createForClass(X402NetworkOption);

@Schema({ _id: false })
export class ChatRichBlock {
  @Prop({
    required: true,
    enum: [
      'report',
      'invoice',
      'tx',
      'x402_checkout_form',
      'on_ramp_checkout_form',
      'credit_card_checkout_form',
      'credit_card',
      'swap_checkout_form',
      'transfer_checkout_form',
      'marketplace_hire',
    ],
  })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: [ChatRichRowSchema], default: undefined })
  rows?: ChatRichRow[];

  @Prop()
  intro?: string;

  @Prop({ type: [X402SupportedAssetRowSchema], default: undefined })
  supportedAssets?: X402SupportedAssetRow[];

  @Prop({ type: [X402NetworkOptionSchema], default: undefined })
  networks?: X402NetworkOption[];
}

const ChatRichBlockSchema = SchemaFactory.createForClass(ChatRichBlock);

@Schema({ _id: false })
export class ChatAttachment {
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

const ChatAttachmentSchema = SchemaFactory.createForClass(ChatAttachment);

@Schema({ _id: false })
export class ChatHandlerCta {
  @Prop({ required: true })
  handler: string;

  @Prop({ type: Object, required: true })
  params: Record<string, unknown>;
}

const ChatHandlerCtaSchema = SchemaFactory.createForClass(ChatHandlerCta);

/** One chat bubble (matches Stardorm `ChatMessage`). */
@Schema({ timestamps: false })
export class ChatMessage {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'agent'] })
  role: string;

  @Prop()
  agentKey?: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ type: [ChatAttachmentSchema], default: undefined })
  attachments?: ChatAttachment[];

  /** Epoch ms, aligned with the web client. */
  @Prop({ required: true, default: () => Date.now() })
  createdAt: number;

  @Prop({ enum: ['sent', 'delivered', 'seen'] })
  status?: string;

  @Prop({ type: ChatRichBlockSchema })
  rich?: ChatRichBlock;

  /** When the model proposes a server handler, the client shows a CTA; params re-sent on execute. */
  @Prop({ type: ChatHandlerCtaSchema })
  handlerCta?: ChatHandlerCta;

  /** Structured handler result (`data` from `HandlerMessage`) after execute-handler. */
  @Prop({ type: Object })
  handlerResultData?: Record<string, unknown>;

  /** 0G inference metadata (agent turns from `OgComputeService.chat`). */
  @Prop()
  model?: string;

  @Prop()
  verified?: boolean;

  @Prop()
  chatId?: string;

  @Prop()
  provider?: string;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
