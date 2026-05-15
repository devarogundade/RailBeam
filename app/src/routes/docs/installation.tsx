import { createFileRoute } from "@tanstack/react-router";
import { DocCallout } from "@/components/docs/doc-callout";
import { DocCode } from "@/components/docs/doc-code";
import { DocPageHero, DocProse, DocSection } from "@/components/docs/doc-page";

export const Route = createFileRoute("/docs/installation")({
  component: DocsInstallation,
});

function DocsInstallation() {
  return (
    <DocProse>
      <DocPageHero
        eyebrow="Get started"
        title="Installation"
        description="Install the packages, construct BeamSdk, and pick a network."
      />

      <DocSection title="npm">
        <DocCode title="package.json">
          {`{
  "dependencies": {
    "@railbeam/beam-sdk": "^0.0.1",
    "@railbeam/stardorm-api-contract": "^0.0.1"
  }
}`}
        </DocCode>
        <DocCallout variant="info" title="Contract package">
          <p>
            <code className="text-foreground">@railbeam/beam-sdk</code> already depends on{" "}
            <code className="text-foreground">@railbeam/stardorm-api-contract</code>. Add the contract package only if
            you import schemas without the SDK.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection title="Network">
        <DocCode title="Construct the client">
          {`import { BeamSdk } from "@railbeam/beam-sdk";

const sdk = new BeamSdk({ network: "testnet" });`}
        </DocCode>
        <p>
          <code className="text-foreground">mainnet</code> and <code className="text-foreground">testnet</code> select
          the Stardorm API base URL, 0G RPC, registry addresses, and subgraph endpoint bundled with that SDK version.
          For a private stack, pass <code className="text-foreground">overrides</code> (for example{" "}
          <code className="text-foreground">apiBaseUrl</code>, <code className="text-foreground">rpcUrl</code>,{" "}
          <code className="text-foreground">subgraphUrl</code>, or contract addresses) on the same constructor.
        </p>
      </DocSection>

      <DocSection title="Types only">
        <p>
          For DTOs and Zod schemas without the SDK, depend on{" "}
          <code className="text-foreground">@railbeam/stardorm-api-contract</code> (e.g.{" "}
          <code className="text-foreground">publicPaymentRequestSchema</code>,{" "}
          <code className="text-foreground">stardormChatSuccessSchema</code>).
        </p>
      </DocSection>
    </DocProse>
  );
}
