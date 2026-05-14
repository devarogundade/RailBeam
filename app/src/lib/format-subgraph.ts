import { formatDistanceToNowStrict } from "date-fns";
import { formatUnits } from "viem";

function stripTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  let out = s.replace(/(\.\d*?)0+$/, "$1");
  if (out.endsWith(".")) out = out.slice(0, -1);
  return out;
}

function toBigIntSafe(amount: bigint | string | number): bigint | null {
  try {
    if (typeof amount === "bigint") return amount;
    return BigInt(String(amount).trim() || "0");
  } catch {
    return null;
  }
}

/**
 * Human-readable amount from smallest units (subgraph `BigInt` / string wei) with K / M / B suffixes.
 * Avoids `Number(wei)` precision loss for large values.
 */
export function formatCompactFromBaseUnits(
  amount: bigint | string | number,
  decimals: number,
): string {
  const bi = toBigIntSafe(amount);
  if (bi === null) return "—";
  const d = Math.min(Math.max(0, Math.floor(decimals)), 80);
  const den = 10n ** BigInt(d);
  const negative = bi < 0n;
  const abs = negative ? -bi : bi;
  const intHuman = abs / den;

  if (intHuman < 1000n) {
    const s = formatUnits(bi, d);
    return stripTrailingZeros(s);
  }

  const tiers: Array<{ min: bigint; div: bigint; suffix: string }> = [
    { min: 1_000_000_000n, div: 1_000_000_000n, suffix: "B" },
    { min: 1_000_000n, div: 1_000_000n, suffix: "M" },
    { min: 1_000n, div: 1_000n, suffix: "K" },
  ];
  const prefix = negative ? "-" : "";
  for (const { min, div, suffix } of tiers) {
    if (intHuman >= min) {
      const v100 = (intHuman * 100n) / div;
      const whole = v100 / 100n;
      const frac = v100 % 100n;
      const fracStr = frac
        .toString()
        .padStart(2, "0")
        .replace(/0+$/, "");
      if (!fracStr) return `${prefix}${whole}${suffix}`;
      return `${prefix}${whole}.${fracStr}${suffix}`;
    }
  }
  return stripTrailingZeros(formatUnits(bi, d));
}

function toUnixSecondsBigInt(
  sec: bigint | number | string | null | undefined,
): bigint | null {
  if (sec == null) return null;
  try {
    if (typeof sec === "bigint") return sec;
    const s = String(sec).trim();
    if (!s) return null;
    return BigInt(s);
  } catch {
    return null;
  }
}

/** Subgraph stores chain times as Unix seconds (`BigInt` in schema, string in JSON). */
export function formatSubgraphDateTime(
  sec: bigint | number | string | null | undefined,
  locale?: string,
): string {
  const bi = toUnixSecondsBigInt(sec);
  if (bi === null) return "—";
  const ms = Number(bi) * 1000;
  if (!Number.isFinite(ms)) return "—";
  return new Intl.DateTimeFormat(locale ?? undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

export function formatSubgraphRelativeTime(
  sec: bigint | number | string | null | undefined,
): string {
  const bi = toUnixSecondsBigInt(sec);
  if (bi === null) return "—";
  const ms = Number(bi) * 1000;
  if (!Number.isFinite(ms)) return "—";
  return formatDistanceToNowStrict(new Date(ms), { addSuffix: true });
}

export function shortenHex(addr: string, left = 6, right = 4): string {
  const a = addr.trim();
  if (a.length <= left + right + 2) return a;
  return `${a.slice(0, left)}…${a.slice(-right)}`;
}
