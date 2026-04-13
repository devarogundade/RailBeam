import type { LocationQuery } from "vue-router";

function locationQueryFromUrl(url: URL): LocationQuery {
  const q: LocationQuery = {};
  url.searchParams.forEach((value, key) => {
    q[key] = value;
  });
  return q;
}

/** Detect Beam checkout from a scanned link (absolute or same-origin relative). */
export function paymentUrlSignalsFromHref(href: string): boolean {
  try {
    const u = new URL(href.trim(), window.location.origin);
    return paymentUrlSignalsFromQuery(locationQueryFromUrl(u));
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

  return !!(initiator && (intentEncoded || session || transactionId));
}
