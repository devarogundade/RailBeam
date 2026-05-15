import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomInt } from 'node:crypto';
import { Model, Types } from 'mongoose';
import type {
  CreateCreditCardInput,
  CreditCardPublic,
  CreditCardSensitiveDetails,
} from '@beam/stardorm-api-contract';
import { EmailNotificationsService } from '../email/email-notifications.service';
import {
  CreditCard,
  CreditCardDocument,
} from '../mongo/schemas/credit-card.schema';

function normalizeWallet(w: string): string {
  return w.trim().toLowerCase();
}

function buildCardSecrets(last4: string): {
  pan: string;
  cardCvv: string;
  expiryMonth: number;
  expiryYear: number;
} {
  const mid = String(randomInt(0, 100_000_000)).padStart(8, '0');
  const pan = `4111${mid}${last4}`;
  const cardCvv = String(randomInt(100, 1000));
  const expiryYear = new Date().getFullYear() + randomInt(2, 5);
  const expiryMonth = randomInt(1, 13);
  return { pan, cardCvv, expiryMonth, expiryYear };
}

@Injectable()
export class CreditCardsService {
  constructor(
    @InjectModel(CreditCard.name)
    private readonly model: Model<CreditCardDocument>,
    private readonly emailNotifications: EmailNotificationsService,
  ) {}

  async createForWallet(
    walletAddress: string,
    input: CreateCreditCardInput,
    userId?: Types.ObjectId,
  ): Promise<CreditCardDocument> {
    const wallet = normalizeWallet(walletAddress);
    const last4 = String(randomInt(0, 10000)).padStart(4, '0');
    const balance = input.initialBalanceCents ?? 0;
    const currency = input.currency ?? 'USD';
    const secrets = buildCardSecrets(last4);
    const created = await this.model.create({
      walletAddress: wallet,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      cardLabel: input.cardLabel?.trim(),
      line1: input.line1.trim(),
      line2: input.line2?.trim(),
      city: input.city.trim(),
      region: input.region.trim(),
      postalCode: input.postalCode.trim(),
      countryCode: input.countryCode,
      currency,
      balanceCents: balance,
      last4,
      ...secrets,
      networkBrand: 'Visa',
      status: 'active',
      ...(userId ? { userId } : {}),
    });
    return created;
  }

  toPublic(doc: CreditCardDocument): CreditCardPublic {
    const o = doc.toObject({ versionKey: false }) as Record<string, unknown>;
    return {
      id: String(o._id),
      firstName: String(o.firstName),
      lastName: String(o.lastName),
      cardLabel: typeof o.cardLabel === 'string' ? o.cardLabel : undefined,
      line1: String(o.line1),
      line2: typeof o.line2 === 'string' ? o.line2 : undefined,
      city: String(o.city),
      region: String(o.region),
      postalCode: String(o.postalCode),
      countryCode: String(o.countryCode),
      currency: String(o.currency),
      balanceCents: Number(o.balanceCents),
      last4: String(o.last4),
      networkBrand: String(o.networkBrand),
      status: o.status === 'frozen' ? 'frozen' : 'active',
      ...(o.createdAt instanceof Date ? { createdAt: o.createdAt } : {}),
      ...(o.updatedAt instanceof Date ? { updatedAt: o.updatedAt } : {}),
    };
  }

  async listForWallet(walletAddress: string): Promise<CreditCardDocument[]> {
    const wallet = normalizeWallet(walletAddress);
    return this.model
      .find({ walletAddress: wallet })
      .sort({ createdAt: -1 })
      .exec();
  }

  async assertOwnedCard(walletAddress: string, cardId: string): Promise<void> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException('Invalid card id');
    }
    const wallet = normalizeWallet(walletAddress);
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(cardId), walletAddress: wallet })
      .exec();
    if (!doc) throw new NotFoundException('Credit card not found');
  }

  private async ensureSensitiveFields(doc: CreditCardDocument): Promise<void> {
    if (
      doc.pan &&
      doc.cardCvv &&
      doc.expiryMonth != null &&
      doc.expiryYear != null
    ) {
      return;
    }
    const s = buildCardSecrets(doc.last4);
    doc.pan = doc.pan ?? s.pan;
    doc.cardCvv = doc.cardCvv ?? s.cardCvv;
    doc.expiryMonth = doc.expiryMonth ?? s.expiryMonth;
    doc.expiryYear = doc.expiryYear ?? s.expiryYear;
    await doc.save();
  }

  async getSensitiveDetailsForWallet(
    walletAddress: string,
    cardId: string,
  ): Promise<CreditCardSensitiveDetails> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException('Invalid card id');
    }
    const wallet = normalizeWallet(walletAddress);
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(cardId), walletAddress: wallet })
      .exec();
    if (!doc) throw new NotFoundException('Credit card not found');
    await this.ensureSensitiveFields(doc);
    return {
      cardId: String(doc._id),
      pan: doc.pan!,
      expiryMonth: doc.expiryMonth!,
      expiryYear: doc.expiryYear!,
      cvv: doc.cardCvv!,
    };
  }

  async fund(
    walletAddress: string,
    cardId: string,
    amountCents: number,
  ): Promise<CreditCardDocument> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException('Invalid card id');
    }
    const wallet = normalizeWallet(walletAddress);
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(cardId), walletAddress: wallet })
      .exec();
    if (!doc) throw new NotFoundException('Credit card not found');
    doc.balanceCents += amountCents;
    await doc.save();
    this.emailNotifications.notifyCardFunded({
      walletAddress: wallet,
      lastFour: doc.last4,
      amountCents,
      balanceCents: doc.balanceCents,
    });
    return doc;
  }

  async withdraw(
    walletAddress: string,
    cardId: string,
    amountCents: number,
  ): Promise<CreditCardDocument> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException('Invalid card id');
    }
    const wallet = normalizeWallet(walletAddress);
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(cardId), walletAddress: wallet })
      .exec();
    if (!doc) throw new NotFoundException('Credit card not found');
    if (doc.balanceCents < amountCents) {
      throw new BadRequestException('Insufficient card balance');
    }
    doc.balanceCents -= amountCents;
    await doc.save();
    return doc;
  }

  /**
   * Restores card balance after a failed on-chain unfund payout (no financial snapshot hooks).
   */
  async restoreWithdrawBalance(
    walletAddress: string,
    cardId: string,
    amountCents: number,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException('Invalid card id');
    }
    const wallet = normalizeWallet(walletAddress);
    const r = await this.model.updateOne(
      { _id: new Types.ObjectId(cardId), walletAddress: wallet },
      { $inc: { balanceCents: amountCents } },
    );
    if (r.matchedCount === 0) {
      throw new NotFoundException('Credit card not found');
    }
  }
}
