# Storage Adapters Implementation Guide

This guide provides comprehensive information for implementing and customizing storage adapters in the Kuzu Memory TypeScript library. Storage adapters abstract the persistence layer and enable the library to work with different storage backends.

## Table of Contents

1. [Overview](#overview)
2. [Storage Adapter Interface](#storage-adapter-interface)
3. [Built-in Adapters](#built-in-adapters)
4. [Implementation Guide](#implementation-guide)
5. [Transaction Handling](#transaction-handling)
6. [Query Optimization](#query-optimization)
7. [Cross-Platform Storage Mapping](#cross-platform-storage-mapping)
8. [Testing Storage Adapters](#testing-storage-adapters)
9. [Performance Considerations](#performance-considerations)
10. [Custom Adapter Examples](#custom-adapter-examples)

## Overview

Storage adapters in Kuzu Memory follow the Repository pattern, providing a consistent interface for memory persistence regardless of the underlying storage technology. This abstraction enables:

- **Storage Backend Flexibility**: Switch between IndexedDB, localStorage, memory, or custom backends
- **Cross-Platform Portability**: Easy adaptation to different platforms (Node.js, mobile, etc.)
- **Testing Isolation**: Mock storage for unit testing
- **Performance Optimization**: Storage-specific optimizations behind a common interface

### Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   KuzuMemory    │    │   RecallEngine  │    │ PatternExtractor│
│   (Core API)    │    │   (Strategies)  │    │   (NLP/Text)    │
└─────────┬───────┘    └─────────────────┘    └─────────────────┘
          │
    ┌─────▼─────┐
    │ Storage   │
    │ Factory   │
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │ Storage   │ ◄── Implements StorageAdapter interface
    │ Adapter   │
    └─────┬─────┘
          │
┌─────────▼─────────┐
│  Storage Backend  │ ◄── IndexedDB, localStorage, Memory, etc.
│ (IndexedDB, etc.) │
└───────────────────┘
```

## Storage Adapter Interface

All storage adapters must implement the `StorageAdapter` interface:

```typescript
import { MemoryItem, MemoryType, MemoryQuery } from '../types';

export interface StorageAdapter {
  // Lifecycle management
  init(): Promise<void>;

  // Single item operations
  get(id: string): Promise<MemoryItem | null>;
  getMany(ids: string[]): Promise<MemoryItem[]>;
  create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem>;
  update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem>;
  delete(id: string): Promise<void>;

  // Batch operations
  query(query: MemoryQuery): Promise<MemoryItem[]>;
  clear(): Promise<void>;

  // Analytics
  getStats(): Promise<{
    totalItems: number;
    byType: Record<MemoryType, number>;
    avgAccessCount: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }>;
}
```

### Method Specifications

#### `init(): Promise<void>`
Initialize the storage backend. This method should:
- Establish connections to the storage system
- Create necessary tables/stores/collections
- Handle database migrations if needed
- Set up indexes for query optimization
- Throw an error if initialization fails

#### `get(id: string): Promise<MemoryItem | null>`
Retrieve a single memory by ID.
- **Parameters**: `id` - UUID string of the memory item
- **Returns**: Memory item if found, `null` if not found
- **Error Handling**: Throw on storage errors, return `null` for missing items

#### `getMany(ids: string[]): Promise<MemoryItem[]>`
Retrieve multiple memories by IDs (batch operation).
- **Parameters**: `ids` - Array of UUID strings
- **Returns**: Array of found memory items (may be fewer than requested)
- **Performance**: Should be optimized to minimize round trips

#### `create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem>`
Create a new memory item.
- **Parameters**: `item` - Memory data without ID (ID will be generated)
- **Returns**: Complete memory item with generated UUID
- **Side Effects**: Should generate UUID, set creation timestamp
- **Validation**: Ensure required fields are present

#### `update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem>`
Update an existing memory item.
- **Parameters**: `id` - UUID of item to update, `updates` - Partial data to merge
- **Returns**: Complete updated memory item
- **Error Handling**: Throw if item not found
- **Immutability**: Should preserve fields not included in updates

#### `delete(id: string): Promise<void>`
Delete a memory item.
- **Parameters**: `id` - UUID of item to delete
- **Returns**: Nothing (void)
- **Idempotency**: Should not error if item doesn't exist

#### `query(query: MemoryQuery): Promise<MemoryItem[]>`
Execute a complex query for memories.
- **Parameters**: `query` - Query object with filters, sorting, pagination
- **Returns**: Array of matching memory items
- **Performance**: Should leverage indexes and optimize for common patterns

#### `clear(): Promise<void>`
Delete all memory items.
- **Returns**: Nothing (void)
- **Use Cases**: Testing, data reset, cleanup
- **Confirmation**: Consider requiring confirmation in production use

#### `getStats(): Promise<StorageStats>`
Get analytics about stored memories.
- **Returns**: Statistics object with counts, averages, and date ranges
- **Performance**: Should be efficiently computed (consider caching)

## Built-in Adapters

### 1. IndexedDBAdapter (Primary)

The default adapter for browser applications, providing persistent storage with high performance.

```typescript
import { IndexedDBAdapter } from 'kuzu-memory/storage';

const adapter = new IndexedDBAdapter('my-app-memory', 1);
await adapter.init();
```

**Features**:
- Persistent storage across browser sessions
- Asynchronous operations (non-blocking)
- Structured data storage with indexes
- Transaction support
- Large storage capacity (typically 50MB+)

**Use Cases**:
- Production web applications
- Progressive Web Apps (PWAs)
- Applications requiring offline functionality

**Limitations**:
- Browser-only (not available in Node.js)
- Complex setup compared to localStorage
- Not available in private browsing mode in some browsers

### 2. LocalStorageAdapter

Synchronous adapter using browser's localStorage API.

```typescript
import { LocalStorageAdapter } from 'kuzu-memory/storage';

const adapter = new LocalStorageAdapter('kuzu-memory-data');
await adapter.init();
```

**Features**:
- Simple implementation
- Synchronous operations
- Persistent across sessions
- Wide browser support

**Use Cases**:
- Simple applications with small data sets
- Rapid prototyping
- Legacy browser support

**Limitations**:
- Limited storage capacity (typically 5-10MB)
- Synchronous operations can block UI
- Data stored as strings (serialization overhead)
- Not available in web workers

### 3. MemoryAdapter

In-memory storage for testing and temporary use.

```typescript
import { MemoryAdapter } from 'kuzu-memory/storage';

const adapter = new MemoryAdapter();
await adapter.init();
```

**Features**:
- Fastest performance (no I/O)
- No persistence
- Simple implementation
- Available in all environments

**Use Cases**:
- Unit testing
- Development and debugging
- Temporary data storage
- Server-side applications with session-based memory

**Limitations**:
- Data lost on page reload/process restart
- No persistence
- Memory usage grows with data size

## Implementation Guide

### Step 1: Create Adapter Class

```typescript
// src/storage/CustomAdapter.ts
import { StorageAdapter, MemoryItem, MemoryType, MemoryQuery } from '../types';
import { generateUUID, sanitizeMemoryContent } from '../utils';

export class CustomAdapter implements StorageAdapter {
  private initialized = false;
  private connection: any; // Your storage connection

  constructor(private config: CustomAdapterConfig) {}

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize your storage backend
      this.connection = await connectToStorage(this.config);
      await this.setupSchema();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize CustomAdapter: ${error.message}`);
    }
  }

  async get(id: string): Promise<MemoryItem | null> {
    this.ensureInitialized();

    try {
      const result = await this.connection.find({ _id: id });
      return result ? this.deserializeMemory(result) : null;
    } catch (error) {
      throw new Error(`Failed to get memory ${id}: ${error.message}`);
    }
  }

  // ... implement other methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Adapter not initialized. Call init() first.');
    }
  }

  private serializeMemory(memory: MemoryItem): any {
    return {
      _id: memory.id,
      type: memory.type,
      content: memory.content,
      timestamp: memory.timestamp.toISOString(),
      // ... other fields
    };
  }

  private deserializeMemory(data: any): MemoryItem {
    return {
      id: data._id,
      type: data.type as MemoryType,
      content: data.content,
      timestamp: new Date(data.timestamp),
      // ... other fields with defaults
    };
  }
}
```

### Step 2: Register with Factory

```typescript
// src/storage/factory.ts
import { CustomAdapter } from './CustomAdapter';

export type StorageType = 'indexeddb' | 'memory' | 'localStorage' | 'custom';

export function createStorageAdapter(options: StorageOptions): StorageAdapter {
  switch (options.type) {
    case 'custom':
      return new CustomAdapter(options.customConfig);
    // ... other cases
    default:
      throw new Error(`Unknown storage type: ${options.type}`);
  }
}
```

### Step 3: Add Type Definitions

```typescript
// src/types/index.ts
export interface CustomAdapterConfig {
  connectionString: string;
  database: string;
  collection: string;
  options?: Record<string, any>;
}

export interface StorageOptions {
  type: StorageType;
  customConfig?: CustomAdapterConfig;
  // ... other options
}
```

## Transaction Handling

Storage adapters should implement transaction patterns for data consistency:

### Atomic Operations

```typescript
export class TransactionalAdapter implements StorageAdapter {
  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const transaction = await this.beginTransaction();

    try {
      // Read current state
      const current = await this.get(id);
      if (!current) {
        throw new Error(`Memory item ${id} not found`);
      }

      // Apply updates
      const updated = { ...current, ...updates, id: current.id };

      // Validate updated item
      const validated = MemoryItemSchema.parse(updated);

      // Write to storage
      await this.writeInTransaction(transaction, validated);

      // Commit transaction
      await transaction.commit();

      return validated;
    } catch (error) {
      // Rollback on error
      await transaction.rollback();
      throw error;
    }
  }
}
```

### Batch Operations

```typescript
async createMany(items: Omit<MemoryItem, 'id'>[]): Promise<MemoryItem[]> {
  const transaction = await this.beginTransaction();
  const results: MemoryItem[] = [];

  try {
    for (const item of items) {
      const withId = { ...item, id: generateUUID() };
      const validated = MemoryItemSchema.parse(withId);
      await this.writeInTransaction(transaction, validated);
      results.push(validated);
    }

    await transaction.commit();
    return results;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

## Query Optimization

### Indexing Strategy

```typescript
async setupSchema(): Promise<void> {
  // Primary index on ID (usually automatic)
  await this.createIndex('id', { unique: true });

  // Compound index for common queries
  await this.createIndex(['type', 'timestamp'], { name: 'type_timestamp' });

  // Full-text search index
  await this.createIndex('content', { type: 'text', name: 'content_search' });

  // Range queries on importance
  await this.createIndex('importance', { name: 'importance_range' });

  // Sparse index for optional fields
  await this.createIndex('tags', { sparse: true, name: 'tags_array' });
}
```

### Query Translation

```typescript
async query(query: MemoryQuery): Promise<MemoryItem[]> {
  const filter = this.buildFilter(query);
  const sort = this.buildSort(query);
  const limit = query.limit || 100;
  const offset = query.offset || 0;

  // Use appropriate indexes
  const result = await this.connection
    .find(filter)
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .execute();

  return result.map(item => this.deserializeMemory(item));
}

private buildFilter(query: MemoryQuery): any {
  const filter: any = {};

  // Type filtering
  if (query.types?.length) {
    filter.type = { $in: query.types };
  }

  // Date range filtering
  if (query.dateRange) {
    filter.timestamp = {
      $gte: query.dateRange.start.toISOString(),
      $lte: query.dateRange.end.toISOString(),
    };
  }

  // Importance filtering
  if (query.minImportance !== undefined) {
    filter.importance = { $gte: query.minImportance };
  }

  // Text search
  if (query.searchText) {
    filter.$text = { $search: query.searchText };
  }

  // Tag filtering
  if (query.tags?.length) {
    filter.tags = { $in: query.tags };
  }

  return filter;
}
```

## Cross-Platform Storage Mapping

### Storage Backend Equivalents

| TypeScript | Python | Java | C# |
|------------|--------|------|----|
| IndexedDB | SQLite + asyncio | H2/SQLite | SQLite/Entity Framework |
| localStorage | pickle/shelve | Properties/Preferences | Registry/Settings |
| Memory | dict/OrderedDict | HashMap/ConcurrentHashMap | Dictionary/ConcurrentDictionary |

### Data Mapping Patterns

```typescript
// TypeScript: Memory item structure
interface MemoryItem {
  id: string;           // UUID
  type: MemoryType;     // Enum as string
  content: string;      // UTF-8 text
  timestamp: Date;      // ISO 8601
  importance: number;   // 0-1 range
  relations: Relation[]; // Array of objects
}
```

**Python Equivalent**:
```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from uuid import UUID

@dataclass
class MemoryItem:
    id: UUID
    type: str  # MemoryType enum
    content: str
    timestamp: datetime
    importance: float  # 0.0-1.0
    relations: List['Relation']
```

**SQL Schema**:
```sql
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    importance DECIMAL(3,2) CHECK (importance >= 0 AND importance <= 1),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memories_type_timestamp ON memories (type, timestamp);
CREATE INDEX idx_memories_importance ON memories (importance);
CREATE INDEX idx_memories_content_search ON memories USING gin(to_tsvector('english', content));
```

### Configuration Translation

```typescript
// TypeScript configuration
interface StorageConfig {
  type: 'indexeddb' | 'localStorage' | 'memory';
  dbName: string;
  version: number;
}
```

**Python Configuration**:
```python
from dataclasses import dataclass
from typing import Literal

@dataclass
class StorageConfig:
    type: Literal['sqlite', 'postgresql', 'memory']
    database_url: str
    pool_size: int = 5
```

**Java Configuration**:
```java
public class StorageConfig {
    public enum Type { H2, SQLITE, POSTGRESQL, MEMORY }

    private Type type;
    private String connectionUrl;
    private int maxPoolSize;
    // ... constructors and getters
}
```

## Testing Storage Adapters

### Unit Test Structure

```typescript
// tests/storage/AdapterTest.ts
import { CustomAdapter } from '../../src/storage/CustomAdapter';
import { MemoryItem, MemoryType } from '../../src/types';
import { generateTestMemory } from '../fixtures';

describe('CustomAdapter', () => {
  let adapter: CustomAdapter;

  beforeEach(async () => {
    adapter = new CustomAdapter({ /* test config */ });
    await adapter.init();
  });

  afterEach(async () => {
    await adapter.clear();
  });

  describe('CRUD operations', () => {
    test('should create and retrieve memory', async () => {
      const memory = generateTestMemory();
      const created = await adapter.create(memory);

      expect(created.id).toBeDefined();
      expect(created.content).toBe(memory.content);

      const retrieved = await adapter.get(created.id);
      expect(retrieved).toEqual(created);
    });

    test('should update existing memory', async () => {
      const memory = await adapter.create(generateTestMemory());
      const updates = { importance: 0.8 };

      const updated = await adapter.update(memory.id, updates);

      expect(updated.importance).toBe(0.8);
      expect(updated.content).toBe(memory.content); // Unchanged
    });

    test('should delete memory', async () => {
      const memory = await adapter.create(generateTestMemory());

      await adapter.delete(memory.id);

      const retrieved = await adapter.get(memory.id);
      expect(retrieved).toBeNull();
    });

    test('should return null for non-existent memory', async () => {
      const result = await adapter.get('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('querying', () => {
    beforeEach(async () => {
      // Create test data
      await Promise.all([
        adapter.create(generateTestMemory({ type: 'episodic', importance: 0.8 })),
        adapter.create(generateTestMemory({ type: 'semantic', importance: 0.6 })),
        adapter.create(generateTestMemory({ type: 'episodic', importance: 0.4 })),
      ]);
    });

    test('should filter by type', async () => {
      const results = await adapter.query({ types: ['episodic'] });

      expect(results).toHaveLength(2);
      results.forEach(memory => {
        expect(memory.type).toBe('episodic');
      });
    });

    test('should filter by importance threshold', async () => {
      const results = await adapter.query({ minImportance: 0.7 });

      expect(results).toHaveLength(1);
      expect(results[0].importance).toBeGreaterThanOrEqual(0.7);
    });

    test('should sort by timestamp descending by default', async () => {
      const results = await adapter.query({});

      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].timestamp.getTime()).toBeGreaterThanOrEqual(
          results[i].timestamp.getTime()
        );
      }
    });

    test('should paginate results', async () => {
      const page1 = await adapter.query({ limit: 2, offset: 0 });
      const page2 = await adapter.query({ limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);

      // No overlap
      const page1Ids = page1.map(m => m.id);
      const page2Ids = page2.map(m => m.id);
      expect(page1Ids.filter(id => page2Ids.includes(id))).toHaveLength(0);
    });
  });

  describe('statistics', () => {
    test('should return accurate statistics', async () => {
      const memories = [
        generateTestMemory({ type: 'episodic', accessCount: 5 }),
        generateTestMemory({ type: 'semantic', accessCount: 3 }),
        generateTestMemory({ type: 'episodic', accessCount: 1 }),
      ];

      await Promise.all(memories.map(m => adapter.create(m)));

      const stats = await adapter.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.byType.episodic).toBe(2);
      expect(stats.byType.semantic).toBe(1);
      expect(stats.avgAccessCount).toBe(3); // (5+3+1)/3
    });
  });

  describe('error handling', () => {
    test('should throw on update of non-existent memory', async () => {
      await expect(
        adapter.update('non-existent-id', { importance: 0.5 })
      ).rejects.toThrow('not found');
    });

    test('should handle invalid data gracefully', async () => {
      const invalidMemory = { content: '', type: 'invalid' };

      await expect(
        adapter.create(invalidMemory as any)
      ).rejects.toThrow();
    });
  });
});
```

### Integration Testing

```typescript
// tests/integration/StorageIntegration.test.ts
import { createMemoryClient } from '../../src';
import { StorageType } from '../../src/storage/factory';

const storageTypes: StorageType[] = ['memory', 'indexeddb', 'localStorage'];

describe('Storage Integration', () => {
  storageTypes.forEach(storageType => {
    describe(`with ${storageType} adapter`, () => {
      test('should maintain data consistency across operations', async () => {
        const client = createMemoryClient({ storage: storageType });
        await client.init();

        // Test complete workflow
        const memory1 = await client.create('First memory');
        const memory2 = await client.create('Second memory');

        const recalled = await client.recall('memory');
        expect(recalled).toHaveLength(2);

        await client.update(memory1.id, { importance: 0.9 });

        const updatedRecall = await client.recall('', { minImportance: 0.8 });
        expect(updatedRecall).toHaveLength(1);
        expect(updatedRecall[0].id).toBe(memory1.id);

        await client.destroy();
      });
    });
  });
});
```

## Performance Considerations

### Benchmarking

```typescript
// tests/performance/StorageBenchmark.ts
import { performance } from 'perf_hooks';

export async function benchmarkAdapter(adapter: StorageAdapter) {
  const results = {
    create: [],
    read: [],
    update: [],
    query: [],
    delete: []
  };

  // Benchmark creation
  const memories = [];
  const createStart = performance.now();

  for (let i = 0; i < 1000; i++) {
    const memory = await adapter.create(generateTestMemory());
    memories.push(memory);
  }

  results.create.push(performance.now() - createStart);

  // Benchmark reads
  const readStart = performance.now();

  for (const memory of memories.slice(0, 100)) {
    await adapter.get(memory.id);
  }

  results.read.push(performance.now() - readStart);

  // More benchmarks...

  return results;
}
```

### Optimization Tips

1. **Batch Operations**: Implement batch methods for better performance
2. **Connection Pooling**: Reuse connections when possible
3. **Lazy Loading**: Load data on-demand
4. **Caching**: Implement in-memory caching for frequently accessed data
5. **Indexing**: Create appropriate indexes for query patterns
6. **Compression**: Compress large content fields
7. **Pagination**: Implement cursor-based pagination for large result sets

### Memory Management

```typescript
export class OptimizedAdapter implements StorageAdapter {
  private cache = new Map<string, MemoryItem>();
  private readonly maxCacheSize = 1000;

  async get(id: string): Promise<MemoryItem | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Load from storage
    const memory = await this.loadFromStorage(id);

    if (memory) {
      this.addToCache(id, memory);
    }

    return memory;
  }

  private addToCache(id: string, memory: MemoryItem): void {
    // Implement LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(id, memory);
  }
}
```

## Custom Adapter Examples

### Redis Adapter

```typescript
import Redis from 'ioredis';
import { StorageAdapter, MemoryItem } from '../types';

export class RedisAdapter implements StorageAdapter {
  private redis: Redis;

  constructor(private config: { host: string; port: number; db?: number }) {}

  async init(): Promise<void> {
    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      db: this.config.db || 0,
    });
  }

  async get(id: string): Promise<MemoryItem | null> {
    const data = await this.redis.get(`memory:${id}`);
    return data ? JSON.parse(data) : null;
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const memory = { ...item, id: generateUUID() };
    await this.redis.setex(
      `memory:${memory.id}`,
      3600, // 1 hour TTL
      JSON.stringify(memory)
    );
    return memory;
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    // Use Redis sets/sorted sets for efficient querying
    const keys = await this.redis.keys('memory:*');
    const pipeline = this.redis.pipeline();

    keys.forEach(key => pipeline.get(key));

    const results = await pipeline.exec();
    const memories = results
      .filter(([err, data]) => !err && data)
      .map(([, data]) => JSON.parse(data as string))
      .filter(memory => this.matchesQuery(memory, query));

    return memories;
  }

  // ... other methods
}
```

### MongoDB Adapter

```typescript
import { MongoClient, Db, Collection } from 'mongodb';
import { StorageAdapter, MemoryItem } from '../types';

export class MongoAdapter implements StorageAdapter {
  private db: Db;
  private collection: Collection<MemoryItem>;

  constructor(private connectionString: string, private dbName: string) {}

  async init(): Promise<void> {
    const client = new MongoClient(this.connectionString);
    await client.connect();

    this.db = client.db(this.dbName);
    this.collection = this.db.collection<MemoryItem>('memories');

    // Create indexes
    await this.collection.createIndex({ type: 1, timestamp: -1 });
    await this.collection.createIndex({ importance: -1 });
    await this.collection.createIndex({ 'content': 'text' });
  }

  async get(id: string): Promise<MemoryItem | null> {
    return await this.collection.findOne({ id });
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const memory = { ...item, id: generateUUID() };
    await this.collection.insertOne(memory);
    return memory;
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    const filter: any = {};

    if (query.types?.length) {
      filter.type = { $in: query.types };
    }

    if (query.minImportance) {
      filter.importance = { $gte: query.minImportance };
    }

    if (query.searchText) {
      filter.$text = { $search: query.searchText };
    }

    return await this.collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(query.limit || 100)
      .skip(query.offset || 0)
      .toArray();
  }

  // ... other methods
}
```

### File System Adapter (Node.js)

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import { StorageAdapter, MemoryItem } from '../types';

export class FileSystemAdapter implements StorageAdapter {
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = path.resolve(dataDir);
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  async get(id: string): Promise<MemoryItem | null> {
    try {
      const filePath = this.getFilePath(id);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const memory = { ...item, id: generateUUID() };
    const filePath = this.getFilePath(memory.id);
    await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
    return memory;
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    const files = await fs.readdir(this.dataDir);
    const memories: MemoryItem[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const data = await fs.readFile(path.join(this.dataDir, file), 'utf8');
        const memory = JSON.parse(data);

        if (this.matchesQuery(memory, query)) {
          memories.push(memory);
        }
      } catch (error) {
        console.warn(`Failed to read ${file}:`, error.message);
      }
    }

    return memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private getFilePath(id: string): string {
    return path.join(this.dataDir, `${id}.json`);
  }

  private matchesQuery(memory: MemoryItem, query: MemoryQuery): boolean {
    if (query.types?.length && !query.types.includes(memory.type)) {
      return false;
    }

    if (query.minImportance && memory.importance < query.minImportance) {
      return false;
    }

    // More filter logic...

    return true;
  }

  // ... other methods
}
```

---

This comprehensive guide covers all aspects of implementing and customizing storage adapters in the Kuzu Memory library. The modular design allows for easy extension and platform adaptation while maintaining consistent behavior across different storage backends.