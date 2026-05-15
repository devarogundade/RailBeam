import { createFileRoute } from "@tanstack/react-router";
import { DocCallout } from "@/components/docs/doc-callout";
import { DocCode } from "@/components/docs/doc-code";
import { DocPageHero, DocProse, DocSection } from "@/components/docs/doc-page";
import { DocResult } from "@/components/docs/doc-result";

export const Route = createFileRoute("/docs/websocket")({
  component: DocsWebSocket,
});

function DocsWebSocket() {
  return (
    <DocProse>
      <DocPageHero
        eyebrow="Realtime"
        title="WebSocket sync"
        description="Stardorm pushes conversation sync events on /ws/conversations — full message rows for in-place cache updates, plus list hints when threads or metadata change. The SDK builds the WebSocket URL from your configured API origin and wraps reconnecting listeners."
      />

      <DocSection title="Auth and URL">
        <p>
          Browsers cannot send an <code className="text-foreground">Authorization</code> header on a WebSocket
          handshake. The Nest gateway accepts the JWT as <code className="text-foreground">?token=</code> on the URL
          (same pattern as the Beam web app).
        </p>
        <DocCode title="Conversation WebSocket URL">
          {`import { BeamSdk } from "@railbeam/beam-sdk";

const sdk = new BeamSdk({ network: "testnet", accessToken: jwt });
const url = sdk.realtime.conversationsWebSocketUrl();
// wss://…/ws/conversations?token=…`}
        </DocCode>
        <DocCallout variant="info" title="Standalone helper">
          <p>
            Use <code className="text-foreground">buildBeamConversationsWebSocketUrl(apiBaseUrl, token)</code> when you
            already know the API base URL and JWT.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection title="Payloads (v1)">
        <p>
          Frames are UTF-8 JSON text. Parse with{" "}
          <code className="text-foreground">parseBeamConversationSyncPayload</code> or handle{" "}
          <code className="text-foreground">BeamConversationSyncPayload</code> in TypeScript.
        </p>
        <DocResult title="Examples">
          {`{ "v": 1, "op": "thread_messages", "conversationId": "…", "messages": [ … ] }
{ "v": 1, "op": "thread", "conversationId": "…" }
{ "v": 1, "op": "conversations" }
{ "v": 1, "op": "conversation_deleted", "conversationId": "…" }`}
        </DocResult>
        <p className="text-muted-foreground text-sm">
          Prefer <code className="text-foreground">thread_messages</code> to merge rows into your local cache without
          refetching the thread. Use <code className="text-foreground">thread</code> only as a legacy invalidation hint.
          Refresh conversation lists after <code className="text-foreground">conversations</code> or{" "}
          <code className="text-foreground">conversation_deleted</code>.
        </p>
      </DocSection>

      <DocSection title="Reconnecting client">
        <p>
          <code className="text-foreground">sdk.realtime.connectConversationSync</code> (or the lower-level{" "}
          <code className="text-foreground">connectBeamConversationSync</code>) opens the socket, parses payloads, and
          reconnects with exponential backoff up to 30 seconds. The client stops reconnecting if the server closes with
          code <code className="text-foreground">4401</code> (missing or invalid JWT).
        </p>
        <DocCode title="Session listener">
          {`import { BeamSdk } from "@railbeam/beam-sdk";

const sdk = new BeamSdk({ network: "testnet", accessToken: jwt });

const conn = sdk.realtime.connectConversationSync({
  onPayload: (p) => {
    if (p.op === "thread_messages") console.log("merge", p.messages.length, "rows");
    if (p.op === "thread") console.log("refresh thread", p.conversationId);
    if (p.op === "conversations") console.log("refresh list");
    if (p.op === "conversation_deleted") console.log("removed", p.conversationId);
  },
  signal: AbortSignal.timeout(60 * 60 * 1000),
});

// conn.close();`}
        </DocCode>
        <DocCallout variant="warning" title="Node without global WebSocket">
          <p>
            On Node versions before global <code className="text-foreground">WebSocket</code>, pass{" "}
            <code className="text-foreground">WebSocket: require(&quot;ws&quot;).WebSocket</code> (or your polyfill)
            into <code className="text-foreground">connectBeamConversationSync</code>.
          </p>
        </DocCallout>
      </DocSection>
    </DocProse>
  );
}
