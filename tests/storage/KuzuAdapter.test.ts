import { KuzuAdapter } from '../../src/storage/KuzuAdapter';
import type { MemoryItem } from '../../src/types';
import * as path from 'path';
import * as fs from 'fs';

describe('KuzuAdapter', () => {
  let adapter: KuzuAdapter;
  const testDbPath = path.join(__dirname, '../../.test-kuzu-db');

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
    adapter = new KuzuAdapter(testDbPath);
  });

  afterEach(() => {
    // Clean up
    if (adapter) {
      adapter.destroy();
    }
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should initialize the database', async () => {
      await expect(adapter.init()).resolves.not.toThrow();
    });

    it('should handle multiple init calls gracefully', async () => {
      await adapter.init();
      await expect(adapter.init()).resolves.not.toThrow();
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      await adapter.init();
    });

    it('should create and retrieve a memory item', async () => {
      const item: Omit<MemoryItem, 'id'> = {
        type: 'episodic',
        content: 'Test memory content',
        timestamp: new Date(),
        importance: 0.8,
        accessCount: 0,
        decay: 0.1,
        tags: ['test', 'memory'],
        metadata: { source: 'test' }
      };

      const created = await adapter.create(item);
      expect(created.id).toBeDefined();
      expect(created.content).toBe(item.content);

      const retrieved = await adapter.get(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe(item.content);
      expect(retrieved?.tags).toEqual(item.tags);
    });

    it('should update a memory item', async () => {
      const item: Omit<MemoryItem, 'id'> = {
        type: 'semantic',
        content: 'Original content',
        timestamp: new Date(),
        importance: 0.5,
        accessCount: 0,
        decay: 0.1
      };

      const created = await adapter.create(item);
      const updated = await adapter.update(created.id, {
        content: 'Updated content',
        importance: 0.9
      });

      expect(updated.content).toBe('Updated content');
      expect(updated.importance).toBe(0.9);

      const retrieved = await adapter.get(created.id);
      expect(retrieved?.content).toBe('Updated content');
    });

    it('should delete a memory item', async () => {
      const item: Omit<MemoryItem, 'id'> = {
        type: 'procedural',
        content: 'To be deleted',
        timestamp: new Date(),
        importance: 0.3,
        accessCount: 0,
        decay: 0.1
      };

      const created = await adapter.create(item);
      await adapter.delete(created.id);

      const retrieved = await adapter.get(created.id);
      expect(retrieved).toBeNull();
    });

    it('should handle relations between memories', async () => {
      const item1: Omit<MemoryItem, 'id'> = {
        type: 'episodic',
        content: 'Memory 1',
        timestamp: new Date(),
        importance: 0.7,
        accessCount: 0,
        decay: 0.1
      };

      const item2: Omit<MemoryItem, 'id'> = {
        type: 'episodic',
        content: 'Memory 2',
        timestamp: new Date(),
        importance: 0.6,
        accessCount: 0,
        decay: 0.1
      };

      const created1 = await adapter.create(item1);
      const created2 = await adapter.create(item2);

      // Update the first memory with a relation to the second
      await adapter.update(created1.id, {
        relations: [
          {
            targetId: created2.id,
            type: 'related',
            strength: 0.8
          }
        ]
      });

      const retrieved = await adapter.get(created1.id);
      expect(retrieved?.relations).toBeDefined();
      expect(retrieved?.relations?.length).toBe(1);
      expect(retrieved?.relations?.[0].targetId).toBe(created2.id);
    });
  });

  describe('query operations', () => {
    beforeEach(async () => {
      await adapter.init();

      // Create test data
      const memories = [
        {
          type: 'episodic' as const,
          content: 'Meeting with Alice',
          tags: ['meeting', 'work'],
          timestamp: new Date('2024-01-01'),
          importance: 0.8,
          accessCount: 5,
          decay: 0.1
        },
        {
          type: 'semantic' as const,
          content: 'TypeScript is a typed superset of JavaScript',
          tags: ['programming', 'typescript'],
          timestamp: new Date('2024-01-02'),
          importance: 0.9,
          accessCount: 10,
          decay: 0.05
        },
        {
          type: 'procedural' as const,
          content: 'How to make coffee',
          tags: ['coffee', 'routine'],
          timestamp: new Date('2024-01-03'),
          importance: 0.5,
          accessCount: 2,
          decay: 0.2
        }
      ];

      for (const memory of memories) {
        await adapter.create(memory);
      }
    });

    it('should query memories by type', async () => {
      const results = await adapter.query({
        type: 'episodic',
        limit: 10,
        offset: 0,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('episodic');
    });

    it('should query memories by text content', async () => {
      const results = await adapter.query({
        text: 'TypeScript',
        limit: 10,
        offset: 0,
        sortBy: 'relevance',
        sortOrder: 'desc'
      });

      expect(results.length).toBe(1);
      expect(results[0].content).toContain('TypeScript');
    });

    it('should query memories by tags', async () => {
      const results = await adapter.query({
        tags: ['programming'],
        limit: 10,
        offset: 0,
        sortBy: 'importance',
        sortOrder: 'desc'
      });

      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('programming');
    });

    it('should clear all memories', async () => {
      await adapter.clear();

      const results = await adapter.query({
        limit: 10,
        offset: 0,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      expect(results.length).toBe(0);
    });
  });

  describe('graph operations', () => {
    let memory1: MemoryItem;
    let memory2: MemoryItem;
    let memory3: MemoryItem;

    beforeEach(async () => {
      await adapter.init();

      // Create a graph of connected memories
      memory1 = await adapter.create({
        type: 'episodic',
        content: 'Memory 1',
        timestamp: new Date(),
        importance: 0.8,
        accessCount: 0,
        decay: 0.1
      });

      memory2 = await adapter.create({
        type: 'episodic',
        content: 'Memory 2',
        timestamp: new Date(),
        importance: 0.7,
        accessCount: 0,
        decay: 0.1
      });

      memory3 = await adapter.create({
        type: 'episodic',
        content: 'Memory 3',
        timestamp: new Date(),
        importance: 0.6,
        accessCount: 0,
        decay: 0.1
      });

      // Create relations: 1 -> 2 -> 3
      await adapter.update(memory1.id, {
        relations: [{
          targetId: memory2.id,
          type: 'sequential',
          strength: 0.9
        }]
      });

      await adapter.update(memory2.id, {
        relations: [{
          targetId: memory3.id,
          type: 'sequential',
          strength: 0.8
        }]
      });
    });

    it('should find connected memories', async () => {
      const connected = await adapter.findConnectedMemories(memory1.id, 2);
      expect(connected.length).toBeGreaterThan(0);

      const ids = connected.map(m => m.id);
      expect(ids).toContain(memory2.id);
    });

    it('should find shortest path between memories', async () => {
      const path = await adapter.findShortestPath(memory1.id, memory3.id);
      expect(path.length).toBeGreaterThan(0);

      const ids = path.map(m => m.id);
      expect(ids).toContain(memory1.id);
      expect(ids).toContain(memory2.id);
      expect(ids).toContain(memory3.id);
    });

    it('should find memory clusters', async () => {
      // Update relation strength to make it a strong cluster
      await adapter.update(memory1.id, {
        relations: [{
          targetId: memory2.id,
          type: 'strong',
          strength: 0.85
        }]
      });

      const cluster = await adapter.getMemoryCluster(memory1.id);
      expect(cluster.length).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await adapter.init();

      // Create test data
      await adapter.create({
        type: 'episodic',
        content: 'Test 1',
        timestamp: new Date('2024-01-01'),
        importance: 0.8,
        accessCount: 5,
        decay: 0.1
      });

      await adapter.create({
        type: 'semantic',
        content: 'Test 2',
        timestamp: new Date('2024-01-02'),
        importance: 0.7,
        accessCount: 3,
        decay: 0.1
      });
    });

    it('should get storage statistics', async () => {
      const stats = await adapter.getStats();

      expect(stats.totalItems).toBe(2);
      expect(stats.byType['episodic']).toBe(1);
      expect(stats.byType['semantic']).toBe(1);
      expect(stats.avgAccessCount).toBe(4);
      expect(stats.oldestItem).toBeDefined();
      expect(stats.newestItem).toBeDefined();
    });
  });
});