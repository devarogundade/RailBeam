import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import type { ChatMessage as Msg, ChatAttachment, Agent } from "@/lib/types";
import type {
  ConversationSummary,
  ChatHistoryResponse,
  ConversationsPageResponse,
  StardormChatRichBlock,
} from "@railbeam/stardorm-api-contract";
import {
  ISO_3166_1_ALPHA2_CODES,
  isoCountryDisplayName,
} from "@railbeam/stardorm-api-contract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  TransferDraftHandlerCtaRow,
  isTransferDraftHandler,
} from "@/components/transfer-draft-handler-cta";
import { SwapCheckoutFormCard } from "@/components/swap-checkout-form-card";
import { TransferCheckoutFormCard } from "@/components/transfer-checkout-form-card";
import { MarketplaceHireRichCard } from "@/components/marketplace-hire-rich-card";
import { SwapHandlerCtaRow, isTokenSwapHandler } from "@/components/swap-handler-cta";
import { ChatMessageContent } from "@/components/chat-message-content";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CoinIcon } from "@/components/icons";
import {
  ArrowLeftRight,
  ChevronDown,
  Paperclip,
  Send,
  FileText,
  Sparkles,
  CreditCard,
  X,
  Check,
  CheckCheck,
  Copy,
  ExternalLink,
  Info,
  Plus,
  Trash2,
  MessageSquare,
  Inbox,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import {
  fetchStardormChatMessages,
  isStardormInferenceEnabled,
  mapHistoryToChatMessages,
  stardormChat,
  stardormExecuteHandler,
  stardormPatchChatMessageResult,
} from "@/lib/stardorm-api";
import { patchChatMessageInCache } from "@/lib/patch-chat-message-result";
import type { ChatHandlerResult } from "@railbeam/stardorm-api-contract";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { toast } from "sonner";
import { useStardormCatalog } from "@/lib/hooks/use-stardorm-catalog";
import { useUserAvatarPreset } from "@/lib/hooks/use-user-avatar-preset";
import { USER_AVATAR_URLS } from "@/lib/user-avatar-assets";
import { queryKeys } from "@/lib/query-keys";
import { invalidateBeamHttpDashboardLists } from "@/lib/query-invalidation";
import { resolveCatalogAgentForChatBubble } from "@/lib/resolve-catalog-agent";
import { CLONED_AGENT_AVATAR_RING_CLASS } from "@/lib/cloned-agent-avatar";
import {
  isRegistryTokenIdOneAgent,
  REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
} from "@/lib/registry-token-one-agent";
import {
  patchStardormUser,
  fetchStardormConversationsPage,
  createStardormConversation,
  fetchStardormMe,
  deleteStardormConversation,
} from "@/lib/stardorm-user-api";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StorageImage } from "@stardorm/agentflow-finance/src/components/storage-image";
import { StorageFile } from "@stardorm/agentflow-finance/src/components/storage-file";
import {
  X402CheckoutFormCard,
} from "@/components/x402-checkout-form-card";
import { X402PaymentLinkActions } from "@/components/x402-payment-link-actions";
import { OnRampCheckoutFormCard } from "@/components/on-ramp-checkout-form-card";
import { CreditCardCheckoutFormCard } from "@/components/credit-card-checkout-form-card";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/empty-state";
import { ChatHistorySkeleton, ConversationListSkeleton } from "@/components/page-shimmer";

const indexRouteApi = getRouteApi("/");

function buildStripeIdentityReturnPath(openConversationId: string | null): string {
  if (openConversationId) {
    return `/?${new URLSearchParams({ convId: openConversationId }).toString()}`;
  }
  return "/";
}

/** UI-only attachment row that also keeps the raw `File` for upload. */
type DraftAttachment = ChatAttachment & { file: File; };

function timeAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function hasOgInferenceMeta(m: Msg): boolean {
  return (
    m.model != null ||
    m.verified != null ||
    m.chatId != null ||
    m.provider != null
  );
}

function OgInferenceMetaButton({ m }: { m: Msg }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="0G inference details"
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            "text-muted-foreground transition-colors hover:bg-(--bg-hover) hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">0G inference details</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 p-3 text-xs" side="top">
        <p className="font-semibold text-foreground">0G inference</p>
        <dl className="space-y-1.5">
          {m.model != null && m.model !== "" && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted-foreground">Model</dt>
              <dd className="min-w-0 break-all font-mono text-foreground">{m.model}</dd>
            </div>
          )}
          {m.provider != null && m.provider !== "" && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted-foreground">Provider</dt>
              <dd className="min-w-0 break-all text-foreground">{m.provider}</dd>
            </div>
          )}
          {m.verified != null && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted-foreground">Verified</dt>
              <dd className="text-foreground">{m.verified ? "Yes" : "No"}</dd>
            </div>
          )}
          {m.chatId != null && m.chatId !== "" && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted-foreground">Chat ID</dt>
              <dd className="min-w-0 break-all font-mono text-[11px] text-foreground">{m.chatId}</dd>
            </div>
          )}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

const CONV_PAGE_SIZE = 20;
const CHAT_PAGE_SIZE = 35;
/** Distance from the bottom (px) still treated as "following" the latest messages. */
const CHAT_SCROLL_SLACK_PX = 200;

