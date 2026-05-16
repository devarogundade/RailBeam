# Beam

Monorepo for **Beam** — an agentic finance workspace on **0G**: marketplace, chat with hired agents, treasury flows, and chain-backed settlement (including [x402](https://docs.x402.org/) payment verification via a dedicated facilitator service).

This repository contains:

| Path | Role |
|------|------|
| [`app/`](app/) | Web client (React 19, TanStack Start / Router, Vite, Wagmi, Tailwind) |
| [`backend/`](backend/) | **Stardorm** NestJS API — auth, users, agents, payments, Stripe/KYC, 0G compute/storage hooks, subgraph-backed catalog |
| [`facilitator/`](facilitator/) | Small NestJS **x402 facilitator** — HTTP `verify` / `settle` / `supported` for EVM exact payments on 0G |
| [`packages/stardorm-api-contract/`](packages/stardorm-api-contract/) | Shared Zod schemas and API types consumed by `app` and `backend` |
| [`smart-contracts/`](smart-contracts/) | Hardhat, Ignition deployments, and The Graph subgraph (see [Smart contracts and subgraph](#smart-contracts-and-subgraph-0g)) |

Product positioning and narrative live in [`deck.md`](deck.md).

---

## Overview

### Architecture (high level)

```mermaid
flowchart LR
  subgraph client [Browser]
    App[app - Vite / TanStack]
  end
  subgraph apis [Services]
    API[backend - NestJS]
    Fac[facilitator - x402]
  end
  subgraph external [External]
    Stripe[Stripe]
  end
  subgraph data [Data and chain]
    Mongo[(MongoDB)]
    Redis[(Redis)]
    Goldsky[Goldsky]
    Subgraph[The Graph subgraph]
    Chain[0G EVM]
  end
  App -->|REST + JWT| API
  App -->|WSS| API
  API -->|optional verify/settle| Fac
  API -->|KYC / cards / on-ramp| Stripe
  Stripe -->|webhooks| API
  API --> Mongo
  API --> Redis
  Chain --> Goldsky
  Goldsky -->|index / host| Subgraph
  API --> Subgraph
  Fac --> Chain
  App --> Chain
```

- The **app** talks to the **backend** (`VITE_STARDORM_API_URL`) for wallet auth, conversations, handlers, and payment APIs. It can read on-chain/agent catalog data from a **subgraph** when `VITE_STARDORM_SUBGRAPH_URL_MAINNET` / `VITE_STARDORM_SUBGRAPH_URL_TESTNET` are set for the active 0G tier (often a **Goldsky**-hosted GraphQL endpoint; see [`smart-contracts/subgraph/`](smart-contracts/subgraph/)).
- The **backend** persists state in **MongoDB**, may call **0G** RPCs and SDKs for compute/storage, calls **Stripe** for KYC, card funding, and on-ramp flows (with **webhooks** back into the API), and calls the **facilitator** when `X402_FACILITATOR_URL` is set and a checkout uses facilitator settlement.
- The **facilitator** holds an EVM private key and uses `@x402/core` + `@x402/evm` to verify and settle payments on the configured 0G network.

### Default ports (local)

| Service | Port | Notes |
|---------|------|--------|
| Backend (`PORT`) | `3000` | Nest default in code / compose |
| Facilitator (`PORT`) | `3402` | Nest default in code / compose |
| Redis (Docker host mapping) | `6378` → container `6379` | Declared in compose for future or multi-instance use |
| App (Vite) | Vite default (often `5173`) | Set in terminal when you run `pnpm dev` |

---

## Smart contracts and subgraph (0G)

On-chain **EIP-8004**–style registries (**IdentityRegistry**, **ReputationRegistry**, **ValidationRegistry**) live under [`smart-contracts/`](smart-contracts/). Hardhat networks are named **`zogMainnet`** (chain id **16661**) and **`zogTestnet`** / Galileo (**16602**); RPC URLs are set in [`smart-contracts/hardhat.config.ts`](smart-contracts/hardhat.config.ts).

### Deployed registry addresses

Canonical outputs from Ignition are committed under [`smart-contracts/ignition/deployments/`](smart-contracts/ignition/deployments/) as `deployed_addresses.json` per chain. The following matches the checked-in manifests at the time of this guide (redeploys change addresses — update the repo and any subgraph manifest when you ship new contracts).

| Network | Chain id | IdentityRegistry | ReputationRegistry | ValidationRegistry |
|---------|----------|-------------------|--------------------|--------------------|
| **0G mainnet** | 16661 | `0x950Ab17d75b65430a2e5536b0d269abFAD0bc30F` | `0x8Bc1926c91D7c7031A76FfE23057037694d529eb` | `0x4697B37fDeb796E450a46007591fcFFe8baD8124` |
| **0G testnet** (Galileo) | 16602 | `0xAA7d78F40743fA03AD59CcCb558C968CaE69e337` | `0x955be54f2169A5Acd3607c647Dbbf6558Cf7907a` | `0x4E768bf6Bf892C9a9c4627C3B68ea90E509e1d11` |

For new subgraph deployments aligned with these addresses, you can read creation blocks from [`smart-contracts/ignition/deployments/chain-16661/journal.jsonl`](smart-contracts/ignition/deployments/chain-16661/journal.jsonl) and `chain-16602/journal.jsonl` (search for `TRANSACTION_CONFIRM` / `blockNumber`). Example: mainnet IdentityRegistry in that journal deployed at block **`33256416`**.

Explorers: [0G Chainscan](https://chainscan.0g.ai) (mainnet), [0G Chainscan (testnet)](https://chainscan-testnet.0g.ai).

### Deploying contracts (Ignition)

From `smart-contracts/`:

1. Set **`MNEMONIC`** in `.env` (or your shell) to a funded deployer on the target network.
2. Compile: `npx hardhat compile`
3. Deploy the bundled **Stardorm8004** module (three registries plus seed agent registrations):

```bash
cd smart-contracts
pnpm run deploy:stardorm8004          # zogMainnet
pnpm run deploy:testnet:stardorm8004 # zogTestnet
```

Equivalent: `npx hardhat ignition deploy ./ignition/modules/Stardorm8004.ts --network zogMainnet` (or `zogTestnet`). Optional verification uses the Hardhat verify config in `hardhat.config.ts` and [0G Chainscan contract verification](https://chainscan.0g.ai).

### Subgraph (The Graph / Goldsky)

Indexer code and manifest live in [`smart-contracts/subgraph/`](smart-contracts/subgraph/). The checked-in [`subgraph.yaml`](smart-contracts/subgraph/subgraph.yaml) targets Goldsky’s **`0g-galileo-testnet`** network slug and the **testnet** addresses above. For each data source, set `startBlock` to the **contract creation block or earlier**; if it is **after** creation, the indexer misses early events. Raising `startBlock` toward that creation block (without passing it) reduces empty scanning versus an unnecessarily low value. The committed manifest uses `33278700` as a conservative starting point — bump it after a redeploy if you want faster sync.

Typical workflow:

1. **`npx hardhat compile`** in `smart-contracts/` so artifacts exist.
2. Copy ABIs into the subgraph package: `pnpm run subgraph:build` from `smart-contracts/` (runs `scripts/copy-subgraph-abis.mjs` then `graph build` inside `subgraph/`), or stepwise: `pnpm run subgraph:abis` then `cd subgraph && npm i && npm run codegen && npm run build`.
3. Edit **`subgraph.yaml`** (or add a separate manifest for mainnet) with `source.address` and `source.startBlock` for each data source, and the correct Goldsky **`network:`** slug for that chain.
4. Deploy to Goldsky (after `goldsky login`): see comments in the manifest and [`smart-contracts/subgraph/package.json`](smart-contracts/subgraph/package.json) scripts `deploy:goldsky` / `deploy:testnet:goldsky`, and [Goldsky’s subgraph docs](https://docs.goldsky.com/subgraphs/deploying-subgraphs).

### Wiring the app and API

- **Frontend**: set `VITE_STARDORM_SUBGRAPH_URL_MAINNET` and `VITE_STARDORM_SUBGRAPH_URL_TESTNET` to your deployed GraphQL HTTP endpoints; set `VITE_IDENTITY_REGISTRY_ADDRESS_MAINNET` / `VITE_REPUTATION_REGISTRY_ADDRESS_MAINNET` and the `*_TESTNET` pairs for on-chain UI actions ([`app/.env.example`](app/.env.example)).
- **Backend**: `STARDORM_SUBGRAPH_URL` and optional `STARDORM_SUBGRAPH_URL_MAINNET` / `STARDORM_SUBGRAPH_URL_TESTNET` ([`backend/.env.example`](backend/.env.example)).

---

## Backend developer guide

### Prerequisites

- **Node.js** (LTS 20+ recommended; align with your team’s version)
- **pnpm** (`corepack enable` or `npm i -g pnpm`)
- **MongoDB** reachable at `MONGODB_URI`

### First-time setup

```bash
cd packages/stardorm-api-contract
pnpm install
pnpm build

cd ../../backend
cp .env.example .env
# Edit .env — at minimum MONGODB_URI, JWT_SECRET, CORS_ORIGINS, and URLs below.

pnpm install
```

For **x402 facilitator settlement** from the API, set `X402_FACILITATOR_URL` to a running facilitator (e.g. `http://localhost:3402` locally, or `http://facilitator:3402` inside Docker).

### Run

```bash
cd backend
pnpm run start:dev    # watch mode
# pnpm run start      # single run
# pnpm run start:prod # after pnpm run build
```

### Useful scripts

| Script | Purpose |
|--------|---------|
| `pnpm run build` | Nest compile to `dist/` |
| `pnpm run lint` | ESLint |
| `pnpm run test` | Jest unit tests |
| `pnpm run test:e2e` | E2E tests (`test/jest-e2e.json`) |

### Where to look in the code

- **HTTP surface**: `src/*/*.controller.ts`, `src/app.controller.ts`
- **Auth / JWT**: `src/auth/`
- **Payments + facilitator client**: `src/payments/` (e.g. `x402-facilitator.service.ts`, `payment-requests.service.ts`)
- **Agent tools / handler payloads**: `src/agent-reply/`, `src/handlers/`
- **Stripe / KYC / on-ramp**: `src/stripe/`
- **Mongo models**: `src/mongo/schemas/`
- **Subgraph**: `src/subgraph/`
- **0G compute / storage**: `src/og/`, `src/storage/`

### Contract package changes

If you change `packages/stardorm-api-contract`, rebuild it (`pnpm run build` in that package) so TypeScript and runtime consumers in `backend` pick up new types and bundled output.

---

## Frontend developer guide

### Prerequisites

- **Node.js** + **pnpm**
- Built **`@railbeam/stardorm-api-contract`** (same as backend): build `packages/stardorm-api-contract` so `dist/` exists. From the **repository root**, run **`npm install`** so workspaces link **`@railbeam/beam-sdk`** and the contract package into `app`.

### First-time setup

```bash
cd packages/stardorm-api-contract
pnpm install
pnpm build

cd ../../app
cp .env.example .env
# Set VITE_STARDORM_API_URL to your backend (e.g. http://localhost:3000)

pnpm install
```

### Run

```bash
cd app
pnpm dev
```

### Build and preview

From the repository root (builds workspace packages, then the app):

```bash
pnpm install
pnpm run build:app
```

From `app/` only (after workspace packages are built):

```bash
cd app
pnpm run build
pnpm run preview
```

### Netlify

Deploy from the **repository root** (leave **Base directory** empty in the Netlify UI). Root [`netlify.toml`](netlify.toml) runs `pnpm run build:app`, which builds workspace packages and the app, then publishes `app/dist/client` (TanStack Start **SPA mode** — static shell + client-side routing). Requires **Node 22+**.

### Lint / format

```bash
pnpm run lint
pnpm run format
```

### Stack notes

- **Routing**: TanStack Router under `src/routes/`
- **Wallet**: Wagmi + Reown AppKit (`VITE_REOWN_PROJECT_ID` when using WalletConnect)
- **Server API URL**: `VITE_STARDORM_API_URL` (see [Environment variables](#environment-variables))

---

## Facilitator developer guide

The **facilitator** is a minimal NestJS app that exposes the x402 facilitator HTTP API used by the backend’s `HTTPFacilitatorClient` flow (`verify`, `settle`, `supported`).

### Prerequisites

- **Node.js**
- **npm** (this package ships `package-lock.json`; Docker build uses `npm ci`)

### First-time setup

```bash
cd facilitator
cp .env.example .env
# Required: PRIVATE_KEY (0x-prefixed). Optional: X402_EVM_NETWORKS (comma-separated CAIP-2 ids; default mainnet + testnet)

npm install
```

### Run

```bash
npm run start:dev
# npm run start:prod  # after npm run build
```

### Configuration

- **`PRIVATE_KEY`**: EVM key for the facilitator signer (must fund gas on 0G).
- **`X402_EVM_NETWORKS`**: comma-separated CAIP-2 ids (e.g. `eip155:16661,eip155:16602`). Omit for both 0G mainnet and testnet. Unsupported values throw at startup.
- **`OG_RPC_URL_MAINNET`**, **`OG_RPC_URL_TESTNET`**: optional JSON-RPC overrides; see `facilitator/.env.example`.
- **`PORT`**: listen port (default `3402`).

### HTTP API (summary)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/verify`, `/settle` | JSON description of POST bodies |
| `POST` | `/verify` | Verify a payment payload against requirements |
| `POST` | `/settle` | Settle on-chain |
| `GET` | `/supported` | Supported schemes / networks |

### Production image

See [`facilitator/Dockerfile`](facilitator/Dockerfile): multi-stage Node 22 Alpine build, `npm ci`, `nest build`, production `node dist/main`.

---

## Docker: backend and facilitator

[`docker-compose.yml`](docker-compose.yml) defines three services:

1. **`facilitator`** — build context `./facilitator`, image built from `facilitator/Dockerfile`, env from `./facilitator/.env`, exposes **3402**.
2. **`backend`** — build context `./backend`, depends on `facilitator` and `redis`, env from `./backend/.env`, injects `X402_FACILITATOR_URL=http://facilitator:3402` and `REDIS_URL=redis://redis:6379`, exposes **3000**.
3. **`redis`** — `redis:7-alpine`, host port **6378** mapped to container **6379**, AOF volume `redis_data`.

### Before you compose

1. Copy env files (compose uses **`.env`**, not `.env.example`):
   - `facilitator/.env` from [`facilitator/.env.example`](facilitator/.env.example)
   - `backend/.env` from [`backend/.env.example`](backend/.env.example) — must include everything the Nest app needs at runtime (MongoDB, JWT, etc.). Compose **overrides** `PORT`, `X402_FACILITATOR_URL`, and `REDIS_URL` for in-network URLs.

2. **Backend image**: the compose file expects a **`Dockerfile` under `backend/`**. This repository currently includes a production **`Dockerfile` only under `facilitator/`**. If `docker compose build backend` fails with a missing Dockerfile, either:
   - add a `backend/Dockerfile` (multi-stage pattern similar to the facilitator, using **pnpm** and `pnpm run build` / `node dist/main`), or  
   - run Redis + facilitator with Compose and run the **backend on the host** with `X402_FACILITATOR_URL=http://localhost:3402` and `REDIS_URL=redis://localhost:6378`.

### Commands

```bash
# From repository root
docker compose build
docker compose up
```

After `up`, from the host machine: backend at `http://localhost:3000`, facilitator at `http://localhost:3402`, Redis at `localhost:6378`.

---

## Environment variables

Canonical templates live next to each app:

| File | Consumer |
|------|----------|
| [`backend/.env.example`](backend/.env.example) | Nest API — copy to `backend/.env` |
| [`app/.env.example`](app/.env.example) | Vite — copy to `app/.env` (only `VITE_*` are exposed to the browser) |
| [`facilitator/.env.example`](facilitator/.env.example) | Facilitator — copy to `facilitator/.env` |

### Backend (`backend/.env`) — grouped by concern

- **Core**: `MONGODB_URI`, `JWT_SECRET`, `PORT`, `CORS_ORIGINS` (comma-separated origin prefixes; `*` allows any origin in dev — see comments in `.env.example`)
- **x402**: `X402_FACILITATOR_URL` (base URL of facilitator HTTP API)
- **Indexing / chain**: `STARDORM_SUBGRAPH_URL`, optional `STARDORM_SUBGRAPH_URL_MAINNET` / `_TESTNET`, `X-Beam-Chain-Id` behavior per `.env.example`
- **0G / EVM RPCs**: `PRIVATE_KEY`, `OG_RPC_URL_MAINNET`, `OG_RPC_URL_TESTNET`, `ONRAMP_RPC_*`, `OG_STORAGE_INDEXER_RPC`, etc.
- **Chainscan / tax helpers**: `CHAINSCAN_API_URL`, tier overrides; native USD spot via `COINMARKETCAP_API_KEY` + `REDIS_URL` (24h cache, CMC symbol `0G`)
- **Stripe / KYC / webhooks**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_PUBLIC_URL`
- **Virtual card / treasury** (when features enabled): `CREDIT_CARD_FUND_RECIPIENT`, `CREDIT_CARD_TREASURY_PRIVATE_KEY`, `ONRAMP_TREASURY_PRIVATE_KEY`
- **Inference**: `INFERENCE_USE_RESPONSES_API`

Details and event names for Stripe webhooks are documented inline in [`backend/.env.example`](backend/.env.example).

### Frontend (`app/.env`)

- **`VITE_STARDORM_API_URL`**: Backend origin (e.g. `http://localhost:3000`)
- **`VITE_STARDORM_SUBGRAPH_URL_MAINNET`** / **`VITE_STARDORM_SUBGRAPH_URL_TESTNET`**: GraphQL HTTP endpoints per 0G tier for marketplace / on-chain data
- **Optional**: `VITE_STARDORM_PAYMENT_TOKEN_DECIMALS`, per-network registry addresses (`VITE_IDENTITY_REGISTRY_ADDRESS_*`, `VITE_REPUTATION_REGISTRY_ADDRESS_*`), `VITE_REOWN_PROJECT_ID`

### Facilitator (`facilitator/.env`)

- **`PRIVATE_KEY`**: Required — facilitator signer
- **`X402_EVM_NETWORKS`**: Optional — comma-separated `eip155:16661` / `eip155:16602`; default is both networks
- **`OG_RPC_URL_MAINNET`**, **`OG_RPC_URL_TESTNET`**, **`PORT`**: Optional overrides

---

## Related docs

- This file, [Smart contracts and subgraph](#smart-contracts-and-subgraph-0g) — deployments, addresses, indexer workflow
- [`smart-contracts/README.md`](smart-contracts/README.md) — upstream Hardhat 3 sample / generic test commands
- [`deck.md`](deck.md) — product narrative
