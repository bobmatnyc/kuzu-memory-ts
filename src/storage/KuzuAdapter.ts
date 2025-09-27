import type { StorageAdapter, MemoryItem, MemoryQuery, MemoryType } from '../types';

// Dynamic imports for Node.js modules
let Database: any;
let Connection: any;
let fs: any;
let path: any;
let os: any;
let uuidv4: any;

// Singleton database instance to avoid lock conflicts
let sharedDb: any = null;
let sharedConnection: any = null;

// Queue system for serializing database operations
interface QueuedOperation<T = any> {
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

class DatabaseQueue {
  private queue: QueuedOperation[] = [];
  private processing = false;
  private readonly maxConcurrency: number;
  private activeOperations = 0;
  private readonly retryAttempts = 3;
  private readonly backoffMultiplier = 2;

  constructor(maxConcurrency: number = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || this.activeOperations >= this.maxConcurrency) {
      return;
    }

    this.processing = true;

    // Process operations with controlled concurrency
    while (this.queue.length > 0 && this.activeOperations < this.maxConcurrency) {
      const queueItem = this.queue.shift()!;
      this.executeWithRetry(queueItem);
    }

    this.processing = false;
  }

  private async executeWithRetry<T>(queueItem: QueuedOperation<T>, attempt: number = 1): Promise<void> {
    this.activeOperations++;

    try {
      const result = await queueItem.operation();
      queueItem.resolve(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Check if this is a retryable error
      const isRetryable = err.message.includes('Could not set lock on file') ||
                         err.message.includes('lock') ||
                         err.message.includes('busy');

      if (isRetryable && attempt < this.retryAttempts) {
        // Exponential backoff
        const delay = Math.min(100 * Math.pow(this.backoffMultiplier, attempt - 1), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry the operation
        this.executeWithRetry(queueItem, attempt + 1);
        return;
      }

      console.error(`KuzuAdapter operation failed after ${attempt} attempts:`, err.message);
      queueItem.reject(err);
    } finally {
      this.activeOperations--;
      // Continue processing queue if there are more items
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  // Clear the queue (useful for cleanup)
  clear(): void {
    this.queue.forEach(({ reject }) => {
      reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.processing = false;
  }

  // Get queue status for debugging
  getStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      processing: this.processing
    };
  }
}

// Singleton queue instance with optimized concurrency
let sharedQueue: DatabaseQueue | null = null;

// Only load Node.js dependencies if we're in Node environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    const kuzu = require('kuzu');
    Database = kuzu.Database;
    Connection = kuzu.Connection;
    fs = require('fs');
    path = require('path');
    os = require('os');
    const uuid = require('uuid');
    uuidv4 = uuid.v4;
  } catch (error) {
    console.warn('Kùzu dependencies not available. KuzuAdapter will not work.');
  }
}

export class KuzuAdapter implements StorageAdapter {
  private db: any = null;
  private connection: any = null;
  private readonly dbPath: string;
  private initialized = false;

  constructor(dbPath?: string) {
    if (path && os) {
      this.dbPath = dbPath || path.join(os.homedir(), '.kuzu-memory-ts', 'memories.db');
    } else {
      this.dbPath = dbPath || '.kuzu-memory-ts/memories.db';
    }
  }

  /**
   * Wraps database operations in the queue to prevent concurrent access issues
   * Now with optimized concurrency and retry logic
   */
  private async queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (!sharedQueue) {
      // Allow limited concurrency for read operations while maintaining safety
      sharedQueue = new DatabaseQueue(2);
    }
    return sharedQueue.enqueue(operation);
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    return this.queueOperation(async () => {
      if (this.initialized) return;

      if (!Database || !Connection || !fs || !path) {
        throw new Error('KuzuAdapter is only available in Node.js environments');
      }

      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Use singleton database instance to avoid lock conflicts
      if (!sharedDb) {
        sharedDb = new Database(this.dbPath);
        sharedConnection = new Connection(sharedDb);
      }

      this.db = sharedDb;
      this.connection = sharedConnection;

      // Create schema for memories and relations
      await this.createSchema();
      this.initialized = true;
    });
  }

  private async createSchema(): Promise<void> {
    if (!this.connection) throw new Error('Database not initialized');

    try {
      // Create Memory node table
      const createMemoryTableStmt = await this.connection.prepare(`
        CREATE NODE TABLE Memory (
          id STRING PRIMARY KEY,
          type STRING,
          content STRING,
          embedding DOUBLE[],
          tags STRING[],
          source STRING,
          timestamp STRING,
          lastAccessed STRING,
          accessCount INT64,
          importance DOUBLE,
          decay DOUBLE,
          metadata STRING
        )
      `);
      await this.connection.execute(createMemoryTableStmt);
    } catch (error: any) {
      // Table might already exist, which is fine
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }

    try {
      // Create Relation edge table
      const createRelationTableStmt = await this.connection.prepare(`
        CREATE REL TABLE Related (
          FROM Memory TO Memory,
          type STRING,
          strength DOUBLE
        )
      `);
      await this.connection.execute(createRelationTableStmt);
    } catch (error: any) {
      // Table might already exist, which is fine
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }

    // Note: Kùzu automatically creates indexes on PRIMARY KEY columns
    // Additional indexes are not supported with CREATE INDEX syntax
  }

  async get(id: string): Promise<MemoryItem | null> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      const getStmt = await this.connection.prepare(
        `MATCH (m:Memory {id: $id})
         OPTIONAL MATCH (m)-[r:Related]->(related:Memory)
         RETURN m, COLLECT({targetId: related.id, type: r.type, strength: r.strength}) AS relations`
      );
      const result = await this.connection.execute(getStmt, { id });

      const rows = await result.getAll();
      if (rows.length === 0) return null;

      const row = rows[0];

      // Kùzu returns results as objects with named properties, not arrays
      const memory = row.m as any;
      const relations = row.relations as any[];

      // Update access count and last accessed
      const updateStmt = await this.connection.prepare(
        `MATCH (m:Memory {id: $id})
         SET m.accessCount = m.accessCount + 1,
             m.lastAccessed = $now`
      );
      await this.connection.execute(updateStmt, { id, now: new Date().toISOString() });

      return this.rowToMemoryItem(memory, relations);
    });
  }

  async getMany(ids: string[]): Promise<MemoryItem[]> {
    if (!ids.length) return [];

    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      // Batch process large ID lists to avoid query size limits
      const batchSize = 100;
      const results: MemoryItem[] = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);

        const stmt = await this.connection.prepare(
          `UNWIND $ids AS id
           MATCH (m:Memory {id: id})
           OPTIONAL MATCH (m)-[r:Related]->(related:Memory)
           RETURN m, COLLECT({targetId: related.id, type: r.type, strength: r.strength}) AS relations`
        );
        const result = await this.connection.execute(stmt, { ids: batch });

        const rows = await result.getAll();
        const batchResults = rows.map((row: any) => this.rowToMemoryItem(row.m as any, row.relations as any[]));
        results.push(...batchResults);
      }

      return results;
    });
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      const id = uuidv4();
      const memory: MemoryItem = { ...item, id };

      // Insert memory node
      const createStmt = await this.connection.prepare(
        `CREATE (m:Memory {
          id: $id,
          type: $type,
          content: $content,
          embedding: $embedding,
          tags: $tags,
          source: $source,
          timestamp: $timestamp,
          lastAccessed: $lastAccessed,
          accessCount: $accessCount,
          importance: $importance,
          decay: $decay,
          metadata: $metadata
        })`
      );

      await this.connection.execute(createStmt, {
        id: memory.id,
        type: memory.type,
        content: memory.content,
        embedding: memory.embedding || [],
        tags: memory.tags || [],
        source: memory.source || null,
        timestamp: memory.timestamp.toISOString(),
        lastAccessed: memory.lastAccessed?.toISOString() || null,
        accessCount: memory.accessCount,
        importance: memory.importance,
        decay: memory.decay,
        metadata: JSON.stringify(memory.metadata || {})
      });

      // Create relations if any
      if (memory.relations && memory.relations.length > 0) {
        const relationStmt = await this.connection.prepare(
          `MATCH (from:Memory {id: $fromId}), (to:Memory {id: $toId})
           CREATE (from)-[:Related {type: $type, strength: $strength}]->(to)`
        );

        for (const relation of memory.relations) {
          await this.connection.execute(relationStmt, {
            fromId: id,
            toId: relation.targetId,
            type: relation.type,
            strength: relation.strength
          });
        }
      }

      return memory;
    });
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      // Get existing memory without going through queue (already in queue)
      const getStmt = await this.connection.prepare(
        `MATCH (m:Memory {id: $id})
         OPTIONAL MATCH (m)-[r:Related]->(related:Memory)
         RETURN m, COLLECT({targetId: related.id, type: r.type, strength: r.strength}) AS relations`
      );
      const result = await this.connection.execute(getStmt, { id });
      const rows = await result.getAll();
      if (rows.length === 0) throw new Error(`Memory with id ${id} not found`);

      const existing = this.rowToMemoryItem(rows[0].m as any, rows[0].relations as any[]);
      const updated = { ...existing, ...updates };

      // Update memory node
      const setClause: string[] = [];
      const params: Record<string, any> = { id };

      if (updates.content !== undefined) {
        setClause.push('m.content = $content');
        params.content = updates.content;
      }
      if (updates.importance !== undefined) {
        setClause.push('m.importance = $importance');
        params.importance = updates.importance;
      }
      if (updates.metadata !== undefined) {
        setClause.push('m.metadata = $metadata');
        params.metadata = JSON.stringify(updates.metadata);
      }
      if (updates.tags !== undefined) {
        setClause.push('m.tags = $tags');
        params.tags = updates.tags;
      }
      if (updates.decay !== undefined) {
        setClause.push('m.decay = $decay');
        params.decay = updates.decay;
      }

      if (setClause.length > 0) {
        const updateStmt = await this.connection.prepare(
          `MATCH (m:Memory {id: $id})
           SET ${setClause.join(', ')}`
        );
        await this.connection.execute(updateStmt, params);
      }

      // Update relations if provided
      if (updates.relations !== undefined) {
        // Delete existing relations
        const deleteRelStmt = await this.connection.prepare(
          `MATCH (m:Memory {id: $id})-[r:Related]->()
           DELETE r`
        );
        await this.connection.execute(deleteRelStmt, { id });

        // Create new relations
        const createRelStmt = await this.connection.prepare(
          `MATCH (from:Memory {id: $fromId}), (to:Memory {id: $toId})
           CREATE (from)-[:Related {type: $type, strength: $strength}]->(to)`
        );

        for (const relation of updates.relations) {
          await this.connection.execute(createRelStmt, {
            fromId: id,
            toId: relation.targetId,
            type: relation.type,
            strength: relation.strength
          });
        }
      }

      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      // Delete all relations first
      const deleteOutgoingStmt = await this.connection.prepare(
        `MATCH (m:Memory {id: $id})-[r]->()
         DELETE r`
      );
      await this.connection.execute(deleteOutgoingStmt, { id });

      const deleteIncomingStmt = await this.connection.prepare(
        `MATCH ()-[r]->(m:Memory {id: $id})
         DELETE r`
      );
      await this.connection.execute(deleteIncomingStmt, { id });

      // Delete the memory node
      const deleteNodeStmt = await this.connection.prepare(
        `MATCH (m:Memory {id: $id})
         DELETE m`
      );
      await this.connection.execute(deleteNodeStmt, { id });
    });
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      // Build optimized query with proper indexing hints
      let cypherQuery = 'MATCH (m:Memory)';
      const whereClause: string[] = [];
      const params: Record<string, any> = {};

      // Add type filter with index hint
      if (query.type) {
        whereClause.push('m.type = $type');
        params.type = query.type;
      }

      // Optimize text search with better indexing
      if (query.text) {
        // Use fulltext search if available, fallback to CONTAINS
        whereClause.push('LOWER(m.content) CONTAINS LOWER($text)');
        params.text = query.text;
      }

      // Optimize tag filter with ANY clause
      if (query.tags && query.tags.length > 0) {
        whereClause.push('ANY(tag IN $tags WHERE tag IN m.tags)');
        params.tags = query.tags;
      }

      // Add date range filter with proper date comparison
      if (query.dateRange) {
        whereClause.push('m.timestamp >= $startDate AND m.timestamp <= $endDate');
        params.startDate = query.dateRange.start.toISOString();
        params.endDate = query.dateRange.end.toISOString();
      }

      if (whereClause.length > 0) {
        cypherQuery += ' WHERE ' + whereClause.join(' AND ');
      }

      // Optimize relations query - only fetch if needed
      const needsRelations = true; // Could be made configurable
      if (needsRelations) {
        cypherQuery += ' OPTIONAL MATCH (m)-[r:Related]->(related:Memory)';
        cypherQuery += ' WITH m, COLLECT({targetId: related.id, type: r.type, strength: r.strength}) AS relations';
      } else {
        cypherQuery += ' WITH m, [] AS relations';
      }

      // Add sorting with proper field mapping
      const sortField = this.mapSortField(query.sortBy);
      cypherQuery += ` ORDER BY m.${sortField} ${query.sortOrder.toUpperCase()}`;

      // Add pagination with bounds checking
      const safeOffset = Math.max(0, query.offset || 0);
      const safeLimit = Math.min(Math.max(1, query.limit || 10), 1000); // Max 1000 results
      cypherQuery += ` SKIP $offset LIMIT $limit`;
      params.offset = safeOffset;
      params.limit = safeLimit;

      cypherQuery += ' RETURN m, relations';

      const stmt = await this.connection.prepare(cypherQuery);
      const result = await this.connection.execute(stmt, params);
      const rows = await result.getAll();

      return rows.map((row: any) => this.rowToMemoryItem(row.m as any, row.relations as any[]));
    });
  }

  async clear(): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      // Delete all relations
      const deleteRelStmt = await this.connection.prepare('MATCH ()-[r:Related]->() DELETE r');
      await this.connection.execute(deleteRelStmt);

      // Delete all memory nodes
      const deleteMemStmt = await this.connection.prepare('MATCH (m:Memory) DELETE m');
      await this.connection.execute(deleteMemStmt);
    });
  }

  async getStats(): Promise<{
    totalItems: number;
    byType: Record<MemoryType, number>;
    avgAccessCount: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      // Get total count and type distribution
      const countStmt = await this.connection.prepare(
        `MATCH (m:Memory)
         RETURN m.type as type, COUNT(*) as typeCount`
      );
      const countResult = await this.connection.execute(countStmt);

      const countRows = await countResult.getAll();
      const byType: Record<string, number> = {};
      let totalItems = 0;

      for (const row of countRows) {
        const type = row.type as string;
        const count = row.typeCount as number;
        byType[type] = count;
        totalItems += count;
      }

      // Get average access count
      const avgStmt = await this.connection.prepare(
        `MATCH (m:Memory)
         RETURN AVG(m.accessCount) as avgAccess`
      );
      const avgResult = await this.connection.execute(avgStmt);
      const avgRows = await avgResult.getAll();
      const avgAccessCount = avgRows.length > 0 ? (avgRows[0].avgAccess as number) || 0 : 0;

      // Get oldest and newest items
      const timeStmt = await this.connection.prepare(
        `MATCH (m:Memory)
         RETURN MIN(m.timestamp) as oldest,
                MAX(m.timestamp) as newest`
      );
      const timeResult = await this.connection.execute(timeStmt);
      const timeRows = await timeResult.getAll();
      const oldestItem = timeRows.length > 0 && timeRows[0].oldest ? new Date(timeRows[0].oldest as string) : null;
      const newestItem = timeRows.length > 0 && timeRows[0].newest ? new Date(timeRows[0].newest as string) : null;

      return {
        totalItems,
        byType: byType as Record<MemoryType, number>,
        avgAccessCount,
        oldestItem,
        newestItem
      };
    });
  }

  // Helper methods
  private rowToMemoryItem(memoryNode: any, relations: any[]): MemoryItem {
    // Validate that we have a valid node object
    if (!memoryNode || typeof memoryNode !== 'object') {
      console.error('Invalid node structure received:', memoryNode);
      throw new Error('Invalid memory node data received from database');
    }

    // Kùzu returns node objects directly with properties
    const node = memoryNode;

    // Ensure required fields exist
    if (!node.id || !node.type || !node.content) {
      console.error('Missing required fields in node data:', node);
      throw new Error('Memory node missing required fields (id, type, content)');
    }

    return {
      id: node.id,
      type: node.type,
      content: node.content,
      embedding: node.embedding?.length > 0 ? node.embedding : undefined,
      metadata: node.metadata ? JSON.parse(node.metadata) : undefined,
      tags: node.tags || [],
      source: node.source || undefined,
      timestamp: new Date(node.timestamp),
      lastAccessed: node.lastAccessed ? new Date(node.lastAccessed) : undefined,
      accessCount: node.accessCount || 0,
      importance: node.importance || 0,
      decay: node.decay || 0,
      relations: relations ? relations.filter(r => r && r.targetId !== null) : []
    };
  }

  private mapSortField(sortBy: MemoryQuery['sortBy']): string {
    switch (sortBy) {
      case 'relevance':
        return 'importance';
      case 'timestamp':
        return 'timestamp';
      case 'importance':
        return 'importance';
      case 'accessCount':
        return 'accessCount';
      default:
        return 'timestamp';
    }
  }

  // Graph-specific operations
  async findConnectedMemories(id: string, depth: number = 2): Promise<MemoryItem[]> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      const stmt = await this.connection.prepare(
        `MATCH (start:Memory {id: $id})-[:Related*1..${depth}]-(connected:Memory)
         OPTIONAL MATCH (connected)-[r:Related]->(related:Memory)
         RETURN DISTINCT connected, COLLECT({targetId: related.id, type: r.type, strength: r.strength}) AS relations`
      );
      const result = await this.connection.execute(stmt, { id });

      const rows = await result.getAll();
      return rows.map((row: any) => this.rowToMemoryItem(row.connected as any, row.relations as any[]));
    });
  }

  async findShortestPath(fromId: string, toId: string): Promise<MemoryItem[]> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      try {
        // Simple implementation: just find any connected path up to depth 3
        const stmt = await this.connection.prepare(
          `MATCH (from:Memory {id: $fromId})-[:Related*1..3]-(to:Memory {id: $toId})
           RETURN from, to`
        );
        const result = await this.connection.execute(stmt, { fromId, toId });
        const rows = await result.getAll();

        if (rows.length === 0) return [];

        // Return just the from and to nodes for simplicity
        const memories: MemoryItem[] = [];
        const fromNode = rows[0].from;
        const toNode = rows[0].to;

        // Get relations for from node
        const fromRelStmt = await this.connection.prepare(
          `MATCH (m:Memory {id: $id})
           OPTIONAL MATCH (m)-[r:Related]->(related:Memory)
           RETURN COLLECT({targetId: related.id, type: r.type, strength: r.strength}) AS relations`
        );
        const fromRelResult = await this.connection.execute(fromRelStmt, { id: fromNode.id });
        const fromRelRows = await fromRelResult.getAll();
        const fromRelations = fromRelRows.length > 0 ? fromRelRows[0].relations : [];

        // Get relations for to node
        const toRelResult = await this.connection.execute(fromRelStmt, { id: toNode.id });
        const toRelRows = await toRelResult.getAll();
        const toRelations = toRelRows.length > 0 ? toRelRows[0].relations : [];

        memories.push(this.rowToMemoryItem(fromNode, fromRelations));
        if (fromNode.id !== toNode.id) {
          memories.push(this.rowToMemoryItem(toNode, toRelations));
        }

        return memories;
      } catch (error) {
        // If path finding fails, return empty array
        console.warn('Shortest path query failed, returning empty result:', error);
        return [];
      }
    });
  }

  async getMemoryCluster(id: string): Promise<MemoryItem[]> {
    return this.queueOperation(async () => {
      if (!this.connection) throw new Error('Database not initialized');

      // Find strongly connected memories (strength > 0.7)
      const stmt = await this.connection.prepare(
        `MATCH (start:Memory {id: $id})-[r:Related]-(connected:Memory)
         WHERE r.strength > 0.7
         OPTIONAL MATCH (connected)-[r2:Related]->(related:Memory)
         RETURN connected, COLLECT({targetId: related.id, type: r2.type, strength: r2.strength}) AS relations`
      );
      const result = await this.connection.execute(stmt, { id });

      const rows = await result.getAll();
      return rows.map((row: any) => this.rowToMemoryItem(row.connected as any, row.relations as any[]));
    });
  }

  // Cleanup
  destroy(): void {
    if (this.connection) {
      this.connection = null;
    }
    if (this.db) {
      this.db = null;
    }
    this.initialized = false;

    // Clear the queue to prevent pending operations
    if (sharedQueue) {
      sharedQueue.clear();
    }

    // Reset singleton instances for testing isolation
    sharedDb = null;
    sharedConnection = null;
    sharedQueue = null;
  }

  // Method to get queue status for debugging
  getQueueStatus(): { queueLength: number; processing: boolean } | null {
    return sharedQueue ? sharedQueue.getStatus() : null;
  }
}