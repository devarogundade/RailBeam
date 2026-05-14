import { createFileRoute, Link } from "@tanstack/react-router";
import { DocCallout } from "@/components/docs/doc-callout";
import { DocCode } from "@/components/docs/doc-code";
import { DocPageHero, DocProse, DocSection } from "@/components/docs/doc-page";
import { DocResult } from "@/components/docs/doc-result";

export const Route = createFileRoute("/docs/")({
  component: DocsOverview,
});

function DocsOverview() {
  return (
    <DocProse>
      <DocPageHero
        eyebrow="Beam SDK"
        title="TypeScript SDK for Beam"
        description="Programmatic access to the same workspace primitives the product uses: agents, users, payments, handlers, storage, and chain reads—so your automations share receipts and rules with the Beam UI instead of bolting on a parallel stack."
      />

      <DocSection title="Why this SDK exists">
        <p>
          Beam treats{" "}
          <strong className="text-foreground">intent</strong> (what should happen),{" "}
          <strong className="text-foreground">execution</strong> (agents and HTTP flows), and{" "}
          <strong className="text-foreground">settlement</strong> (money movement you can reconcile) as one system. The
          SDK is the boundary for teams who want that story in code—typed requests, validated responses, and network
          presets so you are not re-wiring RPC URLs and contract tables in every service.
        </p>
        <DocCallout title="Three things to lean on" variant="info">
          <ul className="m-0 list-disc space-y-2 pl-4">
            <li>
              <strong className="text-foreground">Agent workspace</strong> — chat and delegate over HTTP with compute
              metadata on replies.
            </li>
            <li>
              <strong className="text-foreground">Verifiable flows</strong> — payments and user lifecycles use the same
              DTOs the backend validates.
            </li>
            <li>
              <strong className="text-foreground">Chain + index</strong> — optional subgraph and viem helpers for
              on-chain discovery when you need it.
            </li>
          </ul>
        </DocCallout>
      </DocSection>

      <DocSection title="At a glance">
        <p>
          Pick a logical network (<code className="text-foreground">mainnet</code> or{" "}
          <code className="text-foreground">testnet</code>) — the SDK applies baked-in defaults for the Stardorm API
          origin, 0G JSON-RPC, registry contract addresses, and (when configured) the subgraph GraphQL URL. Authenticate
          with a viem wallet account, then use <strong className="text-foreground">agents</strong>,{" "}
          <strong className="text-foreground">users</strong>, <strong className="text-foreground">payments</strong>,{" "}
          <strong className="text-foreground">handlers</strong>, <strong className="text-foreground">storage</strong>,{" "}
          <strong className="text-foreground">subgraph</strong>, <strong className="text-foreground">chain</strong>{" "}
          for on-chain reads and writes, and <strong className="text-foreground">realtime</strong> for WebSocket
          conversation sync.
        </p>
        <DocCallout title="Packages" variant="info">
          <p>
            Runtime code lives in <code className="text-foreground">@beam/beam-sdk</code>. Shared request and response
            shapes are published from <code className="text-foreground">@beam/stardorm-api-contract</code> — import
            types from either package, but prefer the contract package for portable types in your own modules.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection title="Minimal bootstrap">
        <DocCode title="example.ts">
          {`import { BeamSdk, accountFromPrivateKey } from "@beam/beam-sdk";

const wallet = accountFromPrivateKey("0x…"); // viem LocalAccount

const sdk = new BeamSdk({
  network: "testnet",
});

const { accessToken } = await sdk.auth(wallet);
// accessToken is also stored on the client for subsequent calls

const reply = await sdk.agents.chat({
  agentKey: "beam-registry/1",
  message: "Summarize my last invoice.",
});`}
        </DocCode>
        <DocResult title="Shape of a chat reply (truncated)">
          {`{
  "agentKey": "beam-registry/1",
  "reply": "Here is a concise summary of …",
  "compute": {
    "model": "gpt-4.1-mini",
    "verified": true,
    "chatId": "…",
    "provider": "…",
    "computeNetwork": "…"
  }
}`}
        </DocResult>
      </DocSection>

      <DocSection title="Suggested path">
        <ol>
          <li>
            <Link to="/docs/installation">Installation</Link> — packages, Vite aliases, and network presets.
          </li>
          <li>
            <Link to="/docs/authentication">Authentication</Link> — wallet challenge and JWT storage on the client.
          </li>
          <li>
            <Link to="/docs/agents">Agents</Link> then <Link to="/docs/payments">Payments</Link> — mirror the product
            loop: steer an agent, then complete a checkout or settlement call from code.
          </li>
          <li>
            <Link to="/docs/subgraph">Subgraph</Link> or <Link to="/docs/smart-contracts">Smart contracts</Link> when
            you need indexed or on-chain truth beyond HTTP.
          </li>
        </ol>
      </DocSection>

      <DocSection title="Who this is for">
        <ul>
          <li>Integrators building headless automations that must line up with finance-friendly receipts.</li>
          <li>Teams embedding agents, payments, or KYC flows outside the first-party web app.</li>
          <li>Developers who want compile-time types and runtime validation on the same contracts the API enforces.</li>
        </ul>
      </DocSection>
    </DocProse>
  );
}
