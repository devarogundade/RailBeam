import { getStardormApiBase } from "@/lib/stardorm-axios";

export type X402PaymentLinks = {
  /** Hosted Beam checkout for people (wallet UI). */
  humanCheckoutUrl: string;
  /** x402 paywall URL for agents — GET `/payments/:id/access` (402 + requirements until settled). */
  agentApiUrl: string | null;
};

/** Build app + API URLs for an x402 payment request. */
export function buildX402PaymentLinks(params: {
  paymentRequestId: string;
  payPath?: string;
  appOrigin?: string;
  apiBase?: string | null;
}): X402PaymentLinks {
  const { paymentRequestId, payPath } = params;
  const origin =
    params.appOrigin?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const path =
    payPath?.trim() && payPath.startsWith("/pay/")
      ? payPath
      : `/pay/${encodeURIComponent(paymentRequestId)}`;
  const humanCheckoutUrl = origin ? `${origin}${path}` : path;

  const base = (params.apiBase ?? getStardormApiBase())?.replace(/\/$/, "");
  const agentApiUrl = base
    ? `${base}/payments/${encodeURIComponent(paymentRequestId)}/access`
    : null;

  return { humanCheckoutUrl, agentApiUrl };
}
