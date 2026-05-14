import * as React from "react";
import { useConnection, useSwitchChain } from "wagmi";
import {
  BEAM_CHAIN_IDS,
  type BeamNetworkId,
  beamNetworkFromChainId,
} from "@/lib/beam-chain-config";
import {
  readStoredBeamNetwork,
  writeStoredBeamNetwork,
} from "@/lib/beam-network-storage";
import { stardormClientChainIdRef } from "@/lib/stardorm-client-chain";

type BeamNetworkContextValue = {
  preferredNetwork: BeamNetworkId;
  preferredChainId: number;
  setPreferredNetwork: (n: BeamNetworkId) => void;
  /** Chain id used for subgraph / catalog when disconnected; when connected, use the wallet chain. */
  effectiveChainId: number;
};

const Ctx = React.createContext<BeamNetworkContextValue | null>(null);

export function BeamNetworkProvider({ children }: { children: React.ReactNode }) {
  const { chainId: connectedChainId, status } = useConnection();
  const { switchChainAsync } = useSwitchChain();

  const [preferredNetwork, setPreferredNetworkState] = React.useState<BeamNetworkId>(() =>
    readStoredBeamNetwork(),
  );

  const preferredChainId =
    preferredNetwork === "mainnet" ? BEAM_CHAIN_IDS.mainnet : BEAM_CHAIN_IDS.testnet;

  const setPreferredNetwork = React.useCallback(
    (n: BeamNetworkId) => {
      writeStoredBeamNetwork(n);
      setPreferredNetworkState(n);
      const target = n === "mainnet" ? BEAM_CHAIN_IDS.mainnet : BEAM_CHAIN_IDS.testnet;
      if (status === "connected" && switchChainAsync) {
        void switchChainAsync({ chainId: target }).catch(() => {
          // wallet may reject; preference is still stored for disconnected browsing
        });
      }
    },
    [status, switchChainAsync],
  );

  /** When a wallet is connected, subgraph and registry reads follow the wallet chain; otherwise the header toggle picks the browsing chain. */
  const effectiveChainId =
    status === "connected" && connectedChainId != null ? connectedChainId : preferredChainId;

  React.useEffect(() => {
    if (status !== "connected" || connectedChainId == null) return;
    const tier = beamNetworkFromChainId(connectedChainId);
    if (!tier) return;
    if (tier !== preferredNetwork) {
      setPreferredNetworkState(tier);
      writeStoredBeamNetwork(tier);
    }
  }, [status, connectedChainId, preferredNetwork]);

  React.useEffect(() => {
    if (status !== "connected" || connectedChainId == null || !switchChainAsync) return;
    if (beamNetworkFromChainId(connectedChainId)) return;
    void switchChainAsync({ chainId: preferredChainId }).catch(() => {
      // user dismissed or wallet cannot add the chain
    });
  }, [status, connectedChainId, preferredChainId, switchChainAsync]);

  const value = React.useMemo(
    () => ({
      preferredNetwork,
      preferredChainId,
      setPreferredNetwork,
      effectiveChainId,
    }),
    [preferredNetwork, preferredChainId, setPreferredNetwork, effectiveChainId],
  );

  React.useLayoutEffect(() => {
    stardormClientChainIdRef.current = effectiveChainId;
    return () => {
      stardormClientChainIdRef.current = undefined;
    };
  }, [effectiveChainId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBeamNetwork(): BeamNetworkContextValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useBeamNetwork must be used inside BeamNetworkProvider");
  return v;
}
