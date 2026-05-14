import { createFileRoute } from "@tanstack/react-router";
import { DocCallout } from "@/components/docs/doc-callout";
import { DocCode } from "@/components/docs/doc-code";
import { DocPageHero, DocProse, DocSection } from "@/components/docs/doc-page";
import { DocResult } from "@/components/docs/doc-result";

export const Route = createFileRoute("/docs/agents")({
  component: DocsAgents,
});

function DocsAgents() {
  return (
    <DocProse>
      <DocPageHero
        eyebrow="Inference"
        title="Agents API"
        description="High-level chat against POST /agents/:agentKey/chat. The route resolves catalog keys to on-chain agent ids server-side and returns a structured reply validated with stardormChatSuccessSchema."
      />

      <DocSection title="JSON chat">
        <DocCode title="sdk.agents.chat">
          {`const result = await sdk.agents.chat({
  agentKey: "beam-registry/42",
  message: "Draft a polite follow-up email.",
  conversationId: optionalThreadId,
});`}
        </DocCode>
        <DocResult title="StardormChatSuccess (abridged)">
          {`{
  "agentKey": "beam-registry/42",
  "reply": "Subject: …\\n\\nHi …",
  "compute": {
    "model": "gpt-4.1-mini",
    "verified": true,
    "chatId": "64f…",
    "provider": "openai",
    "computeNetwork": "0g-compute"
  },
  "structured": {
    "text": "Optional handler summary",
    "handler": "x402_checkout",
    "params": { }
  }
}`}
        </DocResult>
      </DocSection>

      <DocSection title="Multipart uploads">
        <p>
          Pass browser <code className="text-foreground">File</code> objects to upload attachments (parity with the
          Nest <code className="text-foreground">FilesInterceptor</code> configuration).
        </p>
        <DocCode title="With files">
          {`await sdk.agents.chat({
  agentKey: "beam-registry/42",
  message: "What changed in this PDF?",
  files: [fileFromInput],
});`}
        </DocCode>
        <DocCallout variant="info" title="Users namespace">
          <p>
            The legacy <code className="text-foreground">POST /users/me/chat</code> path (numeric <code className="text-foreground">agentId</code>) is exposed as{" "}
            <code className="text-foreground">sdk.users.chat</code> when you need the older contract.
          </p>
        </DocCallout>
      </DocSection>
    </DocProse>
  );
}
