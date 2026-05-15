import { BadRequestException, Injectable } from '@nestjs/common';
import { suggestMarketplaceHireInputSchema } from '@beam/stardorm-api-contract';
import type { HandlerContext, HandlerMessage, HandlerService } from './handler.types';
import { marketplaceHireRichFromInput } from '../beam/beam-marketplace-specialists';

@Injectable()
export class MarketplaceHireHandlerService implements HandlerService {
  readonly id = 'suggest_marketplace_hire' as const;

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = suggestMarketplaceHireInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const rich = marketplaceHireRichFromInput(parsed.data);
    const name = rich.specialistName;
    return {
      message:
        `This chat agent cannot run that action. Hire **${name}** on the Beam marketplace, set ${name} as your active chat agent, then ask again.`,
      rich,
      data: {
        kind: 'marketplace_hire',
        walletAddress: ctx.walletAddress,
        specialistAgentKey: rich.specialistAgentKey,
        marketplacePath: rich.marketplacePath,
        ...(rich.agentProfilePath ? { agentProfilePath: rich.agentProfilePath } : {}),
      },
    };
  }
}