export function Chat() {
  const queryClient = useQueryClient();
  const {
    workspaceAgents,
    activeAgentId,
    setActiveAgentId,
    openConversationId,
    setOpenConversationId,
    address,
    stardormAccessToken,
  } = useApp();
  const userKey = address ? (address.toLowerCase() as `0x${string}`) : null;
  const apiOn = isStardormInferenceEnabled();
  const { data: catalog, isError: catalogError } = useStardormCatalog();
  const catalogAgents = catalog?.agents ?? [];
  const suggestions = catalog?.chatSuggestions ?? [];
  const activeAgent =
    workspaceAgents.find((a: Agent) => a.id === activeAgentId) ??
    catalogAgents.find((a: Agent) => a.id === activeAgentId) ??
    catalogAgents.find((a: Agent) => a.id === "beam-default") ??
    catalogAgents[0];

  const convChatKey = openConversationId ?? "_none";

  const convInfinite = useInfiniteQuery({
    queryKey: queryKeys.user.conversations(userKey),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchStardormConversationsPage({
        limit: CONV_PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ConversationsPageResponse) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    enabled: Boolean(getStardormApiBase() && stardormAccessToken && userKey),
  });

  const flatConversations = React.useMemo(
    () => convInfinite.data?.pages.flatMap((p: ConversationsPageResponse) => p.conversations) ?? [],
    [convInfinite.data?.pages],
  );

  const chatInfinite = useInfiniteQuery({
    queryKey: queryKeys.user.chatMessages(userKey, convChatKey),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const r = await fetchStardormChatMessages({
        limit: CHAT_PAGE_SIZE,
        conversationId: openConversationId ?? undefined,
        cursor: pageParam,
      });
      if (!r) throw new Error("Could not load messages");
      return r;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ChatHistoryResponse) =>
      last.hasMoreOlder && last.nextCursorOlder ? last.nextCursorOlder : undefined,
    enabled: Boolean(apiOn && userKey && stardormAccessToken && openConversationId),
  });

  const apiBaseMemo = getStardormApiBase();
  const serverMessages = React.useMemo(() => {
    if (!apiBaseMemo || !chatInfinite.data?.pages.length) return [];
    return chatInfinite.data.pages
      .slice()
      .reverse()
      .flatMap((page: ChatHistoryResponse) => mapHistoryToChatMessages(page, apiBaseMemo));
  }, [apiBaseMemo, chatInfinite.data?.pages]);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pendingMessages, setPendingMessages] = React.useState<Msg[]>([]);
  const displayMessages = React.useMemo(() => {
    if (pendingMessages.length === 0) return serverMessages;
    if (serverMessages.length === 0) return pendingMessages;
    const pendingOnly = pendingMessages.filter((p) => {
      if (p.role !== "user" || !p.content) return true;
      return !serverMessages.some((s) => s.role === "user" && s.content === p.content);
    });
    return [...serverMessages, ...pendingOnly];
  }, [serverMessages, pendingMessages]);
  const [input, setInput] = React.useState("");
  const [inputFocused, setInputFocused] = React.useState(false);
  const isMobile = useIsMobile();
  const composerCompact = isMobile && (inputFocused || input.trim().length > 0);
  const hideAgentPicker = isMobile && input.trim().length > 0;
  const [attachments, setAttachments] = React.useState<DraftAttachment[]>([]);
  const [typing, setTyping] = React.useState(false);
  const [executingHandlerForId, setExecutingHandlerForId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const convScrollRef = React.useRef<HTMLDivElement>(null);
  const convListEndRef = React.useRef<HTMLDivElement>(null);
  const chatTopSentinelRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  /** When true, new messages at the end pin the viewport to the latest bubble. */
  const stickToBottomRef = React.useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = React.useState(false);

  /** Full-thread skeleton only on cold load — not while sending or syncing optimistic bubbles. */
  const showHistorySkeleton = Boolean(
    openConversationId &&
      chatInfinite.isPending &&
      !chatInfinite.data &&
      pendingMessages.length === 0 &&
      !typing,
  );
  const sendInFlightRef = React.useRef(false);
  const prevOpenConversationIdRef = React.useRef(openConversationId);
  const prevLastMessageIdRef = React.useRef<string | undefined>(undefined);

  const scrollToBottom = React.useCallback(() => {
    const end = chatEndRef.current;
    if (end) {
      end.scrollIntoView({ block: "end" });
      return;
    }
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const jumpToLatest = React.useCallback(() => {
    stickToBottomRef.current = true;
    setShowJumpToBottom(false);
    scrollToBottom();
  }, [scrollToBottom]);

  const updateScrollFollowState = React.useCallback((el: HTMLDivElement) => {
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= CHAT_SCROLL_SLACK_PX;
    const canScroll = el.scrollHeight > el.clientHeight + 1;
    stickToBottomRef.current = nearBottom;
    setShowJumpToBottom((prev) => {
      const next = canScroll && !nearBottom;
      return prev === next ? prev : next;
    });
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateScrollFollowState(el);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [openConversationId, updateScrollFollowState]);

  React.useEffect(() => {
    setShowJumpToBottom(false);
  }, [openConversationId]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollFollowState(el);
  }, [displayMessages, typing, showHistorySkeleton, updateScrollFollowState]);

  /**
   * Pin to the latest bubbles when new messages land at the end, without breaking
   * infinite-scroll (prepend older history: last id unchanged) or yanking scroll
   * for typing-only updates while the user has scrolled up.
   */
  React.useLayoutEffect(() => {
    if (showHistorySkeleton) return;
    if (!scrollRef.current) return;

    if (prevOpenConversationIdRef.current !== openConversationId) {
      prevOpenConversationIdRef.current = openConversationId;
      prevLastMessageIdRef.current = undefined;
      stickToBottomRef.current = true;
      setShowJumpToBottom(false);
    }

    const hadNoLast = prevLastMessageIdRef.current === undefined;
    const lastMsg = displayMessages[displayMessages.length - 1];
    const lastId = typeof lastMsg?.id === "string" ? lastMsg.id : undefined;
    const lastIdChanged = lastId !== prevLastMessageIdRef.current;
    prevLastMessageIdRef.current = lastId;

    const needTypingScroll = typing && stickToBottomRef.current;
    const needMessageScroll =
      lastIdChanged &&
      (stickToBottomRef.current ||
        lastMsg?.role === "user" ||
        (Boolean(lastId) && hadNoLast));

    if (!needTypingScroll && !needMessageScroll) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
  }, [displayMessages, typing, showHistorySkeleton, openConversationId, scrollToBottom]);

  React.useEffect(() => {
    const root = convScrollRef.current;
    const target = convListEndRef.current;
    if (!sheetOpen || !root || !target) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          convInfinite.hasNextPage &&
          !convInfinite.isFetchingNextPage
        ) {
          void convInfinite.fetchNextPage();
        }
      },
      { root, rootMargin: "80px", threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [sheetOpen, convInfinite]);

  React.useEffect(() => {
    const root = scrollRef.current;
    const target = chatTopSentinelRef.current;
    if (!apiOn || !root || !target) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          chatInfinite.hasNextPage &&
          !chatInfinite.isFetchingNextPage
        ) {
          const el = root;
          const prevFromBottom = el.scrollHeight - el.scrollTop;
          void chatInfinite.fetchNextPage().then(() => {
            requestAnimationFrame(() => {
              el.scrollTop = el.scrollHeight - prevFromBottom;
            });
          });
        }
      },
      { root, rootMargin: "100px", threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [apiOn, chatInfinite, openConversationId]);

  const createConvMutation = useMutation({
    mutationFn: () => createStardormConversation({}),
    onSuccess: (summary) => {
      setOpenConversationId(summary.id);
      if (userKey) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.chatMessages(userKey, summary.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(userKey) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.conversations(userKey) });
      }
      setSheetOpen(false);
      toast.success("Started a new conversation");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Could not start conversation", { description: msg });
    },
  });

  const selectConvMutation = useMutation({
    mutationFn: (id: string) => patchStardormUser({ activeConversationId: id }),
    onSuccess: (_data, id) => {
      setOpenConversationId(id);
      if (userKey) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.chatMessages(userKey, id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(userKey) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.conversations(userKey) });
      }
      setSheetOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Could not switch conversation", { description: msg });
    },
  });

  const navigate = useNavigate();
  const { convId: conversationFromSearch } = indexRouteApi.useSearch();

  React.useEffect(() => {
    const id = conversationFromSearch;
    if (!id || !apiOn || !userKey || !stardormAccessToken) return;
    if (openConversationId === id) {
      void navigate({ to: "/", search: () => ({}), replace: true });
      return;
    }
    selectConvMutation.mutate(id);
  }, [
    apiOn,
    conversationFromSearch,
    navigate,
    openConversationId,
    selectConvMutation,
    stardormAccessToken,
    userKey,
  ]);

  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => deleteStardormConversation(id),
    onSuccess: async (_data, deletedId) => {
      setDeleteTargetId(null);
      if (userKey) {
        queryClient.removeQueries({
          queryKey: queryKeys.user.chatMessages(userKey, deletedId),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.conversations(userKey) });
        let nextActive: string | null = null;
        try {
          const me = await fetchStardormMe();
          nextActive = me.activeConversationId ?? null;
          queryClient.setQueryData(queryKeys.user.me(userKey), me);
        } catch {
          void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(userKey) });
        }
        setOpenConversationId((prev) => (prev === deletedId ? nextActive : prev));
      } else {
        setOpenConversationId((prev) => (prev === deletedId ? null : prev));
      }
      toast.success("Conversation deleted");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Could not delete conversation", { description: msg });
    },
  });

  const deleteTargetTitle = React.useMemo(() => {
    if (!deleteTargetId) return "";
    const row = flatConversations.find((c: ConversationSummary) => c.id === deleteTargetId);
    return row?.title?.trim() || "Conversation";
  }, [deleteTargetId, flatConversations]);

  const headerTitle = React.useMemo(() => {
    const id = openConversationId;
    if (!id) return "Messages";
    const row = flatConversations.find((c: ConversationSummary) => c.id === id);
    return row?.title?.trim() || "Messages";
  }, [openConversationId, flatConversations]);

  /** Revoke any object URLs created by `URL.createObjectURL` once the component unmounts. */
  const attachmentsRef = React.useRef<DraftAttachment[]>(attachments);
  attachmentsRef.current = attachments;
  React.useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => {
        if (a.url) URL.revokeObjectURL(a.url);
      });
    };
  }, []);

  const activeAgentId_ = activeAgent?.id;

  const runHandlerCta = React.useCallback(
    async (m: Msg, overrideParams?: Record<string, unknown>) => {
      if (!m.handlerCta || !activeAgentId_) return;
      setExecutingHandlerForId(m.id);
      try {
        const base = (overrideParams ?? m.handlerCta.params) as Record<string, unknown>;
        const params =
          m.handlerCta.handler === "complete_stripe_kyc"
            ? {
                ...base,
                returnPath: buildStripeIdentityReturnPath(openConversationId),
              }
            : base;
        const res = await stardormExecuteHandler({
          handler: m.handlerCta.handler,
          params,
          ctaMessageId: m.id,
        });
        if ("error" in res && res.error) {
          toast.error("Action unavailable", { description: res.error });
          return;
        }
        if (!("message" in res)) return;
        invalidateBeamHttpDashboardLists(queryClient);
        if (userKey && openConversationId) {
          const cacheKey = queryKeys.user.chatMessages(userKey, openConversationId);
          if (queryClient.getQueryData(cacheKey) == null) {
            await queryClient.invalidateQueries({ queryKey: cacheKey });
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("Action failed", { description: msg });
      } finally {
        setExecutingHandlerForId(null);
      }
    },
    [activeAgentId_, openConversationId, queryClient, userKey],
  );

  const persistWalletTxResult = React.useCallback(
    async (messageId: string, result: ChatHandlerResult) => {
      if (!userKey || !openConversationId) return;
      patchChatMessageInCache(queryClient, userKey, openConversationId, messageId, result);
      const res = await stardormPatchChatMessageResult(messageId, result);
      if ("error" in res && res.error) {
        toast.error("Could not save transaction status", { description: res.error });
      }
    },
    [userKey, openConversationId, queryClient],
  );

  if (!activeAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
        {catalogError ? (
          <span className="text-destructive">
            Could not load agents. Try again in a moment.
          </span>
        ) : (
          <span>Loading agents…</span>
        )}
      </div>
    );
  }

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    const draftFiles = attachments;
    if (!content && draftFiles.length === 0) return;

    if (!apiOn) {
      toast.error("Chat unavailable", {
        description:
          "Configure VITE_STARDORM_API_URL, connect your wallet, and approve the signature when prompted so messages load from the server.",
      });
      return;
    }

    if (sendInFlightRef.current) return;
    sendInFlightRef.current = true;

    const userAttachments: ChatAttachment[] = draftFiles.map((a) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
      ...(a.url ? { url: a.url } : {}),
    }));
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments: userAttachments.length ? userAttachments : undefined,
      createdAt: Date.now(),
      status: "sent",
    };
    stickToBottomRef.current = true;
    setPendingMessages((p) => [...p, userMsg]);
    setInput("");
    setAttachments([]);
    setTyping(true);

    void (async () => {
      let threadId: string | null = openConversationId;
      let chatFailed = false;
      try {
        if (!threadId) {
          try {
            const created = await createStardormConversation({});
            threadId = created.id;
            setOpenConversationId(created.id);
            if (userKey) {
              void queryClient.invalidateQueries({ queryKey: queryKeys.user.me(userKey) });
              void queryClient.invalidateQueries({ queryKey: queryKeys.user.conversations(userKey) });
            }
          } catch (e) {
            chatFailed = true;
            const msg = e instanceof Error ? e.message : String(e);
            toast.error("Could not start conversation", { description: msg });
          }
        }

        if (!chatFailed && threadId) {
          try {
            const res = await stardormChat({
              agentKey: activeAgent.id,
              message: content,
              conversationId: threadId,
              files: draftFiles.map((a) => a.file),
            });
            if (!res) {
              chatFailed = true;
              toast.error("Chat", {
                description: "API is not configured or returned no response.",
              });
            } else if ("error" in res && res.error) {
              chatFailed = true;
              toast.error("Chat", { description: res.error });
            }
          } catch (e) {
            chatFailed = true;
            const msg = e instanceof Error ? e.message : String(e);
            toast.error("Chat unavailable", { description: msg });
          }
        }
      } finally {
        sendInFlightRef.current = false;
      }

      if (!userKey) {
        setTyping(false);
        setPendingMessages((p) => p.filter((x) => x.id !== userMsg.id));
        return;
      }
      if (chatFailed || !threadId) {
        setTyping(false);
        setPendingMessages((p) => p.filter((x) => x.id !== userMsg.id));
        return;
      }
      setPendingMessages((p) => p.filter((x) => x.id !== userMsg.id));
      setTyping(false);
      const cacheKey = queryKeys.user.chatMessages(userKey, threadId);
      if (queryClient.getQueryData(cacheKey) == null) {
        void queryClient.invalidateQueries({ queryKey: cacheKey });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.conversations(userKey) });
    })();
  };

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: DraftAttachment[] = Array.from(files).map((f) => {
      const isImg = f.type.startsWith("image/");
      return {
        id: crypto.randomUUID(),
        type: isImg ? "image" : "file",
        name: f.name,
        mimeType: f.type || "application/octet-stream",
        url: isImg ? URL.createObjectURL(f) : undefined,
        size: `${(f.size / 1024).toFixed(0)} KB`,
        file: f,
      };
    });
    setAttachments((a) => [...a, ...next]);
  };

  return (
    <>
      <AlertDialog
        open={deleteTargetId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span className="block">
                {`"${deleteTargetTitle}"`} and all of its messages will be removed from your account. This cannot
                be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              loading={deleteConvMutation.isPending}
              disabled={deleteConvMutation.isPending || !deleteTargetId}
              onClick={() => {
                if (deleteTargetId) deleteConvMutation.mutate(deleteTargetId);
              }}
            >
              {deleteConvMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-surface/40 px-3 py-2.5 md:px-5">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Open conversations"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[min(100vw-2rem,22rem)] flex-col gap-0 p-0 sm:max-w-md">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Conversations</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Switch threads or start a new one. History stays on your account.
              </p>
            </div>
            <div ref={convScrollRef} className="min-h-0 flex-1 overflow-y-auto p-2">
              {convInfinite.isPending && convInfinite.data == null ? (
                <ConversationListSkeleton />
              ) : convInfinite.isError ? (
                <div className="px-2 py-4">
                  <EmptyState
                    icon={AlertCircle}
                    title="Could not load conversations"
                    description="Check your connection and try opening the menu again. If the problem persists, disconnect and reconnect your wallet."
                  />
                </div>
              ) : flatConversations.length === 0 ? (
                <div className="px-2 py-4">
                  <EmptyState
                    icon={Inbox}
                    title="No conversations yet"
                    description="Start a new thread from the button below. History syncs to your Beam account when you are signed in."
                  />
                </div>
              ) : (
                <>
                  <ul className="flex flex-col gap-1">
                    {flatConversations.map((c: ConversationSummary) => {
                      const active = c.id === openConversationId;
                      const when = new Date(c.lastMessageAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      return (
                        <li key={c.id} className="flex gap-0.5">
                          <button
                            type="button"
                            disabled={selectConvMutation.isPending}
                            onClick={() => {
                              if (active) {
                                setSheetOpen(false);
                                return;
                              }
                              selectConvMutation.mutate(c.id);
                            }}
                            className={cn(
                              "flex min-w-0 flex-1 flex-col rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                              active
                                ? "border-primary/40 bg-primary/10"
                                : "border-transparent hover:bg-(--bg-hover)",
                            )}
                          >
                            <span className="truncate font-medium">
                              {c.title?.trim() || "Conversation"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{when}</span>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-auto shrink-0 self-stretch rounded-lg text-muted-foreground hover:text-destructive"
                            aria-label={`Delete conversation ${c.title?.trim() || c.id}`}
                            disabled={!apiOn || deleteConvMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(c.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  <div ref={convListEndRef} className="h-2 shrink-0" aria-hidden />
                  {convInfinite.isFetchingNextPage ? (
                    <div className="flex justify-center py-3" aria-hidden>
                      <Skeleton className="mx-auto h-3 w-28 rounded-full" />
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <div className="border-t border-border p-3">
              <Button
                type="button"
                className="w-full gap-2 font-semibold"
                loading={createConvMutation.isPending}
                disabled={!apiOn || createConvMutation.isPending}
                onClick={() => createConvMutation.mutate()}
              >
                {!createConvMutation.isPending ? <Plus className="h-4 w-4" /> : null}
                New conversation
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{headerTitle}</div>
        </div>
      </div>

      {/* messages */}
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="bg-dots h-full overflow-y-auto px-4 py-6 md:px-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {showHistorySkeleton ? (
            <ChatHistorySkeleton />
          ) : (
            <>
              {chatInfinite.isFetchingNextPage ? (
                <div className="flex justify-center py-2" aria-hidden>
                  <Skeleton className="h-3 w-36 rounded-full" />
                </div>
              ) : null}
              <div ref={chatTopSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
              {displayMessages.length === 0 && (
                <div className="py-2">
                  {apiOn ? (
                    openConversationId ? (
                      <EmptyState
                        icon={MessageSquare}
                        title="No messages in this thread yet"
                        description={
                          <>
                            Send a message to talk to{" "}
                            <span className="font-medium text-foreground">{activeAgent.name}</span>. Replies are
                            generated on the backend and stored with your account.
                          </>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={MessageSquare}
                        title="Pick or start a conversation"
                        description={
                          <>
                            No thread is open. Send a message to start with{" "}
                            <span className="font-medium text-foreground">{activeAgent.name}</span>, or open the
                            menu to continue an existing conversation.
                          </>
                        }
                      />
                    )
                  ) : (
                    <EmptyState
                      icon={Wallet}
                      title="Connect to use chat"
                      description="Connect your wallet and approve the signature when prompted so agents can run with your account context."
                    />
                  )}
                </div>
              )}
              {displayMessages.map((m) => (
                <Bubble
                  key={m.id}
                  m={m}
                  agents={catalogAgents}
                  apiBase={getStardormApiBase()}
                  executingHandlerForId={executingHandlerForId}
                  onRunHandlerCta={(msg, override) => void runHandlerCta(msg, override)}
                  onPersistWalletTxResult={(messageId, result) =>
                    void persistWalletTxResult(messageId, result)
                  }
                />
              ))}
            </>
          )}
          {typing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <img
                src={activeAgent.avatar}
                alt=""
                className={cn(
                  "h-7 w-7 rounded-full bg-pill",
                  isRegistryTokenIdOneAgent(activeAgent) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
                  activeAgent.isCloned && CLONED_AGENT_AVATAR_RING_CLASS,
                )}
              />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2.5 text-card-foreground ring-1 ring-border/40">
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-px w-full shrink-0" aria-hidden />
        </div>
        </div>
        {!showHistorySkeleton &&
          showJumpToBottom &&
          (displayMessages.length > 0 || typing) && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                "absolute bottom-5 left-1/2 z-10 h-9 w-9 -translate-x-1/2 rounded-full shadow-md",
                "border border-border bg-card/95 backdrop-blur-sm",
                "animate-in fade-in slide-in-from-bottom-2 duration-200",
              )}
              aria-label="Jump to latest messages"
              onClick={jumpToLatest}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          )}
      </div>

      {/* composer */}
      <div className="border-t border-border bg-background px-3 py-2 md:px-10 md:py-4">
        <div className="mx-auto max-w-3xl">
          {apiOn &&
            !showHistorySkeleton &&
            displayMessages.length === 0 &&
            suggestions.length > 0 && (
              <div
                className={cn(
                  "mb-2 flex flex-wrap gap-2 md:mb-3",
                  "max-md:-mx-3 max-md:max-h-28 max-md:overflow-x-auto max-md:overflow-y-auto max-md:px-3 max-md:overscroll-x-contain max-md:overscroll-y-contain",
                  composerCompact && "max-md:hidden",
                )}
              >
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={typing}
                    onClick={() => void send(s)}
                    className="inline-flex shrink-0 gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:bg-(--bg-hover) hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

          {Array.isArray(activeAgent.skillHandles) && activeAgent.skillHandles.length > 0 && (
            <div
              className={cn(
                "mb-2 flex flex-wrap items-center gap-1.5 md:mb-3",
                composerCompact && "max-md:hidden",
              )}
            >
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Skills
              </span>
              {activeAgent.skillHandles.map((h) => (
                <button
                  key={h.handle}
                  type="button"
                  title={h.label}
                  onClick={() => {
                    const t = `@${h.handle} `;
                    setInput((prev) => (prev ? `${prev}${t}` : t));
                  }}
                  className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[10px] text-foreground/90 hover:border-(--border-medium)"
                >
                  @{h.handle}
                </button>
              ))}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                >
                  {a.type === "image" ? (
                    <StorageImage
                      url={a.url}
                      rootHash={a.rootHash}
                      alt=""
                      className="h-6 w-6 rounded object-cover"
                    />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="max-w-[140px] truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((p) =>
                        p.filter((x) => {
                          if (x.id !== a.id) return true;
                          if (x.url) URL.revokeObjectURL(x.url);
                          return false;
                        }),
                      )
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-row items-center gap-1 rounded-2xl border border-border bg-surface p-1.5 focus-within:border-(--border-medium) md:items-end md:gap-2 md:p-2">
            {!hideAgentPicker && (
              <AgentDropdown
                agents={workspaceAgents}
                activeId={activeAgentId}
                onSelect={setActiveAgentId}
                fallbackAgent={activeAgent}
              />
            )}
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                onFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              disabled={!apiOn}
              onClick={() => fileRef.current?.click()}
              aria-label="Attach"
              className="size-9 shrink-0 touch-manipulation"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <textarea
              value={input}
              disabled={!apiOn || typing}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={
                apiOn
                  ? composerCompact
                    ? "Message…"
                    : `Message ${activeAgent.name}…`
                  : "Connect wallet and send messages…"
              }
              className="max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-base leading-snug outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[36px] md:py-1.5 md:text-sm"
            />
            <Button
              type="button"
              variant="default"
              onClick={() => void send()}
              loading={typing}
              className={cn(
                "size-9 shrink-0 touch-manipulation rounded-lg px-0 font-semibold",
                "md:h-9 md:w-auto md:gap-1.5 md:px-4 md:shadow-md",
                "md:border md:border-white/15 md:hover:shadow-lg md:active:translate-y-px",
              )}
              disabled={!apiOn || typing}
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden md:inline">Send</span>
            </Button>
          </div>
          <div className="mt-2 hidden flex-col gap-1 text-[11px] text-muted-foreground md:flex sm:flex-row sm:items-center sm:justify-between">
            <span>Shift + Enter for newline</span>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Sparkles className="h-3 w-3" /> Hire more agents
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function AgentDropdown({
  agents,
  activeId,
  onSelect,
  fallbackAgent,
}: {
  agents: ReturnType<typeof useApp>["workspaceAgents"];
  activeId: string;
  onSelect: (id: string) => void;
  /** Used when `agents` is empty or no entry matches `activeId` (e.g. catalog-only active agent). */
  fallbackAgent: Agent;
}) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const active =
    agents.find((a) => a.id === activeId) ?? agents[0] ?? fallbackAgent;

  const triggerButton = (
    <button
      type="button"
      aria-haspopup={isMobile ? "dialog" : "menu"}
      aria-expanded={isMobile ? drawerOpen : undefined}
      aria-label={isMobile ? `Agent: ${active.name}. Tap to change.` : undefined}
      className={cn(
        "flex touch-manipulation items-center gap-2 rounded-lg border border-border bg-surface-elevated text-sm hover:border-(--border-medium)",
        "min-h-9 shrink-0 px-1.5 py-1 md:min-h-0 md:px-2 md:py-1.5",
      )}
    >
      <img
        src={active.avatar}
        alt=""
        className={cn(
          "h-6 w-6 shrink-0 rounded-full bg-pill md:h-5 md:w-5",
          isRegistryTokenIdOneAgent(active) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
        )}
      />
      <span className="hidden min-w-0 max-w-40 truncate font-medium md:inline lg:max-w-56">
        {active.name}
      </span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </button>
  );

  const agentRows = (mode: "dropdown" | "drawer") =>
    agents.map((a) => {
      const picked = a.id === activeId;
      const row = (
        <>
          <img
            src={a.avatar}
            alt=""
            className={cn(
              "h-6 w-6 shrink-0 rounded-full bg-pill",
              isRegistryTokenIdOneAgent(a) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{a.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{a.category}</div>
          </div>
          {picked && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
        </>
      );
      if (mode === "drawer") {
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              onSelect(a.id);
              setDrawerOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left outline-none",
              "touch-manipulation active:bg-muted/70",
              picked && "bg-muted/40",
            )}
          >
            {row}
          </button>
        );
      }
      return (
        <DropdownMenuItem
          key={a.id}
          onClick={() => onSelect(a.id)}
          className="flex min-h-10 cursor-pointer items-center gap-2 py-2 md:min-h-0 md:py-1.5"
        >
          {row}
        </DropdownMenuItem>
      );
    });

  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} repositionInputs={false}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="max-h-[88dvh] border-border bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="space-y-1 pb-0 text-left">
            <DrawerTitle className="text-base">Reply with</DrawerTitle>
            <DrawerDescription className="sr-only">
              Choose which agent sends your next message.
            </DrawerDescription>
          </DrawerHeader>
          <div className="mt-1 max-h-[min(380px,52dvh)] overflow-y-auto overscroll-y-contain px-1">
            {agentRows("drawer")}
          </div>
          <div className="mt-2 border-t border-border px-2 pt-2">
            <DrawerClose asChild>
              <Link
                to="/marketplace"
                className="flex min-h-11 touch-manipulation items-center justify-center rounded-xl py-3 text-sm text-muted-foreground active:bg-muted/60"
              >
                Browse marketplace →
              </Link>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu modal>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[min(100vw-1.5rem,16rem)]"
      >
        <DropdownMenuLabel>Reply with</DropdownMenuLabel>
        {agentRows("dropdown")}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/marketplace" className="text-sm text-muted-foreground">
            Browse marketplace →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const TAX_COUNTRY_SELECT_OPTIONS: { code: string; label: string }[] = (() => {
  return [...ISO_3166_1_ALPHA2_CODES]
    .map((code) => {
      const name = isoCountryDisplayName(code);
      return {
        code,
        label: name !== code ? `${name} (${code})` : code,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
})();

function TaxReportHandlerCtaRow({
  m,
  disabled,
  onRunHandlerCta,
}: {
  m: Msg;
  disabled: boolean;
  onRunHandlerCta: (m: Msg, overrideParams?: Record<string, unknown>) => void | Promise<void>;
}) {
  const params = (m.handlerCta?.params ?? {}) as Record<string, unknown>;
  let serverCountry =
    typeof params.countryCode === "string" && /^[A-Za-z]{2}$/.test(params.countryCode)
      ? params.countryCode.toUpperCase()
      : "US";
  if (serverCountry === "UK") serverCountry = "GB";
  if (!ISO_3166_1_ALPHA2_CODES.includes(serverCountry)) serverCountry = "US";
  const [country, setCountry] = React.useState(serverCountry);
  React.useEffect(() => {
    setCountry(serverCountry);
  }, [m.id, serverCountry]);

  return (
    <div className="flex flex-wrap items-center gap-2 px-0.5">
      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger className="h-8 w-[min(100%,16rem)] shrink-0 text-left text-xs sm:text-sm">
          <SelectValue placeholder="Country / region" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {TAX_COUNTRY_SELECT_OPTIONS.map((o) => (
            <SelectItem key={o.code} value={o.code} className="text-xs sm:text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={disabled}
        disabled={disabled}
        onClick={() =>
          void onRunHandlerCta(m, {
            ...params,
            countryCode: country,
          })
        }
      >
        {disabled ? "Running…" : handlerCtaLabel("generate_tax_report")}
      </Button>
    </div>
  );
}

function handlerCtaLabel(handler: string) {
  if (handler === "generate_tax_report") return "Generate tax PDF";
  if (handler === "create_x402_payment") return "Create payment link";
  if (handler === "on_ramp_tokens") return "Create Stripe checkout";
  if (handler === "complete_stripe_kyc") return "Start Identity verification";
  if (handler === "create_credit_card") return "Create virtual card";
  if (handler === "generate_payment_invoice")
    return "Download payment summary";
  if (handler === "generate_financial_activity_report")
    return "Download activity report";
  if (handler === "draft_native_transfer") return "Send native transfer";
  if (handler === "draft_erc20_transfer") return "Send token transfer";
  if (handler === "draft_nft_transfer") return "Send NFT transfer";
  if (handler === "draft_token_swap") return "Approve & swap";
  return handler.replace(/_/g, " ");
}

function isSwapFormCtaParams(params: Record<string, unknown> | undefined): boolean {
  return params != null && params._swapForm === true;
}

function isTransferFormCtaParams(params: Record<string, unknown> | undefined): boolean {
  return params != null && params._transferForm === true;
}

function walletTxConfirmed(m: Msg): boolean {
  return m.result?.kind === "wallet_tx" && m.result.status === "confirmed";
}

type CheckoutFormRich = Extract<
  StardormChatRichBlock,
  | { type: "x402_checkout_form" }
  | { type: "on_ramp_checkout_form" }
  | { type: "credit_card_checkout_form" }
  | { type: "swap_checkout_form" }
  | { type: "transfer_checkout_form" }
>;

/** Rich form blocks need `handlerCta` to run the server handler; show context if it is missing. */
function CheckoutRichUnavailableNotice({ rich }: { rich: CheckoutFormRich }) {
  return (
    <div
      className="w-full max-w-md overflow-hidden rounded-xl border border-amber-500/35 bg-surface-elevated"
      role="alert"
    >
      <div className="flex items-start gap-2 border-b border-border px-3.5 py-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{rich.title}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {rich.type.replace(/_/g, " ")}
          </p>
        </div>
      </div>
      <div className="space-y-2 px-3.5 py-3 text-sm text-muted-foreground">
        {rich.intro ? (
          <p className="whitespace-pre-wrap text-foreground/90">{rich.intro}</p>
        ) : null}
        <p>
          This form cannot be submitted because the server did not attach an action for this
          message (for example, older history or a partial sync). Reload the chat or ask the agent
          to offer it again.
        </p>
      </div>
    </div>
  );
}

function FollowUpRow({ m, apiBase }: { m: Msg; apiBase?: string }) {
  const fu = m.followUp;
  if (!fu) return null;
  if (fu.kind === "x402_checkout") {
    return (
      <div className="mt-2 max-w-md px-0.5">
        <X402PaymentLinkActions
          paymentRequestId={fu.paymentRequestId}
          payPath={fu.payPath}
          apiBase={apiBase}
        />
      </div>
    );
  }
  if (fu.kind === "stripe_on_ramp") {
    return (
      <div className="mt-1 flex flex-wrap gap-2 px-0.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(fu.checkoutUrl).then(
              () => {
                toast.success("Stripe checkout link copied");
              },
              () => {
                toast.error("Could not copy", {
                  description: "Clipboard permission denied or unavailable.",
                });
              },
            );
          }}
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          Copy Stripe link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => window.open(fu.checkoutUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          Open Stripe checkout
        </Button>
      </div>
    );
  }
  if (fu.kind === "stripe_identity") {
    return (
      <div className="mt-1 flex flex-wrap gap-2 px-0.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => window.open(fu.verificationUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          Open Identity verification
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(fu.verificationUrl).then(
              () => {
                toast.success("Verification link copied");
              },
              () => {
                toast.error("Could not copy", {
                  description: "Clipboard permission denied or unavailable.",
                });
              },
            );
          }}
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          Copy link
        </Button>
      </div>
    );
  }
  if (fu.kind === "credit_card_ready") {
    const href = `${fu.dashboardPath}#credit-cards`;
    return (
      <div className="mt-1 flex flex-wrap gap-2 px-0.5">
        <Button type="button" size="sm" variant="secondary" asChild>
          <Link to={fu.dashboardPath} hash="credit-cards">
            <CreditCard className="mr-1 h-3.5 w-3.5" />
            Open dashboard · cards
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(
              typeof window !== "undefined" ? `${window.location.origin}${href}` : href,
            ).then(
              () => toast.success("Dashboard link copied"),
              () =>
                toast.error("Could not copy", {
                  description: "Clipboard permission denied or unavailable.",
                }),
            );
          }}
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          Copy dashboard link
        </Button>
      </div>
    );
  }
  const att = m.attachments?.find((a) => a.id === fu.attachmentId);
  const hash = att?.rootHash;
  if (!apiBase || !hash) {
    return (
      <p className="mt-1 px-0.5 text-xs text-muted-foreground">
        PDF is attached above — reload the chat if the download action is unavailable.
      </p>
    );
  }
  const storageUrl = `${apiBase.replace(/\/$/, "")}/storage/${encodeURIComponent(hash)}`;
  return (
    <div className="mt-1 flex flex-wrap gap-2 px-0.5">
      <StorageFile
        apiBase={apiBase}
        rootHash={hash}
        fileName={fu.name}
        mimeType={att?.mimeType ?? "application/pdf"}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-elevated px-2 py-1 text-sm font-medium text-primary hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        <FileText className="h-3.5 w-3.5" />
        Download {fu.name}
      </StorageFile>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(storageUrl).then(
            () => {
              toast.success("PDF link copied");
            },
            () => {
              toast.error("Could not copy", {
                description: "Clipboard permission denied or unavailable.",
              });
            },
          );
        }}
      >
        <Copy className="mr-1 h-3.5 w-3.5" />
        Copy PDF link
      </Button>
    </div>
  );
}

function Bubble({
  m,
  agents,
  apiBase,
  executingHandlerForId,
  onRunHandlerCta,
  onPersistWalletTxResult,
}: {
  m: Msg;
  agents: Agent[];
  apiBase?: string;
  executingHandlerForId: string | null;
  onRunHandlerCta: (m: Msg, overrideParams?: Record<string, unknown>) => void | Promise<void>;
  onPersistWalletTxResult: (messageId: string, result: ChatHandlerResult) => void | Promise<void>;
}) {
  const isUser = m.role === "user";
  const agent = resolveCatalogAgentForChatBubble(m.agentId, agents);
  const userAvatarPreset = useUserAvatarPreset();
  const userAvatarSrc = USER_AVATAR_URLS[userAvatarPreset];
  return (
    <div
      className={cn(
        "flex animate-fade-in-up items-end gap-2",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <img
          src={agent?.avatar}
          alt=""
          className={cn(
            "h-7 w-7 shrink-0 rounded-full bg-pill",
            agent && isRegistryTokenIdOneAgent(agent) && REGISTRY_TOKEN_ONE_AVATAR_RING_CLASS,
          )}
        />
      )}
      <div className={cn("flex max-w-[78%] flex-col gap-1.5", isUser && "items-end")}>
        {isUser ? (
          <div className="px-1 text-[11px] font-medium text-muted-foreground">You</div>
        ) : (
          agent && (
            <div className="px-1 text-[11px] text-muted-foreground">
              {agent.name} · {timeAgo(m.createdAt)}
            </div>
          )
        )}
        {m.content && (
          <div
            className={cn(
              "rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "rounded-br-sm border-primary/25 bg-primary text-primary-foreground shadow-sm"
                : "rounded-bl-sm border-border bg-card text-card-foreground ring-1 ring-border/40",
            )}
          >
            {!isUser && hasOgInferenceMeta(m) ? (
              <div className="flex items-start gap-1.5">
                <ChatMessageContent
                  content={m.content}
                  variant={isUser ? "user" : "agent"}
                  className="min-w-0 flex-1"
                />
                <OgInferenceMetaButton m={m} />
              </div>
            ) : (
              <ChatMessageContent content={m.content} variant={isUser ? "user" : "agent"} />
            )}
          </div>
        )}
        {!m.content && !isUser && hasOgInferenceMeta(m) && (
          <div className="flex justify-start px-0.5">
            <OgInferenceMetaButton m={m} />
          </div>
        )}
        {m.attachments?.map((a) => (
          <div
            key={a.id}
            className={cn(
              "overflow-hidden rounded-xl border text-sm",
              isUser
                ? "rounded-br-sm border-primary/30 bg-primary/10"
                : "rounded-bl-sm border-border bg-card ring-1 ring-border/40",
            )}
          >
            {a.type === "image" && (a.url || a.rootHash) ? (
              <StorageImage
                url={a.url}
                rootHash={a.rootHash}
                alt=""
                className="max-h-64 w-full object-cover"
              />
            ) : (
              <div className="flex w-full items-center gap-2 px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                {a.size && <span className="shrink-0 text-sm text-muted-foreground">· {a.size}</span>}
                {(a.rootHash || a.url) && (
                  <StorageFile
                    apiBase={apiBase}
                    rootHash={a.rootHash}
                    url={a.url}
                    fileName={a.name}
                    mimeType={a.mimeType}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </StorageFile>
                )}
              </div>
            )}
          </div>
        ))}
        {m.rich?.type === "x402_checkout_form" && !isUser && m.handlerCta && (
          <X402CheckoutFormCard
            rich={m.rich}
            disabled={executingHandlerForId === m.id}
            onCreateLink={(params) => void onRunHandlerCta(m, params)}
          />
        )}
        {m.rich?.type === "x402_checkout_form" && !isUser && !m.handlerCta && (
          <CheckoutRichUnavailableNotice rich={m.rich} />
        )}
        {m.rich?.type === "on_ramp_checkout_form" && !isUser && m.handlerCta && (
          <OnRampCheckoutFormCard
            rich={m.rich}
            disabled={executingHandlerForId === m.id}
            onCreateCheckout={(params) => void onRunHandlerCta(m, params)}
          />
        )}
        {m.rich?.type === "on_ramp_checkout_form" && !isUser && !m.handlerCta && (
          <CheckoutRichUnavailableNotice rich={m.rich} />
        )}
        {m.rich?.type === "credit_card_checkout_form" && !isUser && m.handlerCta && (
          <CreditCardCheckoutFormCard
            rich={m.rich}
            disabled={executingHandlerForId === m.id}
            onSubmitCard={(params) => void onRunHandlerCta(m, params)}
          />
        )}
        {m.rich?.type === "credit_card_checkout_form" && !isUser && !m.handlerCta && (
          <CheckoutRichUnavailableNotice rich={m.rich} />
        )}
        {m.rich?.type === "swap_checkout_form" && !isUser && m.handlerCta && (
          <SwapCheckoutFormCard
            rich={m.rich}
            disabled={executingHandlerForId === m.id}
            onConfirmSwap={(params) => void onRunHandlerCta(m, params)}
          />
        )}
        {m.rich?.type === "swap_checkout_form" && !isUser && !m.handlerCta && (
          <CheckoutRichUnavailableNotice rich={m.rich} />
        )}
        {m.rich?.type === "transfer_checkout_form" && !isUser && m.handlerCta && (
          <TransferCheckoutFormCard
            rich={m.rich}
            disabled={executingHandlerForId === m.id}
            onConfirmTransfer={(params) => void onRunHandlerCta(m, params)}
          />
        )}
        {m.rich?.type === "transfer_checkout_form" && !isUser && !m.handlerCta && (
          <CheckoutRichUnavailableNotice rich={m.rich} />
        )}
        {m.rich?.type === "marketplace_hire" && !isUser && (
          <MarketplaceHireRichCard rich={m.rich} />
        )}
        {m.rich &&
          m.rich.type !== "x402_checkout_form" &&
          m.rich.type !== "on_ramp_checkout_form" &&
          m.rich.type !== "credit_card_checkout_form" &&
          m.rich.type !== "swap_checkout_form" &&
          m.rich.type !== "transfer_checkout_form" &&
          m.rich.type !== "marketplace_hire" && (
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-elevated">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {m.rich.type === "invoice" ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : m.rich.type === "credit_card" ? (
                  <CreditCard className="h-4 w-4 text-primary" />
                ) : m.rich.type === "report" ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : m.rich.type === "tx" ? (
                  <ArrowLeftRight className="h-4 w-4 text-primary" />
                ) : (
                  <CoinIcon className="h-4 w-4" />
                )}
                {m.rich.title}
              </div>
              <span className="rounded-full bg-pill px-2 py-0.5 text-[10px] uppercase text-pill-foreground">
                {m.rich.type}
              </span>
            </div>
            <div className="divide-y divide-border">
              {m.rich.rows?.map((r) => (
                <div
                  key={r.label}
                  className="flex items-start justify-between gap-3 px-3.5 py-2 text-sm"
                >
                  <span className="shrink-0 text-muted-foreground">{r.label}</span>
                  <span
                    className={cn(
                      "min-w-0 max-w-[min(100%,20rem)] text-right font-medium wrap-break-word break-all",
                      m.rich?.type === "tx" &&
                        "font-mono text-[12px] leading-snug tabular-nums tracking-tight text-foreground",
                    )}
                    title={r.value}
                  >
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {m.handlerCta &&
          !isUser &&
          m.rich?.type !== "x402_checkout_form" &&
          m.rich?.type !== "on_ramp_checkout_form" &&
          m.rich?.type !== "credit_card_checkout_form" &&
          m.rich?.type !== "swap_checkout_form" &&
          m.rich?.type !== "transfer_checkout_form" &&
          (m.handlerCta.handler === "generate_tax_report" ? (
            <TaxReportHandlerCtaRow
              m={m}
              disabled={executingHandlerForId === m.id}
              onRunHandlerCta={onRunHandlerCta}
            />
          ) : isTransferDraftHandler(m.handlerCta.handler) &&
            !isTransferFormCtaParams(m.handlerCta.params as Record<string, unknown>) ? (
            <TransferDraftHandlerCtaRow
              messageId={m.id}
              handler={m.handlerCta.handler}
              params={m.handlerCta.params as Record<string, unknown>}
              label={handlerCtaLabel(m.handlerCta.handler)}
              txConfirmed={walletTxConfirmed(m)}
              onPersistResult={(result) => onPersistWalletTxResult(m.id, result)}
            />
          ) : isTokenSwapHandler(m.handlerCta.handler) &&
            !isSwapFormCtaParams(m.handlerCta.params as Record<string, unknown>) ? (
            <SwapHandlerCtaRow
              messageId={m.id}
              params={m.handlerCta.params as Record<string, unknown>}
              label={handlerCtaLabel(m.handlerCta.handler)}
              txConfirmed={walletTxConfirmed(m)}
              onPersistResult={(result) => onPersistWalletTxResult(m.id, result)}
            />
          ) : (
            <div className="flex flex-wrap gap-2 px-0.5">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={executingHandlerForId === m.id}
                disabled={executingHandlerForId === m.id}
                onClick={() => void onRunHandlerCta(m)}
              >
                {executingHandlerForId === m.id
                  ? "Running…"
                  : handlerCtaLabel(m.handlerCta.handler)}
              </Button>
            </div>
          ))}
        {m.followUp && !isUser && <FollowUpRow m={m} apiBase={apiBase} />}
        {isUser && (
          <div className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
            {timeAgo(m.createdAt)} ·{" "}
            {m.status === "seen" ? (
              <CheckCheck className="h-3 w-3 text-primary" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </div>
        )}
      </div>
      {isUser && (
        <img
          src={userAvatarSrc}
          alt=""
          className="h-7 w-7 shrink-0 rounded-full bg-pill object-cover"
        />
      )}
    </div>
  );
}

