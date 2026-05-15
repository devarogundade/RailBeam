import axios from "axios";
import { x402Client, wrapAxiosWithPayment } from "@x402/axios";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import type { PublicClient, WalletClient } from "viem";
import type { CreditCardPublic } from "@railbeam/stardorm-api-contract";
import { creditCardPublicSchema } from "@railbeam/stardorm-api-contract";
import { BEAM_CHAIN_IDS, BEAM_RPC } from "@/lib/beam-chain-config";
import { createStardormAxios, getStardormApiBase } from "@/lib/stardorm-axios";

export type X402CheckoutSettleResult = {
  txHash: string;
  paidByWallet?: string;
  resourceUrl?: string;
};

function rpcUrlForChain(chainId: number): string | undefined {
  if (chainId === BEAM_CHAIN_IDS.mainnet) return BEAM_RPC.mainnet;
  if (chainId === BEAM_CHAIN_IDS.testnet) return BEAM_RPC.testnet;
  return undefined;
}

/** Axios instance that signs x402 payments with the connected wagmi wallet (not a server key). */
export function createX402PaymentAxios(params: {
  apiBase: string;
  walletClient: WalletClient;
  publicClient?: PublicClient | null;
  chainId: number;
  /** JWT-authenticated Stardorm client; use a dedicated instance (never the global singleton). */
  stardormAuth?: boolean;
}) {
  const { walletClient, publicClient, chainId, apiBase, stardormAuth } = params;
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account is not connected.");
  }

  const signer = toClientEvmSigner(
    {
      address: account.address,
      signTypedData: (message) =>
        walletClient.signTypedData({
          account,
          domain: message.domain as never,
          types: message.types as never,
          primaryType: message.primaryType,
          message: message.message as never,
        }),
    },
    publicClient ?? undefined,
  );

  const rpcUrl = rpcUrlForChain(chainId);
  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer,
    ...(rpcUrl ? { schemeOptions: { [chainId]: { rpcUrl } } } : {}),
  });

  const base = stardormAuth
    ? createStardormAxios()
    : axios.create({
        baseURL: apiBase.replace(/\/$/, ""),
      });

  return wrapAxiosWithPayment(base, client);
}

function isBeamUsdcEAddress(asset: string): boolean {
  const a = asset.trim().toLowerCase();
  return (
    a === "0x1f3aa82227281ca364bfb3d253b0f1af1da6473e" ||
    a === "usdc.e" ||
    a === "usdc"
  );
}

/**
 * Completes an x402 hosted checkout: GET /payments/:id/access → 402 → wallet sign → settle.
 */
export async function settleX402CheckoutViaAccess(params: {
  paymentId: string;
  walletClient: WalletClient;
  publicClient?: PublicClient | null;
  chainId: number;
  apiBase: string;
}): Promise<X402CheckoutSettleResult> {
  const api = createX402PaymentAxios(params);
  const res = await api.get(
    `/payments/${encodeURIComponent(params.paymentId)}/access`,
  );

  if (res.status !== 200) {
    let detail = `Checkout payment failed (${res.status})`;
    const data = res.data;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message: unknown }).message;
      if (typeof m === "string") detail = m;
      else if (Array.isArray(m)) detail = m.join(", ");
    }
    throw new Error(detail);
  }

  const data = res.data as {
    txHash?: string;
    paidByWallet?: string;
    resourceUrl?: string;
  };
  if (!data.txHash?.trim()) {
    throw new Error("Payment completed but no transaction hash was returned.");
  }

  return {
    txHash: data.txHash.trim(),
    paidByWallet: data.paidByWallet?.trim() || undefined,
    resourceUrl: data.resourceUrl?.trim() || undefined,
  };
}

/**
 * Funds a virtual card: GET …/fund/access → 402 → wallet signs USDC.e → balance credited.
 */
export async function settleCreditCardFundViaAccess(params: {
  cardId: string;
  amountCents: number;
  walletClient: WalletClient;
  publicClient?: PublicClient | null;
  chainId: number;
  apiBase?: string;
}): Promise<CreditCardPublic> {
  const apiBase = params.apiBase?.trim() || getStardormApiBase();
  if (!apiBase) {
    throw new Error("API not configured (set VITE_STARDORM_API_URL).");
  }
  const api = createX402PaymentAxios({
    apiBase,
    walletClient: params.walletClient,
    publicClient: params.publicClient,
    chainId: params.chainId,
    stardormAuth: true,
  });
  const res = await api.get(
    `/users/me/credit-cards/${encodeURIComponent(params.cardId)}/fund/access`,
    { params: { amountCents: params.amountCents } },
  );

  if (res.status !== 200) {
    let detail = `Card funding failed (${res.status})`;
    const data = res.data;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message: unknown }).message;
      if (typeof m === "string") detail = m;
      else if (Array.isArray(m)) detail = m.join(", ");
    }
    throw new Error(detail);
  }

  return creditCardPublicSchema.parse(res.data);
}

export { isBeamUsdcEAddress };
