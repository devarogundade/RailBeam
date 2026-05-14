import { createFileRoute } from "@tanstack/react-router";
import { DocCode } from "@/components/docs/doc-code";
import { DocPageHero, DocProse, DocSection } from "@/components/docs/doc-page";
import { DocResult } from "@/components/docs/doc-result";

export const Route = createFileRoute("/docs/handlers-storage")({
  component: DocsHandlersStorage,
});

function DocsHandlersStorage() {
  return (
    <DocProse>
      <DocPageHero
        eyebrow="Automation"
        title="Handlers & storage"
        description="List runnable handler ids, invoke them with a signed-in wallet, and upload small payloads to 0G Storage through the authenticated relay."
      />

      <DocSection title="Handlers">
        <DocCode title="List & invoke">
          {`const { handlers } = await sdk.handlers.list();

await sdk.handlers.invoke("tax_report_pdf", {
  year: 2025,
});`}
        </DocCode>
        <DocResult title="handlersListResponseSchema">
          {`{
  "handlers": [
    "tax_report_pdf",
    "x402_checkout",
    "…"
  ]
}`}
        </DocResult>
      </DocSection>

      <DocSection title="Storage">
        <DocCode title="Upload & download">
          {`const uploaded = await sdk.storage.upload({
  content: "metadata json …",
});

const bytes = await sdk.storage.download(uploaded.rootHash);`}
        </DocCode>
        <p className="text-sm">
          Downloads return raw <code className="text-foreground">ArrayBuffer</code> bytes suitable for saving to disk
          or wrapping in a <code className="text-foreground">Blob</code>.
        </p>
      </DocSection>
    </DocProse>
  );
}
