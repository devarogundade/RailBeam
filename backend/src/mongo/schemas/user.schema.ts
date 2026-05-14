import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ default: true })
  autoRoutePrompts: boolean;

  @Prop({ default: true })
  onchainReceipts: boolean;

  @Prop({ default: false })
  emailNotifications: boolean;

  @Prop({ type: String, enum: ['male', 'female'], default: 'male' })
  avatarPreset: 'male' | 'female';
}

const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

/**
 * End-user account keyed by wallet (matches Settings + app-state wallet address).
 */
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  walletAddress: string;

  @Prop()
  displayName?: string;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  /** Currently selected agent in chat (`agentKey`). */
  @Prop({ default: 'beam-default' })
  activeAgentId: string;

  /** Currently open chat thread (`Conversation` id). */
  @Prop({ type: Types.ObjectId, ref: 'Conversation', index: true })
  activeConversationId?: Types.ObjectId;

  @Prop({ type: UserPreferencesSchema, default: () => ({}) })
  preferences: UserPreferences;

  @Prop()
  lastLoginAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
