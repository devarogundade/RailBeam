import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import nodemailer, { type Transporter } from 'nodemailer';
import { User, type UserDocument } from '../mongo/schemas/user.schema';
import type { EmailTemplateId } from './email.constants';
import { EmailTemplateService } from './email-template.service';
import type { EmailJobPayload } from './email.types';

const SUBJECTS: Record<EmailTemplateId, string> = {
  'payment-received': 'Payment received on Beam',
  'on-ramp-fulfilled': 'Your Beam on-ramp is complete',
  'on-ramp-failed': 'Beam on-ramp could not be completed',
  'kyc-verified': 'Identity verification approved',
  'kyc-action-required': 'Action needed for identity verification',
  'card-funded': 'Virtual card funded',
};

@Injectable()
export class EmailSenderService {
  private readonly log = new Logger(EmailSenderService.name);
  private transporter?: Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly templates: EmailTemplateService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private smtpConfigured(): boolean {
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    return Boolean(user && pass);
  }

  private getTransporter(): Transporter | undefined {
    if (!this.smtpConfigured()) return undefined;
    if (!this.transporter) {
      const user = this.config.get<string>('SMTP_USER')!.trim();
      const pass = this.config.get<string>('SMTP_PASS')!.trim();
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
    return this.transporter;
  }

  private fromAddress(): string {
    return (
      this.config.get<string>('SMTP_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      'noreply@beam'
    );
  }

  async processJob(payload: EmailJobPayload): Promise<void> {
    const transport = this.getTransporter();
    if (!transport) {
      this.log.debug('SMTP not configured; skipping email job');
      return;
    }

    const wallet = payload.walletAddress.trim().toLowerCase();
    const user = await this.userModel.findOne({ walletAddress: wallet }).exec();
    if (!user?.email?.trim()) return;
    if (!user.preferences?.emailNotifications) return;

    const to = user.email.trim();
    const displayName = user.displayName?.trim() || 'there';
    const vars = {
      displayName,
      walletAddress: wallet,
      appUrl: this.config.get<string>('APP_PUBLIC_URL')?.trim() || 'http://localhost:5173',
      ...payload.variables,
    };

    const html = await this.templates.render(payload.template, vars);
    const subject = SUBJECTS[payload.template];

    await transport.sendMail({
      from: this.fromAddress(),
      to,
      subject,
      html,
    });
    this.log.log(`Sent ${payload.template} email to ${to}`);
  }
}
