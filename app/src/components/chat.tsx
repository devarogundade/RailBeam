import * as React from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import type { ChatMessage as Msg, ChatAttachment, Agent } from "@/lib/types";
import type { ConversationSummary, ChatHistoryResponse, ConversationsPageResponse } from "@beam/stardorm-api-contract";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CoinIcon } from "@/components/icons";
import {
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
  Menu,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  fetchStardormChatMessages,
  isStardormInferenceEnabled,
  mapHistoryToChatMessages,
  stardormChat,
  stardormExecuteHandler,
} from "@/lib/stardorm-api";
import { getStardormApiBase } from "@/lib/stardorm-axios";
import { toast } from "sonner";
import { useStardormCatalog } from "@/lib/hooks/use-stardorm-catalog";
import { useUserAvatarPreset } from "@/lib/hooks/use-user-avatar-preset";
import { USER_AVATAR_URLS } from "@/lib/user-avatar-assets";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchStardormMe,
  patchStardormUser,
  fetchStardormConversationsPage,
  createStardormConversation,
} from "@/lib/stardorm-user-api";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StorageImage } from "@stardorm/agentflow-finance/src/components/storage-image";
import { StorageFile } from "@stardorm/agentflow-finance/src/components/storage-file";
import {
  X402CheckoutFormCard,
} from "@/components/x402-checkout-form-card";
import { OnRampCheckoutFormCard } from "@/components/on-ramp-checkout-form-card";

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

