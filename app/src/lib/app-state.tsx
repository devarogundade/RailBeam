import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppKit } from "@reown/appkit/react";
import { useConnection, useDisconnect, useBalance, useSignMessage } from "wagmi";
import { formatUnits } from "viem";
import { toast } from "sonner";
import type { Agent } from "./types";
import { isWalletConfigured } from "./web3/appkit";
import axios from "axios";
import {
  authChallengeResponseSchema,
  authVerifyResponseSchema,
} from "@railbeam/stardorm-api-contract";
import { getStardormApiBase, stardormAxios } from "./stardorm-axios";
import { fetchStardormMe, patchStardormUser } from "./stardorm-user-api";
import {
  clearStardormAccessToken,
  clearStardormSignInInflight,
  getStardormAccessToken,
  runStardormWalletSignInOnce,
  setStardormAccessToken,
  stardormConnectedWalletRef,
} from "./stardorm-auth";
import { useStardormCatalog } from "@/lib/hooks/use-stardorm-catalog";
import { useMyActiveSubscribedChainAgentIds } from "@/lib/hooks/use-stardorm-subgraph";
import { useBeamNetwork } from "@/lib/beam-network-context";
import { isBeamConfiguredChainId } from "@/lib/beam-chain-config";
import { getStardormSubgraphUrlForChain } from "@/lib/stardorm-subgraph-config";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfterIdentityRegistryWrite } from "@/lib/query-invalidation";

interface WalletState {
  address: string | null;
  balance: number;
  /** Opens the Reown AppKit modal when configured; returns whether the modal was opened. */
  connect: () => boolean;
  disconnect: () => void;
  /** JWT from `POST /auth/verify` (Bearer for Stardorm API). */
  stardormAccessToken: string | null;
  isStardormAuthed: boolean;
}

interface AgentsState {
  hiredIds: string[];
  /** Optimistic add — UI shows the agent immediately while the subgraph indexes the new subscription. */
  hire: (id: string) => void;
  fire: (id: string) => void;
  isHired: (id: string) => boolean;
  hired: Agent[];
  /** Cloned registry tokens merged into the catalog for the connected wallet. */
  ownedClones: Agent[];
  /** Hired agents plus owned clones (for chat / agent picker). */
  workspaceAgents: Agent[];
}

interface AppState extends WalletState, AgentsState {
  activeAgentId: string;
  setActiveAgentId: (id: string) => void;
  /** Open chat thread; survives in-app navigation until reload or sign-out. */
  openConversationId: string | null;
  setOpenConversationId: React.Dispatch<React.SetStateAction<string | null>>;
}

