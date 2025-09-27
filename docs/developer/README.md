# Kuzu Memory Developer Guide

Welcome to the Kuzu Memory TypeScript library developer documentation. This guide provides comprehensive information for developers working with, contributing to, or porting the Kuzu Memory library.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Testing Strategy](#testing-strategy)
6. [Code Standards](#code-standards)
7. [Documentation Structure](#documentation-structure)
8. [Cross-Platform Considerations](#cross-platform-considerations)

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- TypeScript 5.0+

### Installation for Development

```bash
git clone https://github.com/bobmatnyc/kuzu-memory-ts.git
cd kuzu-memory-ts
npm install
```

### Single-Command Development (Makefile Standard)

The project follows a single-path command philosophy using Make:

```bash
# Build the project
make build

# Run all tests (unit + UAT)
make test

# Start development mode with hot reload
make dev

# Type checking
make type-check

# Linting
make lint

# Quality checks (lint + type-check + test)
make quality

# Publish to npm
make publish

# Show all available commands
make help
```

### Basic Usage Example

```typescript
import { createMemoryClient } from 'kuzu-memory';

// Create a memory client
const client = createMemoryClient({
  storage: 'indexeddb',
  dbName: 'my-app-memory',
  nlp: {
    autoClassify: true,
    autoImportance: true
  }
});

// Initialize the client
await client.init();

// Store a memory
const memory = await client.create('I learned about TypeScript today');

// Recall memories
const memories = await client.recall('TypeScript learning');
```

## Development Setup

### Environment Configuration

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bobmatnyc/kuzu-memory-ts.git
   cd kuzu-memory-ts
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development mode**:
   ```bash
   npm run dev
   # or
   make dev
   ```

### Development Tools

- **TypeScript**: Primary language with strict type checking
- **tsup**: Fast TypeScript build tool
- **Jest**: Testing framework with jsdom environment
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting (integrated with ESLint)

### IDE Setup

**VS Code Configuration** (`.vscode/settings.json`):
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.suggest.includeCompletionsForModuleExports": true
}
```

## Project Structure

```
kuzu-memory-ts/
├── src/                    # Source code
│   ├── core/              # Core application logic
│   │   ├── KuzuMemory.ts  # Main API class
│   │   ├── client.ts      # Client factory
│   │   └── QueryBuilder.ts # Fluent query interface
│   ├── storage/           # Storage adapters
│   │   ├── IndexedDBAdapter.ts
│   │   ├── LocalStorageAdapter.ts
│   │   ├── MemoryAdapter.ts
│   │   └── factory.ts
│   ├── recall/            # Memory recall strategies
│   │   ├── CompositeStrategy.ts
│   │   ├── SimilarityStrategy.ts
│   │   └── factory.ts
│   ├── nlp/              # Natural language processing
│   │   ├── MemoryClassifier.ts
│   │   └── TrainingData.ts
│   ├── extraction/       # Pattern extraction
│   │   ├── PatternExtractor.ts
│   │   └── patterns/
│   ├── hooks/           # React hooks
│   │   ├── useKuzuMemory.ts
│   │   ├── useMemoryQuery.ts
│   │   └── useMemoryMutation.ts
│   ├── utils/          # Utility functions
│   │   ├── validators.ts
│   │   ├── decay.ts
│   │   └── helpers.ts
│   ├── types/          # Type definitions
│   │   └── index.ts
│   └── index.ts        # Main export
├── tests/             # Test files
│   ├── uat/          # User acceptance tests
│   └── nlp/          # NLP-specific tests
├── docs/             # Documentation
│   ├── developer/    # Developer documentation
│   └── ARCHITECTURE.md
├── dist/             # Built output
├── Makefile         # Build commands
└── package.json     # Package configuration
```

### Key Architectural Layers

1. **Presentation Layer**: React hooks and UI integration
2. **Application Layer**: Core KuzuMemory class and client factory
3. **Domain Layer**: Business logic, memory classification, pattern extraction
4. **Infrastructure Layer**: Storage adapters, recall strategies

## Development Workflow

### 1. Feature Development Flow

```bash
# 1. Create feature branch
git checkout -b feature/new-recall-strategy

# 2. Implement changes with TDD approach
npm run test:watch  # Keep tests running

# 3. Add new tests
# Write tests first, then implementation

# 4. Run quality checks
make quality

# 5. Test with UAT suite
make test:uat

# 6. Build and verify
make build

# 7. Commit with conventional commits
git commit -m "feat: add semantic similarity recall strategy"
```

### 2. Testing During Development

```bash
# Run all tests
make test

# Unit tests only
npm run test:unit

# UAT tests only
make test:uat

# Specific UAT test suites
make test:uat:storage
make test:uat:recall
make test:uat:patterns

# Test with coverage
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

### 3. Code Quality Checks

```bash
# Full quality check (recommended before PR)
make quality

# Individual checks
make lint        # ESLint check
make type-check  # TypeScript compilation check
```

## Testing Strategy

### Test Pyramid Structure

```
        ┌─────────────┐
        │ UAT Tests   │  ← User scenarios, integration
        │   (7 files) │
        └─────────────┘
       ┌───────────────┐
       │  Unit Tests   │  ← Individual component tests
       │    (20+)      │
       └───────────────┘
      ┌─────────────────┐
      │ Type Tests      │  ← TypeScript compilation
      │ (Compile-time)  │
      └─────────────────┘
```

### Test Types

1. **Unit Tests**: Individual function/class testing
   - Location: `src/**/*.test.ts`
   - Framework: Jest
   - Focus: Pure functions, isolated logic

2. **UAT (User Acceptance Tests)**: End-to-end scenarios
   - Location: `tests/uat/`
   - Framework: Custom UAT runner
   - Focus: Real user workflows

3. **NLP Tests**: Natural language processing validation
   - Location: `tests/nlp/`
   - Focus: Classification accuracy, training data

### UAT Test Structure

```typescript
// Example UAT test
export const memoryCreationTests: UATTestSuite = {
  name: 'Memory Creation',
  tests: [
    {
      name: 'Should create episodic memory with auto-classification',
      async run({ client }) {
        const memory = await client.create('I went to the store yesterday');
        return {
          success: memory.type === 'episodic',
          details: { actualType: memory.type, expected: 'episodic' }
        };
      }
    }
    // ... more tests
  ]
};
```

## Code Standards

### TypeScript Guidelines

1. **Strict Type Safety**:
   ```typescript
   // ✅ Good: Explicit types
   function processMemory(memory: MemoryItem): ProcessedMemory {
     return { id: memory.id, processed: true };
   }

   // ❌ Bad: Any types
   function processMemory(memory: any): any {
     return { id: memory.id, processed: true };
   }
   ```

2. **Interface over Type** for object shapes:
   ```typescript
   // ✅ Good: Interface for object contracts
   interface StorageConfig {
     dbName: string;
     version: number;
   }

   // ✅ Good: Type for unions
   type MemoryType = 'episodic' | 'semantic' | 'procedural';
   ```

3. **Immutability Patterns**:
   ```typescript
   // ✅ Good: Readonly interfaces
   interface MemoryItem {
     readonly id: string;
     readonly content: string;
   }

   // ✅ Good: Immutable updates
   const updatedMemory = { ...memory, importance: newImportance };
   ```

### Error Handling

1. **Result Pattern** for recoverable errors:
   ```typescript
   import { Result } from '../types/branded';

   async function createMemory(content: string): Promise<Result<MemoryItem, Error>> {
     try {
       const memory = await storage.create(content);
       return Result.ok(memory);
     } catch (error) {
       return Result.err(error as Error);
     }
   }
   ```

2. **Throw for unrecoverable errors**:
   ```typescript
   if (!content?.trim()) {
     throw new Error('Memory content cannot be empty');
   }
   ```

### Naming Conventions

- **Classes**: PascalCase (`MemoryClassifier`, `IndexedDBAdapter`)
- **Functions/Methods**: camelCase (`createMemory`, `extractPatterns`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_BATCH_SIZE`)
- **Interfaces**: PascalCase with descriptive names (`StorageAdapter`)
- **Types**: PascalCase (`MemoryType`, `RecallStrategy`)

### Documentation Standards

1. **TSDoc Comments** for public APIs:
   ```typescript
   /**
    * Creates a new memory with automatic classification
    * @param content - The memory content to store
    * @param metadata - Optional metadata for the memory
    * @returns Promise resolving to the created memory
    * @example
    * ```typescript
    * const memory = await client.create('I learned TypeScript');
    * console.log(memory.type); // 'semantic'
    * ```
    */
   async create(content: string, metadata?: Partial<MemoryItem>): Promise<MemoryItem>
   ```

2. **README examples** for features
3. **Architecture documentation** for design decisions

## Documentation Structure

### Developer Documentation Files

#### Core Development Guides
- **[README.md](README.md)** - This file, development overview and getting started
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Complete contribution guidelines and workflow
- **[TESTING.md](TESTING.md)** - Comprehensive testing strategy, patterns, and implementation
- **[PATTERNS.md](PATTERNS.md)** - Design patterns, architectural decisions, and best practices

#### Technical Implementation
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API documentation with examples
- **[NLP_IMPLEMENTATION.md](NLP_IMPLEMENTATION.md)** - Natural language processing details and Python porting guide
- **[STORAGE_ADAPTERS.md](STORAGE_ADAPTERS.md)** - Storage implementation guide and custom adapter development
- **[PERFORMANCE.md](PERFORMANCE.md)** - Performance optimization guide, benchmarking, and monitoring
- **[SECURITY.md](SECURITY.md)** - Security implementation guide and vulnerability prevention
- **[MIGRATION.md](MIGRATION.md)** - Version upgrade guide and migration strategies

### Documentation Principles

1. **Code First**: Documentation reflects actual implementation
2. **Examples**: Every concept includes working code examples
3. **Cross-Platform**: Considerations for porting to other languages
4. **Maintainable**: Updated with code changes

## Cross-Platform Considerations

### Design Patterns for Portability

The codebase uses patterns that translate well across programming languages:

1. **Factory Pattern**: Object creation abstraction
2. **Strategy Pattern**: Algorithm abstraction
3. **Repository Pattern**: Data access abstraction
4. **Observer Pattern**: Event handling
5. **Builder Pattern**: Complex object construction

### Language Translation Guide

| Concept | TypeScript | Python | Java |
|---------|------------|--------|------|
| Interface | `interface` | `Protocol` or `ABC` | `interface` |
| Enum | `enum` or union types | `Enum` | `enum` |
| Optional | `field?` | `Optional[T]` | `Optional<T>` |
| Async | `async/await` | `async/await` | `CompletableFuture` |
| Events | `EventEmitter` | `asyncio.Event` | `Observable` |

### Data Format Compatibility

All data structures are designed for cross-platform serialization:

```typescript
// Memory item structure (JSON serializable)
interface MemoryItem {
  id: string;              // UUID string
  type: MemoryType;        // Enum as string
  content: string;         // UTF-8 text
  timestamp: Date;         // ISO 8601 string when serialized
  importance: number;      // IEEE 754 double
  metadata: Record<string, any>; // JSON object
}
```

### Configuration Management

Environment-agnostic configuration format:

```typescript
// TypeScript configuration
interface KuzuConfig {
  storage: 'indexeddb' | 'memory' | 'localStorage';
  dbName: string;
  version: number;
  // ... other options
}
```

**Equivalent YAML configuration** (for other platforms):
```yaml
storage:
  type: sqlite  # or postgresql, memory
  database: kuzu_memory.db
  version: 1

memory:
  max_items: 10000
  decay_enabled: true
```

## Getting Help

### Resources

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and community support
- **Documentation**: Complete API and architecture docs
- **Examples**: Working code samples in `examples/`

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code contribution guidelines
- Pull request process
- Issue reporting
- Development workflow

### Community

- Follow coding standards
- Write tests for new features
- Update documentation
- Be respectful in discussions

---

## Quick Reference

### New Developer Checklist
1. **Start Here**: Read this README for project overview
2. **Setup**: Follow [CONTRIBUTING.md](CONTRIBUTING.md) for environment setup
3. **Architecture**: Review [PATTERNS.md](PATTERNS.md) for design patterns
4. **API**: Reference [API_REFERENCE.md](API_REFERENCE.md) for implementation details

### Common Tasks
- **Adding Features**: [CONTRIBUTING.md](CONTRIBUTING.md) + [PATTERNS.md](PATTERNS.md)
- **Writing Tests**: [TESTING.md](TESTING.md)
- **Custom Storage**: [STORAGE_ADAPTERS.md](STORAGE_ADAPTERS.md)
- **NLP/Python Porting**: [NLP_IMPLEMENTATION.md](NLP_IMPLEMENTATION.md)
- **Performance Issues**: [PERFORMANCE.md](PERFORMANCE.md)
- **Security Reviews**: [SECURITY.md](SECURITY.md)
- **Version Upgrades**: [MIGRATION.md](MIGRATION.md)

### Documentation by Role
- **Contributors**: [CONTRIBUTING.md](CONTRIBUTING.md), [TESTING.md](TESTING.md), [PATTERNS.md](PATTERNS.md)
- **Integrators**: [API_REFERENCE.md](API_REFERENCE.md), [STORAGE_ADAPTERS.md](STORAGE_ADAPTERS.md)
- **Python Developers**: [NLP_IMPLEMENTATION.md](NLP_IMPLEMENTATION.md), [MIGRATION.md](MIGRATION.md)
- **DevOps/Security**: [SECURITY.md](SECURITY.md), [PERFORMANCE.md](PERFORMANCE.md), [MIGRATION.md](MIGRATION.md)