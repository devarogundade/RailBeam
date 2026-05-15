import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parsePaymentPayload } from '@x402/core/schemas';
import type { PaymentPayload } from '@x402/core/types';
import { publicPaymentRequestSchema } from '@beam/stardorm-api-contract';
import type {
  PaymentSettlementBody,
  PublicPaymentRequest,
} from '@beam/stardorm-api-contract';
import {
  PaymentRequest,
  type PaymentRequestDocument,
} from '../mongo/schemas/payment-request.schema';
import { EmailNotificationsService } from '../email/email-notifications.service';
import { FinancialSnapshotsService } from '../mongo/financial-snapshots.service';
import { X402FacilitatorService } from './x402-facilitator.service';

@Injectable()
export class PaymentRequestsService {
  constructor(
    @InjectModel(PaymentRequest.name)
    private readonly model: Model<PaymentRequestDocument>,
    private readonly x402Facilitator: X402FacilitatorService,
    private readonly financialSnapshots: FinancialSnapshotsService,
    private readonly emailNotifications: EmailNotificationsService,
  ) {}

  toPublic(doc: PaymentRequestDocument): PublicPaymentRequest {
    return publicPaymentRequestSchema.parse({
      id: doc._id.toHexString(),
      type: doc.type,
      status: doc.status,
      title: doc.title,
      description: doc.description,
      asset: doc.asset,
      amount: doc.amount,
      payTo: doc.payTo,
      network: doc.network,
      expiresAt: doc.expiresAt?.toISOString(),
      resourceId: doc.resourceId,
      resourceUrl: doc.resourceUrl,
      decimals: doc.decimals,
      x402Payload: doc.x402Payload,
      attachment: doc.attachment,
      txHash: doc.txHash,
      paidByWallet: doc.paidByWallet,
    });
  }

  async getPublicById(id: string): Promise<PublicPaymentRequest | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    if (!doc) return null;

    const now = new Date();
    if (
      doc.status === 'pending' &&
      doc.expiresAt &&
      doc.expiresAt.getTime() < now.getTime()
    ) {
      doc.status = 'expired';
      await doc.save();
    }

