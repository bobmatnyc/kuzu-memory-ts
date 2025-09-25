import { EventEmitter } from 'events';
import type {
  MemoryItem,
  MemoryQuery,
  MemoryEvent,
  StorageAdapter,
  RecallStrategy,
  KuzuConfig,
  MemoryType,
} from '../types';
import { createStorageAdapter } from '../storage/factory';
import { createRecallStrategy } from '../recall/factory';
import { PatternExtractor } from '../extraction/PatternExtractor';
import { defaultPatterns } from '../extraction/patterns';
import { applyDecayToMemories, shouldForget } from '../utils/decay';
import { sanitizeMemoryContent } from '../utils/validators';

export class KuzuMemory extends EventEmitter {
  private storage: StorageAdapter;
  private recallStrategy: RecallStrategy;
  private extractor: PatternExtractor;
  private config: KuzuConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private decayInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<KuzuConfig> = {}) {
    super();

    // Set default config
    this.config = {
      storage: config.storage || 'indexeddb',
      dbName: config.dbName || 'kuzu-memory',
      version: config.version || 1,
      autoSync: config.autoSync || false,
      syncInterval: config.syncInterval || 60000,
      maxMemories: config.maxMemories || 10000,
      decayEnabled: config.decayEnabled || true,
      decayInterval: config.decayInterval || 86400000,
      embeddingProvider: config.embeddingProvider,
    };

    // Initialize storage adapter
    this.storage = createStorageAdapter({
      type: this.config.storage!,
      dbName: this.config.dbName,
      version: this.config.version,
    });

    // Initialize recall strategy
    this.recallStrategy = createRecallStrategy({
      type: 'composite',
      embeddingFunction: this.config.embeddingProvider,
    });

    // Initialize pattern extractor
    this.extractor = new PatternExtractor(defaultPatterns);
  }

  async init(): Promise<void> {
    await this.storage.init();

    if (this.config.autoSync) {
      this.startSync();
    }

    if (this.config.decayEnabled) {
      this.startDecay();
    }
  }

  async create(
    content: string,
    metadata?: Partial<MemoryItem>
  ): Promise<MemoryItem> {
    // Sanitize content
    const sanitizedContent = sanitizeMemoryContent(content);

    // Extract patterns
    const extractionResults = await this.extractor.extract(sanitizedContent);

    // Generate embedding if provider is available
    let embedding: number[] | undefined;
    if (this.config.embeddingProvider) {
      try {
        embedding = await this.config.embeddingProvider(sanitizedContent);
      } catch (error) {
        console.error('Failed to generate embedding:', error);
      }
    }

    // Create memory item
    const memory = await this.storage.create({
      type: (metadata?.type || 'semantic') as MemoryType,
      content: sanitizedContent,
      embedding,
      metadata: {
        ...metadata?.metadata,
        extractions: extractionResults,
      },
      tags: metadata?.tags || [],
      source: metadata?.source,
      timestamp: new Date(),
      importance: metadata?.importance ?? 0.5,
      decay: metadata?.decay ?? 0.1,
      relations: metadata?.relations || [],
      accessCount: 0,
    });

    // Check if we're at max capacity
    const stats = await this.storage.getStats();
    if (stats.totalItems > this.config.maxMemories!) {
      await this.pruneOldMemories();
    }

    // Emit event
    this.emit('memory:created', { type: 'memory:created', memory } as MemoryEvent);

    return memory;
  }

  // Alias for create method - accepts either a string or a MemoryItem-like object
  async store(item: string | Partial<MemoryItem>): Promise<MemoryItem> {
    if (typeof item === 'string') {
      return this.create(item);
    } else {
      const { content, ...metadata } = item;
      if (!content) {
        throw new Error('Memory content is required');
      }
      return this.create(content, metadata);
    }
  }

  async get(id: string): Promise<MemoryItem | null> {
    const memory = await this.storage.get(id);

    if (memory) {
      this.emit('memory:accessed', { type: 'memory:accessed', memory } as MemoryEvent);
    }

    return memory;
  }

  // Access method - updates access count and last accessed time
  async access(id: string): Promise<MemoryItem | null> {
    const memory = await this.storage.get(id);

    if (memory) {
      // The storage adapter already updates accessCount and lastAccessed in its get method
      this.emit('memory:accessed', { type: 'memory:accessed', memory } as MemoryEvent);
    }

    return memory;
  }

  async update(
    id: string,
    updates: Partial<MemoryItem>
  ): Promise<MemoryItem> {
    const previous = await this.storage.get(id);
    if (!previous) {
      throw new Error(`Memory with id ${id} not found`);
    }

    // Sanitize content if it's being updated
    if (updates.content) {
      updates.content = sanitizeMemoryContent(updates.content);
    }

    const updated = await this.storage.update(id, updates);

    this.emit('memory:updated', {
      type: 'memory:updated',
      memory: updated,
      previous,
    } as MemoryEvent);

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
    this.emit('memory:deleted', { type: 'memory:deleted', id } as MemoryEvent);
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    let memories = await this.storage.query(query);

    // Apply recall strategy if query text is provided
    if (query.text) {
      memories = await this.recallStrategy.recall(query.text, memories);
    }

    return memories;
  }

  async recall(
    query: string,
    options?: {
      limit?: number;
      type?: MemoryType;
      strategy?: RecallStrategy;
    }
  ): Promise<MemoryItem[]> {
    // Get all relevant memories without text filtering
    // Let the recall strategy handle the actual matching/scoring
    const allMemories = await this.storage.query({
      type: options?.type,
      limit: 1000, // Get many memories for scoring
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    // Apply recall strategy
    const strategy = options?.strategy || this.recallStrategy;
    const recalled = await strategy.recall(query, allMemories);

    // Apply limit
    const limit = options?.limit || 10;
    return recalled.slice(0, limit);
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }

  async getStats() {
    return this.storage.getStats();
  }

  // Pattern extraction
  addPattern(pattern: Parameters<PatternExtractor['addPattern']>[0]) {
    this.extractor.addPattern(pattern);
  }

  removePattern(patternId: string) {
    this.extractor.removePattern(patternId);
  }

  async extractPatterns(text: string) {
    return await this.extractor.extract(text);
  }

  // Event subscription
  subscribe(handler: (event: MemoryEvent) => void): () => void {
    const eventTypes: MemoryEvent['type'][] = [
      'memory:created',
      'memory:updated',
      'memory:deleted',
      'memory:accessed',
      'sync:started',
      'sync:completed',
      'sync:failed',
    ];

    eventTypes.forEach(type => this.on(type, handler));

    // Return unsubscribe function
    return () => {
      eventTypes.forEach(type => this.off(type, handler));
    };
  }

  // Private methods
  private startSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        this.emit('sync:started', { type: 'sync:started' } as MemoryEvent);

        // Sync logic would go here
        // For now, just emit completed event
        this.emit('sync:completed', {
          type: 'sync:completed',
          count: 0,
        } as MemoryEvent);
      } catch (error) {
        this.emit('sync:failed', {
          type: 'sync:failed',
          error: error as Error,
        } as MemoryEvent);
      }
    }, this.config.syncInterval!);
  }

  private startDecay() {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
    }

    this.decayInterval = setInterval(async () => {
      try {
        const allMemories = await this.storage.query({ limit: 1000 });

        for (const memory of allMemories) {
          if (shouldForget(memory)) {
            await this.delete(memory.id);
          } else {
            // Update importance based on decay
            const decayedMemories = applyDecayToMemories([memory]);
            await this.storage.update(memory.id, {
              importance: decayedMemories[0]!.importance,
            });
          }
        }
      } catch (error) {
        console.error('Decay process failed:', error);
      }
    }, this.config.decayInterval!);
  }

  private async pruneOldMemories() {
    // Get memories sorted by importance and access
    const memories = await this.storage.query({
      sortBy: 'importance',
      sortOrder: 'asc',
      limit: 100,
    });

    // Delete least important memories
    const toDelete = memories.slice(0, 10); // Delete 10 at a time
    for (const memory of toDelete) {
      await this.delete(memory.id);
    }
  }

  // Cleanup
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = null;
    }

    this.removeAllListeners();
  }
}