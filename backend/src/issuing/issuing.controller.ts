import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthedWallet } from '../auth/jwt.strategy';
import { IssuingService } from './issuing.service';

@Controller('issuing')
export class IssuingController {
  constructor(private readonly issuing: IssuingService) {}

  /** One virtual Issuing card per wallet (idempotent). Requires JWT cookie or Bearer token. */
  @Post('virtual-card')
  @UseGuards(AuthGuard('jwt'))
  async virtualCard(@Req() req: { user: AuthedWallet }) {
    return this.issuing.ensureVirtualCard(req.user.walletAddress);
  }
}
