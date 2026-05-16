/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STARDORM_API_URL?: string;
  readonly VITE_STARDORM_SUBGRAPH_URL_MAINNET?: string;
  readonly VITE_STARDORM_SUBGRAPH_URL_TESTNET?: string;
  /** Decimals for subgraph `paidAmount` (subscription receipts). Identity `feePerDay` is always native 18. */
  readonly VITE_STARDORM_PAYMENT_TOKEN_DECIMALS?: string;
  /** `IdentityRegistry` on 0G mainnet — on-chain subscribe / unsubscribe (hire / fire). */
  readonly VITE_IDENTITY_REGISTRY_ADDRESS_MAINNET?: string;
  /** `ReputationRegistry` on 0G mainnet — `giveFeedback` for ERC-8004 agents. */
  readonly VITE_REPUTATION_REGISTRY_ADDRESS_MAINNET?: string;
  /** `IdentityRegistry` on 0G testnet. */
  readonly VITE_IDENTITY_REGISTRY_ADDRESS_TESTNET?: string;
  /** `ReputationRegistry` on 0G testnet. */
  readonly VITE_REPUTATION_REGISTRY_ADDRESS_TESTNET?: string;
  /** Reown (WalletConnect) AppKit project id. */
  readonly VITE_REOWN_PROJECT_ID?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
