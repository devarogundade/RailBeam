import { z } from "zod";

export const storageUploadBodySchema = z.object({
  content: z.string().min(1),
});

export const storageUploadResponseSchema = z.object({
  rootHash: z.string().min(1),
  txHash: z.string().optional(),
});

export type StorageUploadBody = z.infer<typeof storageUploadBodySchema>;
export type StorageUploadResponse = z.infer<typeof storageUploadResponseSchema>;
