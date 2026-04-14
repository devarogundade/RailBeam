import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { verifyMessage } from 'ethers';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';

const CHALLENGE_PREFIX = 'Beam authentication\n';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly users: UsersService,
  ) {}

  private nonceKey(wallet: string): string {
    return `auth:nonce:${wallet.toLowerCase()}`;
  }

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
    const nonce = randomBytes(16).toString('hex');
    await this.redis.setStringEx(this.nonceKey(wallet), nonce, 600);
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
    const stored = await this.redis.getString(this.nonceKey(wallet));
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
    await this.redis.del(this.nonceKey(wallet));
    await this.users.upsertWallet(wallet);
    const accessToken = await this.jwt.signAsync({ walletAddress: wallet });
    return { accessToken };
  }
}
