# Testing Guide

This comprehensive testing guide covers the testing philosophy, strategies, patterns, and implementation details for the Kuzu Memory TypeScript library. The project maintains high test coverage and uses multiple testing approaches to ensure reliability.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Architecture](#test-architecture)
3. [Testing Strategy](#testing-strategy)
4. [Unit Testing](#unit-testing)
5. [UAT Testing](#uat-testing)
6. [NLP Testing](#nlp-testing)
7. [Integration Testing](#integration-testing)
8. [Performance Testing](#performance-testing)
9. [Mocking Strategies](#mocking-strategies)
10. [Test Data and Fixtures](#test-data-and-fixtures)
11. [Coverage Requirements](#coverage-requirements)
12. [Running Tests](#running-tests)
13. [Debugging Tests](#debugging-tests)
14. [Continuous Testing](#continuous-testing)

## Testing Philosophy

### Core Principles

1. **Test-Driven Development (TDD)**: Write tests first, then implementation
2. **Behavior-Driven Testing**: Test behavior, not implementation details
3. **Pyramid Structure**: More unit tests, fewer integration tests, minimal E2E tests
4. **Fast Feedback**: Tests should run quickly and provide immediate feedback
5. **Reliability**: Tests should be deterministic and not flaky
6. **Maintainability**: Tests should be easy to understand and modify

### Quality Standards

- **Minimum 70% code coverage** across all metrics (branches, functions, lines, statements)
- **UAT tests** validate complete user workflows
- **Cross-adapter testing** ensures consistency across storage backends
- **NLP validation** ensures classification accuracy
- **Performance benchmarks** prevent regressions

### Test Types Hierarchy

```
┌─────────────────┐
│   Manual Tests  │ ← Exploratory testing
└─────────────────┘
┌─────────────────┐
│  E2E/UAT Tests  │ ← User scenarios (7 test suites)
│   ~15% effort   │
└─────────────────┘
┌─────────────────┐
│Integration Tests│ ← Component interaction
│   ~25% effort   │
└─────────────────┘
┌─────────────────┐
│   Unit Tests    │ ← Individual functions/classes
│   ~60% effort   │   (Largest test suite)
└─────────────────┘
```

## Test Architecture

### Directory Structure

```
tests/
├── fixtures/                    # Shared test data and utilities
│   ├── sample-memories.ts      # Memory item fixtures
│   ├── test-patterns.ts        # Pattern extraction fixtures
│   ├── mock-adapters.ts        # Storage adapter mocks
│   └── test-helpers.ts         # Common testing utilities
├── uat/                        # User Acceptance Tests
│   ├── hooks.uat.test.ts       # React hooks testing
│   ├── integration.uat.test.ts # End-to-end workflows
│   ├── patterns.uat.test.ts    # Pattern extraction
│   ├── performance.uat.test.ts # Performance benchmarks
│   ├── recall.uat.test.ts      # Memory recall strategies
│   └── storage.uat.test.ts     # Storage adapter validation
├── nlp/                        # NLP-specific tests
│   ├── memory-classifier.test.ts # Classification accuracy
│   ├── training-data.test.ts    # Training data validation
│   └── nlp-performance.test.ts  # NLP performance tests
└── unit/                       # Unit tests (alongside source)
    └── [Various unit test files]
```

### Test Configuration

**Jest Configuration** (`jest.config.js`):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',        // Browser-like environment
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test discovery patterns
  testMatch: [
    '**/?(*.)+(spec|test).ts',
    '**/tests/**/*.test.ts'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup and mocking
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000,

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

**NLP Testing Configuration** (`jest.config.nlp.js`):
```javascript
module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/tests/nlp/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/nlp/nlp-setup.ts'],
  testTimeout: 30000  // Longer timeout for NLP processing
};
```

## Testing Strategy

### 1. Test-Driven Development Flow

```bash
# 1. Write failing test
npm run test:watch  # Keep tests running

# 2. Write minimal implementation to pass
# 3. Refactor while keeping tests green
# 4. Add edge case tests
# 5. Repeat cycle
```

### 2. Cross-Platform Testing

All tests are designed to work across different environments:

```typescript
// Environment-agnostic test patterns
describe('KuzuMemory', () => {
  // Test in both browser and Node.js contexts
  const environments = ['jsdom', 'node'];

  environments.forEach(env => {
    describe(`in ${env} environment`, () => {
      // Tests that work in both environments
    });
  });
});
```

### 3. Storage Adapter Testing

All storage adapters must pass the same test suite:

```typescript
// Generic adapter testing pattern
const adapters = [
  { name: 'MemoryAdapter', create: () => new MemoryAdapter() },
  { name: 'LocalStorageAdapter', create: () => new LocalStorageAdapter() },
  { name: 'IndexedDBAdapter', create: () => new IndexedDBAdapter() }
];

describe.each(adapters)('$name', ({ create }) => {
  let adapter: StorageAdapter;

  beforeEach(async () => {
    adapter = create();
    await adapter.init();
  });

  // Same tests run against all adapters
  testStorageOperations(adapter);
});
```

## Unit Testing

### Core Principles

1. **Single Responsibility**: Each test should test one thing
2. **Independence**: Tests should not depend on each other
3. **Deterministic**: Same input always produces same output
4. **Fast**: Unit tests should complete in milliseconds

### Unit Test Structure

```typescript
// src/core/KuzuMemory.test.ts
import { KuzuMemory } from './KuzuMemory';
import { MemoryAdapter } from '../storage/MemoryAdapter';
import { MockRecallStrategy } from '../../tests/fixtures/mock-strategies';

describe('KuzuMemory', () => {
  let memory: KuzuMemory;
  let mockAdapter: jest.Mocked<StorageAdapter>;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    memory = new KuzuMemory(mockAdapter);
  });

  describe('constructor', () => {
    it('should initialize with provided adapter', () => {
      expect(memory.adapter).toBe(mockAdapter);
    });

    it('should set default configuration', () => {
      expect(memory.config.maxMemories).toBe(10000);
      expect(memory.config.decayEnabled).toBe(true);
    });
  });

  describe('create', () => {
    it('should create memory with generated ID', async () => {
      const content = 'Test memory content';
      mockAdapter.create.mockResolvedValue(mockMemoryItem);

      const result = await memory.create(content);

      expect(mockAdapter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content,
          type: expect.any(String),
          timestamp: expect.any(Date)
        })
      );
      expect(result.id).toBeDefined();
    });

    it('should sanitize content before storage', async () => {
      const maliciousContent = '<script>alert("xss")</script>Valid content';

      await memory.create(maliciousContent);

      expect(mockAdapter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Valid content' // Script tag removed
        })
      );
    });

    it('should auto-classify memory type', async () => {
      const episodicContent = 'Yesterday I went to the store';

      await memory.create(episodicContent);

      expect(mockAdapter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'episodic'
        })
      );
    });

    it('should throw error for empty content', async () => {
      await expect(memory.create('')).rejects.toThrow('Content cannot be empty');
      await expect(memory.create('   ')).rejects.toThrow('Content cannot be empty');
    });
  });

  describe('recall', () => {
    beforeEach(() => {
      mockAdapter.query.mockResolvedValue([mockMemoryItem1, mockMemoryItem2]);
    });

    it('should delegate to storage adapter query', async () => {
      const query = 'test query';

      await memory.recall(query);

      expect(mockAdapter.query).toHaveBeenCalledWith(
        expect.objectContaining({
          searchText: query
        })
      );
    });

    it('should apply recall strategy to results', async () => {
      const mockStrategy = new MockRecallStrategy();
      memory.setRecallStrategy(mockStrategy);

      await memory.recall('query');

      expect(mockStrategy.rank).toHaveBeenCalledWith(
        expect.arrayContaining([mockMemoryItem1, mockMemoryItem2]),
        expect.objectContaining({ searchText: 'query' })
      );
    });

    it('should return empty array for no matches', async () => {
      mockAdapter.query.mockResolvedValue([]);

      const result = await memory.recall('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update memory item', async () => {
      const id = 'test-id';
      const updates = { importance: 0.9 };
      mockAdapter.update.mockResolvedValue({ ...mockMemoryItem, ...updates });

      const result = await memory.update(id, updates);

      expect(mockAdapter.update).toHaveBeenCalledWith(id, updates);
      expect(result.importance).toBe(0.9);
    });

    it('should not allow ID updates', async () => {
      const id = 'test-id';
      const updates = { id: 'different-id', importance: 0.9 };

      await expect(memory.update(id, updates)).rejects.toThrow(
        'Cannot update memory ID'
      );
    });

    it('should validate update data', async () => {
      const id = 'test-id';
      const invalidUpdates = { importance: 2.0 }; // Out of 0-1 range

      await expect(memory.update(id, invalidUpdates)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete memory item', async () => {
      const id = 'test-id';
      mockAdapter.delete.mockResolvedValue();

      await memory.delete(id);

      expect(mockAdapter.delete).toHaveBeenCalledWith(id);
    });

    it('should not throw for non-existent items', async () => {
      const id = 'non-existent-id';
      mockAdapter.delete.mockResolvedValue(); // Idempotent

      await expect(memory.delete(id)).resolves.not.toThrow();
    });
  });
});
```

### Testing Async Operations

```typescript
describe('async operations', () => {
  it('should handle promise resolution', async () => {
    const promise = memory.create('test');

    await expect(promise).resolves.toMatchObject({
      content: 'test',
      id: expect.any(String)
    });
  });

  it('should handle promise rejection', async () => {
    mockAdapter.create.mockRejectedValue(new Error('Storage error'));

    await expect(memory.create('test')).rejects.toThrow('Storage error');
  });

  it('should handle concurrent operations', async () => {
    const promises = [
      memory.create('memory 1'),
      memory.create('memory 2'),
      memory.create('memory 3')
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.id).toBeDefined();
    });
  });
});
```

### Testing Error Conditions

```typescript
describe('error handling', () => {
  it('should throw ValidationError for invalid data', async () => {
    const invalidData = { type: 'invalid-type' };

    await expect(
      memory.create(invalidData as any)
    ).rejects.toThrow(ValidationError);
  });

  it('should handle storage adapter failures gracefully', async () => {
    mockAdapter.create.mockRejectedValue(new Error('Storage full'));

    await expect(memory.create('test')).rejects.toThrow(
      'Failed to create memory: Storage full'
    );
  });

  it('should recover from temporary failures', async () => {
    mockAdapter.create
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce(mockMemoryItem);

    // Should retry and succeed
    const result = await memory.createWithRetry('test');
    expect(result).toBeDefined();
  });
});
```

## UAT Testing

User Acceptance Tests (UAT) validate complete user workflows and real-world scenarios.

### UAT Test Structure

```typescript
// tests/uat/integration.uat.test.ts
describe('Memory Management Workflow UAT', () => {
  let client: KuzuMemory;

  beforeEach(async () => {
    client = createMemoryClient({
      storage: 'memory',
      nlp: { autoClassify: true }
    });
    await client.init();
  });

  describe('Complete Memory Lifecycle', () => {
    it('should handle full memory workflow', async () => {
      // 1. Create memories of different types
      const episodicMemory = await client.create(
        'Yesterday I went to the coffee shop and met Sarah'
      );
      const semanticMemory = await client.create(
        'Coffee is made from roasted coffee beans'
      );
      const proceduralMemory = await client.create(
        'To make coffee: 1. Grind beans 2. Heat water 3. Brew'
      );

      // Verify auto-classification worked
      expect(episodicMemory.type).toBe('episodic');
      expect(semanticMemory.type).toBe('semantic');
      expect(proceduralMemory.type).toBe('procedural');

      // 2. Search for related memories
      const coffeeMemories = await client.recall('coffee');
      expect(coffeeMemories).toHaveLength(3);

      // 3. Update memory importance based on usage
      const updatedMemory = await client.update(episodicMemory.id, {
        importance: 0.9
      });
      expect(updatedMemory.importance).toBe(0.9);

      // 4. Search with importance filter
      const importantMemories = await client.recall('coffee', {
        minImportance: 0.8
      });
      expect(importantMemories).toHaveLength(1);
      expect(importantMemories[0].id).toBe(episodicMemory.id);

      // 5. Delete less important memory
      await client.delete(semanticMemory.id);

      // 6. Verify deletion
      const remainingMemories = await client.recall('coffee');
      expect(remainingMemories).toHaveLength(2);
    });

    it('should handle concurrent operations gracefully', async () => {
      // Simulate multiple users or operations
      const operations = [
        client.create('Memory 1'),
        client.create('Memory 2'),
        client.create('Memory 3'),
        client.recall('test'),
        client.getStats()
      ];

      const results = await Promise.allSettled(operations);

      // All operations should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('Pattern Extraction Workflow', () => {
    it('should extract and utilize patterns in memories', async () => {
      // Create memory with various patterns
      const memory = await client.create(`
        Contact john.doe@example.com about the meeting on 2024-01-15.
        Call +1-555-123-4567 or visit https://example.com/meeting for details.
      `);

      // Verify patterns were extracted
      expect(memory.metadata.patterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'email',
            value: 'john.doe@example.com'
          }),
          expect.objectContaining({
            type: 'date',
            value: '2024-01-15'
          }),
          expect.objectContaining({
            type: 'phone',
            value: '+1-555-123-4567'
          }),
          expect.objectContaining({
            type: 'url',
            value: 'https://example.com/meeting'
          })
        ])
      );

      // Search by pattern should find the memory
      const emailMemories = await client.recall('john.doe@example.com');
      expect(emailMemories).toContain(memory);

      const dateMemories = await client.recall('2024-01-15');
      expect(dateMemories).toContain(memory);
    });
  });

  describe('Cross-Adapter Consistency', () => {
    const adapterTypes = ['memory', 'localStorage', 'indexeddb'];

    adapterTypes.forEach(adapterType => {
      describe(`with ${adapterType} adapter`, () => {
        let testClient: KuzuMemory;

        beforeEach(async () => {
          testClient = createMemoryClient({
            storage: adapterType as any,
            dbName: `test-${Date.now()}`
          });
          await testClient.init();
        });

        afterEach(async () => {
          await testClient.clear();
        });

        it('should maintain consistent behavior', async () => {
          // Same operations should work across all adapters
          const memory = await testClient.create('Test memory');
          expect(memory.id).toBeDefined();

          const recalled = await testClient.recall('Test');
          expect(recalled).toHaveLength(1);

          await testClient.update(memory.id, { importance: 0.8 });

          const updated = await testClient.get(memory.id);
          expect(updated?.importance).toBe(0.8);
        });
      });
    });
  });
});
```

### Performance UAT Tests

```typescript
// tests/uat/performance.uat.test.ts
describe('Performance UAT Tests', () => {
  let client: KuzuMemory;

  beforeEach(async () => {
    client = createMemoryClient({ storage: 'memory' });
    await client.init();
  });

  describe('Operation Performance', () => {
    it('should create memories within performance threshold', async () => {
      const startTime = performance.now();

      // Create 100 memories
      const promises = Array(100).fill(0).map((_, i) =>
        client.create(`Test memory ${i}`)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within 1 second
      expect(totalTime).toBeLessThan(1000);

      // Average time per operation should be under 10ms
      expect(totalTime / 100).toBeLessThan(10);
    });

    it('should recall memories efficiently', async () => {
      // Create test dataset
      const memories = await Promise.all(
        Array(1000).fill(0).map((_, i) =>
          client.create(`Test content ${i} with keywords and patterns`)
        )
      );

      const startTime = performance.now();

      const results = await client.recall('keywords');

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      // Query should complete within 100ms
      expect(queryTime).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle large memory content efficiently', async () => {
      const largeContent = 'Large content '.repeat(1000); // ~13KB

      const startTime = performance.now();

      const memory = await client.create(largeContent);

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // 50ms threshold
      expect(memory.content.length).toBe(largeContent.length);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const memory = await client.create(`Test ${i}`);
        await client.recall(`Test ${i}`);
        await client.delete(memory.id);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (< 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
```

## NLP Testing

### Classification Accuracy Tests

```typescript
// tests/nlp/memory-classifier.test.ts
import { MemoryClassifier } from '../../src/nlp/MemoryClassifier';
import { trainingData } from '../../src/nlp/TrainingData';

describe('MemoryClassifier', () => {
  let classifier: MemoryClassifier;

  beforeEach(() => {
    classifier = new MemoryClassifier();
  });

  describe('Training and Classification', () => {
    it('should achieve minimum accuracy on training data', () => {
      const accuracy = classifier.getAccuracy();
      expect(accuracy.overall).toBeGreaterThanOrEqual(0.85); // 85% minimum
      expect(accuracy.byType.episodic).toBeGreaterThanOrEqual(0.80);
      expect(accuracy.byType.semantic).toBeGreaterThanOrEqual(0.80);
      expect(accuracy.byType.procedural).toBeGreaterThanOrEqual(0.80);
    });

    it('should classify episodic memories correctly', () => {
      const episodicTexts = [
        'Yesterday I went to the store and bought milk',
        'Last week I met Sarah at the coffee shop',
        'This morning I had breakfast with my family',
        'I remember when we visited Paris in 2019'
      ];

      episodicTexts.forEach(text => {
        const classification = classifier.classify(text);
        expect(classification.type).toBe('episodic');
        expect(classification.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should classify semantic memories correctly', () => {
      const semanticTexts = [
        'Coffee is made from roasted coffee beans',
        'Python is a programming language',
        'The capital of France is Paris',
        'Water boils at 100 degrees Celsius'
      ];

      semanticTexts.forEach(text => {
        const classification = classifier.classify(text);
        expect(classification.type).toBe('semantic');
        expect(classification.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should classify procedural memories correctly', () => {
      const proceduralTexts = [
        'To make coffee: 1. Grind beans 2. Heat water 3. Brew',
        'How to tie a knot: First, make a loop...',
        'Steps to deploy: 1. Build 2. Test 3. Deploy',
        'Recipe: Mix ingredients, bake for 30 minutes'
      ];

      proceduralTexts.forEach(text => {
        const classification = classifier.classify(text);
        expect(classification.type).toBe('procedural');
        expect(classification.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should handle ambiguous text gracefully', () => {
      const ambiguousTexts = [
        'Hello', // Too short
        '', // Empty
        'a b c d e', // Nonsensical
        'The quick brown fox jumps' // Common phrase
      ];

      ambiguousTexts.forEach(text => {
        const classification = classifier.classify(text);

        // Should return some classification
        expect(['episodic', 'semantic', 'procedural', 'working', 'sensory'])
          .toContain(classification.type);

        // But confidence might be low
        expect(classification.confidence).toBeGreaterThanOrEqual(0.0);
        expect(classification.confidence).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('Training Data Validation', () => {
    it('should have balanced training data', () => {
      const typeCount = trainingData.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Each type should have reasonable representation
      Object.values(typeCount).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(20); // At least 20 examples per type
      });

      // No type should dominate
      const total = trainingData.length;
      Object.values(typeCount).forEach(count => {
        expect(count / total).toBeLessThanOrEqual(0.6); // No more than 60%
      });
    });

    it('should have valid training examples', () => {
      trainingData.forEach((example, index) => {
        expect(example.text).toBeDefined();
        expect(example.text.trim().length).toBeGreaterThan(0);
        expect(example.type).toMatch(/^(episodic|semantic|procedural|working|sensory)$/);

        // Text should be reasonable length
        expect(example.text.length).toBeLessThan(1000);
        expect(example.text.length).toBeGreaterThan(5);
      }, `Training example ${index} is invalid`);
    });
  });

  describe('Feature Extraction', () => {
    it('should extract meaningful features', () => {
      const text = 'Yesterday I went to the store and bought milk';
      const features = classifier.extractFeatures(text);

      // Should contain temporal indicators
      expect(features).toEqual(
        expect.objectContaining({
          hasTemporalWords: true,
          hasPersonalPronouns: true,
          hasPastTense: true
        })
      );

      // Numeric features should be in valid ranges
      expect(features.wordCount).toBeGreaterThan(0);
      expect(features.averageWordLength).toBeGreaterThan(0);
      expect(features.sentimentScore).toBeGreaterThanOrEqual(-1);
      expect(features.sentimentScore).toBeLessThanOrEqual(1);
    });

    it('should handle edge cases in feature extraction', () => {
      const edgeCases = ['', ' ', 'a', '!!!', '123'];

      edgeCases.forEach(text => {
        expect(() => {
          const features = classifier.extractFeatures(text);
          expect(typeof features).toBe('object');
        }).not.toThrow();
      });
    });
  });
});
```

### NLP Performance Tests

```typescript
// tests/nlp/nlp-performance.test.ts
describe('NLP Performance Tests', () => {
  let classifier: MemoryClassifier;

  beforeEach(() => {
    classifier = new MemoryClassifier();
  });

  it('should classify text within performance threshold', () => {
    const texts = Array(1000).fill(0).map((_, i) =>
      `This is test text number ${i} with various content and patterns`
    );

    const startTime = performance.now();

    texts.forEach(text => {
      classifier.classify(text);
    });

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should process 1000 texts in under 1 second
    expect(totalTime).toBeLessThan(1000);

    // Average classification time should be under 1ms
    expect(totalTime / 1000).toBeLessThan(1);
  });

  it('should handle large text efficiently', () => {
    const largeText = 'This is a very long text. '.repeat(1000); // ~27KB

    const startTime = performance.now();

    const result = classifier.classify(largeText);

    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
    expect(result.type).toBeDefined();
    expect(result.confidence).toBeDefined();
  });
});
```

## Mocking Strategies

### Storage Adapter Mocks

```typescript
// tests/fixtures/mock-adapters.ts
export const createMockStorageAdapter = (): jest.Mocked<StorageAdapter> => {
  const memoryStore = new Map<string, MemoryItem>();

  return {
    init: jest.fn().mockResolvedValue(undefined),

    get: jest.fn().mockImplementation(async (id: string) => {
      return memoryStore.get(id) || null;
    }),

    create: jest.fn().mockImplementation(async (item: Omit<MemoryItem, 'id'>) => {
      const memory = { ...item, id: generateUUID() };
      memoryStore.set(memory.id, memory);
      return memory;
    }),

    update: jest.fn().mockImplementation(async (id: string, updates: Partial<MemoryItem>) => {
      const existing = memoryStore.get(id);
      if (!existing) throw new Error('Memory not found');

      const updated = { ...existing, ...updates };
      memoryStore.set(id, updated);
      return updated;
    }),

    delete: jest.fn().mockImplementation(async (id: string) => {
      memoryStore.delete(id);
    }),

    query: jest.fn().mockImplementation(async (query: MemoryQuery) => {
      const items = Array.from(memoryStore.values());
      return items.filter(item => mockQueryFilter(item, query));
    }),

    clear: jest.fn().mockImplementation(async () => {
      memoryStore.clear();
    }),

    getStats: jest.fn().mockResolvedValue({
      totalItems: memoryStore.size,
      byType: {} as any,
      avgAccessCount: 0,
      oldestItem: null,
      newestItem: null
    })
  };
};

export class SlowStorageAdapter implements StorageAdapter {
  constructor(private delay: number = 100) {}

  async init() {
    await new Promise(resolve => setTimeout(resolve, this.delay));
  }

  async get(id: string) {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return null;
  }

  // ... other methods with artificial delays
}

export class FailingStorageAdapter implements StorageAdapter {
  private failCount = 0;

  constructor(private failAfter: number = 3) {}

  async create(item: Omit<MemoryItem, 'id'>) {
    this.failCount++;
    if (this.failCount > this.failAfter) {
      throw new Error('Storage adapter failure simulation');
    }
    return { ...item, id: generateUUID() };
  }

  // ... other methods that can fail
}
```

### NLP Mocks

```typescript
// tests/fixtures/mock-nlp.ts
export const createMockClassifier = (): jest.Mocked<MemoryClassifier> => ({
  classify: jest.fn().mockImplementation((text: string) => {
    // Simple mock classification based on keywords
    if (text.includes('yesterday') || text.includes('I went')) {
      return { type: 'episodic', confidence: 0.85 };
    }
    if (text.includes('how to') || text.includes('steps')) {
      return { type: 'procedural', confidence: 0.80 };
    }
    return { type: 'semantic', confidence: 0.75 };
  }),

  extractFeatures: jest.fn().mockReturnValue({
    wordCount: 10,
    averageWordLength: 5,
    hasTemporalWords: false,
    hasPersonalPronouns: false,
    hasPastTense: false,
    sentimentScore: 0
  }),

  getAccuracy: jest.fn().mockReturnValue({
    overall: 0.85,
    byType: {
      episodic: 0.83,
      semantic: 0.87,
      procedural: 0.84,
      working: 0.80,
      sensory: 0.82
    }
  }),

  retrain: jest.fn().mockResolvedValue(undefined)
});
```

## Test Data and Fixtures

### Sample Memory Data

```typescript
// tests/fixtures/sample-memories.ts
export const sampleMemories: MemoryItem[] = [
  {
    id: 'episodic-1',
    type: 'episodic',
    content: 'Yesterday I went to the coffee shop and met Sarah for our weekly catch-up',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    importance: 0.8,
    accessCount: 3,
    decay: 0.1,
    relations: [],
    tags: ['coffee', 'Sarah', 'social'],
    metadata: {
      patterns: [
        { type: 'temporal', value: 'Yesterday' },
        { type: 'person', value: 'Sarah' },
        { type: 'location', value: 'coffee shop' }
      ]
    }
  },

  {
    id: 'semantic-1',
    type: 'semantic',
    content: 'Coffee is made from roasted coffee beans that are grown in tropical regions',
    timestamp: new Date('2024-01-10T14:30:00Z'),
    importance: 0.6,
    accessCount: 1,
    decay: 0.05,
    relations: [],
    tags: ['coffee', 'knowledge'],
    metadata: {}
  },

  {
    id: 'procedural-1',
    type: 'procedural',
    content: 'To make espresso: 1. Grind coffee beans finely 2. Pack grounds in portafilter 3. Extract for 25-30 seconds',
    timestamp: new Date('2024-01-12T16:15:00Z'),
    importance: 0.7,
    accessCount: 5,
    decay: 0.02,
    relations: [
      { targetId: 'semantic-1', type: 'relates-to', strength: 0.8 }
    ],
    tags: ['coffee', 'recipe', 'howto'],
    metadata: {
      patterns: [
        { type: 'steps', value: ['Grind coffee beans', 'Pack grounds', 'Extract'] }
      ]
    }
  }
];

export const createSampleMemory = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id: generateUUID(),
  type: 'semantic',
  content: 'Sample memory content for testing purposes',
  timestamp: new Date(),
  importance: 0.5,
  accessCount: 0,
  decay: 0.1,
  relations: [],
  tags: [],
  metadata: {},
  ...overrides
});

export const createMemoryBatch = (count: number, overrides: Partial<MemoryItem> = {}): MemoryItem[] => {
  return Array(count).fill(0).map((_, index) =>
    createSampleMemory({
      content: `Sample memory ${index + 1}`,
      ...overrides
    })
  );
};
```

### Pattern Test Data

```typescript
// tests/fixtures/test-patterns.ts
export const testPatterns = {
  emails: [
    'john.doe@example.com',
    'jane.smith+tag@company.co.uk',
    'test123@subdomain.example.org'
  ],

  dates: [
    '2024-01-15',
    'January 15, 2024',
    '01/15/2024',
    'Jan 15, 2024'
  ],

  phones: [
    '+1-555-123-4567',
    '(555) 123-4567',
    '555-123-4567',
    '5551234567'
  ],

  urls: [
    'https://example.com',
    'http://subdomain.example.co.uk/path?param=value',
    'ftp://files.example.com/document.pdf',
    'www.example.com'
  ],

  code: [
    'function test() { return true; }',
    'SELECT * FROM users WHERE id = 1;',
    'const result = array.map(x => x * 2);',
    'if (condition) { doSomething(); }'
  ]
};

export const createTestMemoryWithPatterns = (patterns: string[]): string => {
  return `Test memory containing various patterns: ${patterns.join(', ')}`;
};
```

## Coverage Requirements

### Coverage Configuration

The project maintains minimum coverage thresholds:

```javascript
coverageThreshold: {
  global: {
    branches: 70,      // Conditional statements
    functions: 70,     // Function definitions
    lines: 70,         // Lines of code
    statements: 70     // Executable statements
  },

  // Per-file thresholds for critical components
  'src/core/KuzuMemory.ts': {
    branches: 85,
    functions: 90,
    lines: 85,
    statements: 85
  },

  'src/storage/': {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Coverage Analysis

```bash
# Generate coverage report
npm run test:coverage

# View detailed HTML report
open coverage/lcov-report/index.html

# Check specific file coverage
npm run test:coverage -- --collectCoverageFrom="src/core/KuzuMemory.ts"
```

### Excluding Code from Coverage

```typescript
// Use istanbul ignore comments for unreachable code
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  console.debug('Development mode debugging');
}

// Ignore entire functions when needed
/* istanbul ignore next */
function debugOnlyFunction() {
  // Development-only code
}
```

## Running Tests

### Test Commands

```bash
# Run all tests
make test
npm test

# Run specific test suites
make test:unit          # Unit tests only
make test:uat          # UAT tests only
make test:nlp          # NLP tests only

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test files
npm test -- KuzuMemory.test.ts
npm test -- --testNamePattern="should create memory"

# Debug tests
npm test -- --detectOpenHandles --forceExit
```

### UAT Test Commands

```bash
# All UAT tests
make test:uat

# Specific UAT suites
make test:uat:storage     # Storage adapter tests
make test:uat:recall      # Recall strategy tests
make test:uat:patterns    # Pattern extraction tests
make test:uat:hooks       # React hooks tests
make test:uat:performance # Performance benchmarks
```

### CI/CD Pipeline Integration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run UAT tests
        run: npm run test:uat

      - name: Run NLP tests
        run: npm run test:nlp

      - name: Check coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Tests

### Debug Configuration

**.vscode/launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "${relativeFile}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Common Debugging Patterns

```typescript
describe('debugging tests', () => {
  it('should debug step by step', async () => {
    console.log('Starting test...');

    const memory = await client.create('test');
    console.log('Created memory:', memory);

    const result = await client.recall('test');
    console.log('Recall result:', result);

    expect(result).toHaveLength(1);
  });

  it('should use Jest debugging helpers', async () => {
    // Set timeout for debugging
    jest.setTimeout(60000);

    // Mock debugging
    const mockFn = jest.fn();
    mockFn('test call');

    console.log('Mock calls:', mockFn.mock.calls);
    console.log('Mock results:', mockFn.mock.results);
  });
});
```

### Test Isolation Issues

```typescript
describe('isolated tests', () => {
  // Clear all mocks between tests
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // Clean up storage state
  afterEach(async () => {
    await client.clear();
  });

  // Avoid test interdependence
  beforeEach(() => {
    // Reset to known state
  });
});
```

## Continuous Testing

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:quick"
    }
  },

  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "npm run test:related"
    ]
  }
}
```

### Test Performance Monitoring

```typescript
// tests/monitoring/test-performance.ts
export class TestPerformanceMonitor {
  private metrics = new Map<string, number[]>();

  recordTestDuration(testName: string, duration: number) {
    if (!this.metrics.has(testName)) {
      this.metrics.set(testName, []);
    }
    this.metrics.get(testName)!.push(duration);
  }

  getSlowTests(threshold = 1000) {
    const slowTests = [];

    for (const [testName, durations] of this.metrics.entries()) {
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      if (avgDuration > threshold) {
        slowTests.push({ testName, avgDuration });
      }
    }

    return slowTests.sort((a, b) => b.avgDuration - a.avgDuration);
  }
}
```

### Quality Gates

```bash
#!/bin/bash
# scripts/quality-gate.sh

echo "Running quality gate checks..."

# Run tests with coverage
npm run test:coverage

# Check coverage thresholds
if ! npm run test:coverage:check; then
  echo "Coverage threshold not met"
  exit 1
fi

# Run linting
if ! npm run lint; then
  echo "Linting failed"
  exit 1
fi

# Run type checking
if ! npm run type-check; then
  echo "Type checking failed"
  exit 1
fi

# Run UAT tests
if ! make test:uat; then
  echo "UAT tests failed"
  exit 1
fi

echo "All quality gates passed!"
```

This comprehensive testing guide ensures the Kuzu Memory library maintains high quality through systematic testing at all levels, from individual functions to complete user workflows. The multi-layered approach with unit tests, UAT tests, and NLP-specific tests provides confidence in the library's reliability and performance.