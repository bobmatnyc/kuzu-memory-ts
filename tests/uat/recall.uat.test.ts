import { MemoryItem, RecallStrategy } from '../../src/types';
import { RecencyStrategy } from '../../src/recall/RecencyStrategy';
import { ImportanceStrategy } from '../../src/recall/ImportanceStrategy';
import { FrequencyStrategy } from '../../src/recall/FrequencyStrategy';
import { SimilarityStrategy } from '../../src/recall/SimilarityStrategy';
import { CompositeStrategy } from '../../src/recall/CompositeStrategy';
import { sampleMemories, createSampleMemory, createMemoryBatch } from '../fixtures/sample-memories';

describe('Recall Strategy UAT Tests', () => {
  let testMemories: MemoryItem[];

  beforeEach(() => {
    // Create test memories with various properties
    testMemories = [
      {
        id: '1',
        type: 'semantic',
        content: 'TypeScript is a programming language with static typing',
        tags: ['typescript', 'programming', 'language'],
        timestamp: new Date('2024-01-01'),
        lastAccessed: new Date('2024-01-10'),
        accessCount: 15,
        importance: 0.9,
        decay: 0.1,
        metadata: {},
        relations: [],
      },
      {
        id: '2',
        type: 'episodic',
        content: 'I learned React hooks yesterday and they are very useful',
        tags: ['react', 'hooks', 'learning'],
        timestamp: new Date('2024-01-05'),
        lastAccessed: new Date('2024-01-15'),
        accessCount: 5,
        importance: 0.7,
        decay: 0.2,
        metadata: {},
        relations: [],
      },
      {
        id: '3',
        type: 'procedural',
        content: 'To create a React component: function MyComponent() { return <div>Hello</div>; }',
        tags: ['react', 'component', 'code'],
        timestamp: new Date('2024-01-03'),
        lastAccessed: new Date('2024-01-12'),
        accessCount: 8,
        importance: 0.8,
        decay: 0.15,
        metadata: {},
        relations: [],
      },
      {
        id: '4',
        type: 'working',
        content: 'Need to finish the memory system implementation by Friday',
        tags: ['task', 'deadline', 'work'],
        timestamp: new Date('2024-01-08'),
        lastAccessed: new Date('2024-01-08'),
        accessCount: 1,
        importance: 0.95,
        decay: 0.5,
        metadata: {},
        relations: [],
      },
      {
        id: '5',
        type: 'semantic',
        content: 'JavaScript is a dynamic programming language for web development',
        tags: ['javascript', 'programming', 'web'],
        timestamp: new Date('2023-12-15'),
        lastAccessed: new Date('2024-01-05'),
        accessCount: 20,
        importance: 0.6,
        decay: 0.3,
        metadata: {},
        relations: [],
      },
    ];
  });

  describe('RecencyStrategy', () => {
    let strategy: RecencyStrategy;

    beforeEach(() => {
      strategy = new RecencyStrategy();
    });

    it('should prioritize recent memories', async () => {
      const results = await strategy.recall('programming', testMemories);

      // Should be sorted by timestamp (newest first)
      expect(results[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        results[1].timestamp.getTime()
      );
    });

    it('should include all relevant memories', async () => {
      const results = await strategy.recall('programming', testMemories);

      // Should find memories containing 'programming'
      expect(results.length).toBeGreaterThan(0);
      results.forEach(memory => {
        expect(memory.content.toLowerCase()).toContain('programming');
      });
    });

    it('should handle queries with no matches', async () => {
      const results = await strategy.recall('nonexistent', testMemories);
      expect(results).toHaveLength(0);
    });

    it('should score memories based on recency', () => {
      const recent = testMemories.find(m => m.id === '4')!; // 2024-01-08
      const old = testMemories.find(m => m.id === '5')!; // 2023-12-15

      const recentScore = strategy.score(recent, 'test');
      const oldScore = strategy.score(old, 'test');

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('should handle empty memories array', async () => {
      const results = await strategy.recall('test', []);
      expect(results).toHaveLength(0);
    });

    it('should handle case-insensitive queries', async () => {
      const lowerResults = await strategy.recall('typescript', testMemories);
      const upperResults = await strategy.recall('TYPESCRIPT', testMemories);
      const mixedResults = await strategy.recall('TypeScript', testMemories);

      expect(lowerResults.length).toBe(upperResults.length);
      expect(lowerResults.length).toBe(mixedResults.length);
    });
  });

  describe('ImportanceStrategy', () => {
    let strategy: ImportanceStrategy;

    beforeEach(() => {
      strategy = new ImportanceStrategy();
    });

    it('should prioritize important memories', async () => {
      const results = await strategy.recall('task', testMemories);

      // Should be sorted by importance (highest first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].importance).toBeGreaterThanOrEqual(results[i + 1].importance);
      }
    });

    it('should score memories based on importance', () => {
      const important = testMemories.find(m => m.id === '4')!; // importance: 0.95
      const lessImportant = testMemories.find(m => m.id === '5')!; // importance: 0.6

      const importantScore = strategy.score(important, 'test');
      const lessImportantScore = strategy.score(lessImportant, 'test');

      expect(importantScore).toBeGreaterThan(lessImportantScore);
    });

    it('should filter by query text', async () => {
      const results = await strategy.recall('react', testMemories);

      results.forEach(memory => {
        expect(memory.content.toLowerCase()).toContain('react');
      });
    });

    it('should handle decimal importance values correctly', () => {
      const memory1 = { ...createSampleMemory(), importance: 0.85 };
      const memory2 = { ...createSampleMemory(), importance: 0.849 };

      const score1 = strategy.score(memory1, 'test');
      const score2 = strategy.score(memory2, 'test');

      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('FrequencyStrategy', () => {
    let strategy: FrequencyStrategy;

    beforeEach(() => {
      strategy = new FrequencyStrategy();
    });

    it('should prioritize frequently accessed memories', async () => {
      const results = await strategy.recall('programming', testMemories);

      // Should be sorted by access count (highest first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].accessCount).toBeGreaterThanOrEqual(results[i + 1].accessCount);
      }
    });

    it('should score memories based on access count', () => {
      const frequent = testMemories.find(m => m.id === '5')!; // accessCount: 20
      const infrequent = testMemories.find(m => m.id === '4')!; // accessCount: 1

      const frequentScore = strategy.score(frequent, 'test');
      const infrequentScore = strategy.score(infrequent, 'test');

      expect(frequentScore).toBeGreaterThan(infrequentScore);
    });

    it('should handle zero access count', () => {
      const memory = { ...createSampleMemory(), accessCount: 0 };
      const score = strategy.score(memory, 'test');

      expect(score).toBe(0);
      expect(typeof score).toBe('number');
    });

    it('should normalize scores correctly', () => {
      const highAccess = { ...createSampleMemory(), accessCount: 1000 };
      const lowAccess = { ...createSampleMemory(), accessCount: 1 };

      const highScore = strategy.score(highAccess, 'test');
      const lowScore = strategy.score(lowAccess, 'test');

      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeGreaterThan(0);
      expect(lowScore).toBeGreaterThan(0);
    });
  });

  describe('SimilarityStrategy', () => {
    let strategy: SimilarityStrategy;

    beforeEach(() => {
      strategy = new SimilarityStrategy();
    });

    it('should find semantically similar memories', async () => {
      const results = await strategy.recall('programming language', testMemories);

      // Should find both TypeScript and JavaScript memories
      const contents = results.map(m => m.content.toLowerCase());
      expect(contents.some(content => content.includes('typescript'))).toBe(true);
      expect(contents.some(content => content.includes('javascript'))).toBe(true);
    });

    it('should score based on text similarity', () => {
      const query = 'react component';
      const reactMemory = testMemories.find(m => m.content.includes('React component'))!;
      const unrelatedMemory = testMemories.find(m => m.id === '5')!; // JavaScript memory

      const reactScore = strategy.score(reactMemory, query);
      const unrelatedScore = strategy.score(unrelatedMemory, query);

      expect(reactScore).toBeGreaterThan(unrelatedScore);
    });

    it('should handle partial word matches', async () => {
      const results = await strategy.recall('program', testMemories);

      // Should match 'programming' in content
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle multiple query terms', async () => {
      const results = await strategy.recall('react hooks component', testMemories);

      // Should find memories related to any of these terms
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle empty query gracefully', async () => {
      const results = await strategy.recall('', testMemories);
      expect(results).toHaveLength(0);
    });
  });

  describe('CompositeStrategy', () => {
    let strategy: CompositeStrategy;

    beforeEach(() => {
      strategy = new CompositeStrategy({
        strategies: [
          { strategy: new RecencyStrategy(), weight: 0.3 },
          { strategy: new ImportanceStrategy(), weight: 0.4 },
          { strategy: new FrequencyStrategy(), weight: 0.3 },
        ],
      });
    });

    it('should combine multiple strategies', async () => {
      const results = await strategy.recall('programming', testMemories);

      // Should return results considering all strategies
      expect(results.length).toBeGreaterThan(0);
    });

    it('should calculate composite scores correctly', () => {
      const memory = testMemories[0];
      const query = 'typescript';

      const score = strategy.score(memory, query);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should respect strategy weights', async () => {
      // Create strategy that heavily weights importance
      const importanceHeavy = new CompositeStrategy({
        strategies: [
          { strategy: new ImportanceStrategy(), weight: 0.9 },
          { strategy: new FrequencyStrategy(), weight: 0.1 },
        ],
      });

      const results = await importanceHeavy.recall('task', testMemories);

      // First result should be the highly important task memory
      expect(results[0].id).toBe('4'); // The task with importance 0.95
    });

    it('should handle single strategy composition', async () => {
      const singleStrategy = new CompositeStrategy({
        strategies: [
          { strategy: new RecencyStrategy(), weight: 1.0 },
        ],
      });

      const results = await singleStrategy.recall('programming', testMemories);
      const directResults = await new RecencyStrategy().recall('programming', testMemories);

      expect(results.length).toBe(directResults.length);
    });

    it('should normalize weights automatically', () => {
      const strategy = new CompositeStrategy({
        strategies: [
          { strategy: new RecencyStrategy(), weight: 2.0 },
          { strategy: new ImportanceStrategy(), weight: 3.0 },
        ],
      });

      const memory = testMemories[0];
      const score = strategy.score(memory, 'test');

      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Strategy Performance', () => {
    let largeMemorySet: MemoryItem[];

    beforeEach(() => {
      largeMemorySet = createMemoryBatch(1000);
    });

    it('should handle large memory sets efficiently', async () => {
      const strategy = new RecencyStrategy();

      const startTime = performance.now();
      const results = await strategy.recall('test', largeMemorySet);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(results.length).toBeLessThanOrEqual(largeMemorySet.length);
    });

    it('should maintain performance with complex composite strategies', async () => {
      const strategy = new CompositeStrategy({
        strategies: [
          { strategy: new RecencyStrategy(), weight: 0.25 },
          { strategy: new ImportanceStrategy(), weight: 0.25 },
          { strategy: new FrequencyStrategy(), weight: 0.25 },
          { strategy: new SimilarityStrategy(), weight: 0.25 },
        ],
      });

      const startTime = performance.now();
      const results = await strategy.recall('programming', largeMemorySet);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200); // Should complete within 200ms
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle memories with null/undefined fields', async () => {
      const memoryWithNulls: MemoryItem = {
        id: 'null-test',
        type: 'semantic',
        content: 'Test content',
        tags: [],
        timestamp: new Date(),
        accessCount: 0,
        importance: 0.5,
        decay: 0.1,
        metadata: {},
        relations: [],
        // Missing optional fields like lastAccessed
      };

      const strategies = [
        new RecencyStrategy(),
        new ImportanceStrategy(),
        new FrequencyStrategy(),
        new SimilarityStrategy(),
      ];

      for (const strategy of strategies) {
        const results = await strategy.recall('test', [memoryWithNulls]);
        expect(results.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle very long query strings', async () => {
      const longQuery = 'programming '.repeat(100);
      const strategy = new SimilarityStrategy();

      const results = await strategy.recall(longQuery, testMemories);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle special characters in queries', async () => {
      const specialQueries = [
        'programming!@#$%^&*()',
        'react/hooks',
        'component.tsx',
        'test-memory',
        'query with "quotes"',
      ];

      const strategy = new SimilarityStrategy();

      for (const query of specialQueries) {
        const results = await strategy.recall(query, testMemories);
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should handle memories with extreme values', async () => {
      const extremeMemory: MemoryItem = {
        id: 'extreme',
        type: 'semantic',
        content: 'Extreme test',
        tags: [],
        timestamp: new Date(),
        lastAccessed: new Date(),
        accessCount: Number.MAX_SAFE_INTEGER,
        importance: 1.0,
        decay: 0.0,
        metadata: {},
        relations: [],
      };

      const strategy = new FrequencyStrategy();
      const score = strategy.score(extremeMemory, 'test');

      expect(typeof score).toBe('number');
      expect(isFinite(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Strategy Configuration', () => {
    it('should allow strategy customization', async () => {
      class CustomStrategy implements RecallStrategy {
        name = 'custom';

        async recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]> {
          // Custom logic: prioritize memories with specific tags
          return memories
            .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
            .filter(m => m.tags.includes('custom'))
            .sort((a, b) => b.importance - a.importance);
        }

        score(memory: MemoryItem, query: string): number {
          return memory.tags.includes('custom') ? 1.0 : 0.0;
        }
      }

      const customStrategy = new CustomStrategy();
      const memoryWithCustomTag = {
        ...createSampleMemory(),
        content: 'Test custom strategy',
        tags: ['custom'],
      };

      const results = await customStrategy.recall('test', [memoryWithCustomTag]);
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('custom');
    });

    it('should validate strategy configuration', () => {
      // Test invalid composite strategy configuration
      expect(() => {
        new CompositeStrategy({
          strategies: [], // Empty strategies array
        });
      }).toThrow();

      expect(() => {
        new CompositeStrategy({
          strategies: [
            { strategy: new RecencyStrategy(), weight: -1 }, // Negative weight
          ],
        });
      }).toThrow();
    });
  });

  describe('Query Result Quality', () => {
    it('should return relevant results for keyword queries', async () => {
      const strategy = new SimilarityStrategy();
      const results = await strategy.recall('typescript programming', testMemories);

      // All results should be relevant to the query
      results.forEach(memory => {
        const content = memory.content.toLowerCase();
        const hasTypescript = content.includes('typescript');
        const hasProgramming = content.includes('programming');
        const hasRelatedTerms = content.includes('language') || content.includes('code');

        expect(hasTypescript || hasProgramming || hasRelatedTerms).toBe(true);
      });
    });

    it('should maintain result diversity', async () => {
      const strategy = new CompositeStrategy({
        strategies: [
          { strategy: new RecencyStrategy(), weight: 0.33 },
          { strategy: new ImportanceStrategy(), weight: 0.33 },
          { strategy: new FrequencyStrategy(), weight: 0.34 },
        ],
      });

      const results = await strategy.recall('programming', testMemories);

      // Should include memories with different characteristics
      const importanceValues = results.map(m => m.importance);
      const accessCounts = results.map(m => m.accessCount);
      const timestamps = results.map(m => m.timestamp.getTime());

      // Check for diversity (not all the same)
      expect(new Set(importanceValues).size).toBeGreaterThan(1);
      expect(new Set(accessCounts).size).toBeGreaterThan(1);
      expect(new Set(timestamps).size).toBeGreaterThan(1);
    });

    it('should handle empty results gracefully', async () => {
      const strategies = [
        new RecencyStrategy(),
        new ImportanceStrategy(),
        new FrequencyStrategy(),
        new SimilarityStrategy(),
      ];

      for (const strategy of strategies) {
        const results = await strategy.recall('nonexistent-term-xyz', testMemories);
        expect(results).toEqual([]);
        expect(Array.isArray(results)).toBe(true);
      }
    });
  });
});