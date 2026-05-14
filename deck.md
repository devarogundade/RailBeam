# Beam — Pitch deck (source content)

Structured like a classic investor deck. Replace bracketed placeholders (URLs, names, dates) with your go-to-market details.

---

## Page 01 — Cover

**Welcome to Beam.**

# Pitch Deck

**Presented by** [Your name / team]

| | |
|---|---|
| **Date** | [Month Day, Year] |
| **Website** | [your public URL or landing page] |
| **E-mail** | [contact email] |

**Beam** — Agentic finance on **0G**: marketplace, hired agents, treasury flows, and chain-backed settlement (including **x402**).

---

## Page 02 — The Problem We Solve

### The Problem We Solve

[Footer] [your URL] · **Page 02** · **Beam**

Crypto and on-chain finance still split **intent** from **execution**. Teams and power users stitch together wallets, dashboards, bots, and one-off scripts to move money, buy services, and stay compliant—yet there is no single workspace where **agents**, **treasury**, and **verifiable settlement** work as one system.

Manual handoffs are slow, error-prone, and hard to audit. Paying for real workloads on-chain (and proving payment) usually means custom integrations instead of a **standard, HTTP-native payment rail**.

---

## Page 03 — What’s Broken in Today’s Market

### What’s Broken in Today’s Market

**01.** **Fragmented operator UX**  
Users jump between wallets, spreadsheets, L2 bridges, and SaaS dashboards. There is no one place to **hire an agent**, **chat with context**, and **see financial activity** tied to real chain state.

**02.** **Settlement ≠ product**  
Teams want “pay as you go” and receipts that auditors and partners can trust. Today that often requires bespoke merchant flows instead of **protocol-level payment verification** aligned with how APIs and agents already speak HTTP.

**03.** **Treasury without guardrails**  
Cards, on-ramps, and team spend need policy, visibility, and automation. Bolting tools together rarely delivers **unified billing**, **KYC-aware flows**, and **clear limits** without heavy engineering.

[Footer] [your URL] · **Page 03** · **Beam**

| 01 | 02 | 03 |
|----|----|-----|
| **Fragmented operator UX** | **Settlement gap** | **Treasury & policy** |

---

## Page 04 — Our Solution, Reimagined

### Our Solution, Reimagined

**Agent-native workspace**  
Describe goals in natural language; **Beam** routes work to the right **agents** and **handlers** with conversation context and structured tools—not a pile of disconnected tabs.

**x402-aware, chain-backed payments**  
Exact on-chain settlement on **0G** with a dedicated **facilitator** service: **verify** / **settle** / **supported** so checkouts and APIs can treat payments like first-class infrastructure.

**One surface for treasury and trust**  
Stripe-backed **KYC**, **cards**, and **on-ramp** where your product needs them—while **MongoDB**, **Redis**, and **subgraph**-indexed catalog data keep state, sessions, and marketplace reality in sync.

[Footer] [your URL] · **Page 04** · **Beam**

| Pillar | One line |
|--------|----------|
| **Agent-native workspace** | Chat, hire, execute—with tools and receipts. |
| **x402 on 0G** | HTTP-native payment verification and settlement. |
| **Treasury & compliance hooks** | Cards, ramps, and policy without reinventing the stack. |

---

## Page 05 — Introducing Beam

### Introducing Beam

**Beam** is an **agentic finance workspace** on **0G**. Users and teams **discover agents** in a **marketplace**, **converse** with hired agents, orchestrate **treasury** and operational flows, and settle activity with **x402**-style verification via a small **facilitator** service and the **Stardorm** Nest API.

The **web client** (React, TanStack, Wagmi) talks to **Stardorm** for auth, conversations, handlers, and payments; **The Graph** (often via **Goldsky**) backs on-chain catalog views when configured. **Smart contracts** and the **subgraph** tie listings and activity to chain truth.

Built for **0G EVM** today; designed so product, agents, and settlement stay composable as the ecosystem grows.

[Footer] [your URL] · **Page 05** · **Beam**

---

## Page 06 — Key Features

### Key Features

> “We turn conversations and intents into **actionable finance**: agents with tools, subgraph-backed context, and settlement that doesn’t depend on ad-hoc wiring—so teams spend less time gluing systems and more time shipping product.”

- **Natural-language + structured tools** — Chat-first UX with **handler** payloads and agent replies grounded in your API contract (`@beam/stardorm-api-contract`).
- **Marketplace & catalog** — Agents and offerings informed by **on-chain** data where the subgraph is live.
- **Payments & invoices** — **Payment requests**, facilitator-aware checkout, and flows that fit real merchant and B2B needs.
- **Operational depth** — Activity, snapshots, and reporting-oriented services (e.g. financial activity, taxes helpers where configured) so operators aren’t flying blind.

[Footer] [your URL] · **Page 06** · **Beam**

---

## Page 07 — Integrations & stack depth

### 15+ integrations (representative)

Beam is intentionally **boring where it should be** and **opinionated where it matters**.

