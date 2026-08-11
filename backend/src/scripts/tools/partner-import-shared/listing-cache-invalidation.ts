import { CACHE_PREFIXES } from '../../../common/utils/cache.utils';

export async function invalidateListingCaches(logPrefix: string): Promise<number> {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = Number(process.env.REDIS_PORT || 6379);
  const pattern = `${CACHE_PREFIXES.listings}*`;

  try {
    const { createClient } = await import('redis');
    const client = createClient({ socket: { host: redisHost, port: redisPort } });
    await client.connect();

    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = String(result.cursor);
      keys.push(...result.keys);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await client.del(keys);
    }
    await client.quit();

    console.log(`${logPrefix} Invalidated ${keys.length} listing cache keys (${pattern}).`);
    return keys.length;
  } catch (error) {
    console.warn(`${logPrefix} Could not invalidate Redis cache: ${error}`);
    console.warn(`${logPrefix} Run "npm run clear-cache:listings" manually.`);
    return 0;
  }
}
