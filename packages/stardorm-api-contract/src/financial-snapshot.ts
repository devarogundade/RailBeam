import { z } from "zod";

/** One UTC daily rollup row (Mongo `FinancialSnapshot` → chat / dashboard). */
export const financialSnapshotDailyRowSchema = z.object({
  bucketStart: z.string(),
  bucket: z.string(),
  revenueUsd: z.number().optional(),
  walletBalance0g: z.number().optional(),
  monthlySpend0g: z.number().optional(),
  spendByCategory: z.record(z.number()).default({}),
});

export type FinancialSnapshotDailyRow = z.infer<typeof financialSnapshotDailyRowSchema>;

/** Query for GET `/users/me/financial-snapshots`. */
export const meFinancialSnapshotsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

export type MeFinancialSnapshotsQuery = z.infer<typeof meFinancialSnapshotsQuerySchema>;

export const financialSnapshotsListResponseSchema = z.object({
  items: z.array(financialSnapshotDailyRowSchema),
});

export type FinancialSnapshotsListResponse = z.infer<
  typeof financialSnapshotsListResponseSchema
>;