| Area | Examples |
|------|------------|
| **Chain & indexing** | **0G EVM**, **Goldsky**, **The Graph** subgraph |
| **Payments** | **x402** (`@x402/core` / `@x402/evm`), **Beam facilitator** (Nest) |
| **Fiat & compliance** | **Stripe** (KYC, cards, on-ramp, webhooks) |
| **Data & cache** | **MongoDB**, **Redis** |
| **Client** | **React 19**, **TanStack Router**, **Vite**, **Wagmi**, **Reown / WalletConnect** |
| **Compute & storage** | **0G**-oriented compute/storage hooks in **Stardorm** |
| **DevEx** | Shared **Zod** contracts, **Hardhat** / contracts repo, **Docker**-ready services |

[Footer] [your URL] · **Page 07** · **Beam**

---

## Page 08 — What early users are saying

### What early users are saying

*(Replace with real quotes when you have permission.)*

**[Name], Product / Growth**  
> “We wanted **agent-led** workflows without building a fifth internal dashboard. Beam gives us chat, handlers, and a payment story we can explain to finance.”

**[Name], Engineering lead**  
> “The **facilitator** boundary is clean: our API delegates verify/settle instead of every service owning chain keys and payment edge cases.”

**[Name], Treasury / Ops**  
> “Having **ramps and cards** in the same universe as **wallet auth** and activity reporting beats exporting CSVs from three vendors.”

[Footer] [your URL] · **Page 08** · **Beam**

---

## Page 09 — Product development roadmap

### Product development roadmap

**Phase 1 — MVP**  
Wallet **JWT** auth, conversations, core **handlers**, **payment requests**, facilitator **verify/settle** path on **0G**; subgraph-backed **catalog** where deployed.

**Phase 2 — Beta**  
Harden **Stripe** webhooks and **KYC** paths; expand **agent** marketplace UX; clearer **operator** dashboards for runs and spend.

**Phase 3 — Integrations**  
More **protocol** and **data** connectors; deeper **subgraph** coverage; optional **multi-env** subgraph switching; richer **storage / compute** usage on **0G** where product warrants it.

**Phase 4 — Scale**  
Performance, reliability, **rate limits**, and **higher execution** ceilings for agents and settlement; **observability** and SLOs for facilitator + API.

**Phase 5 — Expansion**  
**Enterprise** workspaces, team **policy**, SLAs, and **API**-first access for integrators; **multi-region** and **multi-chain** positioning as **0G** and **x402** ecosystems mature.

[Footer] [your URL] · **Page 09** · **Beam**

---

## Page 10 — Market opportunity

### Market opportunity

Beam sits at the intersection of **AI agents**, **on-chain commerce**, and **B2B fintech operations**.

| Layer | Thesis (illustrative sizing — replace with your research) |
|-------|-------------------------------------------------------------|
| **Global** | Programmable money + **HTTP-native payments** (**x402**) expanding TAM for machine-payable APIs and agent commerce. |
| **Enterprise** | Teams need **verified settlement**, **audit trails**, and **vendor** workflows—not only retail wallets. |
| **Mid-market** | Product companies want **one workspace** for **agents**, **billing**, and **treasury** without a year of integration work. |
| **Builders / SMB** | **Solo founders** and small teams adopt **opinionated stacks** (hosted API + facilitator + app) to ship **agentic finance** fast. |

[Footer] [your URL] · **Page 10** · **Beam**

---

## Page 11 — Business model

### Business model

> “We align revenue with **usage and trust**: clear pricing for operators, predictable unit economics on settlement and API calls, and room for **ecosystem** partners (agents, data, ramps).”

- **Platform & workspace tiers** — Seat or workspace fees for **marketplace**, **agent** limits, and **support** SLAs.
- **Take rate on flows** — Small **fee** on facilitated **x402** volume and/or **payment request** completion (configure to jurisdiction and partner rules).
- **Usage-based API** — Metered **handler** runs, **inference** (where enabled), **webhook** volume, and **premium** subgraph or **indexing** features.
- **Enterprise & white-label** — Custom **limits**, **VPC** / deployment options, **dedicated** facilitators or keys policy, and **professional services** for integrations.

[Footer] [your URL] · **Page 11** · **Beam**

---

## Page 12 — Meet the founding team

### Meet the founding team

**[Name]**  
*[Role — e.g. Protocol / Backend]*

**[Name]**  
*[Role — e.g. Product / Design]*

[Footer] [your URL] · **Page 12** · **Beam**

---

## Page 13 — Closing

### What will you **automate** next?

**Beam** — Hire agents, run treasury, settle with **x402** on **0G**.

**Contact us**  
[Primary CTA — e-mail or calendar link]

### Let’s build the future together

| **Date** | [Month Day, Year] |
| **Website** | [your URL] |
| **E-mail** | [contact email] |

[Footer] [your URL] · **Page 13** · **Beam**

---

## Speaker notes (optional)

- **Differentiator**: Emphasize **facilitator** as a security and ops boundary, shared **API contract** package, and **subgraph**-truth for marketplace—not “yet another chatbot.”
- **Risk**: Regulatory treatment of ramps, cards, and agent-mediated payments varies by region—pair this deck with counsel-reviewed positioning.
- **Demo path**: Live flow = sign in → open conversation → trigger handler that creates or settles a **payment request** → show activity / receipt in UI.
