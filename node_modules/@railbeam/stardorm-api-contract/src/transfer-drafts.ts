import { z } from "zod";

const caip2Eip155 = z
  .string()
  .min(8)
  .max(64)
  .regex(
    /^eip155:\d+$/,
    "network must be CAIP-2 form eip155:<chainId> (e.g. eip155:16602)",
  );

const evmAddress20 = z
  .string()
  .trim()
  .refine(
    (s) => /^0x[a-fA-F0-9]{40}$/.test(s),
    "must be a 0x-prefixed 20-byte EVM address",
  )
  .transform((s) => s.trim().toLowerCase());

/** Positive integer string in base units (no decimals, no leading zeros except single "0" disallowed for valueWei — use /^[1-9]\\d*$/ for strictly positive). */
const positiveWeiString = z
  .string()
  .trim()
  .regex(
    /^[1-9]\d*$/,
    "must be a positive integer decimal string (base units / wei)",
  );

const decimalStringNonNeg = z
  .string()
  .trim()
  .regex(/^\d+$/, "must be a non-negative integer decimal string");

const nftStandardSchema = z.enum(["erc721", "erc1155"]);

export const draftNativeTransferInputSchema = z.object({
  network: caip2Eip155,
  to: evmAddress20,
  valueWei: positiveWeiString,
  note: z.string().max(500).optional(),
});

export type DraftNativeTransferInput = z.infer<
  typeof draftNativeTransferInputSchema
>;

export const draftErc20TransferInputSchema = z.object({
  network: caip2Eip155,
  token: evmAddress20,
  tokenSymbol: z.string().min(1).max(32).optional(),
  tokenDecimals: z.number().int().min(0).max(36),
  to: evmAddress20,
  amountWei: positiveWeiString,
  note: z.string().max(500).optional(),
});

export type DraftErc20TransferInput = z.infer<
  typeof draftErc20TransferInputSchema
>;

export const draftNftTransferInputSchema = z
  .object({
    network: caip2Eip155,
    contract: evmAddress20,
    standard: nftStandardSchema.default("erc721"),
    to: evmAddress20,
    tokenId: decimalStringNonNeg,
    /** Required for ERC-1155; omit for ERC-721. */
    amount: positiveWeiString.optional(),
    note: z.string().max(500).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.standard === "erc1155") {
      if (!val.amount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "amount (base units) is required for ERC-1155",
          path: ["amount"],
        });
      }
    } else if (val.amount != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amount must be omitted for ERC-721",
        path: ["amount"],
      });
    }
  });

export type DraftNftTransferInput = z.infer<typeof draftNftTransferInputSchema>;
