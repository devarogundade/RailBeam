import { Module } from '@nestjs/common';
import { StardormMongoModule } from '../mongo/stardorm-mongo.module';
import { EmailNotificationsService } from './email-notifications.service';
import { EmailQueueService } from './email-queue.service';
import { EmailSenderService } from './email-sender.service';
import { EmailTemplateService } from './email-template.service';

@Module({
  imports: [StardormMongoModule],
  providers: [
    EmailTemplateService,
    EmailSenderService,
    EmailQueueService,
    EmailNotificationsService,
  ],
  exports: [EmailNotificationsService],
})
export class EmailModule {}
