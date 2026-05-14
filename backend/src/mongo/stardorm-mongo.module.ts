import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ActivityEvent,
  ActivityEventSchema,
} from './schemas/activity-event.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import {
  FinancialSnapshot,
  FinancialSnapshotSchema,
} from './schemas/financial-snapshot.schema';
import { User, UserSchema } from './schemas/user.schema';
import {
  PaymentRequest,
  PaymentRequestSchema,
} from './schemas/payment-request.schema';
import { OnRamp, OnRampSchema } from './schemas/on-ramp.schema';
import { KycStatus, KycStatusSchema } from './schemas/kyc-status.schema';
import {
  CreditCard,
  CreditCardSchema,
} from './schemas/credit-card.schema';

const stardormModels = [
  { name: User.name, schema: UserSchema },
  { name: Conversation.name, schema: ConversationSchema },
  { name: ChatMessage.name, schema: ChatMessageSchema },
  { name: ActivityEvent.name, schema: ActivityEventSchema },
  { name: FinancialSnapshot.name, schema: FinancialSnapshotSchema },
  { name: PaymentRequest.name, schema: PaymentRequestSchema },
  { name: OnRamp.name, schema: OnRampSchema },
  { name: KycStatus.name, schema: KycStatusSchema },
  { name: CreditCard.name, schema: CreditCardSchema },
];

@Module({
  imports: [MongooseModule.forFeature(stardormModels)],
  exports: [MongooseModule],
})
export class StardormMongoModule {}
