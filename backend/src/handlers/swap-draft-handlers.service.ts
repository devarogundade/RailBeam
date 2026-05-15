import { BadRequestException, Injectable } from '@nestjs/common';
import {
  draftTokenSwapInputSchema,
  isSwapFormCtaParams,
  swapFormCtaParamsSchema,
} from '@beam/stardorm-api-contract';
import type {
  HandlerContext,
  HandlerMessage,
  HandlerService,
} from './handler.types';
import {
  assertSwapNetworkAllowed,
  BEAM_MAINNET_SWAP_ROUTER,
  beamMainnetSwapNetworks,
  defaultBeamSwapFormPayload,
} from '../beam/beam-swap.config';
import { txRichFromTokenSwapDraft } from './swap-draft-rich';

function swapDeadlineUnix(): number {
  return Math.floor(Date.now() / 1000) + 20 * 60;
}

@Injectable()
export class DraftTokenSwapHandlerService implements HandlerService {
  readonly id = 'draft_token_swap' as const;

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    if (isSwapFormCtaParams(raw)) {
      const form = swapFormCtaParamsSchema.parse(raw);
      return {
        message:
          'Pick tokens and amounts in the swap form, then confirm. Beam will ask your wallet to approve the router if needed, then sign the Uniswap V3 `exactInputSingle` swap on 0G mainnet.',
        rich: {
          type: 'swap_checkout_form',
          title: 'Token swap',
          intro: form.intro,
          supportedAssets: form.supportedAssets,
          networks: form.networks ?? beamMainnetSwapNetworks(),
          defaultPoolFee: form.defaultPoolFee,
        },
        data: {
          kind: 'token_swap_form',
          walletAddress: ctx.walletAddress,
        },
      };
    }

    const parsed = draftTokenSwapInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const d = parsed.data;

    try {
      assertSwapNetworkAllowed({
        network: d.network,
        clientEvmChainId: ctx.clientEvmChainId,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(msg);
    }

    const normalized = {
      ...d,
      router: (d.router ?? BEAM_MAINNET_SWAP_ROUTER).toLowerCase() as `0x${string}`,
      deadlineUnix: d.deadlineUnix ?? swapDeadlineUnix(),
    };

    const rich = txRichFromTokenSwapDraft(normalized);
    return {
      message:
        'Swap draft confirmed. Connect your wallet on 0G mainnet, tap **Approve & swap** — if allowance is low, you will sign `approve` on the token-in contract first, then `exactInputSingle` on the Beam router.',
      rich,
      data: {
        kind: 'token_swap_draft',
        walletAddress: ctx.walletAddress,
        ...normalized,
      },
    };
  }
}
