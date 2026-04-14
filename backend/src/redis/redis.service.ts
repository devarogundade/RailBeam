import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly mem = new Map<string, { v: string; exp: number | null }>();
  private readonly redis: Redis | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    this.redis = url ? new Redis(url) : null;
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }
    this.mem.delete(key);
  }

  /** Plain string with TTL (e.g. auth nonces). */
  async setStringEx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    if (this.redis) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
      return;
    }
    this.mem.set(key, { v: value, exp: Date.now() + ttlSeconds * 1000 });
  }

  async getString(key: string): Promise<string | null> {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ?? null;
    }
    const rec = this.mem.get(key);
    if (!rec) return null;
    if (rec.exp && Date.now() > rec.exp) {
      this.mem.delete(key);
      return null;
    }
    return rec.v;
  }

  async cacheJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const v = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, v, 'EX', ttlSeconds);
      return;
    }
    this.mem.set(key, { v, exp: Date.now() + ttlSeconds * 1000 });
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const rec = this.mem.get(key);
    if (!rec) return null;
    if (rec.exp && Date.now() > rec.exp) {
      this.mem.delete(key);
      return null;
    }
    return JSON.parse(rec.v) as T;
  }
}
