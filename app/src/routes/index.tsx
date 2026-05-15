import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/chat";

export type IndexSearch = {
  /** Open this conversation after navigation (e.g. Stripe Identity return_url). */
  convId?: string;
  /** Stripe Checkout return (card on-ramp); cleared after we show feedback. */
  onRamp?: "success" | "canceled";
  /** Populated by Stripe when `onRamp` is `success` (`session_id` search param). */
  session_id?: string;
};

function parseConversationIdFromSearch(raw: Record<string, unknown>): string | null {
  const c = raw.convId ?? raw.conversation;
  if (typeof c !== "string") return null;
  const id = c.trim();
  if (!id || id.length > 128) return null;
  return id;
}

function parseStripeCheckoutSessionId(raw: Record<string, unknown>): string | undefined {
  const s = raw.session_id;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  if (!t || t.length > 256) return undefined;
  return t;
}

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): IndexSearch => {
    const out: IndexSearch = {};
    const id = parseConversationIdFromSearch(raw);
    if (id) out.convId = id;
    const or = raw.onRamp;
    if (or === "success" || or === "canceled") out.onRamp = or;
    const sid = parseStripeCheckoutSessionId(raw);
    if (sid) out.session_id = sid;
    return out;
  },
  component: Chat,
});
