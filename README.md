# RailBeam

## Hackathon submission

### One-liner
**RailBeam is an AI-powered planning + payments workflow that helps teams turn a goal into an actionable plan, then execute it with secure, trackable payment flows.**

### Problem
Planning and execution often break down after ideation:
- Plans are vague, not decomposed into actionable steps, and hard to iterate on.
- Execution lacks a “system of record” that connects tasks to real-world transactions.
- Teams need a lightweight way to go from **goal → plan → action → payment/audit trail**.

### Solution
RailBeam combines:
- **Plan creation**: generate and refine structured plans (steps, owners, milestones).
- **Agent-driven workflow**: a chat-based interface to iterate on the plan and drive next actions.
- **Payments shell**: a dedicated experience to initiate, review, and audit payment activity tied to the workflow.

### What we built
- **Create Plan UI**: create a plan from a prompt and iterate on it in-app.
- **Chat Agent experience**: conversational workflow to refine intent, generate steps, and track progress.
- **Payments settings**: configure payment-related settings needed for execution.
- **Payment shell layout**: a focused payments area for reviewing payment activity and details.

### Tech stack
- **Frontend (App)**: Vue (Single File Components)
- **Payments UI (Pay)**: Vue + composables for shell queries and transaction details
- **Backend**: Node-based backend (env-driven config)
- **Smart contracts**: Hardhat Ignition deployment artifacts included under `smart-contracts/`

### Architecture (high level)
- **App** (`app/`): primary UX for planning + agent chat.
- **Pay** (`pay/`): payments shell UX for transaction/activity views.
- **Backend** (`backend/`): API/services used by the frontends.
- **Smart contracts** (`smart-contracts/`): onchain components + deployment references.

### How to run locally
> This repo contains multiple apps. Use the commands below from the repo root.

#### Prerequisites
- Node.js (LTS recommended)
- Package manager (npm/pnpm/yarn)

#### Install
```bash
npm install
```

#### Run (typical)
```bash
npm run dev
```

> If your workspace uses Nx or separate package.json files per app, run the dev command inside `app/` and `pay/` as needed.

### Demo
- **Live demo**: _TODO_
- **Video walkthrough**: _TODO_
- **Pitch deck**: _TODO_

### Team
- _TODO: names + roles_

### Future work
- Add stronger plan ↔ payment linkage (each step can generate required transactions).
- End-to-end audit trail (who approved what, when, and why).
- Safer payment simulations + policy checks before execution.
