import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  Transaction,
  type TransactionDocument,
  type TransactionKind,
} from './schemas/transaction.schema';

export type TransactionView = {
  id: string;
  kind: TransactionKind;
  merchant: string;
  token?: string;
  amount?: string;
  description?: string;
  splitPayment?: boolean;
  subscriptionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly txModel: Model<TransactionDocument>,
  ) {}

  private toView(doc: TransactionDocument): TransactionView {
    return {
      id: String(doc._id),
      kind: doc.kind,
      merchant: doc.merchant,
      token: doc.token,
      amount: doc.amount,
      description: doc.description,
      splitPayment: doc.splitPayment,
      subscriptionId: doc.subscriptionId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async create(dto: CreateTransactionDto): Promise<TransactionView> {
    if (!isNonEmptyString(dto.merchant)) {
      throw new BadRequestException('merchant is required');
    }

    if (dto.kind === 'onetime') {
      if (!isNonEmptyString(dto.token)) {
        throw new BadRequestException('token is required for onetime');
      }
      if (!isNonEmptyString(dto.amount)) {
        throw new BadRequestException('amount is required for onetime');
      }
    }

    if (dto.kind === 'recurrent') {
      if (!isNonEmptyString(dto.subscriptionId)) {
        throw new BadRequestException('subscriptionId is required for recurrent');
      }
    }

    const doc = await this.txModel.create({
      kind: dto.kind,
      merchant: dto.merchant,
      token: dto.kind === 'onetime' ? dto.token : undefined,
      amount: dto.kind === 'onetime' ? dto.amount : undefined,
      description: dto.description,
      splitPayment: dto.kind === 'onetime' ? (dto.splitPayment ?? false) : undefined,
      subscriptionId: dto.kind === 'recurrent' ? dto.subscriptionId : undefined,
    });
    return this.toView(doc);
  }

  async view(id: string): Promise<TransactionView> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Transaction not found');
    }
    const doc = await this.txModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Transaction not found');
    return this.toView(doc);
  }
}

