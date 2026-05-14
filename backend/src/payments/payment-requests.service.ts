import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { publicPaymentRequestSchema } from '@beam/stardorm-api-contract';
import type {
  PaymentSettlementBody,
  PublicPaymentRequest,
} from '@beam/stardorm-api-contract';
import {
  PaymentRequest,
  type PaymentRequestDocument,
} from '../mongo/schemas/payment-request.schema';

@Injectable()
export class PaymentRequestsService {
  constructor(
    @InjectModel(PaymentRequest.name)
    private readonly model: Model<PaymentRequestDocument>,
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

  /**
   * Marks a pending checkout as paid after the client broadcasts settlement on-chain.
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
    if (!txHashRaw) {
      throw new BadRequestException('txHash is required');
    }
    const submittedLower = txHashRaw.toLowerCase();

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
      const recorded = doc.txHash?.toLowerCase();
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

    doc.status = 'paid';
    doc.txHash = submittedLower;
    if (body.payerAddress) {
      doc.paidByWallet = body.payerAddress.toLowerCase();
    }
    await doc.save();
    return this.toPublic(doc);
  }
}
