import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationSyncService } from './conversation-sync.service';
import { ConversationsGateway } from './conversations.gateway';

@Module({
  imports: [AuthModule],
  providers: [ConversationSyncService, ConversationsGateway],
  exports: [ConversationSyncService],
})
export class ConversationsSyncModule {}
