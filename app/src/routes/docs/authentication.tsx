import { createFileRoute } from "@tanstack/react-router";
import { DocCallout } from "@/components/docs/doc-callout";
import { DocCode } from "@/components/docs/doc-code";
import { DocPageHero, DocProse, DocSection } from "@/components/docs/doc-page";
import { DocResult } from "@/components/docs/doc-result";

export const Route = createFileRoute("/docs/authentication")({
  component: DocsAuthentication,
});

function DocsAuthentication() {
  return (
    <DocProse>
      <DocPageHero
        eyebrow="Security"
        title="Authentication"
        description="Beam uses wallet-signed challenges. The SDK wraps POST /auth/challenge and POST /auth/verify, stores the JWT, and sends it as a Bearer token on protected routes."
      />

      <DocSection title="Callable auth namespace">
        <p>
          <code className="text-foreground">sdk.auth(wallet)</code> is an async function with attached helpers:{" "}
          <code className="text-foreground">challenge</code>, <code className="text-foreground">verify</code>, and{" "}
          <code className="text-foreground">me</code>. Calling <code className="text-foreground">verify</code> also
          updates the stored access token.
        </p>
        <DocCode title="Sign-in flow">
          {`import { BeamSdk, accountFromPrivateKey } from "@railbeam/beam-sdk";

const sdk = new BeamSdk({
  network: "testnet",
});

const wallet = accountFromPrivateKey(process.env.DEV_PRIVATE_KEY as \`0x\${string}\`);

const session = await sdk.auth(wallet);
console.log(session.accessToken);

const me = await sdk.auth.me();
console.log(me.walletAddress);`}
        </DocCode>
        <DocResult title="POST /auth/verify">
          {`{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
}`}
        </DocResult>
      </DocSection>

      <DocSection title="Manual session restore">
        <DocCode title="Persisted JWT">
          {`sdk.setAccessToken(savedToken);

// Later
sdk.getAccessToken(); // string | undefined`}
        </DocCode>
      </DocSection>

      <DocSection title="Transport headers">
        <p>
          Every request automatically includes <code className="text-foreground">X-Beam-Chain-Id</code> from the SDK
          network (or an explicit <code className="text-foreground">chainId</code> override).
        </p>
        <DocCallout variant="info" title="Errors">
          <p>
            Failed HTTP calls throw <code className="text-foreground">BeamApiError</code> with <code className="text-foreground">status</code>{" "}
            and <code className="text-foreground">bodyText</code> for debugging.
          </p>
        </DocCallout>
      </DocSection>
    </DocProse>
  );
}
