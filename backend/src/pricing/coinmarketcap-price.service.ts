import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import {
  ZERO_GRAVITY_CMC_SYMBOL,
  ZERO_GRAVITY_USD_CACHE_TTL_SEC,
  ZERO_GRAVITY_USD_REDIS_KEY,
} from './coinmarketcap.constants';

const CMC_QUOTES_URL =
  'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest';

@Injectable()
export class CoinmarketcapPriceService implements OnModuleDestroy {
  private readonly log = new Logger(CoinmarketcapPriceService.name);
  private redis?: IORedis;

  constructor(private readonly config: ConfigService) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  /** Spot USD for one whole native 0G token, or `null` when unavailable. */
  async getZeroGravityUsdPrice(): Promise<number | null> {
    const cached = await this.readCachedPrice();
    if (cached != null) return cached;

    const fresh = await this.fetchUsdPriceFromApi();
    if (fresh == null) return null;

    await this.writeCachedPrice(fresh);
    return fresh;
  }

  private redisClient(): IORedis | undefined {
    if (this.redis) return this.redis;
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) return undefined;
    this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: 2 });
    return this.redis;
  }

  private async readCachedPrice(): Promise<number | null> {
    const client = this.redisClient();
    if (!client) return null;
    try {
      const raw = await client.get(ZERO_GRAVITY_USD_REDIS_KEY);
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Redis read failed for ${ZERO_GRAVITY_USD_REDIS_KEY}: ${msg}`);
      return null;
    }
  }

  private async writeCachedPrice(price: number): Promise<void> {
    const client = this.redisClient();
    if (!client) return;
    try {
      await client.set(
        ZERO_GRAVITY_USD_REDIS_KEY,
        String(price),
        'EX',
        ZERO_GRAVITY_USD_CACHE_TTL_SEC,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Redis write failed for ${ZERO_GRAVITY_USD_REDIS_KEY}: ${msg}`);
    }
  }

  private async fetchUsdPriceFromApi(): Promise<number | null> {
    const apiKey = this.config.get<string>('COINMARKETCAP_API_KEY')?.trim();
    if (!apiKey) {
      this.log.warn('COINMARKETCAP_API_KEY not set; native USD spot unavailable');
      return null;
    }

    const url = new URL(CMC_QUOTES_URL);
    url.searchParams.set('symbol', ZERO_GRAVITY_CMC_SYMBOL);
    url.searchParams.set('convert', 'USD');

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          Accept: 'application/json',
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`CoinMarketCap request failed: ${msg}`);
      return null;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.log.warn(
        `CoinMarketCap quotes/latest returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
      );
      return null;
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      this.log.warn('CoinMarketCap response was not JSON');
      return null;
    }

    return parseZeroGravityUsdFromQuotes(json, ZERO_GRAVITY_CMC_SYMBOL);
  }
}

function usdPriceFromQuoteEntry(entry: object): number | null {
  const quote = (entry as { quote?: unknown }).quote;
  if (!quote || typeof quote !== 'object') return null;
  const usd = (quote as { USD?: unknown }).USD;
  if (!usd || typeof usd !== 'object') return null;
  const price = (usd as { price?: unknown }).price;
  const n = typeof price === 'number' ? price : Number(price);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function quoteDataEntries(data: Record<string, unknown>): unknown[] {
  const out: unknown[] = [];
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) {
      for (const item of v) out.push(item);
    } else if (v != null && typeof v === 'object') {
      out.push(v);
    }
  }
  return out;
}

function parseZeroGravityUsdFromQuotes(
  body: unknown,
  expectedSymbol: string,
): number | null {
  if (!body || typeof body !== 'object') return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;

  const entries = quoteDataEntries(data as Record<string, unknown>);
  const want = expectedSymbol.trim().toUpperCase();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const sym = (entry as { symbol?: unknown }).symbol;
    if (typeof sym === 'string' && sym.trim().toUpperCase() === want) {
      const n = usdPriceFromQuoteEntry(entry);
      if (n != null) return n;
    }
  }
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const n = usdPriceFromQuoteEntry(entry);
    if (n != null) return n;
  }

  return null;
}