const Ctx = React.createContext<AppState | null>(null);

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { open } = useAppKit();
  const { address: rawAddress, chainId, status } = useConnection();
  const { effectiveChainId } = useBeamNetwork();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const signMessageAsyncRef = React.useRef(signMessageAsync);
  signMessageAsyncRef.current = signMessageAsync;
  const catalog = useStardormCatalog();

  const address = status === "connected" && rawAddress ? rawAddress : null;
  const userKey = address ? (address.toLowerCase() as `0x${string}`) : null;

  stardormConnectedWalletRef.current = address;

  /** Session JWT for React consumers — synced from storage on wallet change, not read every render. */
  const [stardormAccessToken, setStardormAccessTokenState] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!address) {
      setStardormAccessTokenState(null);
      return;
    }
    setStardormAccessTokenState(getStardormAccessToken());
  }, [address]);

  const { data: bal } = useBalance({
    address: rawAddress,
    chainId,
    query: { enabled: Boolean(rawAddress) },
  });

  const balance = React.useMemo(() => {
    if (!bal) return 0;
    return Number.parseFloat(formatUnits(bal.value, bal.decimals));
  }, [bal]);

  const subgraphHires = useMyActiveSubscribedChainAgentIds(userKey);

  /** Optimistic ids so the UI flips to "hired" immediately after a successful `subscribe` tx, before the subgraph catches up. */
  const [optimisticHiredIds, setOptimisticHiredIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!address) setOptimisticHiredIds([]);
  }, [address]);

  const [activeAgentId, setActiveAgentIdState] = React.useState<string>("beam-default");
  const appliedServerAgentOnce = React.useRef(false);
  const activeAgentIdRef = React.useRef(activeAgentId);
  activeAgentIdRef.current = activeAgentId;

  const [openConversationId, setOpenConversationIdState] = React.useState<string | null>(null);
  const appliedServerConversationOnce = React.useRef(false);

  const meQuery = useQuery({
    queryKey: queryKeys.user.me(userKey),
    queryFn: fetchStardormMe,
    enabled: Boolean(getStardormApiBase() && stardormAccessToken && userKey),
  });

  const patchUserMutation = useMutation({
    mutationFn: patchStardormUser,
    onSuccess: (user) => {
      if (userKey) {
        queryClient.setQueryData(queryKeys.user.me(userKey), user);
      }
    },
  });

  React.useEffect(() => {
    if (!stardormAccessToken || !userKey) {
      appliedServerAgentOnce.current = false;
      appliedServerConversationOnce.current = false;
      setOpenConversationIdState(null);
    }
  }, [stardormAccessToken, userKey]);

  React.useEffect(() => {
    if (!meQuery.isSuccess || !meQuery.data || appliedServerAgentOnce.current) return;
    setActiveAgentIdState(meQuery.data.activeAgentId);
    appliedServerAgentOnce.current = true;
  }, [meQuery.isSuccess, meQuery.data]);

  React.useEffect(() => {
    if (meQuery.isError) appliedServerAgentOnce.current = true;
  }, [meQuery.isError]);

  React.useEffect(() => {
    if (!meQuery.isSuccess || !meQuery.data || appliedServerConversationOnce.current) return;
    appliedServerConversationOnce.current = true;
    setOpenConversationIdState(
      (prev) => prev ?? meQuery.data.activeConversationId ?? null,
    );
  }, [meQuery.isSuccess, meQuery.data]);

  React.useEffect(() => {
    if (meQuery.isError) appliedServerConversationOnce.current = true;
  }, [meQuery.isError]);

  const setActiveAgentId = React.useCallback(
    (id: string) => {
      setActiveAgentIdState(id);
      if (!getStardormApiBase() || !stardormAccessToken || !userKey) return;
      patchUserMutation.mutate(
        { activeAgentId: id },
        {
          onError: (e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error("Could not save active agent", { description: msg });
            void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(userKey) });
          },
        },
      );
    },
    [patchUserMutation, queryClient, stardormAccessToken, userKey],
  );

  const agents = React.useMemo(
    () => catalog.data?.agents ?? [],
    [catalog.data?.agents],
  );
  const subgraphCatalogHiredIds = React.useMemo(() => {
    const chainIds = subgraphHires.data ?? [];
    const ids: string[] = [];
    for (const cid of chainIds) {
      const agent = agents.find((a) => a.chainAgentId === cid);
      if (agent) ids.push(agent.id);
    }
    return ids;
  }, [subgraphHires.data, agents]);

  /** Catalog `defaultHiredIds` (e.g. `beam-default`) — always in portfolio without an on-chain subscription row. */
  const catalogDefaultHiredIds = React.useMemo(() => {
    const raw = catalog.data?.defaultHiredIds ?? [];
    return raw.filter((id) => {
      const a = agents.find((ag) => ag.id === id);
      return Boolean(a && a.isCloned !== true);
    });
  }, [catalog.data?.defaultHiredIds, agents]);

  const hiredIds = React.useMemo(() => {
    const fromChain =
      address &&
      getStardormSubgraphUrlForChain(effectiveChainId) &&
      isBeamConfiguredChainId(effectiveChainId)
        ? subgraphCatalogHiredIds
        : [];
    const opt = address ? optimisticHiredIds : [];
    const merged = [...new Set([...catalogDefaultHiredIds, ...fromChain, ...opt])];
    return merged.filter((id) => {
      const a = agents.find((ag) => ag.id === id);
      if (a?.isCloned === true) return false;
      return true;
    });
  }, [
    address,
    catalogDefaultHiredIds,
    subgraphCatalogHiredIds,
    optimisticHiredIds,
    effectiveChainId,
    agents,
  ]);

  const refreshChainPortfolioCaches = React.useCallback(() => {
    invalidateAfterIdentityRegistryWrite(queryClient, effectiveChainId);
  }, [queryClient, effectiveChainId]);

  const stardormSignIn = React.useCallback(async (): Promise<boolean> => {
    if (!address) {
      toast.error("Connect a wallet first");
      return false;
    }
    if (!getStardormApiBase()) {
      toast.error("Stardorm is not configured", {
        description: "The Beam API is not set up for this app yet.",
      });
      return false;
    }
    try {
      const { data: chBody } = await stardormAxios.post<unknown>("/auth/challenge", {
        walletAddress: address,
      });
      const chParsed = authChallengeResponseSchema.safeParse(chBody);
      if (!chParsed.success) {
        toast.error("Auth challenge failed", { description: "Invalid response from server." });
        return false;
      }
      const message = chParsed.data.message;
      const signature = await signMessageAsyncRef.current({ message });
      const { data: vJson } = await stardormAxios.post<unknown>("/auth/verify", {
        walletAddress: address,
        message,
        signature,
      });
      const vParsed = authVerifyResponseSchema.safeParse(vJson);
      const token = vParsed.success ? vParsed.data.accessToken : "";
      if (!token) {
        toast.error("Auth verify failed", { description: "No access token returned." });
        return false;
      }
      setStardormAccessToken(token, address);
      setStardormAccessTokenState(token);
      const w = address.toLowerCase() as `0x${string}`;
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(w) });
      return true;
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const body = e.response?.data;
        const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const msg =
          (typeof obj?.message === "string" && obj.message) ||
          (typeof obj?.error === "string" && obj.error) ||
          e.message ||
          `HTTP ${e.response?.status ?? "error"}`;
        const phase = e.config?.url?.includes("verify")
          ? "Auth verify failed"
          : "Auth challenge failed";
        toast.error(phase, { description: msg });
        return false;
      }
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Sign-in failed", { description: msg });
      return false;
    }
  }, [address, queryClient]);

  const stardormSignInRef = React.useRef(stardormSignIn);
  stardormSignInRef.current = stardormSignIn;

  React.useEffect(() => {
    if (!address || status !== "connected") return;
    if (!getStardormApiBase()) return;
    const stored = getStardormAccessToken();
    if (stored) {
      setStardormAccessTokenState((prev) => prev ?? stored);
      return;
    }
    void runStardormWalletSignInOnce(address, () => stardormSignInRef.current()).then((ok) => {
      if (!ok) return;
      const token = getStardormAccessToken();
      if (token) setStardormAccessTokenState(token);
    });
  }, [address, status]);

  const connect = (): boolean => {
    if (!isWalletConfigured) {
      toast.error("Wallet connection is not configured", {
        description:
          "Wallet sign-in is not set up for this app yet. Ask your administrator to finish setup.",
      });
      return false;
    }
    void open();
    return true;
  };

  const disconnect = () => {
    clearStardormSignInInflight(address);
    clearStardormAccessToken(address);
    setStardormAccessTokenState(null);
    queryClient.removeQueries({ queryKey: queryKeys.user.all });
    setActiveAgentIdState("beam-default");
    appliedServerAgentOnce.current = false;
    setOpenConversationIdState(null);
    appliedServerConversationOnce.current = false;
    wagmiDisconnect();
  };

  const hire = React.useCallback(
    (id: string) => {
      setOptimisticHiredIds((p) => (p.includes(id) ? p : [...p, id]));
      refreshChainPortfolioCaches();
    },
    [refreshChainPortfolioCaches],
  );

  const fire = React.useCallback(
    (id: string) => {
      setOptimisticHiredIds((p) => p.filter((x) => x !== id));
      const cur = activeAgentIdRef.current;
      const next = cur === id ? "beam-default" : cur;
      setActiveAgentIdState(next);
      if (
        next !== cur &&
        getStardormApiBase() &&
        stardormAccessToken &&
        userKey
      ) {
        patchUserMutation.mutate(
          { activeAgentId: next },
          {
            onError: (e: unknown) => {
              const msg = e instanceof Error ? e.message : String(e);
              toast.error("Could not save active agent", { description: msg });
              void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(userKey) });
            },
          },
        );
      }
      refreshChainPortfolioCaches();
    },
    [refreshChainPortfolioCaches, patchUserMutation, queryClient, stardormAccessToken, userKey],
  );

  const isHired = (id: string) => hiredIds.includes(id);
  const hired = React.useMemo(() => {
    const list = agents.filter((a) => hiredIds.includes(a.id));
    const hasBeamDefault = list.some((a) => a.id === "beam-default");
    if (!hasBeamDefault) return list;
    /** Subgraph catalog lists registry token #1 as `chain-1` while the seed uses `beam-default` for the same slot — show one row in "My agents". */
    return list.filter((a) => !(a.chainAgentId === 1 && a.id !== "beam-default"));
  }, [agents, hiredIds]);

  const ownedClones = React.useMemo(
    () => agents.filter((a) => a.isCloned === true),
    [agents],
  );

  const workspaceAgents = React.useMemo(() => {
    const ids = new Set(hired.map((h) => h.id));
    return [...hired, ...ownedClones.filter((c) => !ids.has(c.id))];
  }, [hired, ownedClones]);

  const value: AppState = {
    address,
    balance,
    connect,
    disconnect,
    stardormAccessToken,
    isStardormAuthed: Boolean(stardormAccessToken),
    hiredIds,
    hire,
    fire,
    isHired,
    hired,
    ownedClones,
    workspaceAgents,
    activeAgentId,
    setActiveAgentId,
    openConversationId,
    setOpenConversationId: setOpenConversationIdState,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
}

export const formatAddress = short;
