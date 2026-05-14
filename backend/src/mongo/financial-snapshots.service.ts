import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { formatUnits } from 'ethers';
import { Model, Types } from 'mongoose';
import {
  FinancialSnapshot,
  type FinancialSnapshotDocument,
} from './schemas/financial-snapshot.schema';
import { User, type UserDocument } from './schemas/user.schema';
import type { PaymentRequestDocument } from './schemas/payment-request.schema';

function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export type FinancialSnapshotChatRow = {
  bucketStart: string;
  bucket: string;
  revenueUsd?: number;
  walletBalance0g?: number;
  monthlySpend0g?: number;
  spendByCategory: Record<string, number>;
};

@Injectable()
export class FinancialSnapshotsService {
  constructor(
    @InjectModel(FinancialSnapshot.name)
    private readonly snapshotModel: Model<FinancialSnapshotDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private async userIdForWallet(
    wallet: string | undefined | null,
  ): Promise<Types.ObjectId | null> {
    const w = wallet?.trim().toLowerCase();
    if (!w) return null;
    const u = await this.userModel
      .findOne({ walletAddress: w })
      .select('_id')
      .exec();
    return u?._id ?? null;
  }

  private async bumpDayBucket(
    userId: Types.ObjectId,
    at: Date,
    inc: Record<string, number>,
  ): Promise<void> {
    if (!Object.keys(inc).length) return;
    const bucketStart = utcDayStart(at);
    await this.snapshotModel.updateOne(
      { userId, bucket: 'day', bucketStart },
      {
        $setOnInsert: {
          userId,
          bucket: 'day',
          bucketStart,
          spendByCategory: {},
        },
        $inc: inc,
      },
      { upsert: true },
    );
  }

  /**
   * Called when a checkout row moves to `paid` (payer spend / volume).
   */
  async recordPaymentSettled(
    doc: PaymentRequestDocument,
    at = new Date(),
  ): Promise<void> {
    const wallet = doc.paidByWallet ?? doc.createdByWallet;
    const userId = await this.userIdForWallet(wallet);
    if (!userId) return;

    const inc: Record<string, number> = { checkout_payments: 1 };
    const decimals = doc.decimals ?? 18;
    try {
      const n = parseFloat(formatUnits(BigInt(doc.amount), decimals));
      if (Number.isFinite(n) && n !== 0) {
        inc.checkout_token_outflow = n;
      }
    } catch {
      // ignore malformed amount
    }

    const flat: Record<string, number> = {};
    for (const [k, v] of Object.entries(inc)) {
      if (v) flat[`spendByCategory.${k}`] = v;
    }
    await this.bumpDayBucket(userId, at, flat);
  }

  /**
   * Called after on-ramp treasury transfer succeeds (Stripe USD in + token fulfilled).
   */
  async recordOnRampFulfilled(
    walletAddress: string,
    usdAmount: number,
    tokenHuman?: number,
    at = new Date(),
  ): Promise<void> {
    const userId = await this.userIdForWallet(walletAddress);
    if (!userId) return;

    const inc: Record<string, number> = {
      'spendByCategory.on_ramp_orders': 1,
    };
    if (Number.isFinite(usdAmount) && usdAmount !== 0) {
      inc['spendByCategory.on_ramp_usd'] = usdAmount;
      inc.revenueUsd = usdAmount;
    }
    if (
      tokenHuman != null &&
      Number.isFinite(tokenHuman) &&
      tokenHuman !== 0
    ) {
      inc['spendByCategory.on_ramp_token'] = tokenHuman;
    }
    await this.bumpDayBucket(userId, at, inc);
  }

  async recordVirtualCardFund(
    walletAddress: string,
    amountCents: number,
    at = new Date(),
  ): Promise<void> {
    const userId = await this.userIdForWallet(walletAddress);
    if (!userId) return;
    const usd = amountCents / 100;
    if (!Number.isFinite(usd) || usd === 0) return;
    await this.bumpDayBucket(userId, at, {
      'spendByCategory.virtual_card_fund_usd': usd,
    });
  }

  async recordVirtualCardWithdraw(
    walletAddress: string,
    amountCents: number,
    at = new Date(),
  ): Promise<void> {
    const userId = await this.userIdForWallet(walletAddress);
    if (!userId) return;
    const usd = amountCents / 100;
    if (!Number.isFinite(usd) || usd === 0) return;
    await this.bumpDayBucket(userId, at, {
      'spendByCategory.virtual_card_unfund_usd': usd,
    });
  }

  async listRecentDailyForChat(
    userId: Types.ObjectId,
    maxDays = 30,
  ): Promise<FinancialSnapshotChatRow[]> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - maxDays);
    const start = utcDayStart(cutoff);
    const rows = await this.snapshotModel
      .find({ userId, bucket: 'day', bucketStart: { $gte: start } })
      .sort({ bucketStart: -1 })
      .limit(maxDays)
      .lean()
      .exec();

    return rows.map((r) => ({
      bucketStart: (r.bucketStart as Date).toISOString(),
      bucket: r.bucket,
      ...(r.revenueUsd != null ? { revenueUsd: r.revenueUsd } : {}),
      ...(r.walletBalance0g != null ? { walletBalance0g: r.walletBalance0g } : {}),
      ...(r.monthlySpend0g != null ? { monthlySpend0g: r.monthlySpend0g } : {}),
      spendByCategory: {
        ...(typeof r.spendByCategory === 'object' && r.spendByCategory
          ? (r.spendByCategory as Record<string, number>)
          : {}),
      },
    }));
  }
}
