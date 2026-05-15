import { z } from "zod";
import { x402SupportedAssetSchema } from "./chat-api.js";

export const swapFormNetworkOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
});

/** Persisted on the chat CTA row until the user submits the swap form. */
export const swapFormCtaParamsSchema = z.object({
  _swapForm: z.literal(true),
  supportedAssets: z.array(x402SupportedAssetSchema).min(1).max(24),
  networks: z.array(swapFormNetworkOptionSchema).max(16).optional(),
  intro: z.string().max(2000).optional(),
  /** Default Uniswap V3 pool fee tier (500, 3000, or 10000). */
  defaultPoolFee: z.union([z.literal(500), z.literal(3000), z.literal(10000)]).optional(),
});

export type SwapFormCtaParams = z.infer<typeof swapFormCtaParamsSchema>;

export function isSwapFormCtaParams(v: unknown): v is SwapFormCtaParams {
  return swapFormCtaParamsSchema.safeParse(v).success;
}

const caip2Eip155 = z
  .string()
  .min(8)
  .max(64)
  .regex(/^eip155:\d+$/, "network must be CAIP-2 form eip155:<chainId>");

const evmAddress20 = z
  .string()
  .trim()
  .refine((s) => /^0x[a-fA-F0-9]{40}$/.test(s), "must be a 0x-prefixed 20-byte EVM address")
  .transform((s) => s.trim().toLowerCase());

const positiveWeiString = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, "must be a positive integer decimal string (base units)");

const nonNegativeWeiString = z
  .string()
  .trim()
  .regex(/^\d+$/, "must be a non-negative integer decimal string (base units)");

const poolFeeSchema = z.union([
  z.literal(500),
  z.literal(3000),
  z.literal(10000),
]);

/** Confirmed swap draft — user signs approve (if needed) + router `exactInputSingle` in wallet. */
export const draftTokenSwapInputSchema = z.object({
  network: caip2Eip155,
  tokenIn: evmAddress20,
  tokenInSymbol: z.string().min(1).max(32).optional(),
  tokenInDecimals: z.number().int().min(0).max(36),
  tokenOut: evmAddress20,
  tokenOutSymbol: z.string().min(1).max(32).optional(),
  tokenOutDecimals: z.number().int().min(0).max(36),
  amountInWei: positiveWeiString,
  /** Slippage floor in `tokenOut` base units; `0` accepts any output. */
  amountOutMinimumWei: nonNegativeWeiString.default("0"),
  poolFee: poolFeeSchema.default(3000),
  /** Filled server-side from deployment when omitted. */
  router: evmAddress20.optional(),
  /** Unix seconds; wallet may refresh if expired. */
  deadlineUnix: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});

export type DraftTokenSwapInput = z.infer<typeof draftTokenSwapInputSchema>;
