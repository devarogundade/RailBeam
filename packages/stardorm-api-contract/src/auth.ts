import { z } from "zod";

export const authChallengeBodySchema = z.object({
  walletAddress: z.string().min(1),
});

export const authChallengeResponseSchema = z.object({
  message: z.string().min(1),
});

export const authVerifyBodySchema = z.object({
  walletAddress: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1),
});

export const authVerifyResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export const authMeResponseSchema = z.object({
  walletAddress: z.string().min(1),
});

export type AuthChallengeBody = z.infer<typeof authChallengeBodySchema>;
export type AuthChallengeResponse = z.infer<typeof authChallengeResponseSchema>;
export type AuthVerifyBody = z.infer<typeof authVerifyBodySchema>;
export type AuthVerifyResponse = z.infer<typeof authVerifyResponseSchema>;
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
