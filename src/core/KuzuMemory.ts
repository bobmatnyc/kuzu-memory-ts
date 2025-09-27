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
import { Result } from '../types/branded';
import { createStorageAdapter } from '../storage/factory';
import { createRecallStrategy } from '../recall/factory';
import { PatternExtractor } from '../extraction/PatternExtractor';
import { defaultPatterns } from '../extraction/patterns';
import { applyDecayToMemories, shouldForget } from '../utils/decay';
import { sanitizeMemoryContent, sanitizeMetadata } from '../utils/validators';
import { MemoryClassifier } from '../nlp/MemoryClassifier';
import type { ClassificationResult } from '../nlp/MemoryClassifier';
import { toSanitizedContent, toValidatedMetadata } from '../types/branded';

export class KuzuMemory extends EventEmitter {
  private storage: StorageAdapter;
  private recallStrategy: RecallStrategy;
  private extractor: PatternExtractor;
  private classifier: MemoryClassifier | null = null;
  private config: KuzuConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private decayInterval: NodeJS.Timeout | null = null;
  private lastStatsCheck: number = 0;
  // Removed lastKnownCount as it's not used in the optimized implementation

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

    // Storage adapter will be initialized asynchronously in init() method
    this.storage = null as any; // Temporary placeholder

    // Initialize recall strategy
    this.recallStrategy = createRecallStrategy({
      type: 'composite',
      embeddingFunction: this.config.embeddingProvider,
    });

    // Initialize pattern extractor
    this.extractor = new PatternExtractor(defaultPatterns);

    // Initialize NLP classifier if configured
    if (this.config.nlp) {
      this.classifier = new MemoryClassifier({
        autoClassify: this.config.nlp.autoClassify,
        autoImportance: this.config.nlp.autoImportance,
        confidenceThreshold: this.config.nlp.confidenceThreshold,
        customTrainingData: this.config.nlp.customTrainingData,
      });
    }
  }

  async init(): Promise<void> {
    // Initialize storage adapter asynchronously for better tree-shaking
    if (!this.storage) {
      this.storage = await createStorageAdapter({
        type: this.config.storage!,
        dbName: this.config.dbName,
        version: this.config.version,
      });
    }

    await this.storage.init();

    // Initialize classifier if present
    if (this.classifier) {
      await this.classifier.init();
    }

    if (this.config.autoSync) {
      this.startSync();
    }

    if (this.config.decayEnabled) {
      this.startDecay();
    }
  }

  /**
   * Shared memory creation logic to avoid duplication
   */
  private async createMemoryInternal(
    content: string,
    metadata?: Partial<MemoryItem>,
  ): Promise<MemoryItem> {
    // Sanitize content with branded type
    const sanitizedContent = toSanitizedContent(sanitizeMemoryContent(content));

    // Sanitize metadata if provided with branded type
    const sanitizedMetadata = metadata?.metadata
      ? toValidatedMetadata(sanitizeMetadata(metadata.metadata))
      : undefined;

    // Extract patterns
    const extractionResults = await this.extractor.extract(sanitizedContent);

    // Apply NLP classification if enabled and no type provided
    let classification: ClassificationResult | undefined;
    let memoryType: MemoryType = (metadata?.type || 'semantic') as MemoryType;
    let importance: number = metadata?.importance ?? 0.5;

    if (this.classifier && this.config.nlp?.autoClassify) {
      classification = await this.classifier.classify(sanitizedContent);

      // Auto-classify if confidence is high enough and no type was explicitly provided
      if (!metadata?.type && this.classifier.shouldAutoClassify(classification.confidence)) {
        memoryType = classification.type;
      }

      // Auto-set importance if enabled and no importance was explicitly provided
      if (this.config.nlp?.autoImportance && metadata?.importance === undefined && classification.importance !== undefined) {
        importance = classification.importance;
      }
    }

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
      type: memoryType,
      content: sanitizedContent,
      embedding,
      metadata: {
        ...sanitizedMetadata,
        extractions: extractionResults,
        ...(classification && {
          nlpClassification: {
            suggestedType: classification.type,
            confidence: classification.confidence,
            keywords: classification.keywords,
            sentiment: classification.sentiment,
          },
        }),
      },
      tags: [...(metadata?.tags || []), ...(classification?.keywords || [])],
      source: metadata?.source,
      timestamp: new Date(),
      importance,
      decay: metadata?.decay ?? 0.1,
      relations: metadata?.relations || [],
      accessCount: 0,
    });

    // Check if we're at max capacity (optimized check)
    await this.handleCapacityCheck();

    // Emit event
    this.emit('memory:created', { type: 'memory:created', memory } as MemoryEvent);

    return memory;
  }

  /**
   * Optimized capacity check with batch pruning
   */
  private async handleCapacityCheck(): Promise<void> {
    // Use a simple counter cache to avoid frequent stats calls
    if (!this.lastStatsCheck || Date.now() - this.lastStatsCheck > 30000) { // Check every 30 seconds
      const stats = await this.storage.getStats();
      this.lastStatsCheck = Date.now();

      if (stats.totalItems > this.config.maxMemories!) {
        await this.pruneOldMemories();
      }
    }
  }

  /**
   * Creates a memory with Result type for better error handling
   */
  async createSafe(
    content: string,
    metadata?: Partial<MemoryItem>,
  ): Promise<Result<MemoryItem, Error>> {
    try {
      const memory = await this.createMemoryInternal(content, metadata);
      return Result.ok(memory);
    } catch (error) {
      return Result.err(error as Error);
    }
  }

  async create(
    content: string,
    metadata?: Partial<MemoryItem>,
  ): Promise<MemoryItem> {
    return this.createMemoryInternal(content, metadata);
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
    updates: Partial<MemoryItem>,
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
    },
  ): Promise<MemoryItem[]> {
    // Get all relevant memories without text filtering
    // Let the recall strategy handle the actual matching/scoring
    const allMemories = await this.storage.query({
      type: options?.type,
      limit: 1000, // Get many memories for scoring
      offset: 0,
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

  // NLP classification methods
  async classifyMemory(content: string): Promise<ClassificationResult | null> {
    if (!this.classifier) {
      return null;
    }
    return await this.classifier.classify(content);
  }

  async getDetailedClassification(content: string) {
    if (!this.classifier) {
      return null;
    }
    return await this.classifier.getDetailedClassification(content);
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

  /**
   * Streaming decay process that handles memories in batches
   * to avoid loading all memories into memory at once
   */
  private async *streamMemories(batchSize: number = 100) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.storage.query({
        limit: batchSize,
        offset,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch;
        offset += batch.length;
        hasMore = batch.length === batchSize;
      }
    }
  }

  private async processDecayBatch(memories: MemoryItem[]): Promise<void> {
    const promises = memories.map(async (memory) => {
      if (shouldForget(memory)) {
        await this.delete(memory.id);
      } else {
        // Update importance based on decay
        const decayedMemories = applyDecayToMemories([memory]);
        const newImportance = decayedMemories[0]?.importance;

        // Only update if importance actually changed
        if (newImportance !== undefined && Math.abs(newImportance - memory.importance) > 0.001) {
          await this.storage.update(memory.id, {
            importance: newImportance,
          });
        }
      }
    });

    await Promise.all(promises);
  }

  private startDecay() {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
    }

    this.decayInterval = setInterval(async () => {
      try {
        // Process memories in streaming batches
        for await (const batch of this.streamMemories(50)) {
          await this.processDecayBatch(batch);

          // Small delay between batches to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 10));
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
      offset: 0,
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
