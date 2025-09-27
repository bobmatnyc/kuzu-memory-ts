import type { StorageAdapter } from '../types';

// Lazy imports for better tree-shaking and bundle size
type AdapterClass = new (...args: any[]) => StorageAdapter;

export type StorageType = 'indexeddb' | 'memory' | 'localStorage' | 'kuzu';

export interface StorageOptions {
  type: StorageType;
  dbName?: string;
  version?: number;
  storageKey?: string;
  dbPath?: string; // For Kùzu database path
}

// Adapter cache for singleton pattern and performance
const adapterCache = new Map<string, StorageAdapter>();
const adapterClassCache = new Map<StorageType, AdapterClass>();

/**
 * Optimized storage adapter factory with caching and lazy loading
 */
export async function createStorageAdapter(options: StorageOptions): Promise<StorageAdapter> {
  const cacheKey = `${options.type}-${options.dbName || 'default'}-${options.version || 1}`;

  // Return cached adapter if available
  if (adapterCache.has(cacheKey)) {
    return adapterCache.get(cacheKey)!;
  }

  // Lazy load adapter class
  let AdapterClass = adapterClassCache.get(options.type);
  if (!AdapterClass) {
    switch (options.type) {
      case 'indexeddb': {
        const { IndexedDBAdapter } = await import('./IndexedDBAdapter');
        AdapterClass = IndexedDBAdapter;
        break;
      }
      case 'localStorage': {
        const { LocalStorageAdapter } = await import('./LocalStorageAdapter');
        AdapterClass = LocalStorageAdapter;
        break;
      }
      case 'memory': {
        const { MemoryAdapter } = await import('./MemoryAdapter');
        AdapterClass = MemoryAdapter;
        break;
      }
      case 'kuzu': {
        const { KuzuAdapter } = await import('./KuzuAdapter');
        AdapterClass = KuzuAdapter;
        break;
      }
      default:
        throw new Error(`Unknown storage type: ${options.type}`);
    }
    adapterClassCache.set(options.type, AdapterClass);
  }

  // Create adapter instance
  let adapter: StorageAdapter;
  switch (options.type) {
    case 'indexeddb':
      adapter = new AdapterClass(options.dbName, options.version);
      break;
    case 'localStorage':
      adapter = new AdapterClass(options.storageKey);
      break;
    case 'memory':
      adapter = new AdapterClass();
      break;
    case 'kuzu':
      adapter = new AdapterClass(options.dbPath);
      break;
    default:
      throw new Error(`Unknown storage type: ${options.type}`);
  }

  // Cache for future use (but don't cache memory adapter as it's stateful)
  if (options.type !== 'memory') {
    adapterCache.set(cacheKey, adapter);
  }

  return adapter;
}

/**
 * Synchronous version for backwards compatibility (use cached adapters only)
 */
export function createStorageAdapterSync(options: StorageOptions): StorageAdapter {
  // Direct imports for synchronous access (these should already be loaded)
  const { IndexedDBAdapter } = require('./IndexedDBAdapter');
  const { MemoryAdapter } = require('./MemoryAdapter');
  const { LocalStorageAdapter } = require('./LocalStorageAdapter');
  const { KuzuAdapter } = require('./KuzuAdapter');

  switch (options.type) {
    case 'indexeddb':
      return new IndexedDBAdapter(options.dbName, options.version);
    case 'localStorage':
      return new LocalStorageAdapter(options.storageKey);
    case 'memory':
      return new MemoryAdapter();
    case 'kuzu':
      return new KuzuAdapter(options.dbPath);
    default:
      throw new Error(`Unknown storage type: ${options.type}`);
  }
}

/**
 * Clear adapter cache (useful for testing or memory management)
 */
export function clearAdapterCache(): void {
  adapterCache.clear();
  adapterClassCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getAdapterCacheStats(): {
  adapterInstances: number;
  adapterClasses: number;
} {
  return {
    adapterInstances: adapterCache.size,
    adapterClasses: adapterClassCache.size,
  };
}
