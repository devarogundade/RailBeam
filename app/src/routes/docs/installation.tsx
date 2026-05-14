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
        description="Add the Beam SDK to a TypeScript project, wire monorepo aliases if needed, and edit the baked-in network table when you deploy new infrastructure."
      />

      <DocSection title="npm dependency">
        <DocCode title="package.json">
          {`{
  "dependencies": {
    "@beam/beam-sdk": "file:../packages/beam-sdk",
    "@beam/stardorm-api-contract": "file:../packages/stardorm-api-contract"
  }
}`}
        </DocCode>
        <DocCallout variant="warning" title="Build the contract package first">
          <p>
            <code className="text-foreground">@beam/stardorm-api-contract</code> runs <code className="text-foreground">prepare</code>{" "}
            → <code className="text-foreground">tsup</code>. Install or build that workspace before installing the SDK
            so <code className="text-foreground">dist/</code> exists.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection title="Vite alias (this app)">
        <p>
          This monorepo resolves both packages from source roots in <code className="text-foreground">vite.config.ts</code>{" "}
          so local edits are picked up without publishing.
        </p>
        <DocCode title="vite.config.ts (excerpt)">
          {`resolve: {
  alias: {
    "@beam/stardorm-api-contract": stardormApiContractRoot,
    "@beam/beam-sdk": beamSdkRoot,
  },
},`}
        </DocCode>
      </DocSection>

      <DocSection title="Network presets (no constructor URLs)">
        <p>
          Defaults live in <code className="text-foreground">packages/beam-sdk/src/presets.ts</code> as{" "}
          <code className="text-foreground">BEAM_NETWORK_PRESETS</code>: per-network{" "}
          <code className="text-foreground">apiBaseUrl</code>, <code className="text-foreground">rpcUrl</code>,{" "}
          <code className="text-foreground">subgraphUrl</code>, and registry addresses. The shipped table targets local
          Stardorm on <code className="text-foreground">http://127.0.0.1:3000</code>; update the file for staging or
          production origins, and paste your GraphQL indexer URL when the subgraph is live.
        </p>
        <DocCallout variant="info" title="Beam web app still uses Vite env">
          <p>
            The React client continues to read <code className="text-foreground">VITE_STARDORM_API_URL</code> for its own
            axios instance — that is independent from the SDK preset table unless you wire them together yourself.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection title="Types without the SDK">
        <p>
          When you only need DTOs (for example in a Cloudflare Worker), depend on{" "}
          <code className="text-foreground">@beam/stardorm-api-contract</code> and import Zod schemas such as{" "}
          <code className="text-foreground">publicPaymentRequestSchema</code> or{" "}
          <code className="text-foreground">stardormChatSuccessSchema</code>.
        </p>
      </DocSection>
    </DocProse>
  );
}
