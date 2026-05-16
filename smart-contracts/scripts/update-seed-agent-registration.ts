/**
 * Sync on-chain IdentityRegistry seed agents with `ignition/data/seedAgentUris.ts`.
 *
 * For each canonical catalog agent (token id 1 … N), when the signer owns the NFT:
 *   - `setAgentURI(agentId, uri)` — EIP-8004 registration JSON (token URI)
 *   - `setMetadata(agentId, "handlerCapabilities", hex)` — comma-separated handler ids
 *
 * Prerequisites:
 *   - `MNEMONIC` in `smart-contracts/.env` (same as deploy)
 *   - Signer must be `ownerOf(agentId)` for every id you update (usually the deployer)
 *
 * Usage:
 *   npx hardhat run scripts/update-seed-agent-registration.ts --network zogTestnet
 *   npx hardhat run scripts/update-seed-agent-registration.ts --network zogMainnet
 *
 * Options (env vars — Hardhat 3 does not forward custom CLI flags to scripts):
 *   DRY_RUN=1              Print diffs only; do not send transactions
 *   ONLY_AGENT_IDS=4       Single id (e.g. 4 = scribe)
 *   ONLY_AGENT_IDS=3,4,8   Comma-separated agent ids
 *   SKIP_URI=1             Only refresh handlerCapabilities metadata
 *   FORCE=1                Send txs even when on-chain values already match
 *
 * Examples:
 *   DRY_RUN=1 npm run update:seed-agents:testnet
 *   ONLY_AGENT_IDS=4 npm run update:seed-agents:testnet
 *
 * Override registry address (optional):
 *   IDENTITY_REGISTRY_ADDRESS=0x...
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";
import {
  getAddress,
  hexToString,
  stringToHex,
  type Address,
  type Hex,
} from "viem";

import {
  STARDORM_CATALOG_AGENT_KEYS_ORDERED,
  STARDORM_SEED_AGENT_URIS,
} from "../ignition/data/seedAgentUris.js";

const HANDLER_CAPABILITIES_KEY = "handlerCapabilities";
const IDENTITY_DEPLOYMENT_KEY =
  "StardormIdentityRegistryModule#IdentityRegistry";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

type CliOptions = {
  dryRun: boolean;
  force: boolean;
  skipUri: boolean;
  onlyAgentIds: number[] | null;
};

function envFlag(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function parseCli(): CliOptions {
  const dryRun = envFlag("DRY_RUN");
  const force = envFlag("FORCE");
  const skipUri = envFlag("SKIP_URI");
  let onlyAgentIds: number[] | null = null;
  const rawOnly = process.env.ONLY_AGENT_IDS?.trim();
  if (rawOnly) {
    onlyAgentIds = rawOnly
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (onlyAgentIds.length === 0) {
      throw new Error("ONLY_AGENT_IDS: no valid agent ids");
    }
  }
  return { dryRun, force, skipUri, onlyAgentIds };
}

function resolveIdentityRegistryAddress(chainId: number): Address {
  const fromEnv = process.env.IDENTITY_REGISTRY_ADDRESS?.trim();
  if (fromEnv) return getAddress(fromEnv);

  const deployedPath = join(
    REPO_ROOT,
    "ignition",
    "deployments",
    `chain-${chainId}`,
    "deployed_addresses.json",
  );
  if (!existsSync(deployedPath)) {
    throw new Error(
      `No deployment at ${deployedPath}. Set IDENTITY_REGISTRY_ADDRESS or deploy IdentityRegistry first.`,
    );
  }
  const deployed = JSON.parse(readFileSync(deployedPath, "utf8")) as Record<
    string,
    string
  >;
  const addr = deployed[IDENTITY_DEPLOYMENT_KEY];
  if (!addr) {
    throw new Error(
      `Missing ${IDENTITY_DEPLOYMENT_KEY} in ${deployedPath}`,
    );
  }
  return getAddress(addr);
}

function decodeMetadataUtf8(raw: Hex): string {
  if (!raw || raw === "0x") return "";
  try {
    return hexToString(raw);
  } catch {
    return raw;
  }
}

function agentKeyForIndex(index: number): string {
  return STARDORM_CATALOG_AGENT_KEYS_ORDERED[index] ?? `agent-${index + 1}`;
}

function registrationAgentKey(uri: string): string | null {
  try {
    const parsed = JSON.parse(uri) as { agentKey?: unknown };
    return typeof parsed.agentKey === "string" ? parsed.agentKey : null;
  } catch {
    return null;
  }
}

function assertDesiredRegistrationMatchesSlug(
  agentId: number,
  slug: string,
  uri: string,
): void {
  const embedded = registrationAgentKey(uri);
  if (embedded !== slug) {
    throw new Error(
      `[${agentId}] ${slug}: registration JSON agentKey is "${embedded ?? "(missing)"}", expected "${slug}"`,
    );
  }
}

async function main() {
  const opts = parseCli();
  const connection = await network.connect();
  const { viem } = connection;

  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const signer = walletClients[0];
  if (!signer?.account) {
    throw new Error("No wallet client available (check MNEMONIC in .env)");
  }

  const chainId = Number(publicClient.chain?.id);
  if (!Number.isFinite(chainId)) {
    throw new Error("Could not read chain id from connected network");
  }

  const registryAddress = resolveIdentityRegistryAddress(chainId);
  const identity = await viem.getContractAt(
    "IdentityRegistry",
    registryAddress,
  );

  console.log("Network:", connection.networkName ?? "(connected)");
  console.log("Chain id:", chainId);
  console.log("IdentityRegistry:", registryAddress);
  console.log("Signer:", signer.account.address);
  console.log("Seed agents:", STARDORM_SEED_AGENT_URIS.length);
  if (opts.dryRun) console.log("Mode: dry-run (no transactions)");
  if (opts.skipUri) console.log("Skipping URI updates");
  console.log("");

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < STARDORM_SEED_AGENT_URIS.length; i++) {
    const agentId = i + 1;
    if (opts.onlyAgentIds && !opts.onlyAgentIds.includes(agentId)) {
      continue;
    }

    const agentKey = agentKeyForIndex(i);
    const seed = STARDORM_SEED_AGENT_URIS[i];
    const desiredUri = seed.uri;
    const desiredHandlers = seed.handlerCapabilities.metadataValue;
    const desiredMetadataHex = stringToHex(desiredHandlers);
    assertDesiredRegistrationMatchesSlug(agentId, agentKey, desiredUri);

    let owner: Address;
    try {
      owner = await identity.read.ownerOf([BigInt(agentId)]);
    } catch {
      console.warn(
        `[${agentId}] ${agentKey}: token does not exist — skip (not registered yet?)`,
      );
      skipped++;
      continue;
    }

    if (getAddress(owner) !== getAddress(signer.account.address)) {
      console.warn(
        `[${agentId}] ${agentKey}: owner is ${owner}, not signer — skip`,
      );
      skipped++;
      continue;
    }

    let currentUri = "";
    try {
      currentUri = await identity.read.tokenURI([BigInt(agentId)]);
    } catch {
      currentUri = "";
    }

    const currentMetaRaw = (await identity.read.getMetadata([
      BigInt(agentId),
      HANDLER_CAPABILITIES_KEY,
    ])) as Hex;
    const currentHandlers = decodeMetadataUtf8(currentMetaRaw);

    const uriMatch = currentUri === desiredUri;
    const handlersMatch = currentHandlers === desiredHandlers;

    console.log(`[${agentId}] ${agentKey}`);
    if (!uriMatch && !opts.skipUri) {
      console.log("  URI: will update");
      if (currentUri.length > 120) {
        console.log("    current:", `${currentUri.slice(0, 117)}…`);
      } else if (currentUri) {
        console.log("    current:", currentUri);
      }
    } else if (!opts.skipUri) {
      console.log("  URI: up to date");
    }

    if (!handlersMatch) {
      console.log("  handlerCapabilities:");
      console.log("    current:", currentHandlers || "(empty)");
      console.log("    desired:", desiredHandlers);
    } else {
      console.log("  handlerCapabilities: up to date");
    }

    const needsUri = !opts.skipUri && !uriMatch;
    const needsMeta = !handlersMatch;
    if (!opts.force && !needsUri && !needsMeta) {
      skipped++;
      continue;
    }
    if (opts.force && uriMatch && handlersMatch) {
      console.log("  FORCE=1: sending txs anyway");
    }

    if (opts.dryRun) {
      if (needsUri || (opts.force && !opts.skipUri)) {
        console.log("  (dry-run) would call setAgentURI");
      }
      if (needsMeta || opts.force) {
        console.log("  (dry-run) would call setMetadata(handlerCapabilities)");
      }
      updated++;
      continue;
    }

    try {
      if ((needsUri || opts.force) && !opts.skipUri) {
        const hash = await identity.write.setAgentURI(
          [BigInt(agentId), desiredUri],
          { account: signer.account },
        );
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("  setAgentURI tx:", hash);
      }

      if (needsMeta || opts.force) {
        const hash = await identity.write.setMetadata(
          [BigInt(agentId), HANDLER_CAPABILITIES_KEY, desiredMetadataHex],
          { account: signer.account },
        );
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("  setMetadata tx:", hash);
      }

      if (!opts.skipUri) {
        const syncedUri = await identity.read.tokenURI([BigInt(agentId)]);
        const syncedKey = registrationAgentKey(syncedUri);
        if (syncedKey !== agentKey) {
          throw new Error(
            `post-update verify failed: tokenURI agentKey "${syncedKey ?? "(missing)"}" ≠ "${agentKey}"`,
          );
        }
      }

      updated++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ERROR: ${msg}`);
    }

    console.log("");
  }

  console.log("Done.");
  console.log(`  updated: ${updated}`);
  console.log(`  skipped: ${skipped}`);
  console.log(`  failed:  ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
