import * as crypto from 'crypto';

export interface CacheKeyOptions {
  prefix: string;
  parts: (string | number | null | undefined)[];
  separator?: string;
}

export function generateCacheKey(options: CacheKeyOptions): string {
  const { prefix, parts, separator = ':' } = options;
  const validParts = parts.filter((part) => part !== null && part !== undefined);
  const keyParts = [prefix, ...validParts.map(String)];
  return keyParts.join(separator);
}

export function generateCacheKeyHash(data: unknown): string {
  const jsonString = JSON.stringify(data);
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

export function generateCacheKeyWithHash(
  prefix: string,
  data: unknown,
  additionalParts?: (string | number)[],
): string {
  const hash = generateCacheKeyHash(data);
  const parts = [prefix, hash, ...(additionalParts || [])];
  return parts.join(':');
}

export interface CacheTTL {
  listings: {
    search: number;
    single: number;
    userListings: number;
  };
  brands: {
    all: number;
    models: number;
  };
  cities: {
    all: number;
  };
}

export const CACHE_TTL: CacheTTL = {
  listings: {
    search: 300,
    single: 120,
    userListings: 180,
  },
  brands: {
    all: 86400,
    models: 86400,
  },
  cities: {
    all: 604800,
  },
};

export const CACHE_PREFIXES = {
  listings: 'cache:listings',
  listingsSearch: 'cache:listings:search',
  listingsUser: 'cache:listings:user',
  brands: 'cache:brands',
  brandsModels: 'cache:brands:models',
  cities: 'cache:cities',
} as const;