    return this.toPublic(doc);
  }

  private async refreshExpiredPending(): Promise<void> {
    const now = new Date();
    await this.model
      .updateMany(
        { status: 'pending', expiresAt: { $exists: true, $lt: now } },
        { $set: { status: 'expired' } },
      )
      .exec();
  }

  private updatedAtRangeFilter(range?: {
    from?: Date;
    to?: Date;
  }): { updatedAt: { $gte?: Date; $lte?: Date } } | undefined {
    if (!range?.from && !range?.to) return undefined;
    const bounds: { $gte?: Date; $lte?: Date } = {};
    if (range.from) bounds.$gte = range.from;
    if (range.to) bounds.$lte = range.to;
    return { updatedAt: bounds };
  }

  /**
   * Lists checkout rows where the wallet created the request or is recorded as payer.
   */
  async listForWallet(
    wallet: string,
    limit: number,
    range?: { from?: Date; to?: Date },
  ): Promise<PublicPaymentRequest[]> {
    const w = wallet.trim().toLowerCase();
    await this.refreshExpiredPending();

    const r = this.updatedAtRangeFilter(range);
    const docs = await this.model
      .find({
        $or: [{ createdByWallet: w }, { paidByWallet: w }],
        ...(r ?? {}),
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();

    return docs.map((d) => this.toPublic(d));
  }

  /** Payment requests this wallet created (e.g. invoices / checkout links). */
  async listCreatedByWallet(
    wallet: string,
    limit: number,
    range?: { from?: Date; to?: Date },
  ): Promise<PublicPaymentRequest[]> {
    const w = wallet.trim().toLowerCase();
    await this.refreshExpiredPending();
    const r = this.updatedAtRangeFilter(range);
    const docs = await this.model
      .find({ createdByWallet: w, ...(r ?? {}) })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();
    return docs.map((d) => this.toPublic(d));
  }

  /** Payment requests this wallet settled as payer. */
  async listPaidByWallet(
    wallet: string,
    limit: number,
    range?: { from?: Date; to?: Date },
  ): Promise<PublicPaymentRequest[]> {
    const w = wallet.trim().toLowerCase();
    await this.refreshExpiredPending();
    const r = this.updatedAtRangeFilter(range);
    const docs = await this.model
      .find({ paidByWallet: w, ...(r ?? {}) })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();
    return docs.map((d) => this.toPublic(d));
  }

  async createX402Payment(fields: {
    title: string;
    description?: string;
    attachment?: PaymentRequestDocument['attachment'];
    asset: string;
    amount: string;
    payTo: string;
    network: string;
    expiresAt?: Date;
    resourceId?: string;
    resourceUrl?: string;
    createdByWallet?: string;
    decimals?: number;
    x402Payload: Record<string, unknown>;
  }): Promise<PaymentRequestDocument> {
    const created = await this.model.create({
      type: 'x402',
      status: 'pending',
      ...fields,
    });
    return created;
  }

  async createOnChainPayment(fields: {
    title: string;
    description?: string;
    attachment?: PaymentRequestDocument['attachment'];
    asset: string;
    amount: string;
    payTo: string;
    network: string;
    expiresAt?: Date;
    createdByWallet?: string;
    decimals?: number;
  }): Promise<PaymentRequestDocument> {
    const created = await this.model.create({
      type: 'on-chain',
      status: 'pending',
      ...fields,
    });
    return created;
  }

  /**
   * Marks a pending checkout as paid after direct on-chain settlement (`txHash`) or after
   * facilitator verify+settle (`x402PaymentPayload` when `X402_FACILITATOR_URL` is set).
   * Idempotent when the same `txHash` is submitted again.
   */
  async confirmSettlement(
    id: string,
    body: PaymentSettlementBody,
  ): Promise<PublicPaymentRequest> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException();
    }
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException();

    const txHashRaw = body.txHash?.trim();
    const hasFacilitatorPayload = body.x402PaymentPayload != null;

    const now = new Date();
    if (
      doc.status === 'pending' &&
      doc.expiresAt &&
      doc.expiresAt.getTime() < now.getTime()
    ) {
      doc.status = 'expired';
      await doc.save();
    }

    if (doc.status === 'expired' || doc.status === 'cancelled') {
      throw new BadRequestException(
        `This payment request is ${doc.status} and cannot be settled.`,
      );
    }

    if (doc.status === 'paid') {
      if (hasFacilitatorPayload) {
        // Success retries may replay the payload; never call settle again.
        return this.toPublic(doc);
      }
      if (!txHashRaw) {
        throw new BadRequestException('txHash is required');
      }
      const recorded = doc.txHash?.toLowerCase();
      const submittedLower = txHashRaw.toLowerCase();
      if (recorded && recorded === submittedLower) {
        return this.toPublic(doc);
      }
      throw new ConflictException(
        'This payment was already recorded with a different transaction.',
      );
    }

    if (doc.status !== 'pending') {
      throw new BadRequestException(
        `Cannot settle payment while status is ${doc.status}.`,
      );
    }

    let submittedLower: string;
    let payerToRecord = body.payerAddress?.trim().toLowerCase();

    if (hasFacilitatorPayload) {
      if (doc.type !== 'x402') {
        throw new BadRequestException(
          'Facilitator settlement (x402PaymentPayload) is only supported for x402 checkouts.',
        );
      }
      const facilitatorUrl = this.x402Facilitator.getBaseUrl();
      if (!facilitatorUrl) {
        throw new BadRequestException(
          'Facilitator settlement is not configured (X402_FACILITATOR_URL).',
        );
      }
      const parsed = parsePaymentPayload(body.x402PaymentPayload);
      if (!parsed.success) {
        throw new BadRequestException(parsed.error.flatten());
      }
      const settled = await this.x402Facilitator.verifyAndSettle(
        facilitatorUrl,
        parsed.data as PaymentPayload,
        this.x402Facilitator.requirementsFor(doc),
      );
      submittedLower = settled.transaction.trim().toLowerCase();
      if (!payerToRecord && settled.payer?.trim()) {
        payerToRecord = settled.payer.trim().toLowerCase();
      }
    } else {
      if (!txHashRaw) {
        throw new BadRequestException(
          'txHash is required when x402PaymentPayload is not provided.',
        );
      }
      submittedLower = txHashRaw.toLowerCase();
    }

    doc.status = 'paid';
    doc.txHash = submittedLower;
    if (payerToRecord) {
      doc.paidByWallet = payerToRecord;
    }
    await doc.save();
    void this.financialSnapshots.recordPaymentSettled(doc).catch(() => {
      /* best-effort rollup for dashboard chat */
    });
    this.emailNotifications.notifyPaymentReceived({
      createdByWallet: doc.createdByWallet,
      title: doc.title,
      amount: doc.amount,
      asset: doc.asset,
      payerWallet: doc.paidByWallet,
      txHash: doc.txHash,
    });
    return this.toPublic(doc);
  }
}
