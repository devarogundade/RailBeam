import { MemData, Indexer } from "@0gfoundation/0g-ts-sdk";
import type { JsonRpcSigner } from "ethers";

const RPC_URL =
  import.meta.env.VITE_0G_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
const INDEXER_RPC =
  import.meta.env.VITE_0G_STORAGE_INDEXER_URL ??
  "https://indexer-storage-testnet-turbo.0g.ai";

export const OG_STORAGE_PREFIX = "0g-storage:";

export function isOgStorageRef(url: string): boolean {
  return url.startsWith(OG_STORAGE_PREFIX);
}

export function ogRootFromRef(ref: string): string {
  return ref.slice(OG_STORAGE_PREFIX.length);
}

const Storage = {
  /**
   * Upload to 0G Storage (browser) per https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk
   * Returns `0g-storage:<rootHash>` for persistence.
   */
  async awaitUpload(
    file: File,
    name: string,
    signer: JsonRpcSigner
  ): Promise<string> {
    void name;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mem = new MemData(bytes);
    const [, treeErr] = await mem.merkleTree();
    if (treeErr !== null) {
      throw new Error(String(treeErr));
    }
    const indexer = new Indexer(INDEXER_RPC);
    const [tx, uploadErr] = await indexer.upload(mem, RPC_URL, signer);
    if (uploadErr !== null) {
      throw new Error(String(uploadErr));
    }
    const root =
      tx && "rootHash" in tx
        ? tx.rootHash
        : tx && "rootHashes" in tx && tx.rootHashes.length > 0
          ? tx.rootHashes[0]
          : null;
    if (root == null) {
      throw new Error("0G Storage upload did not return a root hash.");
    }
    return `${OG_STORAGE_PREFIX}${root}`;
  },
};

export default Storage;
