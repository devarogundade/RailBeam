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
import { CreateIssuingEphemeralKeyDto } from './dto/create-issuing-ephemeral-key.dto';
import { SetCardFrozenDto } from './dto/set-card-frozen.dto';
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

  private getRequestIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    const raw =
      typeof xff === 'string'
        ? xff
        : Array.isArray(xff)
          ? xff[0]
          : '';
    const first = (raw ?? '').split(',')[0]?.trim();
    return first || (req.ip ?? '').trim() || '127.0.0.1';
  }

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

  /**
   * Reveal PAN/CVC for the authenticated wallet's virtual card.
   * Returns `card: null` if the wallet has no card.
   */
  @Get('card/reveal')
  @UseGuards(AuthGuard('jwt'))
  async revealCard(@Req() req: AuthedRequest) {
    const card = await this.issuing.revealVirtualCard(req.user.walletAddress);
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
    const ip = this.getRequestIp(req);
    const userAgent = String(req.headers['user-agent'] ?? '').trim();
    const card = await this.issuing.ensureVirtualCard(req.user.walletAddress, {
      ...body,
      termsAcceptance: { ip, userAgent },
    });
    return { card };
  }

  /** Freeze/unfreeze the authenticated wallet's issuing card. */
  @Post('card/freeze')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async setFrozen(@Req() req: AuthedRequest, @Body() body: SetCardFrozenDto) {
    const card = await this.issuing.setVirtualCardFrozen(
      req.user.walletAddress,
      body.frozen,
    );
    return { card };
  }

  /**
   * Create an ephemeral key for Stripe Issuing Elements (PIN display).
   * The client must first create a nonce via Stripe.js and exchange it here.
   */
  @Post('ephemeral-keys')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createEphemeralKey(
    @Req() req: AuthedRequest,
    @Body() body: CreateIssuingEphemeralKeyDto,
  ) {
    return await this.issuing.createIssuingEphemeralKey(req.user.walletAddress, {
      cardId: body.cardId,
      nonce: body.nonce,
    });
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
