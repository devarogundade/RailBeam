import { createFileRoute } from "@tanstack/react-router";
import { DocCode } from "@/components/docs/doc-code";
import { DocPageHero, DocProse, DocSection } from "@/components/docs/doc-page";
import { DocResult } from "@/components/docs/doc-result";

export const Route = createFileRoute("/docs/users")({
  component: DocsUsers,
});

function DocsUsers() {
  return (
    <DocProse>
      <DocPageHero
        eyebrow="Account"
        title="Users & billing"
        description="Everything under /users/me/* after authentication: profile, conversations, chat history, credit cards, on-ramps, payment requests, KYC, and handler execution."
      />

      <DocSection title="Profile & threads">
        <DocCode title="Common calls">
          {`const profile = await sdk.users.getMe();

const page = await sdk.users.listConversations({ limit: 25 });

const history = await sdk.users.chatMessages({
  limit: 40,
  conversationId: page.conversations[0]?.id,
});`}
        </DocCode>
      </DocSection>

      <DocSection title="KYC shortcut">
        <p>
          <code className="text-foreground">sdk.kyc.get()</code> is a thin alias for{" "}
          <code className="text-foreground">sdk.users.getKycStatus()</code> — identical wire format.
        </p>
        <DocCode title="KYC status">
          {`const kyc = await sdk.kyc.get();`}
        </DocCode>
        <DocResult title="UserKycStatusDocument (example)">
          {`{
  "status": "verified",
  "updatedAt": "2026-05-14T12:00:00.000Z",
  "requirementsDue": []
}`}
        </DocResult>
      </DocSection>

      <DocSection title="Credit cards & on-ramps">
        <DocCode title="Cards & quotes">
          {`const cards = await sdk.users.listCreditCards();

const quote = await sdk.users.creditCardFundQuote({ amountCents: 5000 });

await sdk.users.fundCreditCard(cards.items[0].id, {
  amountCents: 5000,
});`}
        </DocCode>
      </DocSection>
    </DocProse>
  );
}
