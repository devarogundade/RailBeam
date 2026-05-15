import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  EMAIL_JOB_SEND,
  EMAIL_QUEUE_NAME,
} from './email.constants';
import { EmailSenderService } from './email-sender.service';
import type { EmailJobPayload } from './email.types';

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(EmailQueueService.name);
  private connection?: IORedis;
  private queue?: Queue<EmailJobPayload>;
  private worker?: Worker<EmailJobPayload>;

  constructor(
    private readonly config: ConfigService,
    private readonly sender: EmailSenderService,
  ) {}

  onModuleInit(): void {
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      this.log.warn('REDIS_URL not set; email queue is disabled');
      return;
    }

    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    this.queue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
      connection: this.connection,
    });

    this.worker = new Worker<EmailJobPayload>(
      EMAIL_QUEUE_NAME,
      async (job) => {
        await this.sender.processJob(job.data);
      },
      {
        connection: this.connection.duplicate(),
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job, err) => {
      const id = job?.id ?? 'unknown';
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Email job ${id} failed: ${msg}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async enqueue(payload: EmailJobPayload): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(EMAIL_JOB_SEND, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    });
  }
}
