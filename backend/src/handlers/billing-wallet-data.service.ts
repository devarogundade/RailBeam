import { Injectable } from '@nestjs/common';
import type {
  CreditCardPublic,
  OnRampRecord,
  PublicPaymentRequest,
  UserKycStatusDocument,
} from '@beam/stardorm-api-contract';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { PaymentRequestsService } from '../payments/payment-requests.service';
import { KycStripeService } from '../stripe/kyc-stripe.service';
import { OnRampService } from '../stripe/on-ramp.service';

const LIMIT_PAYMENT_ROWS = 40;
const LIMIT_ON_RAMP = 40;

export type BillingWalletSnapshot = {
  dateRange: { from?: string; to?: string };
  createdBy: PublicPaymentRequest[];
  paidBy: PublicPaymentRequest[];
  onRamps: OnRampRecord[];
  creditCards: CreditCardPublic[];
  kyc: UserKycStatusDocument;
};

@Injectable()
export class BillingWalletDataService {
  constructor(
    private readonly paymentRequests: PaymentRequestsService,
    private readonly onRamp: OnRampService,
    private readonly creditCards: CreditCardsService,
    private readonly kyc: KycStripeService,
  ) {}

  async load(
    walletAddress: string,
    range: { from?: Date; to?: Date },
  ): Promise<BillingWalletSnapshot> {
    const w = walletAddress.trim().toLowerCase();
    const hasRange = Boolean(range.from || range.to);
    const r = hasRange ? range : undefined;

    const [createdBy, paidBy, onRamps, cardDocs, kyc] = await Promise.all([
      this.paymentRequests.listCreatedByWallet(w, LIMIT_PAYMENT_ROWS, r),
      this.paymentRequests.listPaidByWallet(w, LIMIT_PAYMENT_ROWS, r),
      this.onRamp.listForWallet(w, LIMIT_ON_RAMP, r),
      this.creditCards.listForWallet(w),
      this.kyc.getStatusDocument(w),
    ]);

    return {
      dateRange: {
        from: range.from?.toISOString(),
        to: range.to?.toISOString(),
      },
      createdBy,
      paidBy,
      onRamps,
      creditCards: cardDocs.map((d) => this.creditCards.toPublic(d)),
      kyc,
    };
  }
}
