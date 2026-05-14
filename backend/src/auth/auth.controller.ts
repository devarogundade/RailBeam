import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  authChallengeBodySchema,
  authChallengeResponseSchema,
  authMeResponseSchema,
  authVerifyBodySchema,
  authVerifyResponseSchema,
} from '@beam/stardorm-api-contract';
import { parseBody } from '../common/parse-body';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthedWallet } from './jwt.strategy';
import { CurrentWallet } from './current-wallet.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Returns a short-lived message to sign with the wallet (`personal_sign` / `signMessage`). */
  @Post('challenge')
  async challenge(@Body() raw: unknown) {
    const body = parseBody(authChallengeBodySchema, raw);
    return authChallengeResponseSchema.parse(
      await this.auth.createChallenge(body.walletAddress),
    );
  }

  @Post('verify')
  async verify(@Body() raw: unknown) {
    const body = parseBody(authVerifyBodySchema, raw);
    return authVerifyResponseSchema.parse(
      await this.auth.verifyAndLogin(
        body.walletAddress,
        body.message,
        body.signature,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentWallet() wallet: AuthedWallet) {
    return authMeResponseSchema.parse({
      walletAddress: wallet.walletAddress,
    });
  }
}
