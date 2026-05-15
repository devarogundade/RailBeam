import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ogStorageEndpointsForClientEvmChain } from 'src/og/beam-og.config';
import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type UploadTx =
  | { rootHash: string; txHash?: string }
  | { rootHashes: string[]; txHash?: string };

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function parseUploadTx(tx: unknown): { rootHash: string; txHash?: string } {
  if (!isObject(tx)) throw new Error('Storage upload returned invalid tx');

  if (typeof tx.rootHash === 'string' && tx.rootHash) {
    return {
      rootHash: tx.rootHash,
      txHash: typeof tx.txHash === 'string' ? tx.txHash : undefined,
    };
  }

  if (
    Array.isArray(tx.rootHashes) &&
    typeof tx.rootHashes[0] === 'string' &&
    tx.rootHashes[0]
  ) {
    return {
      rootHash: tx.rootHashes[0],
      txHash: typeof tx.txHash === 'string' ? tx.txHash : undefined,
    };
  }

  throw new Error('Storage upload did not return rootHash');
}

export type OgStorageNetworkOptions = {
  /** 0G EVM chain id from the Beam app (`X-Beam-Chain-Id`), when known. */
  clientEvmChainId?: number;
};

@Injectable()
export class OgStorageService {
  constructor(private readonly config: ConfigService) {}

  private endpoints(opts?: OgStorageNetworkOptions) {
    return ogStorageEndpointsForClientEvmChain(
      this.config,
      opts?.clientEvmChainId,
    );
  }

  private pk(): string {
    return this.config.get<string>('PRIVATE_KEY') ?? '';
  }

  private signer(rpcUrl: string): ethers.Wallet {
    const pk = this.pk();
    if (!pk) throw new Error('PRIVATE_KEY is required for 0G Storage');
    return new ethers.Wallet(pk, new ethers.JsonRpcProvider(rpcUrl));
  }

  private formatUploadError(
    err: unknown,
    endpoints: ReturnType<typeof ogStorageEndpointsForClientEvmChain>,
  ): string {
    const raw = err instanceof Error ? err.message : String(err);
    if (!raw.includes('BAD_DATA') && !raw.includes('market()')) {
      return `Storage upload error: ${raw}`;
    }
    const tierLabel = endpoints.tier ?? 'default';
    return (
      `Storage upload failed: 0G market contract returned empty data. ` +
      `Ensure OG_RPC_URL_${endpoints.tier === 'testnet' ? 'TESTNET' : 'MAINNET'} and ` +
      `OG_STORAGE_INDEXER_RPC_${endpoints.tier === 'testnet' ? 'TESTNET' : 'MAINNET'} ` +
      `target the same network (current tier: ${tierLabel}, rpc: ${endpoints.rpcUrl}, indexer: ${endpoints.indexerRpc}). ` +
      `Original: ${raw}`
    );
  }

  async uploadBuffer(
    value: Buffer,
    opts?: OgStorageNetworkOptions,
  ): Promise<{ rootHash: string; txHash?: string }> {
    const endpoints = this.endpoints(opts);
    if (!endpoints.indexerRpc.trim()) {
      throw new Error(
        '0G Storage indexer URL is not configured (set OG_STORAGE_INDEXER_RPC_MAINNET / OG_STORAGE_INDEXER_RPC_TESTNET).',
      );
    }

    const mem = new MemData(new Uint8Array(value));
    const [, treeErr] = await mem.merkleTree();
    if (treeErr) throw new Error(`Merkle tree error: ${String(treeErr)}`);

    const indexer = new Indexer(endpoints.indexerRpc);
    const [tx, err] = await indexer.upload(
      mem,
      endpoints.rpcUrl,
      this.signer(endpoints.rpcUrl),
    );
    if (err) throw new Error(this.formatUploadError(err, endpoints));

    void (tx as UploadTx);
    return parseUploadTx(tx);
  }

  async uploadString(
    value: string,
    opts?: OgStorageNetworkOptions,
  ): Promise<{ rootHash: string; txHash?: string }> {
    return this.uploadBuffer(Buffer.from(value, 'utf8'), opts);
  }

  async getString(
    rootHash: string,
    opts?: OgStorageNetworkOptions,
  ): Promise<string> {
    const { indexerRpc } = this.endpoints(opts);
    const indexer = new Indexer(indexerRpc);
    const tmp = path.join(os.tmpdir(), `stardorm-og-${rootHash}.txt`);
    const err = await indexer.download(rootHash, tmp);
    if (err) throw new Error(`Storage get error: ${String(err)}`);

    try {
      return await fs.readFile(tmp, 'utf-8');
    } finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
  }

  async getBytes(
    rootHash: string,
    opts?: OgStorageNetworkOptions,
  ): Promise<Buffer> {
    const { indexerRpc } = this.endpoints(opts);
    const indexer = new Indexer(indexerRpc);
    const tmp = path.join(
      os.tmpdir(),
      `stardorm-og-${rootHash}-${randomUUID()}.bin`,
    );
    const err = await indexer.download(rootHash, tmp);
    if (err) throw new Error(`Storage get error: ${String(err)}`);

    try {
      return await fs.readFile(tmp);
    } finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
  }
}
