/**
 * Stardorm `/ws/conversations` — JSON text frames (see `backend/conversation-sync.events.ts`).
 * Auth: JWT in `?token=` (browsers cannot set `Authorization` on WebSocket handshakes).
 */

import {
  conversationSyncPayloadSchema,
  type ConversationSyncPayload,
} from "@railbeam/stardorm-api-contract";

/** Mirrors backend `ConversationSyncPayload`. */
export type BeamConversationSyncPayload = ConversationSyncPayload;

/** Backend closes with 4401 when JWT is missing or invalid. */
export const BEAM_WS_CLOSE_UNAUTHORIZED = 4401;

/**
 * Builds `ws:` / `wss:` URL for `/ws/conversations` on the same origin as the HTTP API,
 * with `?token=<JWT>`.
 */
export function buildBeamConversationsWebSocketUrl(
  apiBaseUrl: string,
  accessToken: string,
): string {
  const trimmedBase = apiBaseUrl.trim().replace(/\/$/, "");
  const trimmedToken = accessToken.trim();
  if (!trimmedBase || !trimmedToken) {
    throw new Error("buildBeamConversationsWebSocketUrl: apiBaseUrl and accessToken are required");
  }
  const u = new URL(trimmedBase);
  const prefix = u.pathname.replace(/\/$/, "");
  u.pathname = `${prefix}/ws/conversations`.replace(/\/{2,}/g, "/");
  u.searchParams.set("token", trimmedToken);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.hash = "";
  return u.toString();
}

export function parseBeamConversationSyncPayload(raw: string): BeamConversationSyncPayload | null {
  try {
    const o = JSON.parse(raw) as unknown;
    const parsed = conversationSyncPayloadSchema.safeParse(o);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type ConnectBeamConversationSyncOptions = {
  url: string;
  /** Defaults to `globalThis.WebSocket` (browsers, Node 22+). */
  WebSocket?: typeof WebSocket;
  onPayload: (payload: BeamConversationSyncPayload) => void;
  /** When false, a single connection is attempted. Default true. */
  reconnect?: boolean;
  signal?: AbortSignal;
};

export type BeamConversationSyncConnection = {
  close: () => void;
};

/**
 * Subscribes to conversation sync events with optional exponential backoff reconnect
 * (same policy as the Beam web app listener).
 */
export function connectBeamConversationSync(
  options: ConnectBeamConversationSyncOptions,
): BeamConversationSyncConnection {
  const WS = options.WebSocket ?? globalThis.WebSocket;
  if (!WS) {
    throw new Error(
      "connectBeamConversationSync: No WebSocket implementation found. " +
        "Pass `WebSocket` in options (e.g. from the `ws` package on older Node) or use Node 22+ / a browser.",
    );
  }

  let stopped = false;
  let ws: InstanceType<typeof WS> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;

  const clearReconnect = () => {
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  };

  const applyFrame = (text: string) => {
    const payload = parseBeamConversationSyncPayload(text);
    if (payload) options.onPayload(payload);
  };

  function connect() {
    if (stopped) return;
    clearReconnect();
    ws = new WS(options.url) as InstanceType<typeof WS>;

    ws.onopen = () => {
      attempt = 0;
    };

    ws.onmessage = (ev: { data?: unknown }) => {
      const data = ev.data;
      if (typeof data === "string") applyFrame(data);
      else if (data instanceof ArrayBuffer) {
        applyFrame(new TextDecoder().decode(data));
      } else if (data instanceof Uint8Array) {
        applyFrame(new TextDecoder().decode(data));
      }
    };

    ws.onclose = (ev: { code: number }) => {
      ws = null;
      if (stopped) return;
      const code = typeof ev === "object" && ev && "code" in ev ? Number(ev.code) : 0;
      if (code === BEAM_WS_CLOSE_UNAUTHORIZED) return;
      scheduleReconnect();
    };

    ws.onerror = () => {
      /* close event drives reconnect */
    };
  }

  const scheduleReconnect = () => {
    if (stopped || options.reconnect === false) return;
    attempt += 1;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
    clearReconnect();
    reconnectTimer = setTimeout(connect, delay);
  };

  const onAbort = () => {
    stopped = true;
    clearReconnect();
    if (ws && (ws.readyState === WS.OPEN || ws.readyState === WS.CONNECTING)) {
      ws.close();
    }
    ws = null;
  };

  const abortHandler = () => {
    onAbort();
  };

  if (options.signal) {
    if (options.signal.aborted) onAbort();
    else options.signal.addEventListener("abort", abortHandler, { once: true });
  }

  connect();

  return {
    close: () => {
      stopped = true;
      clearReconnect();
      options.signal?.removeEventListener("abort", abortHandler);
      if (ws && (ws.readyState === WS.OPEN || ws.readyState === WS.CONNECTING)) {
        ws.close();
      }
      ws = null;
    },
  };
}
