/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STARDORM_API_URL?: string;
  readonly VITE_STARDORM_SUBGRAPH_URL?: string;
  readonly VITE_STARDORM_SUBGRAPH_URL_MAINNET?: string;
  readonly VITE_STARDORM_SUBGRAPH_URL_TESTNET?: string;
  /** Decimals for subgraph `paidAmount` (subscription receipts). Identity `feePerDay` is always native 18. */
  readonly VITE_STARDORM_PAYMENT_TOKEN_DECIMALS?: string;
  /** `IdentityRegistry` on 0G — enables on-chain subscribe / unsubscribe (hire / fire). */
  readonly VITE_IDENTITY_REGISTRY_ADDRESS?: string;
  readonly VITE_IDENTITY_REGISTRY_MAINNET?: string;
  readonly VITE_IDENTITY_REGISTRY_TESTNET?: string;
  /** `ReputationRegistry` on 0G — `giveFeedback` for ERC-8004 agents. */
  readonly VITE_REPUTATION_REGISTRY_ADDRESS?: string;
  readonly VITE_REPUTATION_REGISTRY_MAINNET?: string;
  readonly VITE_REPUTATION_REGISTRY_TESTNET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
