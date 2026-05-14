import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/chat";

export type IndexSearch = {
  /** Open this conversation after navigation (e.g. Stripe Identity return_url). */
  conversation?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): IndexSearch => {
    const c = raw.conversation;
    if (typeof c !== "string") return {};
    const id = c.trim();
    if (!id || id.length > 128) return {};
    return { conversation: id };
  },
  component: Chat,
});
