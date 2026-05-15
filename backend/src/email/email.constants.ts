export const EMAIL_QUEUE_NAME = 'email';

export const EMAIL_JOB_SEND = 'send';

/** HTML templates under `backend/templates/emails/`. */
export const EMAIL_TEMPLATES = {
  PAYMENT_RECEIVED: 'payment-received',
  ON_RAMP_FULFILLED: 'on-ramp-fulfilled',
  ON_RAMP_FAILED: 'on-ramp-failed',
  KYC_VERIFIED: 'kyc-verified',
  KYC_ACTION_REQUIRED: 'kyc-action-required',
  CARD_FUNDED: 'card-funded',
} as const;

export type EmailTemplateId =
  (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];
