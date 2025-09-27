# Performance Optimization Guide

This guide provides comprehensive information about performance optimization strategies, monitoring, and benchmarking for the Kuzu Memory TypeScript library. The library is designed to handle large datasets efficiently while maintaining excellent user experience.

## Table of Contents

1. [Performance Philosophy](#performance-philosophy)
2. [Benchmarking Methodology](#benchmarking-methodology)
3. [Memory Management](#memory-management)
4. [Bundle Size Optimization](#bundle-size-optimization)
5. [Lazy Loading Implementation](#lazy-loading-implementation)
6. [Caching Strategies](#caching-strategies)
7. [Storage Performance](#storage-performance)
8. [Query Optimization](#query-optimization)
9. [NLP Performance](#nlp-performance)
10. [Streaming for Large Datasets](#streaming-for-large-datasets)
11. [Monitoring and Metrics](#monitoring-and-metrics)
12. [Performance Debugging](#performance-debugging)
13. [Cross-Platform Considerations](#cross-platform-considerations)

## Performance Philosophy

### Core Principles

1. **Performance by Design** - Built for speed from the ground up
2. **Lazy Everything** - Only load/compute what's needed when needed
3. **Cache Aggressively** - Smart caching with automatic invalidation
4. **Measure First** - Data-driven optimization decisions
5. **User-Centric** - Optimize for perceived performance, not just raw metrics

### Performance Targets

| Operation | Target Time | Context |
|-----------|-------------|---------|
| Memory creation | < 10ms | Single item, no NLP |
| Memory creation (with NLP) | < 50ms | Including classification |
| Memory recall | < 100ms | Query up to 10k items |
| Storage initialization | < 200ms | IndexedDB setup |
| Bundle load | < 500ms | Initial JavaScript parse |
| Full text search | < 150ms | 10k+ memories |

### Performance Measurement Framework

```typescript
// src/monitoring/PerformanceMonitor.ts
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceEntry[]>();

  measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();

    return operation().finally(() => {
      const end = performance.now();
      const duration = end - start;

      this.recordMetric(name, {
        name,
        entryType: 'measure',
        startTime: start,
        duration,
      });

      if (duration > this.getThreshold(name)) {
        console.warn(`Slow operation detected: ${name} took ${duration}ms`);
      }
    });
  }

  private getThreshold(operation: string): number {
    const thresholds = {
      'memory.create': 50,
      'memory.recall': 100,
      'storage.query': 150,
      'nlp.classify': 25,
    };
    return thresholds[operation] || 100;
  }

  getStats(operation?: string): PerformanceStats {
    const entries = operation
      ? this.metrics.get(operation) || []
      : Array.from(this.metrics.values()).flat();

    const durations = entries.map(entry => entry.duration);

    return {
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: this.calculateMedian(durations),
      p95: this.calculatePercentile(durations, 95),
      min: Math.min(...durations),
      max: Math.max(...durations),
    };
  }
}
```

## Benchmarking Methodology

### Benchmark Suite Structure

```typescript
// tests/performance/benchmark-suite.ts
export interface BenchmarkOptions {
  iterations: number;
  warmupIterations: number;
  datasetSize: number;
  timeout: number;
}

export class BenchmarkSuite {
  private results = new Map<string, BenchmarkResult[]>();

  async runBenchmark(
    name: string,
    operation: () => Promise<void>,
    options: BenchmarkOptions = DEFAULT_OPTIONS
  ): Promise<BenchmarkResult> {
    // Warmup phase
    console.log(`Warming up ${name}...`);
    for (let i = 0; i < options.warmupIterations; i++) {
      await operation();
    }

    // Actual benchmark
    console.log(`Benchmarking ${name}...`);
    const durations: number[] = [];

    for (let i = 0; i < options.iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      durations.push(end - start);
    }

    const result = {
      name,
      iterations: options.iterations,
      datasetSize: options.datasetSize,
      average: durations.reduce((a, b) => a + b) / durations.length,
      median: this.calculateMedian(durations),
      min: Math.min(...durations),
      max: Math.max(...durations),
      stdDev: this.calculateStandardDeviation(durations),
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99),
    };

    this.results.set(name, [...(this.results.get(name) || []), result]);
    return result;
  }

  generateReport(): BenchmarkReport {
    const summary = Array.from(this.results.entries()).map(([name, results]) => {
      const latest = results[results.length - 1];
      const trend = results.length > 1
        ? this.calculateTrend(results)
        : 'stable';

      return { name, latest, trend, history: results };
    });

    return {
      timestamp: new Date(),
      environment: this.getEnvironment(),
      summary,
      recommendations: this.generateRecommendations(summary),
    };
  }
}
```

### Core Operation Benchmarks

```typescript
// tests/performance/core-operations.bench.ts
describe('Core Operations Benchmark', () => {
  let client: KuzuMemory;
  let suite: BenchmarkSuite;

  beforeEach(async () => {
    client = createMemoryClient({ storage: 'memory' });
    await client.init();
    suite = new BenchmarkSuite();
  });

  describe('Memory Creation', () => {
    it('should benchmark single memory creation', async () => {
      const result = await suite.runBenchmark(
        'memory.create.single',
        () => client.create('Test memory content'),
        { iterations: 1000, datasetSize: 1 }
      );

      expect(result.average).toBeLessThan(10); // 10ms target
      expect(result.p95).toBeLessThan(25);
    });

    it('should benchmark batch memory creation', async () => {
      const memories = Array(100).fill(0).map((_, i) => `Memory ${i}`);

      const result = await suite.runBenchmark(
        'memory.create.batch',
        () => Promise.all(memories.map(content => client.create(content))),
        { iterations: 10, datasetSize: 100 }
      );

      expect(result.average).toBeLessThan(500); // 500ms for 100 items
      expect(result.average / 100).toBeLessThan(5); // < 5ms per item
    });
  });

  describe('Memory Recall', () => {
    beforeEach(async () => {
      // Create test dataset
      const memories = Array(1000).fill(0).map((_, i) =>
        `Test memory content ${i} with various keywords and patterns`
      );
      await Promise.all(memories.map(content => client.create(content)));
    });

    it('should benchmark text search', async () => {
      const result = await suite.runBenchmark(
        'memory.recall.text-search',
        () => client.recall('test keywords'),
        { iterations: 100, datasetSize: 1000 }
      );

      expect(result.average).toBeLessThan(100); // 100ms target
      expect(result.p95).toBeLessThan(200);
    });

    it('should benchmark filtered recall', async () => {
      const result = await suite.runBenchmark(
        'memory.recall.filtered',
        () => client.recall('test', {
          types: ['semantic'],
          minImportance: 0.5
        }),
        { iterations: 100, datasetSize: 1000 }
      );

      expect(result.average).toBeLessThan(150);
    });
  });

  describe('Storage Operations', () => {
    it('should benchmark storage adapter performance', async () => {
      const adapters = ['memory', 'localStorage', 'indexeddb'];

      for (const adapterType of adapters) {
        const testClient = createMemoryClient({ storage: adapterType });
        await testClient.init();

        const result = await suite.runBenchmark(
          `storage.${adapterType}.create`,
          () => testClient.create('Test content'),
          { iterations: 100, datasetSize: 1 }
        );

        // Different adapters have different performance characteristics
        const expectedMax = {
          memory: 5,
          localStorage: 25,
          indexeddb: 50
        };

        expect(result.average).toBeLessThan(expectedMax[adapterType]);
      }
    });
  });
});
```

### NLP Performance Benchmarks

```typescript
// tests/performance/nlp-performance.bench.ts
describe('NLP Performance Benchmark', () => {
  let classifier: MemoryClassifier;
  let suite: BenchmarkSuite;

  beforeEach(() => {
    classifier = new MemoryClassifier();
    suite = new BenchmarkSuite();
  });

  describe('Classification Performance', () => {
    it('should benchmark text classification', async () => {
      const texts = [
        'Yesterday I went to the store and bought groceries',
        'Python is a programming language used for web development',
        'To bake a cake: 1. Mix ingredients 2. Bake for 30 minutes',
        'The capital of France is Paris',
        'I remember when we visited the mountains last summer'
      ];

      const result = await suite.runBenchmark(
        'nlp.classify.mixed-types',
        async () => {
          texts.forEach(text => classifier.classify(text));
        },
        { iterations: 1000, datasetSize: texts.length }
      );

      expect(result.average).toBeLessThan(25); // 25ms for 5 classifications
      expect(result.average / texts.length).toBeLessThan(5); // < 5ms per classification
    });

    it('should benchmark large text classification', async () => {
      const largeText = 'This is a long text content. '.repeat(500); // ~15KB

      const result = await suite.runBenchmark(
        'nlp.classify.large-text',
        () => Promise.resolve(classifier.classify(largeText)),
        { iterations: 100, datasetSize: 1 }
      );

      expect(result.average).toBeLessThan(100); // 100ms for large text
    });

    it('should benchmark batch classification', async () => {
      const texts = Array(1000).fill(0).map((_, i) =>
        `Sample text content ${i} for classification testing`
      );

      const result = await suite.runBenchmark(
        'nlp.classify.batch',
        async () => {
          texts.forEach(text => classifier.classify(text));
        },
        { iterations: 10, datasetSize: 1000 }
      );

      expect(result.average).toBeLessThan(1000); // 1s for 1000 classifications
      expect(result.average / texts.length).toBeLessThan(1); // < 1ms per classification
    });
  });

  describe('Feature Extraction Performance', () => {
    it('should benchmark feature extraction', async () => {
      const text = 'Yesterday I went to the store and learned about new products';

      const result = await suite.runBenchmark(
        'nlp.features.extract',
        () => Promise.resolve(classifier.extractFeatures(text)),
        { iterations: 1000, datasetSize: 1 }
      );

      expect(result.average).toBeLessThan(5); // Very fast feature extraction
    });
  });
});
```

## Memory Management

### Memory Optimization Patterns

```typescript
// Efficient memory usage patterns
export class OptimizedKuzuMemory extends KuzuMemory {
  private cache = new LRUCache<string, MemoryItem>(1000);
  private weakRefs = new WeakMap();

  async get(id: string): Promise<MemoryItem | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const memory = await this.storage.get(id);
    if (memory) {
      this.cache.set(id, memory);
    }

    return memory;
  }

  // Batch operations for better memory efficiency
  async createMany(contents: string[]): Promise<MemoryItem[]> {
    const batch = contents.map(content =>
      this.prepareMemoryData(content)
    );

    // Process in chunks to avoid memory spikes
    const chunkSize = 100;
    const results: MemoryItem[] = [];

    for (let i = 0; i < batch.length; i += chunkSize) {
      const chunk = batch.slice(i, i + chunkSize);
      const chunkResults = await this.storage.createMany(chunk);
      results.push(...chunkResults);

      // Allow garbage collection
      if (i % (chunkSize * 10) === 0) {
        await this.yieldToEventLoop();
      }
    }

    return results;
  }

  private async yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  // Memory cleanup
  dispose(): void {
    this.cache.clear();
    this.weakRefs = new WeakMap();
    // Clean up event listeners, timers, etc.
  }
}
```

### LRU Cache Implementation

```typescript
// src/utils/LRUCache.ts
export class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, V>();
  private accessOrder: K[] = [];

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.updateAccessOrder(key);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.updateAccessOrder(key);
    } else {
      if (this.cache.size >= this.capacity) {
        this.evictLRU();
      }
      this.accessOrder.push(key);
    }
    this.cache.set(key, value);
  }

  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }

  private evictLRU(): void {
    const lruKey = this.accessOrder.shift();
    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  get size(): number {
    return this.cache.size;
  }
}
```

### Memory Leak Prevention

```typescript
// Memory leak prevention patterns
export class LeakPreventionUtils {
  static setupMemoryMonitoring(): void {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;

        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('High memory usage detected', {
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
          });

          // Trigger cleanup
          this.triggerCleanup();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  static triggerCleanup(): void {
    // Clear caches
    if (global.kuzuMemoryCache) {
      global.kuzuMemoryCache.clear();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Emit cleanup event for listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kuzu:memory-cleanup'));
    }
  }

  static createWeakEventListener<T extends EventTarget>(
    target: T,
    event: string,
    handler: EventListener
  ): () => void {
    const weakRef = new WeakRef(handler);

    const wrappedHandler = (event: Event) => {
      const actualHandler = weakRef.deref();
      if (actualHandler) {
        actualHandler(event);
      } else {
        // Handler was garbage collected, remove listener
        target.removeEventListener(event, wrappedHandler);
      }
    };

    target.addEventListener(event, wrappedHandler);

    return () => target.removeEventListener(event, wrappedHandler);
  }
}
```

## Bundle Size Optimization

### Tree Shaking Configuration

```typescript
// tsup.config.ts - Optimized build configuration
import { defineConfig } from 'tsup';

export default defineConfig([
  // Main bundle
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    treeshake: true,
    splitting: true,
    minify: true,
    target: 'es2020',
    bundle: true,
    external: ['dexie'], // Keep large dependencies external
  },

  // Lazy-loaded modules
  {
    entry: ['src/index.lazy.ts'],
    format: ['esm'],
    outDir: 'dist/lazy',
    treeshake: true,
    minify: true,
    splitting: true,
  },

  // NLP module (optional)
  {
    entry: ['src/nlp/index.ts'],
    format: ['esm'],
    outDir: 'dist/nlp',
    treeshake: true,
    minify: true,
    external: ['natural'], // Keep NLP dependencies external
  }
]);
```

### Modular Architecture

```typescript
// src/index.ts - Core exports only
export { createMemoryClient } from './core/client';
export { KuzuMemory } from './core/KuzuMemory';
export type {
  MemoryItem,
  MemoryType,
  StorageAdapter,
  KuzuConfig
} from './types';

// Conditional exports for optional features
export const lazy = {
  // These are loaded on-demand
  get nlp() {
    return import('./nlp').then(m => m.default);
  },

  get patterns() {
    return import('./extraction/patterns').then(m => m.patterns);
  },

  get hooks() {
    return import('./hooks').then(m => m);
  }
};
```

### Bundle Analysis

```bash
# Package.json scripts for bundle analysis
{
  "scripts": {
    "build:analyze": "tsup --analyze",
    "bundle:size": "bundlesize",
    "bundle:visualize": "webpack-bundle-analyzer dist/stats.json"
  },

  "bundlesize": [
    {
      "path": "./dist/index.js",
      "maxSize": "50 kB",
      "compression": "gzip"
    },
    {
      "path": "./dist/lazy/*.js",
      "maxSize": "30 kB",
      "compression": "gzip"
    }
  ]
}
```

## Lazy Loading Implementation

### Dynamic Module Loading

```typescript
// src/core/LazyLoader.ts
export class LazyLoader {
  private cache = new Map<string, Promise<any>>();

  async load<T>(moduleId: string, loader: () => Promise<T>): Promise<T> {
    if (this.cache.has(moduleId)) {
      return this.cache.get(moduleId);
    }

    const promise = loader().catch(error => {
      // Remove failed loads from cache
      this.cache.delete(moduleId);
      throw error;
    });

    this.cache.set(moduleId, promise);
    return promise;
  }

  preload(moduleId: string, loader: () => Promise<any>): void {
    // Preload in idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.load(moduleId, loader);
      });
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const globalLoader = new LazyLoader();

// Lazy-loaded features
export const features = {
  async nlp() {
    return globalLoader.load('nlp', () => import('../nlp'));
  },

  async patterns() {
    return globalLoader.load('patterns', () => import('../extraction/patterns'));
  },

  async hooks() {
    return globalLoader.load('hooks', () => import('../hooks'));
  }
};
```

### Progressive Feature Loading

```typescript
// Progressive enhancement pattern
export class ProgressiveKuzuMemory extends KuzuMemory {
  private nlpEnabled = false;
  private nlpClassifier?: MemoryClassifier;

  async enableNLP(): Promise<void> {
    if (this.nlpEnabled) return;

    try {
      const nlpModule = await features.nlp();
      this.nlpClassifier = new nlpModule.MemoryClassifier();
      this.nlpEnabled = true;
    } catch (error) {
      console.warn('Failed to load NLP module:', error);
      // Fall back to basic classification
      this.nlpClassifier = new BasicClassifier();
    }
  }

  async create(content: string, options?: CreateOptions): Promise<MemoryItem> {
    let memoryType: MemoryType = 'semantic'; // default

    if (this.nlpEnabled && this.nlpClassifier) {
      const classification = this.nlpClassifier.classify(content);
      memoryType = classification.type;
    }

    return super.create(content, { ...options, type: memoryType });
  }
}
```

## Caching Strategies

### Multi-Level Caching

```typescript
// src/caching/CacheManager.ts
export interface CacheLevel {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class MultiLevelCache implements CacheLevel {
  constructor(
    private l1: MemoryCache,      // Fast in-memory cache
    private l2: StorageCache,     // Persistent storage cache
    private l3?: NetworkCache     // Network/CDN cache
  ) {}

  async get(key: string): Promise<any> {
    // Try L1 first (fastest)
    let value = await this.l1.get(key);
    if (value !== undefined) {
      return value;
    }

    // Try L2 (persistent)
    value = await this.l2.get(key);
    if (value !== undefined) {
      // Populate L1 for next access
      await this.l1.set(key, value);
      return value;
    }

    // Try L3 (network)
    if (this.l3) {
      value = await this.l3.get(key);
      if (value !== undefined) {
        // Populate both L1 and L2
        await Promise.all([
          this.l1.set(key, value),
          this.l2.set(key, value)
        ]);
        return value;
      }
    }

    return undefined;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Write to all levels
    const operations = [
      this.l1.set(key, value, ttl),
      this.l2.set(key, value, ttl)
    ];

    if (this.l3) {
      operations.push(this.l3.set(key, value, ttl));
    }

    await Promise.all(operations);
  }

  async invalidate(key: string): Promise<void> {
    await Promise.all([
      this.l1.delete(key),
      this.l2.delete(key),
      this.l3?.delete(key)
    ].filter(Boolean));
  }
}
```

### Smart Cache Invalidation

```typescript
// Cache invalidation strategies
export class SmartCacheInvalidation {
  private dependencyGraph = new Map<string, Set<string>>();
  private tagCache = new Map<string, Set<string>>();

  // Register cache dependencies
  addDependency(cacheKey: string, dependsOn: string[]): void {
    dependsOn.forEach(dep => {
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, new Set());
      }
      this.dependencyGraph.get(dep)!.add(cacheKey);
    });
  }

  // Tag-based invalidation
  addTag(cacheKey: string, tags: string[]): void {
    tags.forEach(tag => {
      if (!this.tagCache.has(tag)) {
        this.tagCache.set(tag, new Set());
      }
      this.tagCache.get(tag)!.add(cacheKey);
    });
  }

  // Cascade invalidation
  async invalidate(key: string, cache: CacheLevel): Promise<void> {
    const toInvalidate = new Set([key]);

    // Add dependent keys
    const dependents = this.dependencyGraph.get(key);
    if (dependents) {
      dependents.forEach(dep => toInvalidate.add(dep));
    }

    // Invalidate all keys
    await Promise.all(
      Array.from(toInvalidate).map(k => cache.delete(k))
    );
  }

  // Tag-based invalidation
  async invalidateByTag(tag: string, cache: CacheLevel): Promise<void> {
    const keysToInvalidate = this.tagCache.get(tag);
    if (keysToInvalidate) {
      await Promise.all(
        Array.from(keysToInvalidate).map(key => this.invalidate(key, cache))
      );
    }
  }
}
```

## Storage Performance

### IndexedDB Optimization

```typescript
// Optimized IndexedDB adapter
export class OptimizedIndexedDBAdapter extends IndexedDBAdapter {
  private transactionPool = new Map<string, IDBTransaction>();
  private batchOperations: BatchOperation[] = [];
  private batchTimeout?: number;

  // Connection pooling
  private async getTransaction(
    objectStores: string[],
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBTransaction> {
    const key = `${objectStores.join(',')}-${mode}`;

    if (this.transactionPool.has(key)) {
      const transaction = this.transactionPool.get(key)!;
      if (transaction.db && !transaction.error) {
        return transaction;
      }
    }

    const transaction = this.db.transaction(objectStores, mode);
    this.transactionPool.set(key, transaction);

    // Clean up when transaction completes
    transaction.addEventListener('complete', () => {
      this.transactionPool.delete(key);
    });

    return transaction;
  }

  // Batch operations for better performance
  async createMany(items: Omit<MemoryItem, 'id'>[]): Promise<MemoryItem[]> {
    const transaction = await this.getTransaction(['memories'], 'readwrite');
    const store = transaction.objectStore('memories');

    const results: MemoryItem[] = [];
    const operations = items.map(item => {
      const memory = { ...item, id: generateUUID() };
      return new Promise<MemoryItem>((resolve, reject) => {
        const request = store.add(memory);
        request.onsuccess = () => resolve(memory);
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(operations);
  }

  // Optimized querying with indexes
  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    const transaction = await this.getTransaction(['memories'], 'readonly');
    const store = transaction.objectStore('memories');

    // Use appropriate index based on query
    let cursor: IDBRequest<IDBCursorWithValue | null>;

    if (query.types?.length === 1) {
      // Use type index
      const index = store.index('type');
      cursor = index.openCursor(query.types[0]);
    } else if (query.dateRange) {
      // Use timestamp index
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(
        query.dateRange.start.getTime(),
        query.dateRange.end.getTime()
      );
      cursor = index.openCursor(range, 'prev'); // Most recent first
    } else {
      // Full scan (fallback)
      cursor = store.openCursor(null, 'prev');
    }

    const results: MemoryItem[] = [];
    let count = 0;
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    return new Promise((resolve, reject) => {
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (!cursor || count >= limit) {
          resolve(results);
          return;
        }

        const memory = cursor.value as MemoryItem;

        // Apply additional filters
        if (this.matchesQuery(memory, query)) {
          if (count >= offset) {
            results.push(memory);
          }
          count++;
        }

        cursor.continue();
      };

      cursor.onerror = () => reject(cursor.error);
    });
  }
}
```

### Storage Performance Monitoring

```typescript
// Storage performance monitoring
export class StorageMonitor {
  private metrics = {
    operations: new Map<string, number[]>(),
    errors: new Map<string, number>(),
    sizes: new Map<string, number>(),
  };

  async measureOperation<T>(
    operationType: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - start;

      if (!this.metrics.operations.has(operationType)) {
        this.metrics.operations.set(operationType, []);
      }
      this.metrics.operations.get(operationType)!.push(duration);

      // Track data size if available
      if (result && typeof result === 'object') {
        const size = JSON.stringify(result).length;
        this.metrics.sizes.set(operationType, size);
      }

      return result;
    } catch (error) {
      const errorCount = this.metrics.errors.get(operationType) || 0;
      this.metrics.errors.set(operationType, errorCount + 1);
      throw error;
    }
  }

  getPerformanceReport(): StoragePerformanceReport {
    const report = {
      operations: {},
      errors: Object.fromEntries(this.metrics.errors),
      recommendations: []
    };

    for (const [operation, durations] of this.metrics.operations) {
      const average = durations.reduce((a, b) => a + b) / durations.length;
      const p95 = this.calculatePercentile(durations, 95);

      report.operations[operation] = {
        count: durations.length,
        average,
        p95,
        throughput: durations.length / (Math.max(...durations) / 1000)
      };

      // Generate recommendations
      if (average > 100) {
        report.recommendations.push(
          `${operation} average time (${average}ms) exceeds 100ms threshold`
        );
      }

      if (p95 > 500) {
        report.recommendations.push(
          `${operation} P95 time (${p95}ms) indicates performance issues`
        );
      }
    }

    return report;
  }
}
```

## Query Optimization

### Query Planning

```typescript
// Intelligent query planning
export class QueryPlanner {
  constructor(private statistics: DatabaseStatistics) {}

  planQuery(query: MemoryQuery): QueryPlan {
    const plan: QueryPlan = {
      strategy: 'full-scan',
      estimatedCost: Infinity,
      steps: []
    };

    // Analyze available indexes
    const availableIndexes = this.getAvailableIndexes();

    // Strategy 1: Type-based index
    if (query.types?.length === 1) {
      const typeCost = this.estimateIndexCost('type', query.types[0]);
      if (typeCost < plan.estimatedCost) {
        plan.strategy = 'type-index';
        plan.estimatedCost = typeCost;
        plan.steps = [
          { type: 'index-scan', index: 'type', value: query.types[0] },
          { type: 'filter', conditions: this.buildFilterConditions(query) }
        ];
      }
    }

    // Strategy 2: Timestamp range index
    if (query.dateRange) {
      const timestampCost = this.estimateRangeCost('timestamp', query.dateRange);
      if (timestampCost < plan.estimatedCost) {
        plan.strategy = 'timestamp-range';
        plan.estimatedCost = timestampCost;
        plan.steps = [
          {
            type: 'range-scan',
            index: 'timestamp',
            range: query.dateRange
          },
          { type: 'filter', conditions: this.buildFilterConditions(query) }
        ];
      }
    }

    // Strategy 3: Full-text search
    if (query.searchText) {
      const textCost = this.estimateTextSearchCost(query.searchText);
      if (textCost < plan.estimatedCost) {
        plan.strategy = 'full-text';
        plan.estimatedCost = textCost;
        plan.steps = [
          { type: 'text-search', query: query.searchText },
          { type: 'filter', conditions: this.buildFilterConditions(query) }
        ];
      }
    }

    return this.optimizePlan(plan);
  }

  private estimateIndexCost(index: string, value: any): number {
    const indexStats = this.statistics.indexes[index];
    if (!indexStats) return Infinity;

    // Estimate based on selectivity
    const selectivity = indexStats.uniqueValues / this.statistics.totalRecords;
    return this.statistics.totalRecords * selectivity * 0.1; // Index scan cost
  }

  private optimizePlan(plan: QueryPlan): QueryPlan {
    // Optimize filter order (most selective first)
    const filterStep = plan.steps.find(step => step.type === 'filter');
    if (filterStep && filterStep.conditions) {
      filterStep.conditions.sort((a, b) => a.selectivity - b.selectivity);
    }

    return plan;
  }
}
```

### Smart Indexing

```typescript
// Automatic index creation based on query patterns
export class SmartIndexManager {
  private queryLog: QueryLogEntry[] = [];
  private indexUsage = new Map<string, number>();

  logQuery(query: MemoryQuery, executionTime: number): void {
    this.queryLog.push({
      query,
      timestamp: new Date(),
      executionTime,
      resultCount: 0 // Would be filled by actual execution
    });

    // Keep only recent queries
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.queryLog = this.queryLog.filter(entry => entry.timestamp > oneHourAgo);
  }

  analyzeQueryPatterns(): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];
    const fieldUsage = new Map<string, QueryPattern>();

    // Analyze query patterns
    for (const entry of this.queryLog) {
      if (entry.query.types?.length) {
        this.updateFieldUsage(fieldUsage, 'type', entry);
      }
      if (entry.query.dateRange) {
        this.updateFieldUsage(fieldUsage, 'timestamp', entry);
      }
      if (entry.query.minImportance !== undefined) {
        this.updateFieldUsage(fieldUsage, 'importance', entry);
      }
      if (entry.query.tags?.length) {
        this.updateFieldUsage(fieldUsage, 'tags', entry);
      }
    }

    // Generate recommendations
    for (const [field, pattern] of fieldUsage) {
      if (pattern.frequency > 10 && pattern.averageTime > 50) {
        const benefit = this.calculateIndexBenefit(pattern);
        const cost = this.calculateIndexCost(field);

        if (benefit > cost) {
          recommendations.push({
            field,
            type: this.getIndexType(field, pattern),
            benefit,
            cost,
            priority: benefit / cost
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private updateFieldUsage(
    usage: Map<string, QueryPattern>,
    field: string,
    entry: QueryLogEntry
  ): void {
    if (!usage.has(field)) {
      usage.set(field, {
        field,
        frequency: 0,
        totalTime: 0,
        averageTime: 0,
        selectivity: 0
      });
    }

    const pattern = usage.get(field)!;
    pattern.frequency++;
    pattern.totalTime += entry.executionTime;
    pattern.averageTime = pattern.totalTime / pattern.frequency;
  }
}
```

## NLP Performance

### Optimized Classification

```typescript
// Performance-optimized memory classifier
export class OptimizedMemoryClassifier extends MemoryClassifier {
  private featureCache = new Map<string, Features>();
  private classificationCache = new Map<string, ClassificationResult>();
  private batchProcessor?: Worker;

  constructor(config: ClassifierConfig) {
    super(config);

    // Initialize web worker for heavy processing
    if (typeof Worker !== 'undefined') {
      this.batchProcessor = new Worker('/workers/nlp-worker.js');
    }
  }

  // Cache feature extraction results
  extractFeatures(text: string): Features {
    const cacheKey = this.hashText(text);

    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey)!;
    }

    const features = super.extractFeatures(text);
    this.featureCache.set(cacheKey, features);

    // Limit cache size
    if (this.featureCache.size > 10000) {
      const firstKey = this.featureCache.keys().next().value;
      this.featureCache.delete(firstKey);
    }

    return features;
  }

  // Batch classification for better performance
  async classifyBatch(texts: string[]): Promise<ClassificationResult[]> {
    if (this.batchProcessor) {
      return this.classifyBatchWorker(texts);
    }

    // Fallback to main thread processing
    return texts.map(text => this.classify(text));
  }

  private async classifyBatchWorker(texts: string[]): Promise<ClassificationResult[]> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === id) {
          this.batchProcessor!.removeEventListener('message', handleMessage);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.results);
          }
        }
      };

      this.batchProcessor!.addEventListener('message', handleMessage);
      this.batchProcessor!.postMessage({
        id,
        type: 'classify-batch',
        texts,
        model: this.serializeModel()
      });
    });
  }

  // Optimized text preprocessing
  private preprocessText(text: string): string {
    // Use cached regex patterns
    return text
      .toLowerCase()
      .replace(this.getCachedRegex('urls'), '[URL]')
      .replace(this.getCachedRegex('emails'), '[EMAIL]')
      .replace(this.getCachedRegex('numbers'), '[NUM]')
      .replace(this.getCachedRegex('punctuation'), ' ')
      .replace(this.getCachedRegex('whitespace'), ' ')
      .trim();
  }

  private regexCache = new Map<string, RegExp>();

  private getCachedRegex(type: string): RegExp {
    if (!this.regexCache.has(type)) {
      const patterns = {
        urls: /https?:\/\/[^\s]+/gi,
        emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
        numbers: /\b\d+(?:\.\d+)?\b/g,
        punctuation: /[^\w\s]/g,
        whitespace: /\s+/g
      };
      this.regexCache.set(type, patterns[type]);
    }
    return this.regexCache.get(type)!;
  }

  // Performance monitoring
  getPerformanceMetrics(): NLPPerformanceMetrics {
    return {
      cacheHitRate: this.calculateCacheHitRate(),
      averageClassificationTime: this.getAverageClassificationTime(),
      featureCacheSize: this.featureCache.size,
      classificationCacheSize: this.classificationCache.size,
      workerUtilization: this.batchProcessor ? this.getWorkerUtilization() : 0
    };
  }
}
```

### Web Worker for NLP Processing

```javascript
// public/workers/nlp-worker.js
class NLPWorker {
  constructor() {
    this.classifier = null;
    this.isInitialized = false;
  }

  async initialize(modelData) {
    // Initialize classifier with serialized model
    this.classifier = new MemoryClassifier();
    await this.classifier.deserializeModel(modelData);
    this.isInitialized = true;
  }

  classifyBatch(texts) {
    if (!this.isInitialized) {
      throw new Error('Worker not initialized');
    }

    const results = [];
    const batchSize = 100;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      for (const text of batch) {
        results.push(this.classifier.classify(text));
      }

      // Yield control periodically
      if (i % (batchSize * 10) === 0) {
        // Allow other messages to be processed
        setTimeout(() => {}, 0);
      }
    }

    return results;
  }
}

const worker = new NLPWorker();

self.addEventListener('message', async (event) => {
  const { id, type, ...data } = event.data;

  try {
    let result;

    switch (type) {
      case 'initialize':
        await worker.initialize(data.model);
        result = { success: true };
        break;

      case 'classify-batch':
        result = {
          results: worker.classifyBatch(data.texts)
        };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ id, ...result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
});
```

## Streaming for Large Datasets

### Streaming Query Results

```typescript
// Streaming query implementation
export class StreamingQueryProcessor {
  async *queryStream(
    query: MemoryQuery,
    batchSize: number = 100
  ): AsyncIterable<MemoryItem[]> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batchQuery = {
        ...query,
        limit: batchSize,
        offset
      };

      const batch = await this.storage.query(batchQuery);

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      yield batch;

      offset += batch.length;
      hasMore = batch.length === batchSize;

      // Allow other operations to process
      await this.yieldToEventLoop();
    }
  }

  // Process large datasets without blocking
  async processLargeDataset<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      batchSize?: number;
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<R[]> {
    const {
      batchSize = 100,
      concurrency = 5,
      onProgress
    } = options;

    const results: R[] = [];
    const total = items.length;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch with controlled concurrency
      const batchPromises = batch.map((item, index) =>
        this.limitConcurrency(
          () => processor(item),
          concurrency,
          i + index
        )
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (onProgress) {
        onProgress(results.length, total);
      }

      // Yield to prevent blocking
      await this.yieldToEventLoop();
    }

    return results;
  }

  private semaphore = new Map<number, Promise<void>>();

  private async limitConcurrency<T>(
    operation: () => Promise<T>,
    limit: number,
    key: number
  ): Promise<T> {
    const semaphoreKey = key % limit;

    // Wait for previous operation in this slot
    if (this.semaphore.has(semaphoreKey)) {
      await this.semaphore.get(semaphoreKey);
    }

    // Execute operation and update semaphore
    const promise = operation().finally(() => {
      this.semaphore.delete(semaphoreKey);
    });

    this.semaphore.set(semaphoreKey, promise);
    return promise;
  }

  private async yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### Reactive Data Processing

```typescript
// Observable-based reactive processing
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {
  map,
  filter,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  scan
} from 'rxjs/operators';

export class ReactiveKuzuMemory extends KuzuMemory {
  private querySubject = new Subject<MemoryQuery>();
  private memoryUpdates = new Subject<MemoryUpdateEvent>();
  private results = new BehaviorSubject<MemoryItem[]>([]);

  constructor(storage: StorageAdapter) {
    super(storage);
    this.setupReactiveQueries();
  }

  private setupReactiveQueries(): void {
    // Debounced query processing
    this.querySubject.pipe(
      debounceTime(300), // Wait 300ms after last query
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap(query => this.executeQuery(query))
    ).subscribe(results => {
      this.results.next(results);
    });

    // Real-time result updates
    this.memoryUpdates.pipe(
      scan((acc, update) => this.updateResults(acc, update), [] as MemoryItem[])
    ).subscribe(updatedResults => {
      this.results.next(updatedResults);
    });
  }

  // Reactive query interface
  query(query: MemoryQuery): Observable<MemoryItem[]> {
    this.querySubject.next(query);
    return this.results.asObservable();
  }

  // Real-time updates
  override async create(content: string, options?: CreateOptions): Promise<MemoryItem> {
    const memory = await super.create(content, options);

    this.memoryUpdates.next({
      type: 'created',
      memory,
      timestamp: new Date()
    });

    return memory;
  }

  override async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const memory = await super.update(id, updates);

    this.memoryUpdates.next({
      type: 'updated',
      memory,
      timestamp: new Date()
    });

    return memory;
  }

  private updateResults(
    currentResults: MemoryItem[],
    update: MemoryUpdateEvent
  ): MemoryItem[] {
    switch (update.type) {
      case 'created':
        return [update.memory, ...currentResults];

      case 'updated':
        return currentResults.map(item =>
          item.id === update.memory.id ? update.memory : item
        );

      case 'deleted':
        return currentResults.filter(item => item.id !== update.memory.id);

      default:
        return currentResults;
    }
  }
}
```

## Monitoring and Metrics

### Performance Dashboard

```typescript
// Real-time performance monitoring
export class PerformanceDashboard {
  private metrics = new Map<string, PerformanceMetric[]>();
  private alerts = new Subject<PerformanceAlert>();
  private isMonitoring = false;

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Memory usage monitoring
    this.monitorMemoryUsage();

    // Operation performance monitoring
    this.monitorOperations();

    // Storage performance monitoring
    this.monitorStorage();

    // Network performance (if applicable)
    this.monitorNetwork();
  }

  private monitorMemoryUsage(): void {
    const interval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = {
          timestamp: Date.now(),
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        };

        this.recordMetric('memory.usage', usage);

        // Alert on high memory usage
        if (usage.percentage > 90) {
          this.alerts.next({
            type: 'memory',
            level: 'critical',
            message: `Memory usage at ${usage.percentage.toFixed(1)}%`,
            timestamp: new Date()
          });
        }
      }
    }, 5000);

    // Clean up on stop
    this.cleanupTasks.push(() => clearInterval(interval));
  }

  private monitorOperations(): void {
    // Intercept KuzuMemory operations
    const originalCreate = KuzuMemory.prototype.create;
    const originalRecall = KuzuMemory.prototype.recall;

    KuzuMemory.prototype.create = async function(content: string, options?: any) {
      const start = performance.now();
      try {
        const result = await originalCreate.call(this, content, options);
        dashboard.recordMetric('operation.create', {
          duration: performance.now() - start,
          success: true,
          timestamp: Date.now()
        });
        return result;
      } catch (error) {
        dashboard.recordMetric('operation.create', {
          duration: performance.now() - start,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    };

    // Similar monitoring for other operations...
  }

  getDashboardData(): DashboardData {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    return {
      memoryUsage: this.getRecentMetrics('memory.usage', oneHourAgo),
      operationTimes: {
        create: this.getOperationStats('operation.create', oneHourAgo),
        recall: this.getOperationStats('operation.recall', oneHourAgo),
        update: this.getOperationStats('operation.update', oneHourAgo)
      },
      errorRates: this.getErrorRates(oneHourAgo),
      throughput: this.calculateThroughput(oneHourAgo),
      alerts: this.getRecentAlerts(oneHourAgo)
    };
  }

  generatePerformanceReport(): PerformanceReport {
    const data = this.getDashboardData();
    const recommendations: string[] = [];

    // Analyze patterns and generate recommendations
    if (data.memoryUsage.some(m => m.percentage > 80)) {
      recommendations.push('Consider implementing memory cleanup or increasing cache limits');
    }

    if (data.operationTimes.create.p95 > 100) {
      recommendations.push('Memory creation is slow, consider optimizing classification or storage');
    }

    if (data.errorRates.overall > 0.05) {
      recommendations.push('High error rate detected, review error handling and storage stability');
    }

    return {
      timestamp: new Date(),
      summary: {
        healthScore: this.calculateHealthScore(data),
        performance: this.calculatePerformanceScore(data),
        reliability: this.calculateReliabilityScore(data)
      },
      metrics: data,
      recommendations,
      trends: this.analyzeTrends(data)
    };
  }
}
```

### Automated Performance Alerts

```typescript
// Intelligent alerting system
export class PerformanceAlertManager {
  private rules: AlertRule[] = [];
  private alertHistory = new Map<string, AlertEvent[]>();
  private subscribers = new Set<AlertSubscriber>();

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  processMetric(metric: PerformanceMetric): void {
    for (const rule of this.rules) {
      if (this.evaluateRule(rule, metric)) {
        this.triggerAlert(rule, metric);
      }
    }
  }

  private evaluateRule(rule: AlertRule, metric: PerformanceMetric): boolean {
    switch (rule.condition.type) {
      case 'threshold':
        return metric.value > rule.condition.threshold;

      case 'trend':
        const history = this.getMetricHistory(metric.name, rule.condition.windowSize);
        return this.detectTrend(history, rule.condition.trend);

      case 'anomaly':
        const baseline = this.calculateBaseline(metric.name);
        return Math.abs(metric.value - baseline) > rule.condition.deviationThreshold;

      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, metric: PerformanceMetric): Promise<void> {
    const alertKey = `${rule.id}-${metric.name}`;
    const now = new Date();

    // Check if we're in cooldown period
    const lastAlert = this.getLastAlert(alertKey);
    if (lastAlert && (now.getTime() - lastAlert.timestamp.getTime()) < rule.cooldown) {
      return; // Skip alert due to cooldown
    }

    const alert: AlertEvent = {
      id: generateUUID(),
      ruleId: rule.id,
      level: rule.level,
      title: rule.title,
      message: this.formatAlertMessage(rule, metric),
      timestamp: now,
      metric: metric.name,
      value: metric.value,
      acknowledged: false
    };

    // Record alert
    if (!this.alertHistory.has(alertKey)) {
      this.alertHistory.set(alertKey, []);
    }
    this.alertHistory.get(alertKey)!.push(alert);

    // Notify subscribers
    for (const subscriber of this.subscribers) {
      try {
        await subscriber.onAlert(alert);
      } catch (error) {
        console.error('Alert subscriber error:', error);
      }
    }

    // Auto-escalate critical alerts
    if (rule.level === 'critical') {
      setTimeout(() => {
        if (!alert.acknowledged) {
          this.escalateAlert(alert);
        }
      }, rule.escalationDelay || 300000); // 5 minutes
    }
  }
}
```

## Performance Debugging

### Performance Profiler

```typescript
// Built-in performance profiler
export class KuzuPerformanceProfiler {
  private profiles = new Map<string, ProfileSession>();
  private activeSession?: ProfileSession;

  startProfiling(sessionName: string): void {
    this.activeSession = {
      name: sessionName,
      startTime: performance.now(),
      operations: [],
      callStack: [],
      memorySnapshots: []
    };

    this.profiles.set(sessionName, this.activeSession);

    // Take initial memory snapshot
    this.takeMemorySnapshot('session-start');
  }

  stopProfiling(): ProfileSession | undefined {
    if (!this.activeSession) return undefined;

    this.activeSession.endTime = performance.now();
    this.activeSession.duration = this.activeSession.endTime - this.activeSession.startTime;

    this.takeMemorySnapshot('session-end');

    const session = this.activeSession;
    this.activeSession = undefined;

    return session;
  }

  // Instrument function calls
  profile<T>(
    operationName: string,
    operation: () => T | Promise<T>
  ): T | Promise<T> {
    if (!this.activeSession) {
      return operation();
    }

    const start = performance.now();
    const depth = this.activeSession.callStack.length;

    this.activeSession.callStack.push(operationName);

    const recordEnd = (result: any, error?: Error) => {
      const end = performance.now();
      const duration = end - start;

      this.activeSession!.operations.push({
        name: operationName,
        startTime: start,
        duration,
        depth,
        success: !error,
        error: error?.message,
        result: typeof result === 'object' ? JSON.stringify(result).length : 0
      });

      this.activeSession!.callStack.pop();
    };

    try {
      const result = operation();

      if (result instanceof Promise) {
        return result
          .then(res => {
            recordEnd(res);
            return res;
          })
          .catch(err => {
            recordEnd(null, err);
            throw err;
          });
      } else {
        recordEnd(result);
        return result;
      }
    } catch (error) {
      recordEnd(null, error);
      throw error;
    }
  }

  analyzeProfile(sessionName: string): ProfileAnalysis {
    const session = this.profiles.get(sessionName);
    if (!session) {
      throw new Error(`Profile session "${sessionName}" not found`);
    }

    const analysis: ProfileAnalysis = {
      session: sessionName,
      totalDuration: session.duration!,
      operationCount: session.operations.length,
      operationStats: this.analyzeOperations(session.operations),
      hotspots: this.findHotspots(session.operations),
      memoryAnalysis: this.analyzeMemoryUsage(session.memorySnapshots),
      recommendations: []
    };

    // Generate recommendations
    analysis.recommendations = this.generateOptimizationRecommendations(analysis);

    return analysis;
  }

  private findHotspots(operations: ProfiledOperation[]): Hotspot[] {
    const operationTimes = new Map<string, number[]>();

    // Group operations by name
    for (const op of operations) {
      if (!operationTimes.has(op.name)) {
        operationTimes.set(op.name, []);
      }
      operationTimes.get(op.name)!.push(op.duration);
    }

    // Calculate statistics and identify hotspots
    const hotspots: Hotspot[] = [];

    for (const [name, durations] of operationTimes) {
      const totalTime = durations.reduce((a, b) => a + b, 0);
      const averageTime = totalTime / durations.length;
      const maxTime = Math.max(...durations);

      if (totalTime > 100 || averageTime > 50) { // Configurable thresholds
        hotspots.push({
          operation: name,
          totalTime,
          averageTime,
          maxTime,
          callCount: durations.length,
          impact: totalTime / durations.length // Impact score
        });
      }
    }

    return hotspots.sort((a, b) => b.impact - a.impact);
  }

  exportProfile(sessionName: string, format: 'json' | 'chrome-trace' = 'json'): string {
    const session = this.profiles.get(sessionName);
    if (!session) {
      throw new Error(`Profile session "${sessionName}" not found`);
    }

    if (format === 'chrome-trace') {
      return this.toChromeTraceFormat(session);
    }

    return JSON.stringify(session, null, 2);
  }

  private toChromeTraceFormat(session: ProfileSession): string {
    const events = session.operations.map(op => ({
      name: op.name,
      cat: 'kuzu-memory',
      ph: 'X', // Complete event
      ts: op.startTime * 1000, // Convert to microseconds
      dur: op.duration * 1000,
      pid: 1,
      tid: 1,
      args: {
        success: op.success,
        depth: op.depth,
        error: op.error
      }
    }));

    return JSON.stringify({
      traceEvents: events,
      displayTimeUnit: 'ms'
    });
  }
}
```

This comprehensive performance optimization guide provides the foundation for maintaining excellent performance in the Kuzu Memory library across all use cases and deployment scenarios. The monitoring, profiling, and optimization strategies ensure the library remains fast and efficient as it scales.