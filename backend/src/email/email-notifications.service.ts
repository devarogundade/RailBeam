import { Injectable, Logger } from '@nestjs/common';
import { formatUnits } from 'ethers';
import { EMAIL_TEMPLATES } from './email.constants';
import { EmailQueueService } from './email-queue.service';

@Injectable()
export class EmailNotificationsService {
  private readonly log = new Logger(EmailNotificationsService.name);

  constructor(private readonly queue: EmailQueueService) {}

  private enqueue(
    walletAddress: string | undefined | null,
    template: (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES],
    variables: Record<string, string>,
  ): void {
    const wallet = walletAddress?.trim().toLowerCase();
    if (!wallet) return;
    void this.queue
      .enqueue({ walletAddress: wallet, template, variables })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(`Failed to enqueue ${template} for ${wallet}: ${msg}`);
      });
  }

  notifyPaymentReceived(input: {
    createdByWallet?: string | null;
    title: string;
    amount: string;
    asset: string;
    payerWallet?: string | null;
    txHash?: string | null;
  }): void {
    this.enqueue(input.createdByWallet, EMAIL_TEMPLATES.PAYMENT_RECEIVED, {
      title: input.title,
      amount: input.amount,
      asset: input.asset,
      payerWallet: input.payerWallet?.trim() || '—',
      txHash: input.txHash?.trim() || '—',
    });
  }

  notifyOnRampFulfilled(input: {
    walletAddress: string;
    tokenSymbol: string;
    tokenAmountWei: string;
    tokenDecimals: number;
    usdAmountCents: number;
    fulfillmentTxHash?: string | null;
  }): void {
    let amountHuman = input.tokenAmountWei;
    try {
      amountHuman = formatUnits(
        BigInt(input.tokenAmountWei),
        input.tokenDecimals,
      );
    } catch {
      /* keep wei string */
    }
    const usd = (input.usdAmountCents / 100).toFixed(2);
    this.enqueue(input.walletAddress, EMAIL_TEMPLATES.ON_RAMP_FULFILLED, {
      tokenSymbol: input.tokenSymbol,
      tokenAmount: amountHuman,
      usdAmount: usd,
      txHash: input.fulfillmentTxHash?.trim() || '—',
    });
  }

  notifyOnRampFailed(input: {
    walletAddress: string;
    tokenSymbol: string;
    usdAmountCents: number;
    reason?: string | null;
  }): void {
    const usd = (input.usdAmountCents / 100).toFixed(2);
    this.enqueue(input.walletAddress, EMAIL_TEMPLATES.ON_RAMP_FAILED, {
      tokenSymbol: input.tokenSymbol,
      usdAmount: usd,
      reason: input.reason?.trim() || 'We could not complete your purchase.',
    });
  }

  notifyKycVerified(walletAddress: string): void {
    this.enqueue(walletAddress, EMAIL_TEMPLATES.KYC_VERIFIED, {});
  }

  notifyKycActionRequired(walletAddress: string): void {
    this.enqueue(walletAddress, EMAIL_TEMPLATES.KYC_ACTION_REQUIRED, {});
  }

  notifyCardFunded(input: {
    walletAddress: string;
    lastFour: string;
    amountCents: number;
    balanceCents: number;
  }): void {
    const funded = (input.amountCents / 100).toFixed(2);
    const balance = (input.balanceCents / 100).toFixed(2);
    this.enqueue(input.walletAddress, EMAIL_TEMPLATES.CARD_FUNDED, {
      lastFour: input.lastFour,
      fundedUsd: funded,
      balanceUsd: balance,
    });
  }
}
