import { formatUnits } from 'ethers';
import type { StardormChatRichBlock } from '@beam/stardorm-api-contract';
import type { DraftTokenSwapInput } from '@beam/stardorm-api-contract';
import { BEAM_MAINNET_SWAP_ROUTER } from '../beam/beam-swap.config';

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

function trimDecimalZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

function humanAmount(wei: string, decimals: number): string {
  try {
    return trimDecimalZeros(formatUnits(BigInt(wei), decimals));
  } catch {
    return wei;
  }
}

export function txRichFromTokenSwapDraft(
  d: DraftTokenSwapInput,
): StardormChatRichBlock {
  const symIn = d.tokenInSymbol?.trim() || 'Token in';
  const symOut = d.tokenOutSymbol?.trim() || 'Token out';
  const feeBps = d.poolFee / 100;
  return {
    type: 'tx',
    title: `Swap · ${symIn} → ${symOut}`,
    rows: [
      { label: 'Network', value: shortenCaip2(d.network) },
      { label: 'Router', value: shortenEvm(d.router ?? BEAM_MAINNET_SWAP_ROUTER) },
      { label: 'Token in', value: shortenEvm(d.tokenIn) },
      {
        label: 'Amount in',
        value: `${humanAmount(d.amountInWei, d.tokenInDecimals)} (${d.amountInWei} wei)`,
      },
      { label: 'Token out', value: shortenEvm(d.tokenOut) },
      {
        label: 'Min out',
        value: `${humanAmount(d.amountOutMinimumWei, d.tokenOutDecimals)} (${d.amountOutMinimumWei} wei)`,
      },
      { label: 'Pool fee', value: `${d.poolFee} (${feeBps} bps)` },
      ...(d.deadlineUnix != null
        ? [{ label: 'Deadline (unix)', value: String(d.deadlineUnix) }]
        : []),
      ...(d.note?.trim() ? [{ label: 'Note', value: d.note.trim() }] : []),
    ],
  };
}
