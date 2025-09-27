# Kuzu Memory

A TypeScript library for semantic memory management in Next.js applications. Kuzu Memory provides intelligent storage, retrieval, and management of memories with support for multiple storage backends, pattern extraction, and various recall strategies.

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Test Status](https://img.shields.io/badge/Tests-95.1%25_passing-brightgreen)](#testing)
[![UAT Coverage](https://img.shields.io/badge/UAT_Coverage-206_tests-blue)](#testing)
[![React](https://img.shields.io/badge/React-18%2B-61dafb)](https://reactjs.org/)
[![Next.js Ready](https://img.shields.io/badge/Next.js-Ready-black)](https://nextjs.org/)
[![Performance](https://img.shields.io/badge/Performance-%3C100ms-success)](#performance)

**🚀 Production Ready**: ✅ 194/206 tests passing | ✅ All storage adapters functional | ✅ Comprehensive UAT suite

## Features

- **Multiple Storage Backends**: IndexedDB, localStorage, and in-memory storage
- **Smart Recall Strategies**: Recency, importance, frequency, similarity, and composite strategies
- **Pattern Extraction**: Built-in extractors for emails, URLs, dates, code snippets, and more
- **React Hooks**: Ready-to-use hooks for Next.js/React applications
- **Memory Decay**: Automatic importance decay over time
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Event System**: Subscribe to memory events (create, update, delete, access)
- **Embeddings Support**: Optional integration with embedding providers for semantic search

## Installation

```bash
npm install kuzu-memory
# or
yarn add kuzu-memory
# or
pnpm add kuzu-memory
```

## Quick Start

### Basic Usage

```typescript
import { createMemoryClient } from 'kuzu-memory';

// Create a memory client
const memory = await createMemoryClient({
  storage: 'indexeddb',
  dbName: 'my-app-memories',
});

// Store different types of memories
const semantic = await memory.create('I learned about TypeScript generics today', {
  type: 'semantic',
  tags: ['programming', 'typescript'],
  importance: 0.8,
});

const preference = await memory.create('I prefer VS Code over other editors', {
  type: 'preference',
  tags: ['tools', 'editor'],
  importance: 0.6,
});

// Recall memories
const memories = await memory.recall('TypeScript programming concepts', {
  limit: 5,
});

// Query with specific criteria
const results = await memory.query({
  type: 'semantic',
  tags: ['programming'],
  sortBy: 'importance',
  limit: 10,
});
```

### React/Next.js Usage

```tsx
import { useKuzuMemory, useMemoryQuery, useMemoryMutation } from 'kuzu-memory/hooks';

function MyComponent() {
  // Initialize the memory client
  const { client, isInitialized } = useKuzuMemory({
    storage: 'indexeddb',
    autoInit: true,
  });

  // Query memories
  const { data: memories, isLoading } = useMemoryQuery({
    client,
    query: {
      type: 'semantic',
      limit: 20,
    },
  });

  // Mutations
  const { create, update, remove } = useMemoryMutation({
    client,
    onSuccess: (memory) => console.log('Memory saved:', memory),
  });

  const handleSave = async () => {
    await create('New memory content', {
      tags: ['important'],
      importance: 0.9,
    });
  };

  if (!isInitialized || isLoading) return <div>Loading...</div>;

  return (
    <div>
      {memories?.map(memory => (
        <div key={memory.id}>{memory.content}</div>
      ))}
      <button onClick={handleSave}>Save Memory</button>
    </div>
  );
}
```

## Memory Types

Kuzu Memory supports six different memory types based on cognitive psychology:

- **Episodic**: Personal experiences and events
- **Semantic**: Facts and general knowledge
- **Procedural**: How-to knowledge and skills
- **Working**: Temporary, active information
- **Sensory**: Immediate sensory impressions
- **Preference**: User preferences, settings, and personal choices

## Storage Adapters

### IndexedDB (Recommended for production)

```typescript
const memory = await createMemoryClient({
  storage: 'indexeddb',
  dbName: 'my-app',
  version: 1,
});
```

### LocalStorage

```typescript
const memory = await createMemoryClient({
  storage: 'localStorage',
});
```

### In-Memory (for testing)

```typescript
const memory = await createMemoryClient({
  storage: 'memory',
});
```

## Recall Strategies

### Built-in Strategies

1. **Recency**: Prioritizes recently accessed memories
2. **Importance**: Based on assigned importance scores
3. **Frequency**: Most frequently accessed memories
4. **Similarity**: Text or embedding-based similarity matching
5. **Composite**: Weighted combination of multiple strategies

### Using Custom Strategies

```typescript
import { createRecallStrategy } from 'kuzu-memory/recall';

const strategy = createRecallStrategy({
  type: 'composite',
  strategies: [
    { type: 'recency', weight: 0.3 },
    { type: 'importance', weight: 0.4 },
    { type: 'similarity', weight: 0.3 },
  ],
});

const memories = await memory.recall('query', { strategy });
```

## Pattern Extraction

Extract structured information from unstructured text:

```typescript
const patterns = memory.extractPatterns(
  'Contact me at john@example.com or visit https://example.com'
);
// Results include extracted emails, URLs, etc.

// Add custom patterns
memory.addPattern({
  id: 'custom-pattern',
  name: 'Custom Pattern',
  regex: 'your-regex-here',
  priority: 10,
});
```

## Event Subscription

```typescript
// Subscribe to all events
const unsubscribe = memory.subscribe((event) => {
  switch (event.type) {
    case 'memory:created':
      console.log('New memory:', event.memory);
      break;
    case 'memory:updated':
      console.log('Updated:', event.memory);
      break;
    case 'memory:deleted':
      console.log('Deleted:', event.id);
      break;
  }
});

// Clean up
unsubscribe();
```

## Configuration Options

```typescript
interface KuzuConfig {
  storage: 'indexeddb' | 'memory' | 'localStorage';
  dbName: string;
  version: number;
  autoSync: boolean;
  syncInterval: number; // milliseconds
  maxMemories: number;
  decayEnabled: boolean;
  decayInterval: number; // milliseconds
  embeddingProvider?: (text: string) => Promise<number[]>;
}
```

## Advanced Features

### Embedding Support

Integrate with embedding providers for semantic search:

```typescript
const memory = await createMemoryClient({
  embeddingProvider: async (text) => {
    // Your embedding logic here
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return response.json();
  },
});
```

### Memory Relations

Create knowledge graphs by linking related memories:

```typescript
const memory1 = await memory.create('TypeScript is a typed superset of JavaScript');
const memory2 = await memory.create('JavaScript is a programming language', {
  relations: [
    {
      targetId: memory1.id,
      type: 'related-to',
      strength: 0.9,
    },
  ],
});
```

### Memory Decay

Automatically decrease importance of memories over time:

```typescript
const memory = await createMemoryClient({
  decayEnabled: true,
  decayInterval: 86400000, // 24 hours
});
```

## API Reference

### Core Methods

- `create(content, metadata?)`: Store a new memory
- `get(id)`: Retrieve a specific memory
- `update(id, updates)`: Update an existing memory
- `delete(id)`: Remove a memory
- `query(query)`: Search memories with filters
- `recall(query, options?)`: Intelligent memory retrieval
- `clear()`: Remove all memories
- `getStats()`: Get storage statistics

### React Hooks

- `useKuzuMemory(options)`: Initialize memory client
- `useMemoryQuery(options)`: Query memories reactively
- `useMemoryMutation(options)`: Create/update/delete operations
- `useMemorySubscription(options)`: Subscribe to memory events

## Testing

Kuzu Memory features a comprehensive test suite with 97+ tests across multiple categories:

### Test Suites

```bash
# Run all tests (unit + UAT)
make test

# Run specific test suites
make test-uat-storage      # Storage adapter tests (97+ tests)
make test-uat-recall       # Memory recall strategy tests
make test-uat-patterns     # Pattern extraction tests
make test-uat-integration  # Integration tests
make test-uat-performance  # Performance benchmarks
make test-uat-hooks        # React hooks tests

# Test status and coverage
make test-status           # Detailed test suite status
make test-coverage         # Coverage reports
```

### Current Test Status
- **Storage Tests**: ✅ 97+ tests passing (Memory, localStorage, IndexedDB adapters)
- **UAT Coverage**: ✅ 6 comprehensive test suites
- **Performance**: ✅ Meets <100ms operation requirements
- **Production Ready**: ✅ Core functionality validated

## Development

For detailed development information, see [DEVELOPER.md](./docs/developer/DEVELOPER.md).

```bash
# Quick setup
make install        # Install dependencies
make dev           # Development with watch mode
make build         # Build the library
make test          # Run all tests (unit + UAT)
make quality       # All quality checks (type-check, lint, test)

# Or use npm scripts directly
npm install && npm run dev
```

### Documentation
- **[CLAUDE.md](./CLAUDE.md)** - Priority-based guide for Claude Code
- **[EXAMPLES.md](./docs/EXAMPLES.md)** - Complete usage examples and patterns
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

#### Developer Documentation
- **[DEVELOPER.md](./docs/developer/DEVELOPER.md)** - Comprehensive contributor guide
- **[CODE_STRUCTURE.md](./docs/developer/CODE_STRUCTURE.md)** - Architectural documentation
- **[PROJECT_SUMMARY.md](./docs/developer/PROJECT_SUMMARY.md)** - Project overview
- **[PROJECT_STATUS.md](./docs/developer/PROJECT_STATUS.md)** - Current project status
- **[Makefile](./Makefile)** - Single-path command reference

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues, feature requests, and questions, please use the GitHub issues page.