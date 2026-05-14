import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import { WebSocket } from 'ws';
import { ConversationSyncService } from './conversation-sync.service';

type AuthedSocket = WebSocket & { walletAddress?: string };

function bearerFromRequest(req?: IncomingMessage): string | null {
  const h = req?.headers?.authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return t.length ? t : null;
}

function tokenFromUrl(urlStr: string | undefined): string | null {
  if (!urlStr) return null;
  try {
    const u = new URL(urlStr, 'http://localhost');
    const q = u.searchParams.get('token')?.trim();
    return q?.length ? q : null;
  } catch {
    return null;
  }
}

@WebSocketGateway({
  path: '/ws/conversations',
})
export class ConversationsGateway
  implements OnGatewayConnection<AuthedSocket>, OnGatewayDisconnect<AuthedSocket>
{
  private readonly log = new Logger(ConversationsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly sync: ConversationSyncService,
  ) {}

  async handleConnection(client: AuthedSocket, req?: IncomingMessage) {
    const token =
      bearerFromRequest(req) ?? tokenFromUrl(client.url) ?? tokenFromUrl(req?.url);
    if (!token) {
      client.close(4401, 'Missing bearer token or ?token=');
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<{ walletAddress?: string }>(token);
      const wallet = String(payload.walletAddress ?? '').trim().toLowerCase();
      if (!wallet) {
        client.close(4401, 'Invalid token');
        return;
      }
      client.walletAddress = wallet;
      this.sync.register(wallet, client);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.debug(`WS auth failed: ${msg}`);
      client.close(4401, 'Unauthorized');
    }
  }

  handleDisconnect(client: AuthedSocket) {
    const w = client.walletAddress;
    if (w) this.sync.unregister(w, client);
  }
}
