import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { handlersListResponseSchema } from '@beam/stardorm-api-contract';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedWallet } from '../auth/jwt.strategy';
import { CurrentWallet } from '../auth/current-wallet.decorator';
import { HANDLER_ACTION_IDS } from './handler.types';
import { HandlersService } from './handlers.service';

@Controller('handlers')
export class HandlersController {
  constructor(private readonly handlers: HandlersService) {}

  /** Public list of runnable handler ids (for clients / agents). */
  @Get()
  list() {
    return handlersListResponseSchema.parse({
      handlers: [...HANDLER_ACTION_IDS],
    });
  }

  @Post(':handleId')
  @UseGuards(JwtAuthGuard)
  async invoke(
    @Param('handleId') handleId: string,
    @Body() body: unknown,
    @CurrentWallet() wallet: AuthedWallet,
  ) {
    return this.handlers.dispatch(handleId, body, {
      walletAddress: wallet.walletAddress,
    });
  }
}
