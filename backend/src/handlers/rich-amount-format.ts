import { formatUnits } from 'ethers';

export function trimDecimalZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

/** Token amount from base units; never returns raw wei in UI copy. */
export function humanAmountFromBaseUnits(
  wei: string,
  decimals: number,
): string {
  try {
    if (!/^\d+$/.test(wei.trim())) return '—';
    return trimDecimalZeros(formatUnits(BigInt(wei.trim()), decimals));
  } catch {
    return '—';
  }
}

export function humanNativeGasAmount(valueWei: string): string {
  const human = humanAmountFromBaseUnits(valueWei, 18);
  return human === '—' ? human : `${human} 0G`;
}

export function humanMinAmountOut(
  amountOutMinimumWei: string,
  decimals: number,
  symbol?: string,
): string {
  const raw = amountOutMinimumWei.trim();
  if (!raw || raw === '0') return 'No minimum';
  const human = humanAmountFromBaseUnits(raw, decimals);
  const sym = symbol?.trim();
  return sym && human !== '—' ? `${human} ${sym}` : human;
}

export function formatUnixDeadlineLabel(unixSec: number): string {
  if (!Number.isFinite(unixSec) || unixSec <= 0) return '—';
  return `${new Date(unixSec * 1000).toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}
