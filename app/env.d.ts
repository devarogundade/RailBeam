/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECT_ID: string;
  readonly VITE_CLIENT_URL: string;
  /** CAIP-2 network id for x402 (e.g. eip155:16601). Must match your facilitator. */
  readonly VITE_X402_NETWORK?: string;
  /** USDC contract on that chain, required when the backend has no built-in address for `VITE_X402_NETWORK`. */
  readonly VITE_X402_USDC_ASSET?: string;
  readonly VITE_EXPLORER_URL: string;
  readonly VITE_BEAM_GRAPH_URL?: string;
  readonly VITE_BEAM_TRANSACTION_URL?: string;
  readonly VITE_0G_RPC_URL?: string;
  readonly VITE_0G_STORAGE_INDEXER_URL?: string;
  readonly VITE_HOOK_MANAGER_ADDRESS?: string;
  readonly VITE_MERCHANT_MODULE_ADDRESS?: string;
  readonly VITE_FS_API_KEY: string;
  readonly VITE_FS_AUTH_DOMAIN: string;
  readonly VITE_FS_PROJECT_ID: string;
  readonly VITE_FS_STORAGE_BUCKET: string;
  readonly VITE_FS_MSG_SENDER_ID: string;
  readonly VITE_FS_APP_ID: string;
  readonly VITE_FS_MEASUREMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
