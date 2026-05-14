/**
 * Pulls normal + ERC-20 transfers from a Blockscout-style Chainscan HTTP API
 * (`module=account&action=txlist|tokentx`).
 */

const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const FETCH_TIMEOUT_MS = 25_000;

export type ChainscanNativeTx = {
  timestamp: string;
  from: string;
  to: string;
  value: string;
  hash: string;
  isError?: string;
  txreceipt_status?: string;
};

export type ChainscanTokenTx = {
  timestamp: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  tokenSymbol: string;
  tokenDecimal: string;
  tokenName?: string;
  hash: string;
};

type ApiRow = Record<string, string>;

function asTxArray(result: unknown): ApiRow[] {
  if (Array.isArray(result)) return result as ApiRow[];
  if (typeof result === 'string') return [];
  return [];
}

function buildApiUrl(
  apiBase: string,
  action: 'txlist' | 'tokentx',
  address: string,
  page: number,
): string {
  const base = apiBase.replace(/\/+$/, '');
  const u = new URL(`${base}`);
  u.searchParams.set('module', 'account');
  u.searchParams.set('action', action);
  u.searchParams.set('address', address);
  u.searchParams.set('page', String(page));
  u.searchParams.set('offset', String(PAGE_SIZE));
  u.searchParams.set('sort', 'desc');
  return u.toString();
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Chainscan HTTP ${res.status}`);
  }
  return res.json() as Promise<unknown>;
}

function parseApiEnvelope(body: unknown): {
  status: string;
  result: unknown;
  message?: string;
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Chainscan: invalid JSON body');
  }
  const o = body as Record<string, unknown>;
  const status = String(o.status ?? '');
  const message = typeof o.message === 'string' ? o.message : undefined;
  return { status, result: o.result, message };
}

async function fetchAllPages(
  apiBase: string,
  action: 'txlist' | 'tokentx',
  address: string,
  rangeStartSec: number,
  rangeEndSec: number,
): Promise<ApiRow[]> {
  const collected: ApiRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = buildApiUrl(apiBase, action, address, page);
    const body = await fetchJson(url);
    const { status, result, message } = parseApiEnvelope(body);
    const rows = asTxArray(result);
    if (status !== '1') {
      if (page === 1 && rows.length === 0) {
        break;
      }
      if (page === 1) {
        throw new Error(
          typeof message === 'string' && message.length > 0
            ? message
            : 'Chainscan returned status != 1',
        );
      }
      break;
    }
    if (rows.length === 0) {
      break;
    }
    let oldest = Number.POSITIVE_INFINITY;
    for (const r of rows) {
      const ts = parseInt(String(r.timestamp ?? ''), 10);
      if (!Number.isFinite(ts)) continue;
      oldest = Math.min(oldest, ts);
      if (ts >= rangeStartSec && ts <= rangeEndSec) {
        collected.push(r);
      }
    }
    if (rows.length < PAGE_SIZE) break;
    if (oldest < rangeStartSec) break;
  }
  return collected;
}

export type TokenFlowRow = {
  contractAddress: string;
  symbol: string;
  decimals: number;
  received: bigint;
  sent: bigint;
};

export type ChainscanLedgerAggregate = {
  rangeStartSec: number;
  rangeEndSec: number;
  nativeReceivedWei: bigint;
  nativeSentWei: bigint;
  nativeTxInCount: number;
  nativeTxOutCount: number;
  tokenFlows: TokenFlowRow[];
  tokenTxInCount: number;
  tokenTxOutCount: number;
};

function aggregate(
  wallet: string,
  nativeRows: ApiRow[],
  tokenRows: ApiRow[],
  rangeStartSec: number,
  rangeEndSec: number,
): ChainscanLedgerAggregate {
  const w = wallet.toLowerCase();
  let nativeReceivedWei = 0n;
  let nativeSentWei = 0n;
  let nativeTxInCount = 0;
  let nativeTxOutCount = 0;

  for (const r of nativeRows) {
    if (r.isError === '1' || r.txreceipt_status === '0') continue;
    const ts = parseInt(String(r.timestamp), 10);
    if (!Number.isFinite(ts) || ts < rangeStartSec || ts > rangeEndSec) continue;
    const from = String(r.from || '').toLowerCase();
    const to = String(r.to || '').toLowerCase();
    let v = 0n;
    try {
      v = BigInt(String(r.value || '0'));
    } catch {
      continue;
    }
    if (to === w && from !== w) {
      nativeReceivedWei += v;
      nativeTxInCount += 1;
    } else if (from === w && to !== w) {
      nativeSentWei += v;
      nativeTxOutCount += 1;
    }
  }

  const tokenMap = new Map<
    string,
    { symbol: string; decimals: number; received: bigint; sent: bigint }
  >();
  let tokenTxInCount = 0;
  let tokenTxOutCount = 0;

  for (const r of tokenRows) {
    const ts = parseInt(String(r.timestamp), 10);
    if (!Number.isFinite(ts) || ts < rangeStartSec || ts > rangeEndSec) continue;
    const from = String(r.from || '').toLowerCase();
    const to = String(r.to || '').toLowerCase();
    const contract = String(r.contractAddress || '').toLowerCase();
    if (!contract) continue;
    let v = 0n;
    try {
      v = BigInt(String(r.value || '0'));
    } catch {
      continue;
    }
    const dec = Math.min(36, Math.max(0, parseInt(String(r.tokenDecimal || '18'), 10) || 18));
    const symbol = String(r.tokenSymbol || '?').slice(0, 32);
    let b = tokenMap.get(contract);
    if (!b) {
      b = { symbol, decimals: dec, received: 0n, sent: 0n };
      tokenMap.set(contract, b);
    }
    if (to === w && from !== w) {
      b.received += v;
      tokenTxInCount += 1;
    } else if (from === w && to !== w) {
      b.sent += v;
      tokenTxOutCount += 1;
    }
  }

  const tokenFlows: TokenFlowRow[] = [...tokenMap.entries()].map(
    ([contractAddress, v]) => ({
      contractAddress,
      symbol: v.symbol,
      decimals: v.decimals,
      received: v.received,
      sent: v.sent,
    }),
  );
  tokenFlows.sort((a, b) => {
    const ta = a.received + a.sent;
    const tb = b.received + b.sent;
    if (tb > ta) return 1;
    if (tb < ta) return -1;
    return 0;
  });

  return {
    rangeStartSec,
    rangeEndSec,
    nativeReceivedWei,
    nativeSentWei,
    nativeTxInCount,
    nativeTxOutCount,
    tokenFlows,
    tokenTxInCount,
    tokenTxOutCount,
  };
}

export async function fetchChainscanLedger(
  apiBaseUrl: string,
  walletAddress: string,
  rangeStartSec: number,
  rangeEndSec: number,
): Promise<ChainscanLedgerAggregate> {
  const addr = walletAddress.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(addr)) {
    throw new Error('Invalid wallet address for Chainscan');
  }
  const [nativeRows, tokenRows] = await Promise.all([
    fetchAllPages(apiBaseUrl, 'txlist', addr, rangeStartSec, rangeEndSec),
    fetchAllPages(apiBaseUrl, 'tokentx', addr, rangeStartSec, rangeEndSec),
  ]);
  return aggregate(addr, nativeRows, tokenRows, rangeStartSec, rangeEndSec);
}

export function formatTokenHuman(amount: bigint, decimals: number): string {
  if (decimals <= 0) return amount.toString();
  const a = amount < 0n ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = a / base;
  const frac = a % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fracStr}`;
}
