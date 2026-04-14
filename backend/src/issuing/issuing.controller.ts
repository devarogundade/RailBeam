import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CreateVirtualCardDto } from './dto/create-virtual-card.dto';
import { IssuingService } from './issuing.service';

type AuthedWallet = {
  walletAddress: string;
};

interface AuthedRequest extends Request {
  user: AuthedWallet;
}

@Controller('issuing')
export class IssuingController {
  constructor(private readonly issuing: IssuingService) {}

  /**
   * Current virtual card for the authenticated wallet, or `card: null`.
   * Query `refresh=false` to allow a recent cached snapshot when available.
   */
  @Get('card')
  @UseGuards(AuthGuard('jwt'))
  async getCard(@Req() req: AuthedRequest, @Query('refresh') refresh?: string) {
    const useCache = refresh === '0' || refresh === 'false' || refresh === 'no';
    const card = await this.issuing.getVirtualCardSummary(
      req.user.walletAddress,
      !useCache,
    );
    return { card };
  }

  /** One virtual Issuing card per wallet (idempotent). JWT cookie or Bearer. */
  @Post('virtual-card')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async virtualCard(@Req() req: AuthedRequest, @Body() body: CreateVirtualCardDto) {
    const card = await this.issuing.ensureVirtualCard(req.user.walletAddress, body);
    return { card };
  }

  /** Stripe Issuing webhooks — raw body required (see main.ts). */
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const raw: unknown = req.body;
    if (!Buffer.isBuffer(raw)) {
      throw new BadRequestException(
        'Webhook expects raw JSON body; check issuing webhook middleware order',
      );
    }
    return this.issuing.handleStripeWebhook(raw, signature);
  }
}
