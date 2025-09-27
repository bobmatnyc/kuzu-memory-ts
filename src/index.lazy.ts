/**
 * Lazy loading entry point for optimal bundle size
 * Use this for code splitting and dynamic imports
 */

// Core types are always needed and lightweight
export * from './types';
export * from './types/branded';

// Version
export const VERSION = '0.1.0';

/**
 * Lazy load the main KuzuMemory class with caching
 */
let cachedKuzuMemory: any = null;
export async function loadKuzuMemory() {
  if (cachedKuzuMemory) {
    return cachedKuzuMemory;
  }

  const { KuzuMemory } = await import(/* webpackChunkName: "core" */ './core/KuzuMemory');
  cachedKuzuMemory = KuzuMemory;
  return cachedKuzuMemory;
}

/**
 * Lazy load the memory client factory with caching
 */
let cachedClientFactory: any = null;
export async function loadMemoryClient() {
  if (cachedClientFactory) {
    return cachedClientFactory;
  }

  const { createMemoryClient } = await import(/* webpackChunkName: "core" */ './core/client');
  cachedClientFactory = createMemoryClient;
  return cachedClientFactory;
}

/**
 * Lazy load the query builder
 */
export async function loadQueryBuilder() {
  const module = await import('./core/QueryBuilder');
  return {
    MemoryQueryBuilder: module.MemoryQueryBuilder,
    memoryQuery: module.memoryQuery,
    MemoryQueries: module.MemoryQueries,
  };
}

/**
 * Lazy load React hooks with caching and optimized loading
 */
let cachedHooks: any = null;
export async function loadReactHooks() {
  if (cachedHooks) {
    return cachedHooks;
  }

  const [
    { useKuzuMemory },
    { useMemoryQuery },
    { useMemoryMutation },
    { useMemorySubscription },
  ] = await Promise.all([
    import(/* webpackChunkName: "hooks" */ './hooks/useKuzuMemory'),
    import(/* webpackChunkName: "hooks" */ './hooks/useMemoryQuery'),
    import(/* webpackChunkName: "hooks" */ './hooks/useMemoryMutation'),
    import(/* webpackChunkName: "hooks" */ './hooks/useMemorySubscription'),
  ]);

  cachedHooks = {
    useKuzuMemory,
    useMemoryQuery,
    useMemoryMutation,
    useMemorySubscription,
  };

  return cachedHooks;
}

/**
 * Lazy load storage adapters with caching and tree-shaking optimization
 */
const adapterCache = new Map<string, any>();

export async function loadStorageAdapter(type: 'indexeddb' | 'localStorage' | 'memory' | 'kuzu') {
  if (adapterCache.has(type)) {
    return adapterCache.get(type);
  }

  let AdapterClass;
  switch (type) {
    case 'indexeddb':
      const { IndexedDBAdapter } = await import(/* webpackChunkName: "storage-indexeddb" */ './storage/IndexedDBAdapter');
      AdapterClass = IndexedDBAdapter;
      break;

    case 'localStorage':
      const { LocalStorageAdapter } = await import(/* webpackChunkName: "storage-localstorage" */ './storage/LocalStorageAdapter');
      AdapterClass = LocalStorageAdapter;
      break;

    case 'memory':
      const { MemoryAdapter } = await import(/* webpackChunkName: "storage-memory" */ './storage/MemoryAdapter');
      AdapterClass = MemoryAdapter;
      break;

    case 'kuzu':
      const { KuzuAdapter } = await import(/* webpackChunkName: "storage-kuzu" */ './storage/KuzuAdapter');
      AdapterClass = KuzuAdapter;
      break;

    default:
      throw new Error(`Unknown storage adapter type: ${type}`);
  }

  adapterCache.set(type, AdapterClass);
  return AdapterClass;
}

/**
 * Lazy load recall strategies with caching and optimal chunking
 */
const strategyCache = new Map<string, any>();

export async function loadRecallStrategy(type: 'recency' | 'frequency' | 'importance' | 'similarity' | 'composite') {
  if (strategyCache.has(type)) {
    return strategyCache.get(type);
  }

  let StrategyClass;
  switch (type) {
    case 'recency':
      const { RecencyStrategy } = await import(/* webpackChunkName: "recall-basic" */ './recall/RecencyStrategy');
      StrategyClass = RecencyStrategy;
      break;

    case 'frequency':
      const { FrequencyStrategy } = await import(/* webpackChunkName: "recall-basic" */ './recall/FrequencyStrategy');
      StrategyClass = FrequencyStrategy;
      break;

    case 'importance':
      const { ImportanceStrategy } = await import(/* webpackChunkName: "recall-basic" */ './recall/ImportanceStrategy');
      StrategyClass = ImportanceStrategy;
      break;

    case 'similarity':
      const { SimilarityStrategy } = await import(/* webpackChunkName: "recall-advanced" */ './recall/SimilarityStrategy');
      StrategyClass = SimilarityStrategy;
      break;

    case 'composite':
      const { CompositeStrategy } = await import(/* webpackChunkName: "recall-advanced" */ './recall/CompositeStrategy');
      StrategyClass = CompositeStrategy;
      break;

    default:
      throw new Error(`Unknown recall strategy type: ${type}`);
  }

  strategyCache.set(type, StrategyClass);
  return StrategyClass;
}

/**
 * Lazy load domain value objects
 */
export async function loadDomainObjects() {
  const [
    { MemoryContent },
    { MemoryImportance },
  ] = await Promise.all([
    import('./domain/value-objects/MemoryContent'),
    import('./domain/value-objects/MemoryImportance'),
  ]);

  return {
    MemoryContent,
    MemoryImportance,
  };
}

/**
 * Lazy load monitoring tools
 */
export async function loadMonitoring() {
  const { MetricsCollector } = await import('./monitoring/MetricsCollector');
  return { MetricsCollector };
}

/**
 * Lazy load event store
 */
export async function loadEventStore() {
  const { EventStore } = await import('./domain/events/EventStore');
  return { EventStore };
}

/**
 * Optimized convenience function to initialize with lazy loading and preloading
 */
export async function createLazyMemoryClient(config?: {
  storage?: 'indexeddb' | 'localStorage' | 'memory' | 'kuzu';
  preload?: boolean;
  [key: string]: any;
}) {
  const { preload = false, ...clientConfig } = config || {};

  // Optionally preload commonly used modules
  const promises: Promise<any>[] = [loadMemoryClient()];

  if (preload) {
    // Preload based on storage type
    if (clientConfig.storage) {
      promises.push(loadStorageAdapter(clientConfig.storage));
    }
    // Always preload composite strategy as it's most commonly used
    promises.push(loadRecallStrategy('composite'));
  }

  const [createMemoryClient] = await Promise.all(promises);
  return createMemoryClient(clientConfig);
}
