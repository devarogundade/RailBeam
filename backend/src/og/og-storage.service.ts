import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { activeOgRpcUrl } from 'src/og/beam-og.config';
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

@Injectable()
export class OgStorageService {
  constructor(private readonly config: ConfigService) {}

  private rpcUrl(): string {
    return activeOgRpcUrl(this.config);
  }

  private indexerUrl(): string {
    return this.config.get<string>('OG_STORAGE_INDEXER_RPC') ?? '';
  }

  private pk(): string {
    return this.config.get<string>('PRIVATE_KEY') ?? '';
  }

  private signer(): ethers.Wallet {
    const pk = this.pk();
    if (!pk) throw new Error('PRIVATE_KEY is required for 0G Storage');
    return new ethers.Wallet(pk, new ethers.JsonRpcProvider(this.rpcUrl()));
  }

  async uploadBuffer(
    value: Buffer,
  ): Promise<{ rootHash: string; txHash?: string }> {
    const mem = new MemData(new Uint8Array(value));
    const [, treeErr] = await mem.merkleTree();
    if (treeErr) throw new Error(`Merkle tree error: ${String(treeErr)}`);

    const indexer = new Indexer(this.indexerUrl());
    const [tx, err] = await indexer.upload(mem, this.rpcUrl(), this.signer());
    if (err) throw new Error(`Storage upload error: ${String(err)}`);

    void (tx as UploadTx);
    return parseUploadTx(tx);
  }

  async uploadString(
    value: string,
  ): Promise<{ rootHash: string; txHash?: string }> {
    return this.uploadBuffer(Buffer.from(value, 'utf8'));
  }

  async getString(rootHash: string): Promise<string> {
    const indexer = new Indexer(this.indexerUrl());
    const tmp = path.join(os.tmpdir(), `stardorm-og-${rootHash}.txt`);
    const err = await indexer.download(rootHash, tmp);
    if (err) throw new Error(`Storage get error: ${String(err)}`);

    try {
      return await fs.readFile(tmp, 'utf-8');
    } finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
  }

  async getBytes(rootHash: string): Promise<Buffer> {
    const indexer = new Indexer(this.indexerUrl());
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
