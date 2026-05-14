import { BadRequestException, Injectable } from '@nestjs/common';
import {
  draftErc20TransferInputSchema,
  draftNativeTransferInputSchema,
  draftNftTransferInputSchema,
} from '@beam/stardorm-api-contract';
import type {
  HandlerContext,
  HandlerMessage,
  HandlerService,
} from './handler.types';
import {
  txRichFromErc20Draft,
  txRichFromNativeDraft,
  txRichFromNftDraft,
} from './transfer-draft-rich';

@Injectable()
export class DraftNativeTransferHandlerService implements HandlerService {
  readonly id = 'draft_native_transfer' as const;

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = draftNativeTransferInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const d = parsed.data;
    const rich = txRichFromNativeDraft(d);
    return {
      message:
        'Native transfer draft confirmed. This server does not broadcast transactions — open Beam Send (or your wallet), select the same network, and send the wei amount to the recipient you confirmed.',
      rich,
      data: {
        kind: 'native_transfer_draft',
        walletAddress: ctx.walletAddress,
        network: d.network,
        to: d.to,
        valueWei: d.valueWei,
        ...(d.note != null ? { note: d.note } : {}),
      },
    };
  }
}

@Injectable()
export class DraftErc20TransferHandlerService implements HandlerService {
  readonly id = 'draft_erc20_transfer' as const;

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = draftErc20TransferInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const d = parsed.data;
    const rich = txRichFromErc20Draft(d);
    return {
      message:
        'Token transfer draft confirmed. Sign an ERC-20 transfer in Beam Send or your wallet on the stated network — the Beam backend never holds your signing keys.',
      rich,
      data: {
        kind: 'erc20_transfer_draft',
        walletAddress: ctx.walletAddress,
        network: d.network,
        token: d.token,
        tokenDecimals: d.tokenDecimals,
        ...(d.tokenSymbol != null ? { tokenSymbol: d.tokenSymbol } : {}),
        to: d.to,
        amountWei: d.amountWei,
        ...(d.note != null ? { note: d.note } : {}),
      },
    };
  }
}

@Injectable()
export class DraftNftTransferHandlerService implements HandlerService {
  readonly id = 'draft_nft_transfer' as const;

  async handle(raw: unknown, ctx: HandlerContext): Promise<HandlerMessage> {
    const parsed = draftNftTransferInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const d = parsed.data;
    const rich = txRichFromNftDraft(d);
    return {
      message:
        'NFT transfer draft confirmed. Complete the transfer with your wallet (ERC-721 safeTransferFrom or ERC-1155 safeTransferFrom as appropriate). The server only recorded this summary.',
      rich,
      data: {
        kind: 'nft_transfer_draft',
        walletAddress: ctx.walletAddress,
        network: d.network,
        contract: d.contract,
        standard: d.standard,
        to: d.to,
        tokenId: d.tokenId,
        ...(d.amount != null ? { amount: d.amount } : {}),
        ...(d.note != null ? { note: d.note } : {}),
      },
    };
  }
}
