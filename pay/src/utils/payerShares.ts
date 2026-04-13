import type { Hex } from "viem";

export type PayerShareRow = {
  key: string;
  address: Hex;
  shortAddr: string;
  isYou: boolean;
  label: string;
  wei: bigint;
  pct: number;
};

/** Labels: You (matched viewer) vs Other 1…n for everyone else. */
export function buildPayerShareRows(
  payers: Hex[],
  amountsWei: bigint[],
  viewerAddress?: string | null
): PayerShareRow[] {
  if (!payers.length) return [];
  const me = viewerAddress?.toLowerCase() ?? null;
  const totalWei = amountsWei.reduce((a, b) => a + b, 0n);
  let otherN = 0;
  return payers.map((p, i) => {
    const wei = amountsWei[i] ?? 0n;
    const pct =
      totalWei > 0n ? Number((wei * 10000n) / totalWei) / 100 : 0;
    const isYou = !!(me && p.toLowerCase() === me);
    if (!isYou) otherN += 1;
    return {
      key: `${p}-${i}`,
      address: p,
      shortAddr: `${p.slice(0, 6)}…${p.slice(-4)}`,
      isYou,
      label: isYou ? "You" : `Other ${otherN}`,
      wei,
      pct,
    };
  });
}
