# Kuzu Memory - Developer Guide

**Audience**: Contributors and maintainers
**Prerequisites**: TypeScript, React, Browser APIs knowledge

## 🚀 Quick Start

### Environment Setup
```bash
# Clone and setup
git clone <repository-url>
cd kuzu-memory-ts
make install

# Start development
make dev

# Run quality checks
make quality
```

### Development Commands
```bash
make dev          # Watch mode development
make build        # Production build
make test         # Run tests
make type-check   # TypeScript validation
make lint         # ESLint checking
make quality      # All quality checks
```

## 🏗️ Architecture Deep Dive

### Core Design Principles

1. **Type Safety First**: Everything is strictly typed with Zod runtime validation
2. **Strategy Pattern**: Pluggable storage and recall strategies
3. **Event-Driven**: All operations emit events for reactive programming
4. **Immutable Data**: Memory items are immutable after creation
5. **Performance**: Lazy loading, debouncing, and efficient queries

### Key Architectural Decisions

#### Why Zod for Validation?
- Runtime type safety for user inputs
- Automatic TypeScript type generation
- Composable schema definitions
- Excellent error messages

#### Why EventEmitter?
- Decoupled components
- React hook integration
- Debugging and monitoring
- Extension point for analytics

#### Why Strategy Pattern?
- Pluggable algorithms
- Testing different approaches
- User customization
- Future ML integration

## 📦 Module Development

### Adding a New Storage Adapter

1. **Implement StorageAdapter interface**:
```typescript
// src/storage/MyAdapter.ts
export class MyAdapter implements StorageAdapter {
  async init(): Promise<void> { /* setup */ }
  async get(id: string): Promise<MemoryItem | null> { /* fetch */ }
  // ... implement all methods
}
```

2. **Add to factory**:
```typescript
// src/storage/factory.ts
export function createStorageAdapter(options: StorageOptions): StorageAdapter {
  switch (options.type) {
    case 'my-adapter':
      return new MyAdapter(options);
    // ... existing cases
  }
}
```

3. **Update types**:
```typescript
// src/types/index.ts
export type StorageType = 'indexeddb' | 'memory' | 'localStorage' | 'my-adapter';
```

### Adding a New Recall Strategy

1. **Implement RecallStrategy interface**:
```typescript
// src/recall/MyStrategy.ts
export class MyStrategy implements RecallStrategy {
  name = 'my-strategy';

  async recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]> {
    return memories
      .map(memory => ({ memory, score: this.score(memory, query) }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.memory);
  }

  score(memory: MemoryItem, query: string): number {
    // Your scoring algorithm
    return 0.5;
  }
}
```

2. **Add to factory and types** (similar to storage adapter)

### Adding Pattern Extractors

1. **Create extractor function**:
```typescript
// src/extraction/extractors.ts
export function createMyExtractor(options?: MyOptions): Pattern {
  return {
    id: 'my-pattern',
    name: 'My Pattern',
    priority: 10,
    extractor: (text: string) => {
      // Your extraction logic
      return { matches: [], confidence: 0.8 };
    }
  };
}
```

2. **Add to default patterns**:
```typescript
// src/extraction/patterns.ts
export const defaultPatterns: Pattern[] = [
  // ... existing patterns
  createMyExtractor(),
];
```

## 🧪 Testing Guidelines

### Test Structure
```
src/
├── __tests__/           # Global tests
├── module/
│   ├── __tests__/      # Module tests
│   └── component.ts
└── component.test.ts    # Co-located tests
```

### Testing Patterns

#### Unit Testing Storage Adapters:
```typescript
describe('MyAdapter', () => {
  let adapter: MyAdapter;

  beforeEach(async () => {
    adapter = new MyAdapter({ /* options */ });
    await adapter.init();
  });

  afterEach(async () => {
    await adapter.clear();
  });

  test('should store and retrieve memory', async () => {
    const memory = await adapter.create({
      type: 'semantic',
      content: 'test content',
      timestamp: new Date(),
      // ...
    });

    const retrieved = await adapter.get(memory.id);
    expect(retrieved).toEqual(memory);
  });
});
```

#### Testing React Hooks:
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useKuzuMemory } from '../hooks/useKuzuMemory';

test('should initialize memory client', async () => {
  const { result, waitForNextUpdate } = renderHook(() =>
    useKuzuMemory({ storage: 'memory' })
  );

  await waitForNextUpdate();

  expect(result.current.isInitialized).toBe(true);
  expect(result.current.client).toBeDefined();
});
```

### Test Data Factories
```typescript
// test-utils/factories.ts
export function createTestMemory(overrides?: Partial<MemoryItem>): MemoryItem {
  return {
    id: uuid(),
    type: 'semantic',
    content: 'Test memory content',
    timestamp: new Date(),
    importance: 0.5,
    accessCount: 0,
    decay: 0.1,
    tags: [],
    relations: [],
    ...overrides,
  };
}
```

## 🔧 Configuration Management

### Environment-Specific Configs
```typescript
// Development
const devConfig: KuzuConfig = {
  storage: 'memory',
  decayEnabled: false,
  maxMemories: 1000,
};

