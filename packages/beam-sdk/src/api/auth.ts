import {
  authChallengeBodySchema,
  authChallengeResponseSchema,
  authMeResponseSchema,
  authVerifyBodySchema,
  authVerifyResponseSchema,
  type AuthChallengeResponse,
  type AuthMeResponse,
  type AuthVerifyBody,
  type AuthVerifyResponse,
} from "@beam/stardorm-api-contract";
import type { BeamHttpClient } from "../http.js";
import type { BeamSignableWallet } from "../wallet.js";

export type BeamAuthApi = {
  (wallet: BeamSignableWallet): Promise<AuthVerifyResponse>;
  challenge: (walletAddress: string) => Promise<AuthChallengeResponse>;
  verify: (body: AuthVerifyBody) => Promise<AuthVerifyResponse>;
  me: () => Promise<AuthMeResponse>;
};

export function createBeamAuthApi(
  http: BeamHttpClient,
  setAccessToken: (token: string | undefined) => void,
): BeamAuthApi {
  const challenge = async (walletAddress: string) =>
    http.requestJson("POST", "/auth/challenge", {
      body: authChallengeBodySchema.parse({ walletAddress }),
      parse: authChallengeResponseSchema,
    });

  const verify = async (body: AuthVerifyBody) => {
    const v = await http.requestJson("POST", "/auth/verify", {
      body: authVerifyBodySchema.parse(body),
      parse: authVerifyResponseSchema,
    });
    setAccessToken(v.accessToken);
    return v;
  };

  const me = async () =>
    http.requestJson("GET", "/auth/me", { parse: authMeResponseSchema });

  const signIn = async (wallet: BeamSignableWallet) => {
    const ch = await challenge(wallet.address);
    const signature = await wallet.signMessage({ message: ch.message });
    const v = await verify({
      walletAddress: wallet.address,
      message: ch.message,
      signature,
    });
    setAccessToken(v.accessToken);
    return v;
  };

  return Object.assign(signIn, { challenge, verify, me });
}
