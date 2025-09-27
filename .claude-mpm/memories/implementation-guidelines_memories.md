# Kuzu Memory - Implementation Guidelines

**Memory Type**: Development Standards
**Created**: 2025-09-25
**Importance**: High

## Code Organization Principles

### File Structure Standards
```
src/
├── types/          # Core type definitions (Zod schemas)
├── core/          # Main API classes and factories
├── storage/       # Storage adapter implementations
├── recall/        # Memory retrieval strategies
├── extraction/    # Pattern extraction system
├── hooks/         # React integration layer
├── utils/         # Shared utilities and helpers
└── index.ts       # Main entry point
```

### Naming Conventions
- **Classes**: PascalCase (`KuzuMemory`, `IndexedDBAdapter`)
- **Functions**: camelCase (`createMemoryClient`, `sanitizeContent`)
- **Types/Interfaces**: PascalCase (`MemoryItem`, `StorageAdapter`)
- **Constants**: UPPER_SNAKE_CASE (`VERSION`, `DEFAULT_CONFIG`)
- **Files**: camelCase or kebab-case consistently

## API Design Standards

### Error Handling Pattern
```typescript
// Use specific error types
export class MemoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Memory with id ${id} not found`);
    this.name = 'MemoryNotFoundError';
  }
}

// Validate inputs with helpful messages
export function validateConfig(config: unknown): KuzuConfig {
  try {
    return KuzuConfigSchema.parse(config);
  } catch (error) {
    throw new Error(`Invalid configuration: ${error.message}`);
  }
}
```

### Async Operation Standards
- Always use async/await (no callbacks)
- Handle errors at appropriate boundaries
- Provide meaningful error messages
- Use proper TypeScript return types

### Interface Design
```typescript
// Storage adapters implement comprehensive interface
export interface StorageAdapter {
  init(): Promise<void>;
  get(id: string): Promise<MemoryItem | null>;
  create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem>;
  // ... all CRUD + query operations
}
```

## React Hook Standards

### Hook Naming
- Use "use" prefix consistently
- Descriptive names: `useMemoryQuery`, `useMemoryMutation`
- Return objects with clear property names

### State Management
```typescript
export function useMemoryQuery({ client, query }: Options): Return {
  const [data, setData] = useState<MemoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Proper dependency array management
  useEffect(() => {
    // Query logic
  }, [client, JSON.stringify(query)]);

  return { data, isLoading, error, refetch };
}
```

### Event Handling
- Clean up event listeners in useEffect cleanup
- Use proper TypeScript event types
- Handle component unmounting gracefully

## Type Safety Standards

### Zod Schema Design
```typescript
// Composable schemas
export const MemoryItemSchema = z.object({
  id: z.string().uuid(),
  type: MemoryTypeEnum,
  content: z.string(),
  // ... other fields
});

// Reuse schemas
export type MemoryItem = z.infer<typeof MemoryItemSchema>;
```

### Generic Usage
```typescript
// Use generics for reusable patterns
export interface QueryResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}
```

## Testing Standards

### Test Structure
```typescript
describe('ComponentName', () => {
  let subject: ComponentType;

  beforeEach(async () => {
    subject = new ComponentType(testConfig);
    await subject.init();
  });

  afterEach(async () => {
    await subject.cleanup();
  });

  describe('methodName', () => {
    test('should handle normal case', async () => {
      // Arrange
      const input = createTestData();

      // Act
      const result = await subject.methodName(input);

      // Assert
      expect(result).toMatchObject(expectedOutput);
    });
  });
});
```

### Test Data Factories
```typescript
export function createTestMemory(overrides?: Partial<MemoryItem>): MemoryItem {
  return {
    id: uuid(),
    type: 'semantic',
    content: 'Test content',
    timestamp: new Date(),
    // ... defaults
    ...overrides,
  };
}
```

## Performance Guidelines

### Memory Management
- Clean up event listeners
- Clear intervals/timeouts
- Implement proper destroy methods
- Use WeakMap/WeakSet for caches when appropriate

### Query Optimization
- Debounce user input
- Implement result caching
- Use pagination for large datasets
- Consider lazy loading strategies

### Bundle Optimization
- Tree-shakable exports
- Dynamic imports for large features
- Minimize dependencies
- Use tsup for optimal bundling

## Security Guidelines

### Input Validation
```typescript
export function sanitizeMemoryContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
```

### Data Storage
- Never store sensitive data without encryption
- Validate all data read from storage
- Use UUID for identifiers
- Implement proper access controls

## Configuration Management

### Environment-Specific Configs
```typescript
const configs = {
  development: {
    storage: 'memory' as const,
    decayEnabled: false,
    logging: true,
  },
  production: {
    storage: 'indexeddb' as const,
    decayEnabled: true,
    logging: false,
  },
};
```

### Feature Flags
```typescript
export interface FeatureFlags {
  enableDecay: boolean;
  enableEmbeddings: boolean;
  enableAnalytics: boolean;
}
```

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Creates a new memory item with automatic pattern extraction
 *
 * @param content - The text content to store and analyze
 * @param metadata - Optional metadata and configuration
 * @returns Promise resolving to the created memory item
 *
 * @example
 * ```typescript
 * const memory = await client.create('Important note about API design', {
 *   type: 'semantic',
 *   tags: ['api', 'documentation'],
 *   importance: 0.9
 * });
 * ```
 *
 * @throws {ValidationError} When content is empty or invalid
 * @throws {StorageError} When storage operation fails
 */
async create(content: string, metadata?: Partial<MemoryItem>): Promise<MemoryItem>
```

### README Structure
1. Brief description
2. Installation instructions
3. Quick start example
4. API reference
5. Configuration options
6. Development setup

## Version Management

### Semantic Versioning
- **MAJOR**: Breaking API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Breaking Change Process
1. Deprecation warnings in previous minor version
2. Migration guide documentation
3. Version bump with clear changelog
4. Community notification

## Code Review Guidelines

### What to Look For
- Type safety and proper error handling
- Performance implications
- Security considerations
- Test coverage
- Documentation updates
- Breaking change impact

### Review Checklist
- [ ] All tests passing
- [ ] TypeScript compilation clean
- [ ] ESLint/Prettier conformance
- [ ] Documentation updated
- [ ] Performance impact considered
- [ ] Security implications reviewed

## Deployment Standards

### Pre-release Checklist
```bash
# Quality gates
make quality         # Run all checks
make build          # Verify build
make publish-check  # Package verification

# Documentation
# Update CHANGELOG.md
# Update README.md if needed
# Tag release in git
```

### Publishing Process
```bash
npm version [patch|minor|major]
npm publish
git push --tags
```

## Common Patterns to Follow

### Factory Pattern
```typescript
export function createStorageAdapter(options: StorageOptions): StorageAdapter {
  switch (options.type) {
    case 'indexeddb': return new IndexedDBAdapter(options);
    case 'memory': return new MemoryAdapter(options);
    default: throw new Error(`Unknown storage type: ${options.type}`);
  }
}
```

### Strategy Pattern
```typescript
export interface RecallStrategy {
  name: string;
  recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]>;
  score(memory: MemoryItem, query: string): number;
}
```

### Observer Pattern
```typescript
// Event emission in core class
this.emit('memory:created', { type: 'memory:created', memory });

// Event subscription in hooks
useEffect(() => {
  const unsubscribe = client.subscribe(handleEvent);
  return unsubscribe;
}, [client]);
```

These guidelines ensure consistent, maintainable, and high-quality code across the entire library.