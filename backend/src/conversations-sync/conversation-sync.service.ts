import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import type { ConversationSyncPayload } from './conversation-sync.events';

type Wallet = string;

@Injectable()
export class ConversationSyncService {
  private readonly log = new Logger(ConversationSyncService.name);
  private readonly sockets = new Map<Wallet, Set<WebSocket>>();

  register(wallet: Wallet, socket: WebSocket): void {
    const w = wallet.trim().toLowerCase();
    let set = this.sockets.get(w);
    if (!set) {
      set = new Set();
      this.sockets.set(w, set);
    }
    set.add(socket);
  }

  unregister(wallet: Wallet, socket: WebSocket): void {
    const w = wallet.trim().toLowerCase();
    const set = this.sockets.get(w);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) this.sockets.delete(w);
  }

  notifyWallet(wallet: Wallet, payload: ConversationSyncPayload): void {
    const w = wallet.trim().toLowerCase();
    const set = this.sockets.get(w);
    if (!set?.size) return;
    const raw = JSON.stringify(payload);
    for (const socket of set) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      try {
        socket.send(raw);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(`send failed for ${w}: ${msg}`);
      }
    }
  }
}
