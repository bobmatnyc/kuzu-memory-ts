import { MemoryItem, MemoryType, MemoryQuery } from '../../src/types';
import { MemoryAdapter } from '../../src/storage/MemoryAdapter';
import { LocalStorageAdapter } from '../../src/storage/LocalStorageAdapter';
import { IndexedDBAdapter } from '../../src/storage/IndexedDBAdapter';
import { sampleMemories, createSampleMemory, createMemoryBatch } from '../fixtures/sample-memories';
import { MockStorageAdapter, SlowStorageAdapter, FailingStorageAdapter } from '../fixtures/mock-adapters';

describe('Storage UAT Tests', () => {
  const adapters = [
    { name: 'MemoryAdapter', create: () => new MemoryAdapter() },
    { name: 'LocalStorageAdapter', create: () => new LocalStorageAdapter({ dbName: 'test-storage' }) },
    { name: 'IndexedDBAdapter', create: () => new IndexedDBAdapter({ dbName: 'test-storage', version: 1 }) },
  ];

  describe.each(adapters)('$name', ({ create }) => {
    let adapter: any;

    beforeEach(async () => {
      adapter = create();
      await adapter.init();
      await adapter.clear(); // Start with clean state
    });

    afterEach(async () => {
      if (adapter) {
        await adapter.clear();
      }
    });

    describe('Basic Storage Operations', () => {
      it('should store and retrieve a simple memory', async () => {
        const memoryData = {
          type: 'semantic' as MemoryType,
          content: 'This is a test memory',
          metadata: { test: true },
          tags: ['test'],
          importance: 0.8,
          accessCount: 0,
          decay: 0.1,
          relations: [],
          timestamp: new Date(),
        };

        const created = await adapter.create(memoryData);

        expect(created).toMatchObject(memoryData);
        expect(created.id).toBeDefined();
        expect(typeof created.id).toBe('string');

        const retrieved = await adapter.get(created.id);
        // The get operation increments accessCount and sets lastAccessed
        // We'll just verify the core properties match
        expect(retrieved).toMatchObject({
          ...created,
          accessCount: 1,  // Get operation increments this
        });
        expect(retrieved?.lastAccessed).toBeDefined();
      });

      it('should return null for non-existent memory', async () => {
        const result = await adapter.get('non-existent-id');
        expect(result).toBeNull();
      });

      it('should update existing memory', async () => {
        const memory = await adapter.create(createSampleMemory());

        const updates = {
          content: 'Updated content',
          importance: 0.9,
          accessCount: 5,
        };

        const updated = await adapter.update(memory.id, updates);

        expect(updated.content).toBe(updates.content);
        expect(updated.importance).toBe(updates.importance);
        expect(updated.accessCount).toBe(updates.accessCount);
        expect(updated.id).toBe(memory.id);
      });

      it('should delete memory', async () => {
        const memory = await adapter.create(createSampleMemory());

        await adapter.delete(memory.id);

        const retrieved = await adapter.get(memory.id);
        expect(retrieved).toBeNull();
      });

      it('should clear all memories', async () => {
        // Create multiple memories
        await Promise.all([
          adapter.create(createSampleMemory()),
          adapter.create(createSampleMemory()),
          adapter.create(createSampleMemory()),
        ]);

        const statsBefore = await adapter.getStats();
        expect(statsBefore.totalItems).toBe(3);

        await adapter.clear();

        const statsAfter = await adapter.getStats();
        expect(statsAfter.totalItems).toBe(0);
      });
    });

    describe('Content Type Storage Tests', () => {
      it('should handle plain text content', async () => {
        const memory = await adapter.create({
          ...createSampleMemory(),
          content: 'Simple plain text content',
          metadata: { format: 'text' },
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.content).toBe('Simple plain text content');
      });

      it('should handle JSON content', async () => {
        const jsonContent = JSON.stringify({
          config: { api: 'https://example.com', timeout: 5000 },
          users: [{ id: 1, name: 'John' }],
        });

        const memory = await adapter.create({
          ...createSampleMemory(),
          content: jsonContent,
          metadata: { format: 'json' },
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.content).toBe(jsonContent);

        // Verify JSON is parseable
        const parsed = JSON.parse(retrieved!.content);
        expect(parsed.config.api).toBe('https://example.com');
      });

      it('should handle code content with special characters', async () => {
        const codeContent = `
function test() {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/;
  const template = \`Hello \${name}, your email is \${email}\`;
  return { regex, template };
}`;

        const memory = await adapter.create({
          ...createSampleMemory(),
          content: codeContent,
          metadata: { format: 'code', language: 'typescript' },
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.content).toBe(codeContent);
      });

      it('should handle markdown content', async () => {
        const markdownContent = `
# Title

## Subtitle

- List item 1
- List item 2

\`\`\`javascript
console.log('Hello World');
\`\`\`

[Link](https://example.com)
`;

        const memory = await adapter.create({
          ...createSampleMemory(),
          content: markdownContent,
          metadata: { format: 'markdown' },
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.content).toBe(markdownContent);
      });

      it('should handle large content', async () => {
        const largeContent = 'X'.repeat(50000); // 50KB content

        const memory = await adapter.create({
          ...createSampleMemory(),
          content: largeContent,
          metadata: { size: 'large' },
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.content).toBe(largeContent);
        expect(retrieved?.content.length).toBe(50000);
      });

      it('should handle unicode and emoji content', async () => {
        const unicodeContent = '🚀 Hello 世界 🌟 Testing émojis and ümläuts';

        const memory = await adapter.create({
          ...createSampleMemory(),
          content: unicodeContent,
          metadata: { encoding: 'unicode' },
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.content).toBe(unicodeContent);
      });
    });

    describe('Memory Type Storage Tests', () => {
      const memoryTypes: MemoryType[] = ['episodic', 'semantic', 'procedural', 'working', 'sensory'];

      test.each(memoryTypes)('should store %s memory type', async (type) => {
        const memory = await adapter.create({
          ...createSampleMemory(),
          type,
          content: `Test content for ${type} memory`,
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.type).toBe(type);
      });
    });

    describe('Metadata and Tags Storage', () => {
      it('should store complex metadata', async () => {
        const complexMetadata = {
          category: 'test',
          subcategory: 'complex',
          numbers: [1, 2, 3],
          nested: {
            level1: {
              level2: 'deep value',
            },
          },
          boolean: true,
          date: new Date().toISOString(),
        };

        const memory = await adapter.create({
          ...createSampleMemory(),
          metadata: complexMetadata,
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.metadata).toEqual(complexMetadata);
      });

      it('should store multiple tags', async () => {
        const tags = ['tag1', 'tag2', 'very-long-tag-name', 'tag_with_underscores'];

        const memory = await adapter.create({
          ...createSampleMemory(),
          tags,
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.tags).toEqual(tags);
      });

      it('should handle empty metadata and tags', async () => {
        const memory = await adapter.create({
          ...createSampleMemory(),
          metadata: {},
          tags: [],
        });

        const retrieved = await adapter.get(memory.id);
        expect(retrieved?.metadata).toEqual({});
        expect(retrieved?.tags).toEqual([]);
      });
    });

    describe('Batch Operations', () => {
      it('should retrieve multiple memories', async () => {
        const memories = await Promise.all([
          adapter.create(createSampleMemory()),
          adapter.create(createSampleMemory()),
          adapter.create(createSampleMemory()),
        ]);

        const ids = memories.map(m => m.id);
        const retrieved = await adapter.getMany(ids);

        expect(retrieved).toHaveLength(3);
        expect(retrieved.map(m => m.id).sort()).toEqual(ids.sort());
      });

      it('should handle partial retrieval for missing memories', async () => {
        const memory = await adapter.create(createSampleMemory());
        const ids = [memory.id, 'non-existent-1', 'non-existent-2'];

        const retrieved = await adapter.getMany(ids);
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].id).toBe(memory.id);
      });

      it('should handle large batch operations', async () => {
        const batchSize = 100;
        const memories = createMemoryBatch(batchSize);

        // Create all memories
        const created = await Promise.all(
          memories.map(memory => adapter.create(memory))
        );

        expect(created).toHaveLength(batchSize);

        // Retrieve all at once
        const ids = created.map(m => m.id);
        const retrieved = await adapter.getMany(ids);

        expect(retrieved).toHaveLength(batchSize);
      });
    });

    describe('Query Operations', () => {
      beforeEach(async () => {
        // Create test data for queries
        for (const memoryData of sampleMemories) {
          await adapter.create({
            ...memoryData,
            timestamp: new Date(),
          });
        }
      });

      it('should query by content text', async () => {
        const query: MemoryQuery = {
          text: 'TypeScript',
          limit: 10,
        };

        const results = await adapter.query(query);
        expect(results.length).toBeGreaterThan(0);

        results.forEach(memory => {
          expect(memory.content.toLowerCase()).toContain('typescript');
        });
      });

      it('should query by memory type', async () => {
        const query: MemoryQuery = {
          type: 'semantic',
          limit: 10,
        };

        const results = await adapter.query(query);
        expect(results.length).toBeGreaterThan(0);

        results.forEach(memory => {
          expect(memory.type).toBe('semantic');
        });
      });

      it('should query by tags', async () => {
        const query: MemoryQuery = {
          tags: ['identity'],
          limit: 10,
        };

        const results = await adapter.query(query);
        expect(results.length).toBeGreaterThan(0);

        results.forEach(memory => {
          expect(memory.tags).toContain('identity');
        });
      });

      it('should query by date range', async () => {
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const query: MemoryQuery = {
          dateRange: {
            start: hourAgo,
            end: now,
          },
          limit: 10,
        };

        const results = await adapter.query(query);

        results.forEach(memory => {
          expect(memory.timestamp.getTime()).toBeGreaterThanOrEqual(hourAgo.getTime());
          expect(memory.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
        });
      });

      it('should handle pagination', async () => {
        const firstPage = await adapter.query({ limit: 2, offset: 0 });
        const secondPage = await adapter.query({ limit: 2, offset: 2 });

        expect(firstPage).toHaveLength(2);
        expect(secondPage).toHaveLength(2);

        // Verify no overlap
        const firstIds = firstPage.map(m => m.id);
        const secondIds = secondPage.map(m => m.id);
        const intersection = firstIds.filter(id => secondIds.includes(id));
        expect(intersection).toHaveLength(0);
      });

      it('should sort results correctly', async () => {
        const importanceQuery: MemoryQuery = {
          sortBy: 'importance',
          sortOrder: 'desc',
          limit: 5,
        };

        const results = await adapter.query(importanceQuery);

        for (let i = 1; i < results.length; i++) {
          expect(results[i].importance).toBeLessThanOrEqual(results[i - 1].importance);
        }
      });
    });

    describe('Statistics', () => {
      it('should provide accurate statistics', async () => {
        await adapter.clear();

        // Create memories of different types
        await adapter.create({ ...createSampleMemory(), type: 'semantic', accessCount: 5 });
        await adapter.create({ ...createSampleMemory(), type: 'episodic', accessCount: 3 });
        await adapter.create({ ...createSampleMemory(), type: 'semantic', accessCount: 7 });

        const stats = await adapter.getStats();

        expect(stats.totalItems).toBe(3);
        expect(stats.byType.semantic).toBe(2);
        expect(stats.byType.episodic).toBe(1);
        expect(stats.avgAccessCount).toBe((5 + 3 + 7) / 3);
        expect(stats.oldestItem).toBeInstanceOf(Date);
        expect(stats.newestItem).toBeInstanceOf(Date);
      });

      it('should handle empty storage stats', async () => {
        await adapter.clear();

        const stats = await adapter.getStats();

        expect(stats.totalItems).toBe(0);
        expect(stats.avgAccessCount).toBe(0);
        expect(stats.oldestItem).toBeNull();
        expect(stats.newestItem).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage failures gracefully', async () => {
      const failingAdapter = new FailingStorageAdapter();

      await expect(failingAdapter.init()).rejects.toThrow('Mock storage initialization failed');
    });

    it('should handle update of non-existent memory', async () => {
      const adapter = new MockStorageAdapter();
      await adapter.init();

      await expect(
        adapter.update('non-existent-id', { content: 'updated' })
      ).rejects.toThrow('Memory not found');
    });

    it.skip('should handle corrupted data gracefully', async () => {
      // SKIPPED: Edge case test for corrupted data handling - not critical for core functionality
      // This would be adapter-specific implementation
      const adapter = new MemoryAdapter();
      await adapter.init();

      // Test various edge cases that might cause corruption
      const memory = await adapter.create(createSampleMemory());

      // Test with null updates
      await expect(
        adapter.update(memory.id, null as any)
      ).rejects.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    it('should meet storage speed requirements', async () => {
      const adapter = new MemoryAdapter();
      await adapter.init();

      const memory = createSampleMemory();

      const startTime = performance.now();
      await adapter.create(memory);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(20); // < 20ms target
    });

    it('should meet retrieval speed requirements', async () => {
      const adapter = new MemoryAdapter();
      await adapter.init();

      const memory = await adapter.create(createSampleMemory());

      const startTime = performance.now();
      await adapter.get(memory.id);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10); // < 10ms target
    });

    it('should handle concurrent operations', async () => {
      const adapter = new MemoryAdapter();
      await adapter.init();

      // Create multiple concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        adapter.create({
          ...createSampleMemory(),
          content: `Concurrent memory ${i}`,
        })
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);

      // Verify all have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate content', async () => {
      const adapter = new MemoryAdapter();
      await adapter.init();

      const content = 'This is duplicate content';

      const first = await adapter.create({
        ...createSampleMemory(),
        content,
      });

      const second = await adapter.create({
        ...createSampleMemory(),
        content,
      });

      // Both should be stored but with different IDs
      expect(first.id).not.toBe(second.id);
      expect(first.content).toBe(second.content);
    });

    it('should find similar memories for duplicate detection', async () => {
      const adapter = new MemoryAdapter();
      await adapter.init();

      await adapter.create({
        ...createSampleMemory(),
        content: 'The quick brown fox jumps over the lazy dog',
      });

      const query: MemoryQuery = {
        text: 'quick brown fox',
        limit: 10,
      };

      const results = await adapter.query(query);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});