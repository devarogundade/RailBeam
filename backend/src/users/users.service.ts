import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly redis: RedisService,
  ) {}

  private cacheKey(wallet: string): string {
    return `issuing:summary:${wallet.toLowerCase()}`;
  }

  async findByWallet(wallet: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ walletAddress: wallet.toLowerCase() })
      .exec();
  }

  async upsertWallet(wallet: string): Promise<UserDocument> {
    const key = wallet.toLowerCase();
    const doc = await this.userModel
      .findOneAndUpdate(
        { walletAddress: key },
        { $setOnInsert: { walletAddress: key } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    await this.redis.del(this.cacheKey(key));
    return doc;
  }

  async setStripeIds(
    wallet: string,
    patch: Partial<
      Pick<User, 'stripeCardholderId' | 'stripeCardId' | 'lastIssuedCardStatus'>
    >,
  ): Promise<UserDocument | null> {
    const key = wallet.toLowerCase();
    const doc = await this.userModel
      .findOneAndUpdate({ walletAddress: key }, { $set: patch }, { new: true })
      .exec();
    await this.redis.del(this.cacheKey(key));
    return doc;
  }

  async getCachedIssuingSummary(
    wallet: string,
  ): Promise<Record<string, unknown> | null> {
    return this.redis.getJson<Record<string, unknown>>(
      this.cacheKey(wallet.toLowerCase()),
    );
  }

  async setCachedIssuingSummary(
    wallet: string,
    summary: Record<string, unknown>,
  ): Promise<void> {
    await this.redis.cacheJson(
      this.cacheKey(wallet.toLowerCase()),
      summary,
      300,
    );
  }
}
