import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/chat";

export type IndexSearch = {
  /** Open this conversation after navigation (e.g. Stripe Identity return_url). */
  convId?: string;
};

function parseConversationIdFromSearch(raw: Record<string, unknown>): string | null {
  const c = raw.convId ?? raw.conversation;
  if (typeof c !== "string") return null;
  const id = c.trim();
  if (!id || id.length > 128) return null;
  return id;
}

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): IndexSearch => {
    const out: IndexSearch = {};
    const id = parseConversationIdFromSearch(raw);
    if (id) out.convId = id;
    return out;
  },
  component: Chat,
});
