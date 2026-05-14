# Beam — Hackathon Submission

**The checkout layer for an AI-first economy.**  
One place where people *and* software discover what to buy, pay in small amounts when it makes sense, and settle with rules everyone can see — not buried in a spreadsheet.

---

## In one minute

Software is learning to shop, negotiate, and use paid APIs on its own. Meanwhile, most payment tools were built for humans swiping cards once a month. **Beam** is a financial workspace built for that gap: merchants and operators get real acceptance flows, **AI agents** get a seat at the table, and money moves in a way that fits **high-frequency, low-friction** commerce — including the emerging **“pay to unlock this link or file”** pattern the web is standardizing around.

We’re building on **0G** so discovery, identity, and settlement can live on infrastructure meant for the next wave of apps — not bolted on as an afterthought.

---

## The opportunity

| What’s changing | Why it’s hard today |
|-----------------|---------------------|
| **Agents pay per step** | Card rails and invoices weren’t designed for machines buying access millions of times at tiny amounts. |
| **Groups want to split naturally** | Shared costs still often mean Venmo chains, manual splits, or custom code — not a single, reusable pattern. |
| **Merchants pay a “storefront tax”** | Standing up catalog, checkout, chat, and trust signals across tools is slow; shoppers bounce between tabs. |
| **Premium = pay + access together** | Sellers need “they paid → they get in” in one beat, in a form **both people and agents** can follow. |

**Beam** turns that into a product story: *discover → agree → pay → unlock*, with room for **subscriptions**, **splits**, **QR-style checkout**, and **agent-native** flows so the same rail serves a coffee shop and an autonomous buyer.

---

## What Beam is

Think of Beam as **financial rails plus a workspace**: not only moving value, but tying **payment to permission** so the moment money clears, the right doors open — for a person *or* for code acting on their behalf.

- **For merchants & operators** — Faster path from “here’s what we sell” (including **AI sales assistants**) to **paid outcomes**, with less glue between dashboard, wallet, and chain.
- **For users** — Familiar flows where amounts and who gets paid are easier to reason about; optional **split-the-bill** style experiences without leaving the product narrative.
- **For builders & agents** — A structured way to handle **micropayments**, gated resources, and on-chain settlement so every new partner doesn’t mean a new one-off payment integration.

We align with **Track 3 — financial and service layer for the AI era**: programmable settlement, agent marketplaces, pay-per-resource access, and collaboration patterns where **multiple parties** can coordinate toward the same purchase or subscription.

---

## How it works (without the wiring diagram)

1. **Discovery & trust** — Catalog and agent experiences can lean on **on-chain registries** and indexing so “who is this merchant / agent?” isn’t only whatever a single database says today.
2. **Pay in the shape of the internet** — Where APIs and files return “payment required,” Beam participates in **HTTP-native paid access** flows so **software** can complete a purchase the same way a browser would — suitable for **per-request** and **per-resource** pricing.
3. **Heavy lifting off the main thread** — Large files and payloads can sit on **decentralized storage** while **hashes and payment paths** stay compact — so agents aren’t forced to drag megabytes through a chain just to prove delivery.
4. **When privacy matters** — Sensitive policy or inference can sit alongside **attestable compute** so high-trust commerce isn’t only “trust us, we ran it on our server.”
5. **Fiat where the real world still knocks** — Where regulation matters, paths for **KYC, cards, and on-ramp** meet the same product so the demo isn’t “crypto only” by default.

*Under the hood this repo includes smart contracts on **0G**, a **subgraph** for indexed data, an **x402-style facilitator** for verification/settlement, a **Stardorm** API, and a **React** app — judges who want ports, env vars, and commands will find them in the root [`README.md`](README.md).*

---

## Why this wins

**Composable revenue** — Splits, repeat billing, and shared unlocks become patterns merchants and wallets can reuse instead of renegotiating every time.

**Agent-ready by design** — Clear payment “shapes” (plain offers, gated resources, on-chain transfers) so automation stays **predictable** for clients and partners.

**Decentralized delivery, centralized clarity** — Content and large artifacts can live on **durable, content-addressed storage** while **rules and receipts** stay where they’re easy to audit.

**One workspace narrative** — Marketplace, chat, treasury, and settlement in one story: **less tab-hopping**, more “we actually shipped a product surface,” not only a protocol slide.

---

## Hackathon progress

_Add your sprint story here — demo URL, 90-second video, what you’d ship in the next week._

| Highlight | Notes |
|-----------|--------|
| Live demo | _Link_ |
| Walkthrough | _Video_ |
| Deployments | _0G testnet / mainnet, indexer, facilitator_ |
| Team | _Names · roles · best contact_ |

---

## Links

| Resource | URL |
|----------|-----|
| **x402** (paid HTTP resources) | https://docs.x402.org/ |
| **0G** explorer | https://chainscan.0g.ai |
| **This repo** | Technical setup, architecture, and contract addresses: [`README.md`](README.md) |

---

**Beam** — *Pay like software thinks. Sell like the chain is watching. Let agents pull up a chair.*
