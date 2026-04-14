import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Returns a short-lived message to sign with the wallet (personal_sign). */
  @Post('challenge')
  async challenge(@Body() body: { walletAddress?: string }) {
    const walletAddress = body?.walletAddress;
    if (!walletAddress) {
      throw new BadRequestException('walletAddress required');
    }
    return this.auth.createChallenge(walletAddress);
  }

  /**
   * Verifies the signed challenge and returns a JWT (Bearer + optional HttpOnly cookie).
   */
  @Post('verify')
  async verify(
    @Body()
    body: {
      walletAddress?: string;
      message?: string;
      signature?: string;
      setCookie?: boolean;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { walletAddress, message, signature, setCookie } = body ?? {};
    if (!walletAddress || !message || !signature) {
      throw new BadRequestException(
        'walletAddress, message, and signature required',
      );
    }
    const { accessToken } = await this.auth.verifyAndLogin(
      walletAddress,
      message,
      signature,
    );
    if (setCookie) {
      res.cookie('jwt', accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
    return { accessToken };
  }
}
