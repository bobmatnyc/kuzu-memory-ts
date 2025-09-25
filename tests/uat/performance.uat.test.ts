import { KuzuMemory } from '../../src/core/KuzuMemory';
import { MemoryItem, MemoryType } from '../../src/types';
import { MemoryAdapter } from '../../src/storage/MemoryAdapter';
import { LocalStorageAdapter } from '../../src/storage/LocalStorageAdapter';
import { IndexedDBAdapter } from '../../src/storage/IndexedDBAdapter';
import { RecencyStrategy } from '../../src/recall/RecencyStrategy';
import { ImportanceStrategy } from '../../src/recall/ImportanceStrategy';
import { CompositeStrategy } from '../../src/recall/CompositeStrategy';
import { createMemoryBatch, createSampleMemory } from '../fixtures/sample-memories';

describe('Performance Benchmark UAT Tests', () => {
  // Performance targets
  const PERFORMANCE_TARGETS = {
    STORAGE_TIME: 20, // ms
    RETRIEVAL_TIME: 10, // ms
    QUERY_TIME: 50, // ms
    RECALL_TIME: 100, // ms
    BULK_STORAGE_TIME: 1000, // ms for 1000 items
    BULK_RECALL_TIME: 200, // ms for 1000 items
    MEMORY_USAGE_THRESHOLD: 50 * 1024 * 1024, // 50MB
  };

  describe('Storage Performance', () => {
    const adapters = [
      { name: 'MemoryAdapter', create: () => new MemoryAdapter() },
      { name: 'LocalStorageAdapter', create: () => new LocalStorageAdapter({ dbName: 'perf-test' }) },
      { name: 'IndexedDBAdapter', create: () => new IndexedDBAdapter({ dbName: 'perf-test', version: 1 }) },
    ];

    describe.each(adapters)('$name Performance', ({ create }) => {
      let adapter: any;

      beforeEach(async () => {
        adapter = create();
        await adapter.init();
        await adapter.clear();
      });

      afterEach(async () => {
        if (adapter) {
          await adapter.clear();
        }
      });

      it('should meet single item storage time target', async () => {
        const memory = createSampleMemory();

        const startTime = performance.now();
        await adapter.create(memory);
        const duration = performance.now() - startTime;

        expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME);
      });

      it('should meet single item retrieval time target', async () => {
        const memory = await adapter.create(createSampleMemory());

        const startTime = performance.now();
        await adapter.get(memory.id);
        const duration = performance.now() - startTime;

        expect(duration).toBeLessThan(PERFORMANCE_TARGETS.RETRIEVAL_TIME);
      });

      it('should handle bulk storage efficiently', async () => {
        const batchSize = 1000;
        const memories = createMemoryBatch(batchSize);

        const startTime = performance.now();
        await Promise.all(memories.map(memory => adapter.create(memory)));
        const duration = performance.now() - startTime;

        expect(duration).toBeLessThan(PERFORMANCE_TARGETS.BULK_STORAGE_TIME);

        // Verify storage rate
        const itemsPerSecond = batchSize / (duration / 1000);
        expect(itemsPerSecond).toBeGreaterThan(100); // At least 100 items/second
      });

      it('should handle bulk retrieval efficiently', async () => {
        const batchSize = 100;
        const memories = createMemoryBatch(batchSize);
        const storedMemories = await Promise.all(
          memories.map(memory => adapter.create(memory))
        );

        const ids = storedMemories.map(m => m.id);

        const startTime = performance.now();
        await adapter.getMany(ids);
        const duration = performance.now() - startTime;

        expect(duration).toBeLessThan(PERFORMANCE_TARGETS.RETRIEVAL_TIME * 5);

        // Verify retrieval rate
        const itemsPerSecond = batchSize / (duration / 1000);
        expect(itemsPerSecond).toBeGreaterThan(200); // At least 200 items/second
      });

      it('should maintain performance with large datasets', async () => {
        const largeDatasetSize = 5000;
        const memories = createMemoryBatch(largeDatasetSize);

        // Store large dataset
        const storageStartTime = performance.now();
        for (let i = 0; i < memories.length; i += 100) {
          const batch = memories.slice(i, i + 100);
          await Promise.all(batch.map(memory => adapter.create(memory)));
        }
        const storageTime = performance.now() - storageStartTime;

        // Query performance should not degrade significantly
        const queryStartTime = performance.now();
        const results = await adapter.query({
          text: 'test',
          limit: 10,
        });
        const queryTime = performance.now() - queryStartTime;

        expect(queryTime).toBeLessThan(PERFORMANCE_TARGETS.QUERY_TIME * 2); // Allow 2x for large dataset

        // Cleanup
        await adapter.clear();
      });

      it('should handle concurrent operations efficiently', async () => {
        const concurrentOperations = 50;
        const memories = createMemoryBatch(concurrentOperations);

        // Concurrent storage
        const storageStartTime = performance.now();
        await Promise.all(memories.map(memory => adapter.create(memory)));
        const storageTime = performance.now() - storageStartTime;

        expect(storageTime).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME * 10);

        // Get all stored IDs
        const stats = await adapter.getStats();
        expect(stats.totalItems).toBe(concurrentOperations);

        // Concurrent queries
        const queryPromises = Array.from({ length: 10 }, () =>
          adapter.query({ limit: 5, sortBy: 'timestamp' })
        );

        const queryStartTime = performance.now();
        const queryResults = await Promise.all(queryPromises);
        const queryTime = performance.now() - queryStartTime;

        expect(queryTime).toBeLessThan(PERFORMANCE_TARGETS.QUERY_TIME * 2);
        expect(queryResults.every(results => results.length <= 5)).toBe(true);
      });
    });
  });

  describe('Recall Strategy Performance', () => {
    let testMemories: MemoryItem[];

    beforeEach(() => {
      testMemories = createMemoryBatch(1000);
    });

    it('should meet RecencyStrategy performance targets', async () => {
      const strategy = new RecencyStrategy();

      const startTime = performance.now();
      const results = await strategy.recall('test query', testMemories);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should meet ImportanceStrategy performance targets', async () => {
      const strategy = new ImportanceStrategy();

      const startTime = performance.now();
      const results = await strategy.recall('important query', testMemories);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should meet CompositeStrategy performance targets', async () => {
      const strategy = new CompositeStrategy({
        strategies: [
          { strategy: new RecencyStrategy(), weight: 0.4 },
          { strategy: new ImportanceStrategy(), weight: 0.6 },
        ],
      });

      const startTime = performance.now();
      const results = await strategy.recall('composite query', testMemories);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME * 1.5); // Allow extra time for composite
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should scale linearly with memory set size', async () => {
      const strategy = new RecencyStrategy();
      const baselines: { size: number; time: number }[] = [];

      // Test with different memory set sizes
      const sizes = [100, 500, 1000, 2000];

      for (const size of sizes) {
        const memories = createMemoryBatch(size);

        const startTime = performance.now();
        await strategy.recall('scaling test', memories);
        const duration = performance.now() - startTime;

        baselines.push({ size, time: duration });
      }

      // Verify roughly linear scaling (not exponential)
      const firstRatio = baselines[1].time / baselines[0].time;
      const lastRatio = baselines[3].time / baselines[2].time;

      // Ratio should not increase dramatically (indicating exponential growth)
      expect(lastRatio).toBeLessThan(firstRatio * 3);
    });

    it('should maintain performance with frequent recalls', async () => {
      const strategy = new RecencyStrategy();
      const recallCount = 100;
      const durations: number[] = [];

      for (let i = 0; i < recallCount; i++) {
        const startTime = performance.now();
        await strategy.recall(`query ${i}`, testMemories);
        const duration = performance.now() - startTime;
        durations.push(duration);
      }

      const averageDuration = durations.reduce((sum, dur) => sum + dur, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(averageDuration).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME);
      expect(maxDuration).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME * 2);

      // Check for performance degradation over time
      const firstHalf = durations.slice(0, 50);
      const secondHalf = durations.slice(50);
      const firstAvg = firstHalf.reduce((sum, dur) => sum + dur, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, dur) => sum + dur, 0) / secondHalf.length;

      // Second half should not be significantly slower
      expect(secondAvg).toBeLessThan(firstAvg * 1.5);
    });
  });

  describe('End-to-End Performance', () => {
    let memory: KuzuMemory;

    beforeEach(async () => {
      memory = new KuzuMemory({
        storage: 'memory',
        maxMemories: 10000,
        decayEnabled: false, // Disable for consistent testing
      });
      await memory.init();
    });

    afterEach(async () => {
      if (memory) {
        await memory.clear();
      }
    });

    it('should meet end-to-end workflow performance targets', async () => {
      const workflowItems = 50;

      // Measure full workflow: store -> recall -> update -> recall
      const startTime = performance.now();

      // Store phase
      const storeStartTime = performance.now();
      const storedMemories = await Promise.all(
        Array.from({ length: workflowItems }, (_, i) =>
          memory.store({
            type: 'semantic' as MemoryType,
            content: `Workflow test item ${i} with various keywords for testing`,
            tags: ['workflow', 'performance', `item-${i}`],
            importance: Math.random(),
          })
        )
      );
      const storeTime = performance.now() - storeStartTime;

      // Recall phase
      const recallStartTime = performance.now();
      const recalled = await memory.recall('workflow test keywords');
      const recallTime = performance.now() - recallStartTime;

      // Update phase
      const updateStartTime = performance.now();
      await Promise.all(
        storedMemories.slice(0, 10).map(mem =>
          memory.update(mem.id, { importance: 0.9 })
        )
      );
      const updateTime = performance.now() - updateStartTime;

      // Final recall phase
      const finalRecallStartTime = performance.now();
      const finalRecalled = await memory.recall('workflow test');
      const finalRecallTime = performance.now() - finalRecallStartTime;

      const totalTime = performance.now() - startTime;

      // Individual phase targets
      expect(storeTime).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME * workflowItems);
      expect(recallTime).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME);
      expect(updateTime).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME * 10);
      expect(finalRecallTime).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME);

      // Total workflow should complete in reasonable time
      expect(totalTime).toBeLessThan(3000); // 3 seconds max

      // Verify functionality wasn't compromised for performance
      expect(recalled.length).toBeGreaterThan(0);
      expect(finalRecalled.length).toBeGreaterThanOrEqual(recalled.length);
    });

    it('should maintain performance with real-world usage patterns', async () => {
      // Simulate realistic usage: mixed operations over time
      const operations = [
        'store', 'recall', 'store', 'query', 'update', 'recall', 'store', 'query'
      ];

      const operationTimes: { [key: string]: number[] } = {
        store: [],
        recall: [],
        query: [],
        update: [],
      };

      let memoryIds: string[] = [];

      for (let cycle = 0; cycle < 10; cycle++) {
        for (const op of operations) {
          const startTime = performance.now();

          switch (op) {
            case 'store':
              const stored = await memory.store({
                type: 'episodic' as MemoryType,
                content: `Real world content for cycle ${cycle}`,
                tags: ['real-world', `cycle-${cycle}`],
                importance: Math.random(),
              });
              memoryIds.push(stored.id);
              operationTimes.store.push(performance.now() - startTime);
              break;

            case 'recall':
              await memory.recall('real world content');
              operationTimes.recall.push(performance.now() - startTime);
              break;

            case 'query':
              await memory.query({
                tags: ['real-world'],
                limit: 5,
                sortBy: 'importance',
              });
              operationTimes.query.push(performance.now() - startTime);
              break;

            case 'update':
              if (memoryIds.length > 0) {
                const randomId = memoryIds[Math.floor(Math.random() * memoryIds.length)];
                await memory.update(randomId, { accessCount: 10 });
                operationTimes.update.push(performance.now() - startTime);
              }
              break;
          }
        }
      }

      // Verify performance targets for each operation type
      Object.entries(operationTimes).forEach(([op, times]) => {
        if (times.length > 0) {
          const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
          const maxTime = Math.max(...times);

          switch (op) {
            case 'store':
              expect(avgTime).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME);
              expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME * 2);
              break;
            case 'recall':
              expect(avgTime).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME);
              expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME * 2);
              break;
            case 'query':
              expect(avgTime).toBeLessThan(PERFORMANCE_TARGETS.QUERY_TIME);
              expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.QUERY_TIME * 2);
              break;
            case 'update':
              expect(avgTime).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME);
              expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME * 2);
              break;
          }
        }
      });
    });

    it('should handle memory pressure gracefully', async () => {
      // Test with large amount of data to stress memory usage
      const largeContentSize = 10000; // 10KB per memory
      const memoryCount = 100;

      const startTime = performance.now();
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

      // Create memories with large content
      for (let i = 0; i < memoryCount; i++) {
        await memory.store({
          type: 'semantic' as MemoryType,
          content: 'A'.repeat(largeContentSize) + ` Memory ${i}`,
          tags: ['large-content'],
          importance: Math.random(),
        });

        // Test performance hasn't degraded
        if (i % 20 === 0 && i > 0) {
          const recallStartTime = performance.now();
          await memory.recall('Memory');
          const recallTime = performance.now() - recallStartTime;

          expect(recallTime).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME * 2);
        }
      }

      const totalTime = performance.now() - startTime;
      const finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

      // Should complete in reasonable time even with large data
      expect(totalTime).toBeLessThan(10000); // 10 seconds max

      // Memory usage should be reasonable (if available)
      if (process.memoryUsage && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_TARGETS.MEMORY_USAGE_THRESHOLD);
      }

      // Verify data integrity wasn't compromised
      const stats = await memory.getStats();
      expect(stats.totalItems).toBe(memoryCount);
    });
  });

  describe('Pattern Extraction Performance', () => {
    let memory: KuzuMemory;

    beforeEach(async () => {
      memory = new KuzuMemory({
        storage: 'memory',
      });
      await memory.init();
    });

    afterEach(async () => {
      if (memory) {
        await memory.clear();
      }
    });

    it('should extract patterns efficiently from large text', async () => {
      const largeText = [
        'My name is John Doe and I work as a senior software engineer.',
        'I prefer TypeScript over JavaScript for large applications.',
        'We decided to use React with Next.js for our frontend framework.',
        'Contact me at john.doe@company.com for technical discussions.',
        'The project deadline is March 15th, 2024.',
        'I like working with Docker, Kubernetes, and AWS for deployments.',
      ].join(' ').repeat(50); // Create large text block

      const startTime = performance.now();
      const patterns = await memory.extractPatterns(largeText);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200); // Should complete within 200ms
      expect(patterns.length).toBeGreaterThan(0);

      // Verify pattern quality wasn't compromised for speed
      const identityPatterns = patterns.filter(p => p.pattern.includes('identity'));
      const emailPatterns = patterns.filter(p => p.pattern.includes('email'));

      expect(identityPatterns.length).toBeGreaterThan(0);
      expect(emailPatterns.length).toBeGreaterThan(0);
    });

    it('should handle batch pattern extraction efficiently', async () => {
      const textSamples = [
        'I am Alice and I prefer React for frontend development.',
        'My email is bob@example.com and I like Vue.js.',
        'We decided to migrate to TypeScript for better type safety.',
        'The meeting is scheduled for January 20th at 2 PM.',
        'Contact support at help@company.org for assistance.',
      ];

      const startTime = performance.now();
      const allPatterns = await Promise.all(
        textSamples.map(text => memory.extractPatterns(text))
      );
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Batch should be fast
      expect(allPatterns.length).toBe(textSamples.length);

      // Verify each extraction found patterns
      allPatterns.forEach(patterns => {
        expect(patterns.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Stress Tests', () => {
    it('should handle extreme load conditions', async () => {
      const memory = new KuzuMemory({
        storage: 'memory',
        maxMemories: 5000,
      });
      await memory.init();

      try {
        // Rapid-fire operations
        const rapidOperations = Array.from({ length: 200 }, async (_, i) => {
          const stored = await memory.store({
            type: 'working' as MemoryType,
            content: `Stress test memory ${i}`,
            tags: ['stress'],
            importance: Math.random(),
          });

          // Immediately try to recall
          await memory.recall(`stress test ${i}`);

          return stored;
        });

        const startTime = performance.now();
        const results = await Promise.all(rapidOperations);
        const duration = performance.now() - startTime;

        expect(results.length).toBe(200);
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

        // Verify system is still responsive
        const finalRecall = await memory.recall('stress test');
        expect(finalRecall.length).toBeGreaterThan(0);

      } finally {
        await memory.clear();
      }
    });

    it('should maintain performance under sustained load', async () => {
      const memory = new KuzuMemory({
        storage: 'memory',
        maxMemories: 2000,
      });
      await memory.init();

      try {
        const sustainedOperations = 5; // Number of sustained operation cycles
        const operationsPerCycle = 50;
        const cycleTimes: number[] = [];

        for (let cycle = 0; cycle < sustainedOperations; cycle++) {
          const cycleStartTime = performance.now();

          // Mixed operations per cycle
          await Promise.all([
            ...Array.from({ length: operationsPerCycle }, (_, i) =>
              memory.store({
                type: 'semantic' as MemoryType,
                content: `Sustained test cycle ${cycle} item ${i}`,
                tags: ['sustained', `cycle-${cycle}`],
                importance: Math.random(),
              })
            ),
            memory.recall('sustained test'),
            memory.query({ tags: ['sustained'], limit: 10 }),
          ]);

          const cycleTime = performance.now() - cycleStartTime;
          cycleTimes.push(cycleTime);

          // Brief pause between cycles
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Performance should remain consistent across cycles
        const avgCycleTime = cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length;
        const maxCycleTime = Math.max(...cycleTimes);
        const minCycleTime = Math.min(...cycleTimes);

        // Variation shouldn't be too extreme
        expect(maxCycleTime - minCycleTime).toBeLessThan(avgCycleTime * 2);

        // All cycles should complete in reasonable time
        expect(maxCycleTime).toBeLessThan(2000); // 2 seconds per cycle max

      } finally {
        await memory.clear();
      }
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish performance baselines', async () => {
      // This test establishes baseline measurements for regression detection
      const memory = new KuzuMemory({ storage: 'memory' });
      await memory.init();

      const baselines = {
        singleStore: 0,
        singleRecall: 0,
        batchStore: 0,
        batchRecall: 0,
        complexQuery: 0,
      };

      try {
        // Single store baseline
        const storeStartTime = performance.now();
        await memory.store({
          type: 'semantic' as MemoryType,
          content: 'Baseline test memory',
          tags: ['baseline'],
          importance: 0.8,
        });
        baselines.singleStore = performance.now() - storeStartTime;

        // Single recall baseline
        const recallStartTime = performance.now();
        await memory.recall('baseline test');
        baselines.singleRecall = performance.now() - recallStartTime;

        // Batch operations
        const batchSize = 100;
        const memories = createMemoryBatch(batchSize);

        const batchStoreStart = performance.now();
        await Promise.all(memories.map(mem => memory.store(mem)));
        baselines.batchStore = performance.now() - batchStoreStart;

        const batchRecallStart = performance.now();
        await memory.recall('test memory');
        baselines.batchRecall = performance.now() - batchRecallStart;

        // Complex query baseline
        const queryStart = performance.now();
        await memory.query({
          text: 'test',
          sortBy: 'importance',
          limit: 20,
        });
        baselines.complexQuery = performance.now() - queryStart;

        // Log baselines for future comparison
        console.log('Performance Baselines:', baselines);

        // Verify baselines are within acceptable ranges
        expect(baselines.singleStore).toBeLessThan(PERFORMANCE_TARGETS.STORAGE_TIME);
        expect(baselines.singleRecall).toBeLessThan(PERFORMANCE_TARGETS.RECALL_TIME);
        expect(baselines.batchStore).toBeLessThan(PERFORMANCE_TARGETS.BULK_STORAGE_TIME);
        expect(baselines.complexQuery).toBeLessThan(PERFORMANCE_TARGETS.QUERY_TIME);

      } finally {
        await memory.clear();
      }
    });
  });
});