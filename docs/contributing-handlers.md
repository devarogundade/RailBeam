# Contributing: chat handlers

Use this guide when you open a PR that adds or changes a **handler** — a wallet-scoped server action the model can propose in chat (CTA button, optional rich form) and the user runs via `POST /users/me/chat/execute-handler` or `POST /handlers/:handleId`.

---

## PR description template (copy below the line)

```markdown
## Summary
- Adds handler `<handler_id>`: <one sentence on user-facing behavior>.
- <Note contract / UI / agent prompt changes if any>.

## Handler checklist
- [ ] `HANDLER_ACTION_IDS` in `@beam/stardorm-api-contract`
- [ ] Nest: service + `HandlersModule` + `HandlersService.dispatch`
- [ ] Zod input (contract and/or `handler-inputs.schema.ts`)
- [ ] `buildOpenAiHandlerTools` (+ optional `offer_*_form` tools)
- [ ] `stardorm-agent-reply.schema.ts` (validate + normalize tool → `handlerCta`)
- [ ] `handler-workspace-routing.ts` if workspace / hire flows need CTA copy or forms
- [ ] `UserService.executeHandler` if CTA-stored params need special merge / validation
- [ ] App chat UI (`chat.tsx`, rich block types in contract) if new buttons or forms
- [ ] On-chain / catalog: `handlerCapabilities` (or merge logic) if the tool must be gated to specific agents

## Test plan
- [ ] `GET /handlers` lists the new id
- [ ] Authenticated `POST /handlers/<id>` with valid body returns expected `HandlerMessage`
- [ ] Chat: model (or mocked tool call) produces CTA; **Run** succeeds with `ctaMessageId`
- [ ] Workspace-only path (if applicable): user with capability sees form + CTA
```

---

## What a handler is

1. **Id** — Stable string in `HANDLER_ACTION_IDS` (e.g. `generate_tax_report`). The OpenAI tool name usually **matches** this id.
2. **Implementation** — A Nest injectable that parses `body` with Zod, uses `HandlerContext` (`walletAddress`, optional `clientEvmChainId`, `conversationId`), and returns `HandlerMessage` (`message`, optional `attachments`, `data`, `rich`).
3. **Chat path** — The assistant reply can include `handler` + `params` (+ optional `rich`). The client stores a **handler CTA** on the message; execution requires `ctaMessageId` pointing at that message (`executeHandlerBodySchema` in the API contract).
4. **Direct API** — `POST /handlers/:handleId` invokes the same dispatch with a JWT wallet (no CTA), used for integrations and testing.

---

## Layers to touch (in order)

### 1. API contract (source of truth)

**File:** `packages/stardorm-api-contract/src/handlers.ts`

- Append the new id to `HANDLER_ACTION_IDS` (keep the comment that points at `handlers.service.ts` accurate).
- Rebuild or link the package so backend and app pick up new types (`HandlerActionId`, `handlerActionIdSchema`, chat schemas that reference handlers).

Anything that embeds handler ids (e.g. `executeHandlerBodySchema`, `chatHistoryHandlerCtaSchema`, marketplace `requiredHandler`) updates automatically from `handlerActionIdSchema` once the enum list changes.

### 2. Backend — execution

| Area | What to do |
|------|------------|
| `backend/src/handlers/<feature>.service.ts` | Implement `HandlerService`: `readonly id`, `handle(raw, ctx)`. Parse with Zod; throw `BadRequestException` for invalid input. |
| `backend/src/handlers/handlers.module.ts` | Register provider; import modules that expose dependencies (Stripe, Mongo, etc.). |
| `backend/src/handlers/handlers.service.ts` | Inject service, add `case '<id>': return this.<svc>.handle(body, ctx)`. |
| `backend/src/handlers/handler-inputs.schema.ts` | Add or extend Zod schemas shared with agent tools / execute path (pattern varies: some inputs live in the contract package). |