export function Chat() {
  const queryClient = useQueryClient();
  const { hired, activeAgentId, setActiveAgentId, address, stardormAccessToken } = useApp();
  const userKey = address ? (address.toLowerCase() as `0x${string}`) : null;
  const apiOn = isStardormInferenceEnabled();
  const { data: catalog, isError: catalogError } = useStardormCatalog();
  const catalogAgents = catalog?.agents ?? [];
  const suggestions = catalog?.chatSuggestions ?? [];
  const activeAgent =
    hired.find((a: Agent) => a.id === activeAgentId) ??
    catalogAgents.find((a: Agent) => a.id === activeAgentId) ??
    catalogAgents.find((a: Agent) => a.id === "beam-default") ??
    catalogAgents[0];

  const meQuery = useQuery({
    queryKey: queryKeys.user.me(userKey),
    queryFn: fetchStardormMe,
    enabled: Boolean(getStardormApiBase() && stardormAccessToken && userKey),
  });
  const activeConversationId = meQuery.data?.activeConversationId;
  const convChatKey = activeConversationId ?? "_default";

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
        conversationId: activeConversationId,
        cursor: pageParam,
      });
      if (!r) throw new Error("Could not load messages");
      return r;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ChatHistoryResponse) =>
      last.hasMoreOlder && last.nextCursorOlder ? last.nextCursorOlder : undefined,
    enabled: Boolean(apiOn && userKey && stardormAccessToken),
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
  const displayMessages = React.useMemo(
    () => [...serverMessages, ...pendingMessages],
    [serverMessages, pendingMessages],
  );
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<DraftAttachment[]>([]);
  const [typing, setTyping] = React.useState(false);
  const [executingHandlerForId, setExecutingHandlerForId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const convScrollRef = React.useRef<HTMLDivElement>(null);
  const convListEndRef = React.useRef<HTMLDivElement>(null);
  const chatTopSentinelRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const historyLoading = Boolean(chatInfinite.isPending && !chatInfinite.data);

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
  }, [apiOn, chatInfinite, activeConversationId]);

  const createConvMutation = useMutation({
    mutationFn: () => createStardormConversation({}),
    onSuccess: () => {
      if (userKey) {
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
    onSuccess: () => {
      if (userKey) {
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

  const headerTitle = React.useMemo(() => {
    const id = activeConversationId;
    if (!id) return "Messages";
    const row = flatConversations.find((c: ConversationSummary) => c.id === id);
    return row?.title?.trim() || "Messages";
  }, [activeConversationId, flatConversations]);

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
        const res = await stardormExecuteHandler({
          handler: m.handlerCta.handler,
          params: overrideParams ?? m.handlerCta.params,
          ctaMessageId: m.id,
        });
        if ("error" in res && res.error) {
          toast.error("Action unavailable", { description: res.error });
          return;
        }
        if (!("message" in res)) return;
        if (userKey) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.user.chatMessages(userKey, convChatKey),
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("Action failed", { description: msg });
      } finally {
        setExecutingHandlerForId(null);
      }
    },
    [activeAgentId_, convChatKey, queryClient, userKey],
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
          "Configure VITE_STARDORM_API_URL, connect your wallet, and complete sign-in so messages load from the server.",
      });
      return;
    }

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
    setPendingMessages((p) => [...p, userMsg]);
    setInput("");
    setAttachments([]);
    setTyping(true);

    void (async () => {
      let chatFailed = false;
      try {
        const res = await stardormChat({
          agentKey: activeAgent.id,
          message: content,
          conversationId: activeConversationId,
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
      } finally {
        setTyping(false);
      }

      if (!userKey) {
        setPendingMessages((p) => p.filter((x) => x.id !== userMsg.id));
        return;
      }
      if (chatFailed) {
        setPendingMessages((p) => p.filter((x) => x.id !== userMsg.id));
        return;
      }
      try {
        await queryClient.refetchQueries({
          queryKey: queryKeys.user.chatMessages(userKey, convChatKey),
        });
      } catch {
        toast.error("Thread sync failed", {
          description: "Could not reload messages from the server.",
        });
      } finally {
        setPendingMessages((p) => p.filter((x) => x.id !== userMsg.id));
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.conversations(userKey) });
      scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
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
              <Menu className="h-5 w-5" />
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
              {convInfinite.isPending && !convInfinite.data?.pages.length ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">Loading…</p>
              ) : convInfinite.isError ? (
                <p className="px-2 py-4 text-sm text-destructive">Could not load conversations.</p>
              ) : flatConversations.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                <>
                  <ul className="flex flex-col gap-1">
                    {flatConversations.map((c: ConversationSummary) => {
                      const active = c.id === activeConversationId;
                      const when = new Date(c.lastMessageAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      return (
                        <li key={c.id}>
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
                              "flex w-full flex-col rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
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
                        </li>
                      );
                    })}
                  </ul>
                  <div ref={convListEndRef} className="h-2 shrink-0" aria-hidden />
                  {convInfinite.isFetchingNextPage ? (
                    <p className="py-2 text-center text-[11px] text-muted-foreground">Loading more…</p>
                  ) : null}
                </>
              )}
            </div>
            <div className="border-t border-border p-3">
              <Button
                type="button"
                className="w-full gap-2 font-semibold"
                disabled={!apiOn || createConvMutation.isPending}
                onClick={() => createConvMutation.mutate()}
              >
                <Plus className="h-4 w-4" />
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
      <div ref={scrollRef} className="bg-dots flex-1 overflow-y-auto px-4 py-6 md:px-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <span>Loading conversation from the server…</span>
            </div>
          ) : (
            <>
              {chatInfinite.isFetchingNextPage ? (
                <div className="py-2 text-center text-xs text-muted-foreground">Loading older messages…</div>
              ) : null}
              <div ref={chatTopSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
              {displayMessages.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center text-sm text-muted-foreground">
                  {apiOn ? (
                    <p>
                      No messages in this thread yet. Send a message to talk to{" "}
                      <span className="font-medium text-foreground">{activeAgent.name}</span> — replies
                      are generated on the backend and stored with your account.
                    </p>
                  ) : (
                    <p>
                      Connect your wallet and sign in.
                    </p>
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
                />
              ))}
            </>
          )}
          {typing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <img src={activeAgent.avatar} alt="" className="h-7 w-7 rounded-full bg-pill" />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-2.5">
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-border bg-background px-4 py-4 md:px-10">
        <div className="mx-auto max-w-3xl">
          {apiOn &&
            !historyLoading &&
            displayMessages.length === 0 &&
            suggestions.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground hover:bg-(--bg-hover) hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

          {Array.isArray(activeAgent.skillHandles) && activeAgent.skillHandles.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
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

          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-(--border-medium)">
            <AgentDropdown
              agents={hired}
              activeId={activeAgentId}
              onSelect={setActiveAgentId}
              fallbackAgent={activeAgent}
            />
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
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <textarea
              value={input}
              disabled={!apiOn}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={
                apiOn
                  ? `Message ${activeAgent.name}…`
                  : "Sign in to send messages…"
              }
              className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
            />
            <Button onClick={() => void send()} size="sm" className="font-semibold" disabled={!apiOn}>
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
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
  );
}

function AgentDropdown({
  agents,
  activeId,
  onSelect,
  fallbackAgent,
}: {
  agents: ReturnType<typeof useApp>["hired"];
  activeId: string;
  onSelect: (id: string) => void;
  /** Used when `agents` is empty or no entry matches `activeId` (e.g. catalog-only active agent). */
  fallbackAgent: Agent;
}) {
  const active =
    agents.find((a) => a.id === activeId) ?? agents[0] ?? fallbackAgent;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-2 py-1.5 text-sm hover:border-(--border-medium)">
          <img src={active.avatar} alt="" className="h-5 w-5 rounded-full bg-pill" />
          <span className="font-medium">{active.name}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Reply with</DropdownMenuLabel>
        {agents.map((a) => (
          <DropdownMenuItem
            key={a.id}
            onClick={() => onSelect(a.id)}
            className="flex items-center gap-2"
          >
            <img src={a.avatar} alt="" className="h-6 w-6 rounded-full bg-pill" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{a.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{a.category}</div>
            </div>
            {a.id === activeId && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
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

function handlerCtaLabel(handler: string) {
  if (handler === "generate_tax_report") return "Generate tax PDF";
  if (handler === "create_x402_payment") return "Create payment link";
  if (handler === "on_ramp_tokens") return "Create Stripe checkout";
  if (handler === "complete_stripe_kyc") return "Start Identity verification";
  if (handler === "create_credit_card") return "Create virtual card";
  return handler.replace(/_/g, " ");
}

function FollowUpRow({ m, apiBase }: { m: Msg; apiBase?: string }) {
  const fu = m.followUp;
  if (!fu) return null;
  if (fu.kind === "x402_checkout") {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const href = `${origin}${fu.payPath}`;
    return (
      <div className="mt-1 flex flex-wrap gap-2 px-0.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(href).then(
              () => {
                toast.success("Checkout link copied");
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
          Copy pay link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          Open checkout
        </Button>
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
}: {
  m: Msg;
  agents: Agent[];
  apiBase?: string;
  executingHandlerForId: string | null;
  onRunHandlerCta: (m: Msg, overrideParams?: Record<string, unknown>) => void | Promise<void>;
}) {
  const isUser = m.role === "user";
  const agent = agents.find((a) => a.id === m.agentId);
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
        <img src={agent?.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full bg-pill" />
      )}
      <div className={cn("flex max-w-[78%] flex-col gap-1.5", isUser && "items-end")}>
        {!isUser && agent && (
          <div className="px-1 text-[11px] text-muted-foreground">
            {agent.name} · {timeAgo(m.createdAt)}
          </div>
        )}
        {m.content && (
          <div
            className={cn(
              "rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "rounded-br-sm border-(--border-medium) bg-(--btn-item-active) text-foreground"
                : "rounded-bl-sm border-border bg-surface",
            )}
          >
            {!isUser && hasOgInferenceMeta(m) ? (
              <div className="flex items-start gap-1.5">
                <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">{m.content}</div>
                <OgInferenceMetaButton m={m} />
              </div>
            ) : (
              m.content
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
              "overflow-hidden rounded-xl border border-border bg-surface text-sm",
              isUser ? "rounded-br-sm" : "rounded-bl-sm",
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
        {m.rich?.type === "on_ramp_checkout_form" && !isUser && m.handlerCta && (
          <OnRampCheckoutFormCard
            rich={m.rich}
            disabled={executingHandlerForId === m.id}
            onCreateCheckout={(params) => void onRunHandlerCta(m, params)}
          />
        )}
        {m.rich &&
          m.rich.type !== "x402_checkout_form" &&
          m.rich.type !== "on_ramp_checkout_form" && (
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-elevated">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {m.rich.type === "invoice" ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : m.rich.type === "credit_card" ? (
                  <CreditCard className="h-4 w-4 text-primary" />
                ) : m.rich.type === "report" ? (
                  <Sparkles className="h-4 w-4 text-primary" />
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
          m.rich?.type !== "on_ramp_checkout_form" && (
          <div className="flex flex-wrap gap-2 px-0.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={executingHandlerForId === m.id}
              onClick={() => void onRunHandlerCta(m)}
            >
              {executingHandlerForId === m.id ? "Running…" : handlerCtaLabel(m.handlerCta.handler)}
            </Button>
          </div>
        )}
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

