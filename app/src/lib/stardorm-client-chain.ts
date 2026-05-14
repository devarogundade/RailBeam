/**
 * Live 0G EVM chain id for Stardorm API calls (matches the in-app network toggle /
 * connected wallet). `BeamNetworkProvider` updates this; `stardormAxios` sends
 * `X-Beam-Chain-Id`.
 */
export const stardormClientChainIdRef = {
  current: undefined as number | undefined,
};
