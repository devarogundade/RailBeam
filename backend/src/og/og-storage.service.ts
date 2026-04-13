import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';
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

@Injectable()
export class OgStorageService {
  constructor(private readonly config: ConfigService) {}

  private rpcUrl(): string {
    return (
      this.config.get<string>('OG_RPC_URL') ?? 'https://evmrpc-testnet.0g.ai'
    );
  }

  private indexerUrl(): string {
    return (
      this.config.get<string>('OG_STORAGE_INDEXER_RPC') ??
      'https://indexer-storage-testnet-turbo.0g.ai'
    );
  }

  private pk(): string {
    return this.config.get<string>('PRIVATE_KEY') ?? '';
  }

  private signer(): ethers.Wallet {
    return new ethers.Wallet(
      this.pk(),
      new ethers.JsonRpcProvider(this.rpcUrl()),
    );
  }

  async uploadString(
    value: string,
  ): Promise<{ rootHash: string; txHash?: string }> {
    const bytes = new TextEncoder().encode(value);
    const mem = new MemData(bytes);
    const [, treeErr] = await mem.merkleTree();
    if (treeErr) throw new Error(`Merkle tree error: ${String(treeErr)}`);

    const indexer = new Indexer(this.indexerUrl());
    const [tx, err] = await indexer.upload(mem, this.rpcUrl(), this.signer());
    if (err) throw new Error(`Storage upload error: ${String(err)}`);

    void (tx as UploadTx);
    return parseUploadTx(tx);
  }

  async getString(rootHash: string): Promise<string> {
    const indexer = new Indexer(this.indexerUrl());
    const tmp = path.join(os.tmpdir(), `beam-og-${rootHash}.txt`);
    const err = await indexer.download(rootHash, tmp);
    if (err) throw new Error(`Storage get error: ${String(err)}`);

    try {
      return await fs.readFile(tmp, 'utf-8');
    } finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
  }
}
