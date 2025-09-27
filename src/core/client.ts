import { KuzuMemory } from './KuzuMemory';
import type { KuzuConfig } from '../types';
import { clearAdapterCache } from '../storage/factory';

// Client cache with expiration
const clientCache = new Map<string, { client: KuzuMemory; expires: number }>();
let defaultClient: KuzuMemory | null = null;
const CLIENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a cache key for client configuration
 */
function getCacheKey(config?: Partial<KuzuConfig>): string {
  if (!config) return 'default';
  return JSON.stringify({
    storage: config.storage || 'indexeddb',
    dbName: config.dbName || 'kuzu-memory',
    version: config.version || 1,
    maxMemories: config.maxMemories || 10000,
  });
}

/**
 * Create a memory client with optimized initialization and caching
 */
export async function createMemoryClient(
  config?: Partial<KuzuConfig>,
): Promise<KuzuMemory> {
  const cacheKey = getCacheKey(config);
  const now = Date.now();

  // Check cache for existing client
  const cached = clientCache.get(cacheKey);
  if (cached && now < cached.expires) {
    return cached.client;
  }

  // Clean up expired cache entries
  for (const [key, entry] of clientCache.entries()) {
    if (now >= entry.expires) {
      try {
        entry.client.destroy();
      } catch (error) {
        console.warn('Error destroying expired client:', error);
      }
      clientCache.delete(key);
    }
  }

  // Create new client
  const client = new KuzuMemory(config);
  await client.init();

  // Cache the client (except for memory storage which is typically temporary)
  if (config?.storage !== 'memory') {
    clientCache.set(cacheKey, {
      client,
      expires: now + CLIENT_CACHE_TTL,
    });
  }

  return client;
}

export async function getDefaultClient(
  config?: Partial<KuzuConfig>,
): Promise<KuzuMemory> {
  if (!defaultClient) {
    defaultClient = await createMemoryClient(config);
  }
  return defaultClient;
}

/**
 * Clear default client and all cached clients
 */
export function clearDefaultClient(): void {
  if (defaultClient) {
    defaultClient.destroy();
    defaultClient = null;
  }
}

/**
 * Clear all cached clients and storage adapters
 */
export function clearAllClients(): void {
  // Clear default client
  clearDefaultClient();

  // Clear all cached clients
  for (const [key, entry] of clientCache.entries()) {
    try {
      entry.client.destroy();
    } catch (error) {
      console.warn(`Error destroying cached client ${key}:`, error);
    }
  }
  clientCache.clear();

  // Clear storage adapter cache
  clearAdapterCache();
}

/**
 * Get cache statistics for monitoring
 */
export function getClientCacheStats(): {
  cachedClients: number;
  hasDefaultClient: boolean;
} {
  return {
    cachedClients: clientCache.size,
    hasDefaultClient: defaultClient !== null,
  };
}
