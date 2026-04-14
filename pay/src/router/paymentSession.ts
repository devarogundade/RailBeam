import type { LocationQuery } from "vue-router";

function locationQueryFromUrl(url: URL): LocationQuery {
  const q: LocationQuery = {};
  url.searchParams.forEach((value, key) => {
    q[key] = value;
  });
  return q;
}

function locationQueryFromHash(url: URL): LocationQuery {
  // Support hash-based links like:
  // - https://pay.example/#/?txn=...&initiator=...
  // - https://pay.example/#/p/home?txn=...&initiator=...
  const hash = (url.hash || "").replace(/^#/, "");
  const idx = hash.indexOf("?");
  if (idx < 0) return {};
  const qs = hash.slice(idx + 1);
  const params = new URLSearchParams(qs);
  const q: LocationQuery = {};
  params.forEach((value, key) => {
    q[key] = value;
  });
  return q;
}

function mergedLocationQuery(url: URL): LocationQuery {
  // Prefer normal querystring; fill gaps from hash querystring.
  const q = locationQueryFromUrl(url);
  const h = locationQueryFromHash(url);
  for (const [k, v] of Object.entries(h)) {
    if (q[k] == null) q[k] = v as any;
  }
  return q;
}

/** Detect Beam checkout from a scanned link (absolute or same-origin relative). */
export function paymentUrlSignalsFromHref(href: string): boolean {
  try {
    const u = new URL(href.trim(), window.location.origin);
    return paymentUrlSignalsFromQuery(mergedLocationQuery(u));
  } catch {
    return false;
  }
}

/** Same rules as checkout bootstrap: initiator plus intent, session, or tx. */
export function paymentUrlSignalsFromQuery(query: LocationQuery): boolean {
  const first = (v: unknown) =>
    Array.isArray(v) ? String(v[0] ?? "") : v != null ? String(v) : "";

  const initiator = first(query.initiator);
  const intentEncoded = first(query.intent);
  const session = first(query.session);
  const transactionId = first(query.tx);
  const checkoutTxnId = first((query as any).txn);

  return !!(initiator && (intentEncoded || session || transactionId || checkoutTxnId));
}
