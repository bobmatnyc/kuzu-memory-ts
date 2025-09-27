# Kuzu Memory API Reference

This document provides complete API documentation for the Kuzu Memory TypeScript library.

## Table of Contents

1. [Core API](#core-api)
2. [React Hooks](#react-hooks)
3. [Storage Adapters](#storage-adapters)
4. [Recall Strategies](#recall-strategies)
5. [NLP Classification](#nlp-classification)
6. [Types and Interfaces](#types-and-interfaces)
7. [Utilities](#utilities)
8. [Error Handling](#error-handling)
9. [Configuration](#configuration)
10. [Examples](#examples)

## Core API

### KuzuMemory Class

The main class that orchestrates all memory operations.

```typescript
class KuzuMemory extends EventEmitter {
  constructor(config?: Partial<KuzuConfig>)

  // Lifecycle
  async init(): Promise<void>
  destroy(): void

  // Memory operations
  async create(content: string, metadata?: Partial<MemoryItem>): Promise<MemoryItem>
  async createSafe(content: string, metadata?: Partial<MemoryItem>): Promise<Result<MemoryItem, Error>>
  async store(item: string | Partial<MemoryItem>): Promise<MemoryItem>
  async get(id: string): Promise<MemoryItem | null>
  async access(id: string): Promise<MemoryItem | null>
  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem>
  async delete(id: string): Promise<void>

  // Querying
  async query(query: MemoryQuery): Promise<MemoryItem[]>
  async recall(query: string, options?: RecallOptions): Promise<MemoryItem[]>

  // Utilities
  async clear(): Promise<void>
  async getStats(): Promise<StorageStats>

  // Pattern extraction
  addPattern(pattern: PatternConfig): void
  removePattern(patternId: string): void
  async extractPatterns(text: string): Promise<ExtractionResult[]>

  // NLP classification
  async classifyMemory(content: string): Promise<ClassificationResult | null>
  async getDetailedClassification(content: string): Promise<DetailedClassification | null>

  // Events
  subscribe(handler: (event: MemoryEvent) => void): () => void
}
```

#### Constructor

```typescript
constructor(config?: Partial<KuzuConfig>)
```

Creates a new KuzuMemory instance with optional configuration.

**Parameters:**
- `config` (optional): Configuration object

**Example:**
```typescript
const memory = new KuzuMemory({
  storage: 'indexeddb',
  dbName: 'my-app-memory',
  maxMemories: 5000,
  nlp: {
    autoClassify: true,
    autoImportance: true
  }
});
```

#### init()

```typescript
async init(): Promise<void>
```

Initializes the memory system. Must be called before using other methods.

**Throws:** `Error` if initialization fails

**Example:**
```typescript
await memory.init();
```

#### create()

```typescript
async create(content: string, metadata?: Partial<MemoryItem>): Promise<MemoryItem>
```

Creates a new memory with automatic classification and pattern extraction.

**Parameters:**
- `content`: The memory content (required)
- `metadata`: Optional metadata including type, importance, tags, etc.

**Returns:** Promise resolving to the created MemoryItem

**Throws:** `Error` if creation fails

**Example:**
```typescript
const memory = await client.create('I learned about React hooks today', {
  type: 'semantic',
  importance: 0.8,
  tags: ['learning', 'react'],
  source: 'documentation'
});
```

#### createSafe()

```typescript
async createSafe(content: string, metadata?: Partial<MemoryItem>): Promise<Result<MemoryItem, Error>>
```

Safe version of create() that returns a Result type instead of throwing.

**Parameters:**
- `content`: The memory content (required)
- `metadata`: Optional metadata

**Returns:** Promise resolving to Result<MemoryItem, Error>

**Example:**
```typescript
const result = await client.createSafe('Memory content');
if (result.success) {
  console.log('Memory created:', result.data.id);
} else {
  console.error('Failed to create memory:', result.error);
}
```

#### recall()

```typescript
async recall(query: string, options?: RecallOptions): Promise<MemoryItem[]>
```

Recalls memories based on a query string using configured recall strategies.

**Parameters:**
- `query`: Search query string
- `options`: Optional recall configuration

**Returns:** Promise resolving to array of ranked MemoryItems

**Example:**
```typescript
const memories = await client.recall('React hooks', {
  limit: 5,
  type: 'semantic',
  strategy: customStrategy
});
```

#### query()

```typescript
async query(query: MemoryQuery): Promise<MemoryItem[]>
```

Structured query interface for advanced memory retrieval.

**Parameters:**
- `query`: Structured query object

**Returns:** Promise resolving to array of MemoryItems

**Example:**
```typescript
const memories = await client.query({
  text: 'JavaScript',
  type: 'semantic',
  tags: ['programming'],
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  },
  limit: 10,
  sortBy: 'importance',
  sortOrder: 'desc'
});
```

### Client Factory Functions

#### createMemoryClient()

```typescript
async function createMemoryClient(config?: Partial<KuzuConfig>): Promise<KuzuMemory>
```

Factory function that creates and initializes a KuzuMemory instance.

**Parameters:**
- `config`: Optional configuration

**Returns:** Promise resolving to initialized KuzuMemory instance

**Example:**
```typescript
const client = await createMemoryClient({
  storage: 'indexeddb',
  dbName: 'my-app-memory'
});
```

#### getDefaultClient()

```typescript
async function getDefaultClient(config?: Partial<KuzuConfig>): Promise<KuzuMemory>
```

Gets or creates a singleton default client instance.

**Parameters:**
- `config`: Configuration used only for initial creation

**Returns:** Promise resolving to default KuzuMemory instance

**Example:**
```typescript
const client = await getDefaultClient();
// Subsequent calls return the same instance
const sameClient = await getDefaultClient();
```

## React Hooks

### useKuzuMemory

Primary hook for React integration.

```typescript
function useKuzuMemory(options?: UseKuzuMemoryOptions): UseKuzuMemoryReturn
```

**Parameters:**
```typescript
interface UseKuzuMemoryOptions extends Partial<KuzuConfig> {
  autoInit?: boolean; // Default: true
}
```

**Returns:**
```typescript
interface UseKuzuMemoryReturn {
  client: KuzuMemory | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
  reset: () => Promise<void>;
}
```

**Example:**
```typescript
function MyComponent() {
  const { client, isInitialized, error } = useKuzuMemory({
    storage: 'indexeddb',
    autoInit: true
  });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!isInitialized) {
    return <div>Loading memory system...</div>;
  }

  return <MemoryInterface client={client} />;
}
```

### useMemoryQuery

Hook for querying memories with automatic reactivity.

```typescript
function useMemoryQuery(params: UseMemoryQueryParams): UseMemoryQueryReturn
```

**Parameters:**
```typescript
interface UseMemoryQueryParams {
  client: KuzuMemory | null;
  query: MemoryQuery | null;
  enabled?: boolean;
  onSuccess?: (memories: MemoryItem[]) => void;
  onError?: (error: Error) => void;
}
```

**Returns:**
```typescript
interface UseMemoryQueryReturn {
  data: MemoryItem[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Example:**
```typescript
function MemoryList() {
  const { client } = useKuzuMemory();
  const { data: memories, isLoading, error } = useMemoryQuery({
    client,
    query: {
      type: 'semantic',
      limit: 10,
      sortBy: 'importance'
    }
  });

  if (isLoading) return <div>Loading memories...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {memories?.map(memory => (
        <li key={memory.id}>{memory.content}</li>
      ))}
    </ul>
  );
}
```

### useMemoryMutation

Hook for memory mutations with optimistic updates.

```typescript
function useMemoryMutation(params: UseMemoryMutationParams): UseMemoryMutationReturn
```

**Parameters:**
```typescript
interface UseMemoryMutationParams {
  client: KuzuMemory | null;
  onSuccess?: (memory: MemoryItem, operation: string) => void;
  onError?: (error: Error, operation: string) => void;
}
```

**Returns:**
```typescript
interface UseMemoryMutationReturn {
  create: (content: string, metadata?: Partial<MemoryItem>) => Promise<MemoryItem>;
  update: (id: string, updates: Partial<MemoryItem>) => Promise<MemoryItem>;
  remove: (id: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}
```

**Example:**
```typescript
function CreateMemoryForm() {
  const { client } = useKuzuMemory();
  const { create, isLoading, error } = useMemoryMutation({ client });

  const handleSubmit = async (content: string) => {
    try {
      await create(content, {
        tags: ['user-input'],
        importance: 0.7
      });
      // Handle success
    } catch (err) {
      // Error already handled by hook
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      handleSubmit(formData.get('content'));
    }}>
      <textarea name="content" disabled={isLoading} />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Memory'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </form>
  );
}
```

## Storage Adapters

### StorageAdapter Interface

```typescript
interface StorageAdapter {
  init(): Promise<void>;
  get(id: string): Promise<MemoryItem | null>;
  getMany(ids: string[]): Promise<MemoryItem[]>;
  create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem>;
  update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem>;
  delete(id: string): Promise<void>;
  query(query: MemoryQuery): Promise<MemoryItem[]>;
  clear(): Promise<void>;
  getStats(): Promise<StorageStats>;
}
```

### Built-in Adapters

#### IndexedDBAdapter

Browser-based persistent storage with full-text search capabilities.

```typescript
const adapter = new IndexedDBAdapter('my-database', 1);
await adapter.init();
```

**Features:**
- Persistent storage
- Full-text search
- Multiple indexes for fast queries
- Transaction support
- Works offline

#### LocalStorageAdapter

Simple browser storage for small datasets.

```typescript
const adapter = new LocalStorageAdapter('my-memories');
await adapter.init();
```

**Features:**
- Simple key-value storage
- Synchronous operations
- Limited storage capacity
- No complex queries

#### MemoryAdapter

In-memory storage for testing and temporary data.

```typescript
const adapter = new MemoryAdapter();
await adapter.init();
```

**Features:**
- Ultra-fast operations
- No persistence
- Perfect for testing
- Memory-only storage

### Creating Custom Storage Adapters

```typescript
class CustomStorageAdapter implements StorageAdapter {
  async init(): Promise<void> {
    // Initialize your storage system
  }

  async get(id: string): Promise<MemoryItem | null> {
    // Retrieve memory by ID
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    // Create new memory with generated ID
    const memory: MemoryItem = {
      ...item,
      id: generateUUID()
    };
    // Store and return memory
    return memory;
  }

  // Implement other required methods...
}
```

## Recall Strategies

### RecallStrategy Interface

```typescript
interface RecallStrategy {
  name: string;
  recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]>;
  score(memory: MemoryItem, query: string): number;
}
```

### Built-in Strategies

#### CompositeStrategy (Default)

Combines multiple strategies with weighted scoring.

```typescript
const strategy = new CompositeStrategy([
  { strategy: new SimilarityStrategy(), weight: 0.4 },
  { strategy: new RecencyStrategy(), weight: 0.3 },
  { strategy: new ImportanceStrategy(), weight: 0.3 }
]);
```

#### SimilarityStrategy

Text similarity using TF-IDF and optional embeddings.

```typescript
const strategy = new SimilarityStrategy({
  embeddingFunction: async (text) => await getEmbedding(text)
});
```

#### RecencyStrategy

Prioritizes recently created or accessed memories.

```typescript
const strategy = new RecencyStrategy({
  decayRate: 0.1 // How fast recency importance decreases
});
```

#### ImportanceStrategy

Uses the memory's importance score for ranking.

```typescript
const strategy = new ImportanceStrategy();
```

#### FrequencyStrategy

Ranks by access frequency and usage patterns.

```typescript
const strategy = new FrequencyStrategy({
  boostFactor: 1.5 // Multiplier for frequently accessed memories
});
```

## NLP Classification

### MemoryClassifier

Automatic memory type classification using Natural Language Processing.

```typescript
class MemoryClassifier {
  constructor(config?: ClassifierConfig)

  async init(): Promise<void>
  async classify(content: string): Promise<ClassificationResult>
  async classifyBatch(contents: string[]): Promise<ClassificationResult[]>
  async addTrainingData(examples: TrainingExample[]): Promise<void>
  async getDetailedClassification(content: string): Promise<DetailedClassification>
  shouldAutoClassify(confidence: number): boolean
}
```

#### Configuration

```typescript
interface ClassifierConfig {
  autoClassify?: boolean;        // Default: true
  autoImportance?: boolean;      // Default: true
  confidenceThreshold?: number;  // Default: 0.6
  customTrainingData?: TrainingExample[];
}
```

#### Classification Result

```typescript
interface ClassificationResult {
  type: MemoryType;
  confidence: number;           // 0-1 confidence score
  importance?: number;          // 0-1 importance score
  keywords?: string[];          // Extracted keywords
  sentiment?: number;           // -1 to 1 sentiment score
}
```

**Example:**
```typescript
const classifier = new MemoryClassifier({
  autoClassify: true,
  confidenceThreshold: 0.7
});

await classifier.init();

const result = await classifier.classify('I went to the store yesterday');
// Result: { type: 'episodic', confidence: 0.89, importance: 0.6, ... }
```

## Types and Interfaces

### Core Types

#### MemoryItem

```typescript
interface MemoryItem {
  readonly id: string;              // UUID
  readonly type: MemoryType;        // Memory classification
  readonly content: string;         // Sanitized content
  readonly embedding?: number[];    // Optional embedding vector
  readonly metadata?: Record<string, any>; // Additional data
  readonly tags: string[];          // Associated tags
  readonly source?: string;         // Content source
  readonly timestamp: Date;         // Creation time
  readonly lastAccessed?: Date;     // Last access time
  readonly accessCount: number;     // Access frequency
  readonly importance: number;      // 0-1 importance score
  readonly decay: number;           // Decay rate
  readonly relations: MemoryRelation[]; // Connections to other memories
}
```

#### MemoryType

```typescript
type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'working' | 'sensory';
```

Memory type classification based on cognitive psychology:

- **episodic**: Personal experiences and events
- **semantic**: General knowledge and facts
- **procedural**: Skills and step-by-step instructions
- **working**: Current tasks and temporary information
- **sensory**: Sensory impressions and perceptions

#### MemoryQuery

```typescript
interface MemoryQuery {
  text?: string;                    // Query text
  type?: MemoryType;               // Filter by type
  tags?: string[];                 // Filter by tags
  dateRange?: {                    // Date range filter
    start: Date;
    end: Date;
  };
  limit?: number;                  // Max results (default: 10)
  offset?: number;                 // Pagination offset (default: 0)
  sortBy?: 'relevance' | 'timestamp' | 'importance' | 'accessCount';
  sortOrder?: 'asc' | 'desc';     // Default: 'desc'
}
```

#### MemoryRelation

```typescript
interface MemoryRelation {
  targetId: string;                // Related memory ID
  type: string;                    // Relationship type
  strength: number;                // 0-1 relationship strength
}
```

### Configuration Types

#### KuzuConfig

```typescript
interface KuzuConfig {
  storage: 'indexeddb' | 'memory' | 'localStorage';
  dbName: string;                  // Database name
  version: number;                 // Schema version
  autoSync: boolean;               // Auto-sync enabled
  syncInterval: number;            // Sync interval (ms)
  maxMemories: number;             // Memory limit
  decayEnabled: boolean;           // Decay process enabled
  decayInterval: number;           // Decay interval (ms)
  embeddingProvider?: (text: string) => Promise<number[]>;
  nlp?: {
    autoClassify: boolean;
    autoImportance: boolean;
    confidenceThreshold: number;
    customTrainingData?: TrainingExample[];
  };
}
```

### Event Types

#### MemoryEvent

```typescript
type MemoryEvent =
  | { type: 'memory:created'; memory: MemoryItem }
  | { type: 'memory:updated'; memory: MemoryItem; previous: MemoryItem }
  | { type: 'memory:deleted'; id: string }
  | { type: 'memory:accessed'; memory: MemoryItem }
  | { type: 'sync:started' }
  | { type: 'sync:completed'; count: number }
  | { type: 'sync:failed'; error: Error };
```

## Utilities

### Validation

```typescript
import { sanitizeMemoryContent, sanitizeMetadata } from 'kuzu-memory/utils';

const safeContent = sanitizeMemoryContent(userInput);
const safeMetadata = sanitizeMetadata(userMetadata);
```

### Decay Functions

```typescript
import { applyDecayToMemories, shouldForget } from 'kuzu-memory/utils';

const decayedMemories = applyDecayToMemories(memories);
const forgotten = memories.filter(shouldForget);
```

### Helpers

```typescript
import { generateMemoryId, formatTimestamp } from 'kuzu-memory/utils';

const id = generateMemoryId(); // UUID v4
const formatted = formatTimestamp(new Date());
```

## Error Handling

### Result Type

The library provides a Result type for safe error handling:

```typescript
import { Result } from 'kuzu-memory/types';

const result = await client.createSafe('content');
if (result.success) {
  console.log('Memory created:', result.data);
} else {
  console.error('Failed to create:', result.error);
}
```

### Error Types

```typescript
// Validation errors
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Storage errors
class StorageError extends Error {
  constructor(message: string, public operation: string) {
    super(message);
    this.name = 'StorageError';
  }
}

// Classification errors
class ClassificationError extends Error {
  constructor(message: string, public content?: string) {
    super(message);
    this.name = 'ClassificationError';
  }
}
```

## Configuration

### Default Configuration

```typescript
const defaultConfig: KuzuConfig = {
  storage: 'indexeddb',
  dbName: 'kuzu-memory',
  version: 1,
  autoSync: false,
  syncInterval: 60000,        // 1 minute
  maxMemories: 10000,
  decayEnabled: true,
  decayInterval: 86400000,    // 24 hours
  nlp: {
    autoClassify: true,
    autoImportance: true,
    confidenceThreshold: 0.6
  }
};
```

### Environment-Specific Configuration

```typescript
// Development
const devConfig: Partial<KuzuConfig> = {
  storage: 'memory',
  maxMemories: 1000,
  decayEnabled: false
};

// Production
const prodConfig: Partial<KuzuConfig> = {
  storage: 'indexeddb',
  dbName: 'app-memory-v1',
  maxMemories: 50000,
  decayEnabled: true,
  autoSync: true
};
```

## Examples

### Basic Usage

```typescript
import { createMemoryClient } from 'kuzu-memory';

async function basicExample() {
  // Create and initialize client
  const client = await createMemoryClient();

  // Create a memory
  const memory = await client.create('I learned about TypeScript today', {
    tags: ['learning', 'typescript'],
    importance: 0.8
  });

  // Query memories
  const memories = await client.recall('TypeScript learning');

  // Update a memory
  await client.update(memory.id, {
    importance: 0.9,
    tags: [...memory.tags, 'important']
  });

  // Get statistics
  const stats = await client.getStats();
  console.log(`Total memories: ${stats.totalItems}`);
}
```

### React Integration

```typescript
import { useKuzuMemory, useMemoryQuery } from 'kuzu-memory/hooks';

function MemoryApp() {
  const { client, isInitialized } = useKuzuMemory({
    storage: 'indexeddb',
    dbName: 'my-app-memory'
  });

  const { data: recentMemories } = useMemoryQuery({
    client,
    query: {
      sortBy: 'timestamp',
      limit: 5
    }
  });

  if (!isInitialized) {
    return <div>Initializing memory system...</div>;
  }

  return (
    <div>
      <h1>My Memories</h1>
      {recentMemories?.map(memory => (
        <div key={memory.id}>
          <p>{memory.content}</p>
          <small>
            Type: {memory.type}, Importance: {memory.importance}
          </small>
        </div>
      ))}
    </div>
  );
}
```

### Custom Storage Adapter

```typescript
import { StorageAdapter, MemoryItem, MemoryQuery } from 'kuzu-memory';

class FirebaseStorageAdapter implements StorageAdapter {
  constructor(private firestore: any) {}

  async init(): Promise<void> {
    // Initialize Firestore connection
  }

  async get(id: string): Promise<MemoryItem | null> {
    const doc = await this.firestore
      .collection('memories')
      .doc(id)
      .get();

    return doc.exists ? doc.data() : null;
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const docRef = await this.firestore
      .collection('memories')
      .add(item);

    return { ...item, id: docRef.id };
  }

  // Implement other methods...
}

// Usage
const adapter = new FirebaseStorageAdapter(firestore);
const client = new KuzuMemory({ customAdapter: adapter });
```

### Advanced Querying

```typescript
async function advancedQueries(client: KuzuMemory) {
  // Complex query with multiple filters
  const workMemories = await client.query({
    type: 'working',
    tags: ['urgent', 'todo'],
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date()
    },
    sortBy: 'importance',
    limit: 20
  });

  // Semantic recall with custom strategy
  const similarMemories = await client.recall('machine learning', {
    strategy: new SimilarityStrategy({
      embeddingFunction: openaiEmbedding
    }),
    limit: 10
  });

  // Pattern extraction
  const patterns = await client.extractPatterns(
    'Contact John at john@example.com or call (555) 123-4567'
  );
  // Returns: [{ pattern: 'email', value: 'john@example.com', ... }]
}
```

This API reference provides comprehensive documentation for all public interfaces in the Kuzu Memory library. For implementation details and examples, refer to the other documentation files in this developer guide.