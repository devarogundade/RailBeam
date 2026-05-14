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
} from '@beam/stardorm-api-contract';
import {
  CreditCard,
  CreditCardDocument,
} from '../mongo/schemas/credit-card.schema';

function normalizeWallet(w: string): string {
  return w.trim().toLowerCase();
}

@Injectable()
export class CreditCardsService {
  constructor(
    @InjectModel(CreditCard.name)
    private readonly model: Model<CreditCardDocument>,
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
}
