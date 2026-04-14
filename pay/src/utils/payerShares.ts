import type { Hex } from "viem";

export type PayerShareRow = {
  key: string;
  address: Hex;
  shortAddr: string;
  isYou: boolean;
  label: string;
  wei: bigint;
  pct: number;
  status?: "paid" | "pending";
};

/** Labels: You (matched viewer) vs Other 1…n for everyone else. */
export function buildPayerShareRows(
  payers: Hex[],
  amountsWei: bigint[],
  viewerAddress?: string | null,
  paidPayers?: ReadonlySet<string> | null
): PayerShareRow[] {
  if (!payers.length) return [];
  const me = viewerAddress?.toLowerCase() ?? null;
  const totalWei = amountsWei.reduce((a, b) => a + b, 0n);
  const rows = payers.map((p, i) => {
    const wei = amountsWei[i] ?? 0n;
    const pct =
      totalWei > 0n ? Number((wei * 10000n) / totalWei) / 100 : 0;
    const isYou = !!(me && p.toLowerCase() === me);
    const status: PayerShareRow["status"] =
      paidPayers ? (paidPayers.has(p.toLowerCase()) ? "paid" : "pending") : undefined;
    return {
      key: `${p}-${i}`,
      address: p,
      shortAddr: `${p.slice(0, 6)}…${p.slice(-4)}`,
      isYou,
      label: "", // assigned after sorting
      wei,
      pct,
      status,
    };
  });

  // Always rank viewer first when present; keep stable order otherwise.
  rows.sort((a, b) => Number(b.isYou) - Number(a.isYou));

  let otherN = 0;
  for (const r of rows) {
    if (r.isYou) {
      r.label = "You";
    } else {
      otherN += 1;
      r.label = `Other ${otherN}`;
    }
  }

  return rows;
}