`handlers.controller.ts` lists ids from the contract; no change needed unless you add non-standard routes.

### 3. Backend — agent tools and structured replies

| File | Purpose |
|------|---------|
| `backend/src/agent-reply/stardorm-handler-tools.ts` | Define OpenAI `function` tool(s): `buildOpenAiHandlerTools` must `push` your tool when `allowed.includes('<id>')`. Checkout-style flows often add both a **create** tool and an **offer\_\*\_checkout\_form** tool. |
| `backend/src/agent-reply/stardorm-agent-reply.schema.ts` | Validate tool arguments, map tool calls and JSON replies into `{ text, handler, params, rich? }`. Every handler id should have matching branches (search for existing `handler === '...'` patterns). |
| `backend/src/agent-reply/handler-workspace-routing.ts` | Optional CTA copy (`HANDLER_CTA_LINES`), regex fallbacks (`HANDLER_USER_INTENT_RULES`), and `buildHandlerWorkspaceOffer` switch arms for hired / workspace agents. |

System prompt fragments for tool calling are built from `allowedHandlers` in the same schema module — extend those when the model needs new parameter documentation.

### 4. Backend — chat execute path

**File:** `backend/src/user/user.service.ts` — `executeHandler`

If the CTA stores template params (checkout forms, Stripe KYC, etc.), add branches that merge **stored** CTA params with the **request** body and validate before calling `HandlersService.dispatch`. Pass `conversationId` in `HandlerContext` when the handler needs return URLs or webhook correlation.

### 5. Who gets the tool?

**File:** `backend/src/user/user.service.ts` — `mergeHandlersForChatKeys`

Allowed tools are the **union** of `handlerCapabilities` from catalog/subgraph for the active agent, subscriptions, clones, and workspace keys. New handlers only appear in chat if on-chain (or catalog) metadata lists them — align with `handlerCapabilities` / merge helpers, or document a deliberate global exception (similar to `suggest_marketplace_hire`).

### 6. Frontend

**File:** `app/src/components/chat.tsx` (and related components)

- Button labels: `handlerCtaLabel` and any handler-specific panels.
- Rich blocks: if you add a new `StardormChatRichBlock` `type`, define it in the contract (`chat-api` / rich block schema) and render it next to existing `x402_checkout_form`, `transfer_checkout_form`, etc.

**File:** `app/src/lib/stardorm-api.ts` — uses contract schemas for `executeHandler` and `handlers.invoke`; usually no change if schemas are updated.

### 7. Docs and examples

Update in-repo docs that show handler ids (e.g. `app/src/routes/docs/handlers-storage.tsx`) so examples stay consistent with `GET /handlers`.

---

## Conventions

- **Naming:** Prefer `snake_case` ids consistent with existing tools and OpenAI `function.name`.
- **Validation:** Prefer Zod in one place and reuse from both tool-args parsing and `handle()`.
- **Security:** Handlers run as the authenticated wallet; never trust client-only checks for limits or eligibility.
- **Types:** After editing the contract, ensure TypeScript exhaustiveness (e.g. `switch (handleId)` in `HandlersService`) — a missing `case` should fail compilation.

---

## Quick reference paths

| Concern | Path |
|---------|------|
| Handler id list | `packages/stardorm-api-contract/src/handlers.ts` |
| Dispatch switch | `backend/src/handlers/handlers.service.ts` |
| OpenAI tools | `backend/src/agent-reply/stardorm-handler-tools.ts` |
| Reply normalization | `backend/src/agent-reply/stardorm-agent-reply.schema.ts` |
| Workspace CTAs | `backend/src/agent-reply/handler-workspace-routing.ts` |
| Chat execution | `backend/src/user/user.service.ts` (`executeHandler`) |
| Chat UI | `app/src/components/chat.tsx` |

For questions about **0G Storage** or handler-adjacent uploads, see the in-app doc route **Handlers & storage** (`/docs/handlers-storage`) and align examples with live handler ids from `GET /handlers`.