// Production
const prodConfig: KuzuConfig = {
  storage: 'indexeddb',
  decayEnabled: true,
  maxMemories: 10000,
  autoSync: true,
};
```

### Feature Flags
```typescript
export interface FeatureFlags {
  enableDecay: boolean;
  enableEmbeddings: boolean;
  enableAnalytics: boolean;
}

// Usage in KuzuMemory
if (this.features.enableDecay) {
  this.startDecay();
}
```

## 🔍 Debugging Tips

### Enable Debug Logging
```typescript
const memory = new KuzuMemory({
  // ... config
});

// Subscribe to all events for debugging
memory.subscribe((event) => {
  console.log('Memory Event:', event);
});
```

### Chrome DevTools Integration
```typescript
// Add to global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).kuzuMemory = memory;
}

// Now you can use in console:
// kuzuMemory.getStats()
// kuzuMemory.query({ limit: 100 })
```

### Common Issues and Solutions

#### Issue: "Memory not found" errors
**Cause**: Async timing issues or storage not initialized
**Solution**: Always await `memory.init()` before operations

#### Issue: Poor recall performance
**Cause**: Large datasets without proper indexing
**Solution**: Implement pagination and consider similarity strategy

#### Issue: React hook stale closures
**Cause**: Dependencies not properly declared
**Solution**: Use exhaustive-deps ESLint rule

## 📈 Performance Optimization

### Memory Management
```typescript
// Implement memory pooling for frequent operations
class MemoryPool {
  private pool: MemoryItem[] = [];

  acquire(): MemoryItem {
    return this.pool.pop() || this.createNew();
  }

  release(item: MemoryItem): void {
    // Reset item and return to pool
    this.pool.push(this.reset(item));
  }
}
```

### Query Optimization
```typescript
// Use indexes for common queries
const indexedQueries = new Map<string, MemoryItem[]>();

// Cache expensive recall operations
const recallCache = new LRUCache<string, MemoryItem[]>(100);
```

### Bundle Size Optimization
- Tree-shake unused recall strategies
- Lazy load storage adapters
- Dynamic imports for pattern extractors

## 🔒 Security Best Practices

### Input Validation
```typescript
// Always validate inputs at boundaries
export function createMemory(input: unknown): MemoryItem {
  const validated = MemoryItemSchema.parse(input);
  return sanitizeMemoryContent(validated);
}
```

### Content Sanitization
```typescript
export function sanitizeMemoryContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
```

### Storage Security
- Never store sensitive data without encryption
- Validate all data read from storage
- Implement proper error boundaries

## 📚 API Design Guidelines

### Naming Conventions
- **Classes**: PascalCase (`KuzuMemory`, `IndexedDBAdapter`)
- **Functions**: camelCase (`createMemoryClient`, `calculateDecay`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CONFIG`, `VERSION`)
- **Types**: PascalCase (`MemoryItem`, `StorageAdapter`)

### Error Handling
```typescript
// Use specific error types
export class MemoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Memory with id ${id} not found`);
    this.name = 'MemoryNotFoundError';
  }
}

// Provide helpful error messages
export function validateConfig(config: unknown): KuzuConfig {
  try {
    return KuzuConfigSchema.parse(config);
  } catch (error) {
    throw new Error(`Invalid configuration: ${error.message}`);
  }
}
```

### Backward Compatibility
- Use semantic versioning strictly
- Deprecate before removing features
- Provide migration guides for breaking changes

## 🚀 Release Process

### Version Bumping
```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major
```

### Pre-release Checklist
- [ ] All tests passing
- [ ] Type checking clean
- [ ] Linting passed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented

### Publishing
```bash
make publish-check  # Verify package
make publish        # Publish to npm
```

## 🎯 Contributing Guidelines

### Code Style
- Use TypeScript strict mode
- Prefer functional programming patterns
- Write self-documenting code
- Add JSDoc comments for public APIs

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Run quality checks (`make quality`)
5. Create PR with clear description

### Commit Message Format
```
type(scope): short description

Longer description if needed

Fixes #123
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## 📖 Documentation Standards

### Code Comments
```typescript
/**
 * Creates a new memory item with pattern extraction
 *
 * @param content - The text content to store
 * @param metadata - Optional metadata and configuration
 * @returns Promise resolving to the created memory item
 *
 * @example
 * ```typescript
 * const memory = await client.create('Important note', {
 *   type: 'semantic',
 *   tags: ['important'],
 *   importance: 0.9
 * });
 * ```
 */
async create(content: string, metadata?: Partial<MemoryItem>): Promise<MemoryItem>
```

### README Updates
- Keep examples current with API changes
- Test all code examples
- Update feature lists
- Maintain migration guides

---

This developer guide should be updated as the codebase evolves. Always prioritize clarity and maintainability over cleverness.