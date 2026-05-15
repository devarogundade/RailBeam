import type { StardormChatRichBlock } from '@beam/stardorm-api-contract';
import type { DraftTokenSwapInput } from '@beam/stardorm-api-contract';
import { BEAM_MAINNET_SWAP_ROUTER } from '../beam/beam-swap.config';
import {
  formatUnixDeadlineLabel,
  humanAmountFromBaseUnits,
  humanMinAmountOut,
} from './rich-amount-format';

function shortenEvm(addr: string): string {
  const t = addr.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(t)) {
    return t.length <= 14 ? t : `${t.slice(0, 6)}…${t.slice(-4)}`;
  }
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function shortenCaip2(s: string, max = 40): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function poolFeeLabel(fee: number): string {
  if (fee === 500) return '0.05%';
  if (fee === 10000) return '1%';
  return '0.3%';
}

export function txRichFromTokenSwapDraft(
  d: DraftTokenSwapInput,
): StardormChatRichBlock {
  const symIn = d.tokenInSymbol?.trim() || 'Token in';
  const symOut = d.tokenOutSymbol?.trim() || 'Token out';
  const amountIn = humanAmountFromBaseUnits(d.amountInWei, d.tokenInDecimals);
  return {
    type: 'tx',
    title: `Swap · ${symIn} → ${symOut}`,
    rows: [
      { label: 'Network', value: shortenCaip2(d.network) },
      { label: 'Router', value: shortenEvm(d.router ?? BEAM_MAINNET_SWAP_ROUTER) },
      { label: 'Sell', value: symIn },
      { label: `Amount in`, value: amountIn === '—' ? amountIn : `${amountIn} ${symIn}` },
      { label: 'Buy', value: symOut },
      {
        label: 'Minimum received',
        value: humanMinAmountOut(
          d.amountOutMinimumWei,
          d.tokenOutDecimals,
          symOut,
        ),
      },
      { label: 'Pool fee', value: poolFeeLabel(d.poolFee) },
      ...(d.deadlineUnix != null
        ? [{ label: 'Deadline', value: formatUnixDeadlineLabel(d.deadlineUnix) }]
        : []),
      ...(d.note?.trim() ? [{ label: 'Note', value: d.note.trim() }] : []),
    ],
  };
}
