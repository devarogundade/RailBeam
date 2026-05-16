/** CoinMarketCap symbol for 0G native (see coinmarketcap.com/currencies/zero-gravity/). */
export const ZERO_GRAVITY_CMC_SYMBOL = '0G';

export const ZERO_GRAVITY_USD_REDIS_KEY = 'cmc:usd:zero-gravity';

/** 24 hours — CoinMarketCap free tier is daily-limited; cache aggressively. */
export const ZERO_GRAVITY_USD_CACHE_TTL_SEC = 86_400;
