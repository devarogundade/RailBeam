import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { verifyMessage } from 'ethers';
import { AuthChallengeStore, randomNonce } from './auth-challenge.store';
import { User } from '../mongo/schemas/user.schema';

const CHALLENGE_PREFIX = 'Stardorm authentication\n';
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly challenges = new AuthChallengeStore();

  constructor(
    private readonly jwt: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  private assertEvmAddress(wallet: string): string {
    const w = wallet.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(w)) {
      throw new BadRequestException('Invalid wallet address');
    }
    return w;
  }

  buildChallengeMessage(wallet: string, nonce: string): string {
    return `${CHALLENGE_PREFIX}Wallet: ${wallet}\nNonce: ${nonce}`;
  }

  async createChallenge(walletAddress: string): Promise<{ message: string }> {
    const wallet = this.assertEvmAddress(walletAddress);
    const nonce = randomNonce();
    this.challenges.set(wallet, nonce, CHALLENGE_TTL_MS);
    return { message: this.buildChallengeMessage(wallet, nonce) };
  }

  async verifyAndLogin(
    walletAddress: string,
    message: string,
    signature: string,
  ): Promise<{ accessToken: string }> {
    const wallet = this.assertEvmAddress(walletAddress);
    const msg = message?.trim();
    const sig = signature?.trim();
    if (!msg || !sig) {
      throw new BadRequestException('message and signature required');
    }
    const stored = this.challenges.peek(wallet);
    if (!stored) {
      throw new UnauthorizedException('Challenge expired or missing');
    }
    const expected = this.buildChallengeMessage(wallet, stored);
    if (msg !== expected) {
      throw new UnauthorizedException('Message does not match challenge');
    }
    let recovered: string;
    try {
      recovered = verifyMessage(msg, sig).toLowerCase();
    } catch {
      throw new UnauthorizedException('Invalid signature');
    }
    if (recovered !== wallet) {
      throw new UnauthorizedException('Signature does not match wallet');
    }
    this.challenges.consume(wallet);

    await this.userModel.updateOne(
      { walletAddress: wallet },
      {
        $set: { lastLoginAt: new Date() },
        $setOnInsert: {
          walletAddress: wallet,
          activeAgentId: 'beam-default',
          preferences: {},
        },
      },
      { upsert: true },
    );

    const accessToken = await this.jwt.signAsync({ walletAddress: wallet });
    return { accessToken };
  }
}
