import type { EmailTemplateId } from './email.constants';

export type EmailJobPayload = {
  walletAddress: string;
  template: EmailTemplateId;
  variables: Record<string, string>;
};
