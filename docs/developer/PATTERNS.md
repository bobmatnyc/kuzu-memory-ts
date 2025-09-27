# Design Patterns and Best Practices

This comprehensive guide covers the design patterns, architectural decisions, and best practices implemented in the Kuzu Memory TypeScript library. Understanding these patterns is essential for contributing to the project and building applications with similar requirements.

## Table of Contents

1. [Architecture Patterns](#architecture-patterns)
2. [Creational Patterns](#creational-patterns)
3. [Structural Patterns](#structural-patterns)
4. [Behavioral Patterns](#behavioral-patterns)
5. [Async/Await Patterns](#asyncawait-patterns)
6. [Error Handling Patterns](#error-handling-patterns)
7. [TypeScript Patterns](#typescript-patterns)
8. [Domain Modeling Patterns](#domain-modeling-patterns)
9. [Testing Patterns](#testing-patterns)
10. [Performance Patterns](#performance-patterns)
11. [Security Patterns](#security-patterns)
12. [Cross-Platform Patterns](#cross-platform-patterns)

## Architecture Patterns

### Layered Architecture

The Kuzu Memory library follows a clean layered architecture that separates concerns and enables maintainability:

```typescript
// Layer separation with clear dependencies
// Presentation Layer (React hooks, UI components)
export class PresentationLayer {
  constructor(private applicationLayer: ApplicationLayer) {}
}

// Application Layer (Use cases, orchestration)
export class ApplicationLayer {
  constructor(
    private domainServices: DomainServices,
    private infrastructure: Infrastructure
  ) {}

  async createMemory(content: string, options?: CreateOptions): Promise<MemoryItem> {
    // Orchestrate domain logic and infrastructure
    const sanitized = await this.domainServices.sanitization.sanitize(content);
    const classified = await this.domainServices.classification.classify(sanitized);
    const memory = this.domainServices.memoryFactory.create(classified, options);

    return this.infrastructure.storage.create(memory);
  }
}

// Domain Layer (Business logic, entities)
export class DomainLayer {
  // Pure business logic, no infrastructure dependencies
  createMemoryEntity(content: string, type: MemoryType): MemoryEntity {
    return new MemoryEntity(content, type);
  }
}

// Infrastructure Layer (Storage, external services)
export class InfrastructureLayer {
  constructor(
    private storage: StorageAdapter,
    private nlpService: NLPService
  ) {}
}
```

### Hexagonal Architecture (Ports and Adapters)

```typescript
// Core business logic (hexagon center)
export class MemoryCore {
  constructor(
    // Ports (interfaces) define contracts
    private storage: StoragePort,
    private classifier: ClassificationPort,
    private validator: ValidationPort
  ) {}

  async createMemory(content: string): Promise<MemoryItem> {
    // Business logic is independent of infrastructure
    const validated = await this.validator.validate(content);
    const classified = await this.classifier.classify(validated);
    return this.storage.store(classified);
  }
}

// Ports define interfaces (what the core needs)
export interface StoragePort {
  store(memory: MemoryItem): Promise<MemoryItem>;
  retrieve(id: string): Promise<MemoryItem | null>;
  query(criteria: QueryCriteria): Promise<MemoryItem[]>;
}

export interface ClassificationPort {
  classify(content: string): Promise<MemoryType>;
}

// Adapters implement ports (how infrastructure provides services)
export class IndexedDBStorageAdapter implements StoragePort {
  async store(memory: MemoryItem): Promise<MemoryItem> {
    // IndexedDB-specific implementation
  }
}

export class NaiveBayesClassificationAdapter implements ClassificationPort {
  async classify(content: string): Promise<MemoryType> {
    // NLP-specific implementation
  }
}
```

### Event-Driven Architecture

```typescript
// Event system for loose coupling
export class EventDrivenMemoryManager {
  private eventBus = new EventBus();

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.eventBus.on('memory.created', this.handleMemoryCreated.bind(this));
    this.eventBus.on('memory.updated', this.handleMemoryUpdated.bind(this));
    this.eventBus.on('memory.accessed', this.handleMemoryAccessed.bind(this));
    this.eventBus.on('pattern.extracted', this.handlePatternExtracted.bind(this));
  }

  async createMemory(content: string): Promise<MemoryItem> {
    const memory = await this.storage.create({ content });

    // Emit event for other systems to react
    this.eventBus.emit('memory.created', {
      memory,
      timestamp: new Date(),
      metadata: { source: 'api' }
    });

    return memory;
  }

  private async handleMemoryCreated(event: MemoryCreatedEvent): Promise<void> {
    // Async pattern extraction
    this.patternExtractor.extractAsync(event.memory.content);

    // Update analytics
    this.analytics.recordCreation(event.memory);

    // Trigger related memory suggestions
    this.relationBuilder.findRelations(event.memory);
  }
}

// Event definitions with strong typing
export interface MemoryCreatedEvent {
  memory: MemoryItem;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class EventBus {
  private handlers = new Map<string, Array<(event: any) => void>>();

  on<T>(eventType: string, handler: (event: T) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  emit<T>(eventType: string, event: T): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.forEach(handler => {
      // Execute handlers asynchronously to prevent blocking
      setTimeout(() => handler(event), 0);
    });
  }
}
```

## Creational Patterns

### Factory Pattern

```typescript
// Abstract Factory for creating storage adapters
export abstract class StorageAdapterFactory {
  abstract createAdapter(config: StorageConfig): StorageAdapter;

  // Template method for common setup
  protected setupAdapter(adapter: StorageAdapter, config: StorageConfig): StorageAdapter {
    if (config.enableCaching) {
      return new CachedStorageAdapter(adapter);
    }

    if (config.enableSecurity) {
      return new SecureStorageAdapter(adapter, config.security);
    }

    return adapter;
  }
}

export class BrowserStorageFactory extends StorageAdapterFactory {
  createAdapter(config: StorageConfig): StorageAdapter {
    let adapter: StorageAdapter;

    switch (config.type) {
      case 'indexeddb':
        adapter = new IndexedDBAdapter(config.dbName, config.version);
        break;
      case 'localStorage':
        adapter = new LocalStorageAdapter(config.storageKey);
        break;
      case 'memory':
        adapter = new MemoryAdapter();
        break;
      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }

    return this.setupAdapter(adapter, config);
  }
}

export class NodeStorageFactory extends StorageAdapterFactory {
  createAdapter(config: StorageConfig): StorageAdapter {
    let adapter: StorageAdapter;

    switch (config.type) {
      case 'sqlite':
        adapter = new SQLiteAdapter(config.path);
        break;
      case 'postgresql':
        adapter = new PostgreSQLAdapter(config.connectionString);
        break;
      case 'memory':
        adapter = new MemoryAdapter();
        break;
      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }

    return this.setupAdapter(adapter, config);
  }
}

// Factory selector pattern
export class StorageFactoryProvider {
  static getFactory(): StorageAdapterFactory {
    if (typeof window !== 'undefined') {
      return new BrowserStorageFactory();
    }

    if (typeof process !== 'undefined' && process.versions?.node) {
      return new NodeStorageFactory();
    }

    throw new Error('Unknown environment');
  }
}
```

### Builder Pattern

```typescript
// Complex object construction with validation
export class MemoryQueryBuilder {
  private query: Partial<MemoryQuery> = {};

  searchText(text: string): this {
    if (text && text.length > 0) {
      this.query.searchText = text.trim();
    }
    return this;
  }

  types(...types: MemoryType[]): this {
    this.query.types = types.filter(Boolean);
    return this;
  }

  importanceRange(min?: number, max?: number): this {
    if (min !== undefined && min >= 0 && min <= 1) {
      this.query.minImportance = min;
    }
    if (max !== undefined && max >= 0 && max <= 1) {
      this.query.maxImportance = max;
    }
    return this;
  }

  dateRange(start: Date, end: Date): this {
    if (start <= end) {
      this.query.dateRange = { start, end };
    }
    return this;
  }

  tags(...tags: string[]): this {
    this.query.tags = tags.filter(tag => tag && tag.trim().length > 0);
    return this;
  }

  limit(limit: number): this {
    if (limit > 0 && limit <= 10000) {
      this.query.limit = limit;
    }
    return this;
  }

  offset(offset: number): this {
    if (offset >= 0) {
      this.query.offset = offset;
    }
    return this;
  }

  sortBy(field: SortField, order: SortOrder = 'desc'): this {
    this.query.sortBy = field;
    this.query.sortOrder = order;
    return this;
  }

  build(): MemoryQuery {
    // Validation
    if (this.query.minImportance !== undefined &&
        this.query.maxImportance !== undefined &&
        this.query.minImportance > this.query.maxImportance) {
      throw new Error('Invalid importance range');
    }

    if (this.query.dateRange?.start && this.query.dateRange?.end &&
        this.query.dateRange.start > this.query.dateRange.end) {
      throw new Error('Invalid date range');
    }

    return {
      searchText: this.query.searchText,
      types: this.query.types,
      minImportance: this.query.minImportance,
      maxImportance: this.query.maxImportance,
      dateRange: this.query.dateRange,
      tags: this.query.tags,
      limit: this.query.limit || 100,
      offset: this.query.offset || 0,
      sortBy: this.query.sortBy || 'timestamp',
      sortOrder: this.query.sortOrder || 'desc'
    };
  }

  // Fluent interface example usage:
  // const query = new MemoryQueryBuilder()
  //   .searchText('learning')
  //   .types('semantic', 'episodic')
  //   .importanceRange(0.5, 1.0)
  //   .limit(50)
  //   .build();
}

// Memory item builder with defaults and validation
export class MemoryItemBuilder {
  private memory: Partial<MemoryItem> = {};

  content(content: string): this {
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }
    this.memory.content = content.trim();
    return this;
  }

  type(type: MemoryType): this {
    this.memory.type = type;
    return this;
  }

  importance(importance: number): this {
    if (importance < 0 || importance > 1) {
      throw new Error('Importance must be between 0 and 1');
    }
    this.memory.importance = importance;
    return this;
  }

  tags(...tags: string[]): this {
    this.memory.tags = tags.filter(tag => tag && tag.trim().length > 0);
    return this;
  }

  metadata(metadata: Record<string, any>): this {
    this.memory.metadata = { ...metadata };
    return this;
  }

  build(): Omit<MemoryItem, 'id'> {
    if (!this.memory.content) {
      throw new Error('Content is required');
    }

    return {
      content: this.memory.content,
      type: this.memory.type || 'semantic',
      importance: this.memory.importance || 0.5,
      timestamp: new Date(),
      lastAccessed: undefined,
      accessCount: 0,
      decay: 0.1,
      tags: this.memory.tags || [],
      metadata: this.memory.metadata || {},
      relations: []
    };
  }
}
```

### Singleton Pattern (with TypeScript best practices)

```typescript
// Proper singleton implementation with lazy initialization
export class ConfigurationManager {
  private static instance: ConfigurationManager | undefined;
  private config: KuzuConfig;

  private constructor() {
    this.config = this.loadDefaultConfig();
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  getConfig(): Readonly<KuzuConfig> {
    return { ...this.config }; // Return copy to prevent mutation
  }

  updateConfig(updates: Partial<KuzuConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  private loadDefaultConfig(): KuzuConfig {
    return {
      storage: {
        type: 'indexeddb',
        dbName: 'kuzu-memory',
        version: 1
      },
      nlp: {
        autoClassify: true,
        autoImportance: true,
        confidenceThreshold: 0.7
      },
      memory: {
        maxItems: 10000,
        decayEnabled: true,
        decayRate: 0.01
      }
    };
  }

  // For testing - allow instance reset
  static resetInstance(): void {
    ConfigurationManager.instance = undefined;
  }
}
```

## Structural Patterns

### Adapter Pattern

```typescript
// Adapt external NLP library to our interface
export interface MemoryClassificationService {
  classify(content: string): Promise<ClassificationResult>;
  getConfidence(): number;
}

// Adapter for Natural.js library
export class NaturalJSAdapter implements MemoryClassificationService {
  private classifier: any; // External library type
  private confidence = 0;

  constructor() {
    // Initialize external library
    const natural = require('natural');
    this.classifier = new natural.BayesClassifier();
    this.trainClassifier();
  }

  async classify(content: string): Promise<ClassificationResult> {
    try {
      const result = this.classifier.classify(content);
      const classifications = this.classifier.getClassifications(content);

      this.confidence = classifications[0]?.value || 0;

      return {
        type: this.mapToMemoryType(result),
        confidence: this.confidence,
        features: this.extractFeatures(content)
      };
    } catch (error) {
      throw new AdapterError('Natural.js classification failed', error);
    }
  }

  getConfidence(): number {
    return this.confidence;
  }

  private mapToMemoryType(naturalResult: string): MemoryType {
    const mapping: Record<string, MemoryType> = {
      'personal-experience': 'episodic',
      'factual-knowledge': 'semantic',
      'procedural-knowledge': 'procedural',
      'temporary-info': 'working',
      'sensory-data': 'sensory'
    };

    return mapping[naturalResult] || 'semantic';
  }

  private trainClassifier(): void {
    // Training data would be loaded here
    trainingData.forEach(item => {
      this.classifier.addDocument(item.text, item.category);
    });

    this.classifier.train();
  }
}

// Adapter for TensorFlow.js
export class TensorFlowAdapter implements MemoryClassificationService {
  private model: any;
  private confidence = 0;

  constructor() {
    this.loadModel();
  }

  async classify(content: string): Promise<ClassificationResult> {
    try {
      const tensor = this.textToTensor(content);
      const prediction = await this.model.predict(tensor);
      const result = await prediction.data();

      this.confidence = Math.max(...result);
      const typeIndex = result.indexOf(this.confidence);

      return {
        type: this.indexToMemoryType(typeIndex),
        confidence: this.confidence,
        features: this.extractFeatures(content)
      };
    } catch (error) {
      throw new AdapterError('TensorFlow.js classification failed', error);
    }
  }

  getConfidence(): number {
    return this.confidence;
  }

  private async loadModel(): Promise<void> {
    const tf = require('@tensorflow/tfjs');
    this.model = await tf.loadLayersModel('/models/memory-classifier.json');
  }

  private textToTensor(text: string): any {
    // Convert text to tensor representation
    // Implementation would depend on model requirements
  }

  private indexToMemoryType(index: number): MemoryType {
    const types: MemoryType[] = ['episodic', 'semantic', 'procedural', 'working', 'sensory'];
    return types[index] || 'semantic';
  }
}
```

### Decorator Pattern

```typescript
// Add functionality to storage adapters without modifying them
export interface StorageAdapter {
  get(id: string): Promise<MemoryItem | null>;
  create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem>;
  update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem>;
  delete(id: string): Promise<void>;
  query(query: MemoryQuery): Promise<MemoryItem[]>;
}

// Base decorator
export abstract class StorageAdapterDecorator implements StorageAdapter {
  constructor(protected adapter: StorageAdapter) {}

  async get(id: string): Promise<MemoryItem | null> {
    return this.adapter.get(id);
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    return this.adapter.create(item);
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    return this.adapter.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete(id);
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    return this.adapter.query(query);
  }
}

// Caching decorator
export class CachedStorageAdapter extends StorageAdapterDecorator {
  private cache = new Map<string, MemoryItem>();
  private queryCache = new Map<string, MemoryItem[]>();

  async get(id: string): Promise<MemoryItem | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const item = await super.get(id);
    if (item) {
      this.cache.set(id, item);
    }

    return item;
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const created = await super.create(item);
    this.cache.set(created.id, created);
    this.invalidateQueryCache();
    return created;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const updated = await super.update(id, updates);
    this.cache.set(id, updated);
    this.invalidateQueryCache();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await super.delete(id);
    this.cache.delete(id);
    this.invalidateQueryCache();
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    const queryKey = JSON.stringify(query);

    if (this.queryCache.has(queryKey)) {
      return this.queryCache.get(queryKey)!;
    }

    const results = await super.query(query);
    this.queryCache.set(queryKey, results);

    return results;
  }

  private invalidateQueryCache(): void {
    this.queryCache.clear();
  }
}

// Logging decorator
export class LoggedStorageAdapter extends StorageAdapterDecorator {
  constructor(adapter: StorageAdapter, private logger: Logger) {
    super(adapter);
  }

  async get(id: string): Promise<MemoryItem | null> {
    const start = Date.now();

    try {
      const result = await super.get(id);
      this.logger.info(`GET ${id}`, {
        duration: Date.now() - start,
        found: result !== null
      });
      return result;
    } catch (error) {
      this.logger.error(`GET ${id} failed`, {
        duration: Date.now() - start,
        error: error.message
      });
      throw error;
    }
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const start = Date.now();

    try {
      const result = await super.create(item);
      this.logger.info(`CREATE ${result.id}`, {
        duration: Date.now() - start,
        type: result.type
      });
      return result;
    } catch (error) {
      this.logger.error('CREATE failed', {
        duration: Date.now() - start,
        error: error.message
      });
      throw error;
    }
  }
}

// Security decorator
export class SecuredStorageAdapter extends StorageAdapterDecorator {
  constructor(
    adapter: StorageAdapter,
    private validator: SecurityValidator,
    private sanitizer: ContentSanitizer
  ) {
    super(adapter);
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    // Validate and sanitize before storage
    const validation = this.validator.validate(item);
    if (!validation.valid) {
      throw new SecurityError('Invalid item', validation.errors);
    }

    const sanitized = {
      ...item,
      content: this.sanitizer.sanitize(item.content).sanitized
    };

    return super.create(sanitized);
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    if (updates.content) {
      const validation = this.validator.validate(updates);
      if (!validation.valid) {
        throw new SecurityError('Invalid updates', validation.errors);
      }

      updates = {
        ...updates,
        content: this.sanitizer.sanitize(updates.content).sanitized
      };
    }

    return super.update(id, updates);
  }
}
```

### Composite Pattern

```typescript
// Combine multiple recall strategies
export interface RecallStrategy {
  name: string;
  rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]>;
  getWeight(): number;
}

export class CompositeRecallStrategy implements RecallStrategy {
  name = 'composite';
  private strategies: RecallStrategy[] = [];

  addStrategy(strategy: RecallStrategy): this {
    this.strategies.push(strategy);
    return this;
  }

  removeStrategy(strategyName: string): this {
    this.strategies = this.strategies.filter(s => s.name !== strategyName);
    return this;
  }

  async rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]> {
    if (this.strategies.length === 0) {
      return memories;
    }

    if (this.strategies.length === 1) {
      return this.strategies[0].rank(memories, query);
    }

    // Combine scores from all strategies
    const scoredMemories = new Map<string, { memory: MemoryItem; totalScore: number; scores: Record<string, number> }>();

    // Initialize with zero scores
    memories.forEach(memory => {
      scoredMemories.set(memory.id, {
        memory,
        totalScore: 0,
        scores: {}
      });
    });

    // Apply each strategy and accumulate weighted scores
    for (const strategy of this.strategies) {
      const rankedMemories = await strategy.rank(memories, query);
      const weight = strategy.getWeight();

      rankedMemories.forEach((memory, index) => {
        const score = (rankedMemories.length - index) / rankedMemories.length;
        const weightedScore = score * weight;

        const entry = scoredMemories.get(memory.id)!;
        entry.scores[strategy.name] = score;
        entry.totalScore += weightedScore;
      });
    }

    // Sort by combined score
    const sortedEntries = Array.from(scoredMemories.values())
      .sort((a, b) => b.totalScore - a.totalScore);

    return sortedEntries.map(entry => entry.memory);
  }

  getWeight(): number {
    return this.strategies.reduce((sum, strategy) => sum + strategy.getWeight(), 0);
  }

  // Individual strategy implementations
  private createTextSimilarityStrategy(): RecallStrategy {
    return {
      name: 'text-similarity',
      getWeight: () => 0.4,
      async rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]> {
        if (!query.searchText) return memories;

        return memories
          .map(memory => ({
            memory,
            similarity: this.calculateTextSimilarity(memory.content, query.searchText!)
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .map(item => item.memory);
      }
    };
  }

  private createImportanceStrategy(): RecallStrategy {
    return {
      name: 'importance',
      getWeight: () => 0.3,
      async rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]> {
        return [...memories].sort((a, b) => b.importance - a.importance);
      }
    };
  }

  private createRecencyStrategy(): RecallStrategy {
    return {
      name: 'recency',
      getWeight: () => 0.3,
      async rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]> {
        return [...memories].sort((a, b) =>
          b.timestamp.getTime() - a.timestamp.getTime()
        );
      }
    };
  }
}
```

## Behavioral Patterns

### Strategy Pattern

```typescript
// Abstract strategy for memory recall
export abstract class RecallStrategy {
  abstract name: string;
  abstract rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]>;
  abstract getRelevanceScore(memory: MemoryItem, query: MemoryQuery): number;
}

// Concrete strategies
export class SimilarityRecallStrategy extends RecallStrategy {
  name = 'similarity';

  async rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]> {
    if (!query.searchText) {
      return memories;
    }

    const scoredMemories = memories.map(memory => ({
      memory,
      score: this.getRelevanceScore(memory, query)
    }));

    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .map(item => item.memory);
  }

  getRelevanceScore(memory: MemoryItem, query: MemoryQuery): number {
    if (!query.searchText) return 0;

    const contentWords = memory.content.toLowerCase().split(/\s+/);
    const queryWords = query.searchText.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const queryWord of queryWords) {
      if (contentWords.some(contentWord =>
        contentWord.includes(queryWord) || queryWord.includes(contentWord)
      )) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }
}

export class ImportanceRecallStrategy extends RecallStrategy {
  name = 'importance';

  async rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]> {
    return [...memories].sort((a, b) => {
      // Primary sort: importance
      const importanceDiff = b.importance - a.importance;
      if (Math.abs(importanceDiff) > 0.01) {
        return importanceDiff;
      }

      // Secondary sort: recency
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  getRelevanceScore(memory: MemoryItem, query: MemoryQuery): number {
    return memory.importance;
  }
}

export class ContextualRecallStrategy extends RecallStrategy {
  name = 'contextual';

  async rank(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]> {
    const now = new Date();

    return memories
      .map(memory => ({
        memory,
        score: this.getRelevanceScore(memory, query)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.memory);
  }

  getRelevanceScore(memory: MemoryItem, query: MemoryQuery): number {
    let score = 0;

    // Type matching bonus
    if (query.types?.includes(memory.type)) {
      score += 0.3;
    }

    // Tag matching bonus
    if (query.tags?.some(tag => memory.tags.includes(tag))) {
      score += 0.2;
    }

    // Recency bonus (decay over time)
    const daysSinceCreation = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-daysSinceCreation / 30); // 30-day decay
    score += recencyScore * 0.2;

    // Access frequency bonus
    const accessScore = Math.min(memory.accessCount / 100, 1); // Cap at 100 accesses
    score += accessScore * 0.3;

    return score;
  }
}

// Context class that uses strategies
export class RecallEngine {
  private strategy: RecallStrategy;

  constructor(strategy: RecallStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: RecallStrategy): void {
    this.strategy = strategy;
  }

  async recall(memories: MemoryItem[], query: MemoryQuery): Promise<MemoryItem[]> {
    return this.strategy.rank(memories, query);
  }

  // Dynamic strategy selection based on query characteristics
  selectOptimalStrategy(query: MemoryQuery): RecallStrategy {
    if (query.searchText && query.searchText.length > 20) {
      return new SimilarityRecallStrategy();
    }

    if (query.types?.length === 1 && query.tags?.length > 0) {
      return new ContextualRecallStrategy();
    }

    if (query.minImportance !== undefined) {
      return new ImportanceRecallStrategy();
    }

    // Default fallback
    return new CompositeRecallStrategy()
      .addStrategy(new SimilarityRecallStrategy())
      .addStrategy(new ImportanceRecallStrategy())
      .addStrategy(new ContextualRecallStrategy());
  }
}
```

### Observer Pattern

```typescript
// Memory lifecycle events
export interface MemoryObserver {
  onMemoryCreated(memory: MemoryItem): Promise<void>;
  onMemoryUpdated(memory: MemoryItem, changes: Partial<MemoryItem>): Promise<void>;
  onMemoryDeleted(id: string): Promise<void>;
  onMemoryAccessed(memory: MemoryItem): Promise<void>;
}

export class MemorySubject {
  private observers: MemoryObserver[] = [];

  addObserver(observer: MemoryObserver): void {
    this.observers.push(observer);
  }

  removeObserver(observer: MemoryObserver): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  protected async notifyMemoryCreated(memory: MemoryItem): Promise<void> {
    await Promise.all(
      this.observers.map(observer =>
        observer.onMemoryCreated(memory).catch(error =>
          console.warn('Observer error:', error)
        )
      )
    );
  }

  protected async notifyMemoryUpdated(memory: MemoryItem, changes: Partial<MemoryItem>): Promise<void> {
    await Promise.all(
      this.observers.map(observer =>
        observer.onMemoryUpdated(memory, changes).catch(error =>
          console.warn('Observer error:', error)
        )
      )
    );
  }

  protected async notifyMemoryDeleted(id: string): Promise<void> {
    await Promise.all(
      this.observers.map(observer =>
        observer.onMemoryDeleted(id).catch(error =>
          console.warn('Observer error:', error)
        )
      )
    );
  }

  protected async notifyMemoryAccessed(memory: MemoryItem): Promise<void> {
    await Promise.all(
      this.observers.map(observer =>
        observer.onMemoryAccessed(memory).catch(error =>
          console.warn('Observer error:', error)
        )
      )
    );
  }
}

// Concrete observers
export class AnalyticsObserver implements MemoryObserver {
  private analytics: AnalyticsService;

  constructor(analytics: AnalyticsService) {
    this.analytics = analytics;
  }

  async onMemoryCreated(memory: MemoryItem): Promise<void> {
    await this.analytics.recordEvent('memory_created', {
      type: memory.type,
      importance: memory.importance,
      contentLength: memory.content.length,
      timestamp: memory.timestamp
    });
  }

  async onMemoryUpdated(memory: MemoryItem, changes: Partial<MemoryItem>): Promise<void> {
    await this.analytics.recordEvent('memory_updated', {
      id: memory.id,
      changes: Object.keys(changes),
      timestamp: new Date()
    });
  }

  async onMemoryDeleted(id: string): Promise<void> {
    await this.analytics.recordEvent('memory_deleted', {
      id,
      timestamp: new Date()
    });
  }

  async onMemoryAccessed(memory: MemoryItem): Promise<void> {
    await this.analytics.recordEvent('memory_accessed', {
      id: memory.id,
      type: memory.type,
      timestamp: new Date()
    });
  }
}

export class CacheObserver implements MemoryObserver {
  private cache: Cache;

  constructor(cache: Cache) {
    this.cache = cache;
  }

  async onMemoryCreated(memory: MemoryItem): Promise<void> {
    await this.cache.set(`memory:${memory.id}`, memory);
    await this.cache.invalidateQueries(); // Invalidate query caches
  }

  async onMemoryUpdated(memory: MemoryItem, changes: Partial<MemoryItem>): Promise<void> {
    await this.cache.set(`memory:${memory.id}`, memory);
    await this.cache.invalidateQueries();
  }

  async onMemoryDeleted(id: string): Promise<void> {
    await this.cache.delete(`memory:${id}`);
    await this.cache.invalidateQueries();
  }

  async onMemoryAccessed(memory: MemoryItem): Promise<void> {
    // Update access time in cache
    const cached = await this.cache.get(`memory:${memory.id}`);
    if (cached) {
      cached.lastAccessed = new Date();
      cached.accessCount = (cached.accessCount || 0) + 1;
      await this.cache.set(`memory:${memory.id}`, cached);
    }
  }
}

// Memory manager with observer support
export class ObservableMemoryManager extends MemorySubject {
  constructor(private storage: StorageAdapter) {
    super();
  }

  async create(content: string, options?: CreateOptions): Promise<MemoryItem> {
    const memory = await this.storage.create({
      content,
      type: options?.type || 'semantic',
      importance: options?.importance || 0.5,
      timestamp: new Date(),
      accessCount: 0,
      decay: 0.1,
      tags: options?.tags || [],
      metadata: options?.metadata || {},
      relations: []
    });

    await this.notifyMemoryCreated(memory);
    return memory;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const memory = await this.storage.update(id, updates);
    await this.notifyMemoryUpdated(memory, updates);
    return memory;
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
    await this.notifyMemoryDeleted(id);
  }

  async get(id: string): Promise<MemoryItem | null> {
    const memory = await this.storage.get(id);
    if (memory) {
      await this.notifyMemoryAccessed(memory);
    }
    return memory;
  }
}
```

### Command Pattern

```typescript
// Abstract command interface
export interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  getDescription(): string;
}

// Concrete commands
export class CreateMemoryCommand implements Command {
  private createdMemory?: MemoryItem;

  constructor(
    private storage: StorageAdapter,
    private content: string,
    private options?: CreateOptions
  ) {}

  async execute(): Promise<void> {
    const memoryData = {
      content: this.content,
      type: this.options?.type || 'semantic',
      importance: this.options?.importance || 0.5,
      timestamp: new Date(),
      accessCount: 0,
      decay: 0.1,
      tags: this.options?.tags || [],
      metadata: this.options?.metadata || {},
      relations: []
    };

    this.createdMemory = await this.storage.create(memoryData);
  }

  async undo(): Promise<void> {
    if (this.createdMemory) {
      await this.storage.delete(this.createdMemory.id);
      this.createdMemory = undefined;
    }
  }

  getDescription(): string {
    return `Create memory: ${this.content.substring(0, 50)}...`;
  }

  getCreatedMemory(): MemoryItem | undefined {
    return this.createdMemory;
  }
}

export class UpdateMemoryCommand implements Command {
  private originalMemory?: MemoryItem;

  constructor(
    private storage: StorageAdapter,
    private id: string,
    private updates: Partial<MemoryItem>
  ) {}

  async execute(): Promise<void> {
    this.originalMemory = await this.storage.get(this.id);
    if (!this.originalMemory) {
      throw new Error(`Memory ${this.id} not found`);
    }

    await this.storage.update(this.id, this.updates);
  }

  async undo(): Promise<void> {
    if (this.originalMemory) {
      await this.storage.update(this.id, this.originalMemory);
    }
  }

  getDescription(): string {
    return `Update memory: ${this.id}`;
  }
}

export class DeleteMemoryCommand implements Command {
  private deletedMemory?: MemoryItem;

  constructor(
    private storage: StorageAdapter,
    private id: string
  ) {}

  async execute(): Promise<void> {
    this.deletedMemory = await this.storage.get(this.id);
    if (!this.deletedMemory) {
      throw new Error(`Memory ${this.id} not found`);
    }

    await this.storage.delete(this.id);
  }

  async undo(): Promise<void> {
    if (this.deletedMemory) {
      await this.storage.create(this.deletedMemory);
    }
  }

  getDescription(): string {
    return `Delete memory: ${this.id}`;
  }
}

// Command invoker with undo/redo support
export class CommandManager {
  private history: Command[] = [];
  private currentIndex = -1;

  async executeCommand(command: Command): Promise<void> {
    // Remove any commands after current index (when we're not at the end)
    if (this.currentIndex < this.history.length - 1) {
      this.history.splice(this.currentIndex + 1);
    }

    // Execute the command
    await command.execute();

    // Add to history
    this.history.push(command);
    this.currentIndex++;

    // Limit history size
    const maxHistorySize = 100;
    if (this.history.length > maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  async undo(): Promise<boolean> {
    if (this.currentIndex >= 0) {
      const command = this.history[this.currentIndex];
      await command.undo();
      this.currentIndex--;
      return true;
    }
    return false;
  }

  async redo(): Promise<boolean> {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      await command.execute();
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getHistory(): string[] {
    return this.history.map(command => command.getDescription());
  }

  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// Usage with memory manager
export class UndoableMemoryManager {
  private commandManager = new CommandManager();

  constructor(private storage: StorageAdapter) {}

  async create(content: string, options?: CreateOptions): Promise<MemoryItem> {
    const command = new CreateMemoryCommand(this.storage, content, options);
    await this.commandManager.executeCommand(command);
    return command.getCreatedMemory()!;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<void> {
    const command = new UpdateMemoryCommand(this.storage, id, updates);
    await this.commandManager.executeCommand(command);
  }

  async delete(id: string): Promise<void> {
    const command = new DeleteMemoryCommand(this.storage, id);
    await this.commandManager.executeCommand(command);
  }

  async undo(): Promise<boolean> {
    return this.commandManager.undo();
  }

  async redo(): Promise<boolean> {
    return this.commandManager.redo();
  }

  canUndo(): boolean {
    return this.commandManager.canUndo();
  }

  canRedo(): boolean {
    return this.commandManager.canRedo();
  }

  getHistory(): string[] {
    return this.commandManager.getHistory();
  }
}
```

## Async/Await Patterns

### Promise Chaining and Composition

```typescript
// Proper async/await patterns for complex operations
export class AsyncMemoryProcessor {

  // Sequential processing with error handling
  async processMemorySequentially(contents: string[]): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];

    for (const content of contents) {
      try {
        // Each step depends on the previous
        const sanitized = await this.sanitizeContent(content);
        const classified = await this.classifyMemory(sanitized);
        const enhanced = await this.enhanceMemory(classified);
        const stored = await this.storeMemory(enhanced);

        results.push(stored);
      } catch (error) {
        console.error(`Failed to process memory: ${content}`, error);
        // Continue processing other items
      }
    }

    return results;
  }

  // Parallel processing for independent operations
  async processMemoryParallel(contents: string[]): Promise<MemoryItem[]> {
    const promises = contents.map(async (content) => {
      try {
        // All operations can run in parallel
        const [sanitized, patterns] = await Promise.all([
          this.sanitizeContent(content),
          this.extractPatterns(content)
        ]);

        const classified = await this.classifyMemory(sanitized);
        const enhanced = await this.enhanceMemory(classified, patterns);

        return this.storeMemory(enhanced);
      } catch (error) {
        console.error(`Failed to process memory: ${content}`, error);
        throw error; // Re-throw to be caught by Promise.allSettled
      }
    });

    const results = await Promise.allSettled(promises);

    // Separate successful and failed results
    const successful: MemoryItem[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push(`Item ${index}: ${result.reason.message}`);
      }
    });

    if (failed.length > 0) {
      console.warn('Some memories failed to process:', failed);
    }

    return successful;
  }

  // Controlled concurrency to prevent overwhelming resources
  async processMemoryBatched(
    contents: string[],
    batchSize = 5
  ): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);

      const batchPromises = batch.map(content =>
        this.processIndividualMemory(content)
      );

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Optional: Add delay between batches to prevent rate limiting
        if (i + batchSize < contents.length) {
          await this.delay(100); // 100ms delay
        }
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} failed:`, error);
        // Could implement retry logic here
      }
    }

    return results;
  }

  // Timeout wrapper for operations
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  // Retry pattern for unreliable operations
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2
  ): Promise<T> {
    let lastError: Error;
    let delay = delayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw error;
        }

        console.warn(`Attempt ${attempt} failed:`, error.message);
        await this.delay(delay);
        delay *= backoffMultiplier;
      }
    }

    throw lastError!;
  }

  // Circuit breaker pattern
  private circuitBreaker = new Map<string, CircuitState>();

  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
  ): Promise<T> {
    const state = this.getCircuitState(operationName);

    // Check if circuit is open
    if (state.isOpen()) {
      if (Date.now() - state.lastFailureTime < config.timeoutMs) {
        throw new Error(`Circuit breaker open for ${operationName}`);
      } else {
        // Try to close circuit (half-open state)
        state.halfOpen();
      }
    }

    try {
      const result = await operation();
      state.recordSuccess();
      return result;
    } catch (error) {
      state.recordFailure();

      if (state.failureCount >= config.failureThreshold) {
        state.open();
        console.warn(`Circuit breaker opened for ${operationName}`);
      }

      throw error;
    }
  }

  private getCircuitState(operationName: string): CircuitState {
    if (!this.circuitBreaker.has(operationName)) {
      this.circuitBreaker.set(operationName, new CircuitState());
    }
    return this.circuitBreaker.get(operationName)!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit breaker implementation
class CircuitState {
  failureCount = 0;
  lastFailureTime = 0;
  state: 'closed' | 'open' | 'half-open' = 'closed';

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  open(): void {
    this.state = 'open';
  }

  halfOpen(): void {
    this.state = 'half-open';
  }

  isOpen(): boolean {
    return this.state === 'open';
  }
}
```

## Error Handling Patterns

### Result Pattern for Safe Operations

```typescript
// Result pattern implementation
export class Result<T, E = Error> {
  private constructor(
    private _value?: T,
    private _error?: E,
    private _isSuccess = false
  ) {}

  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result(value, undefined, true);
  }

  static err<T, E = Error>(error: E): Result<T, E> {
    return new Result(undefined, error, false);
  }

  isOk(): boolean {
    return this._isSuccess;
  }

  isErr(): boolean {
    return !this._isSuccess;
  }

  value(): T {
    if (this._isSuccess && this._value !== undefined) {
      return this._value;
    }
    throw new Error('Called value() on an error result');
  }

  error(): E {
    if (!this._isSuccess && this._error !== undefined) {
      return this._error;
    }
    throw new Error('Called error() on a success result');
  }

  unwrap(): T {
    if (this._isSuccess && this._value !== undefined) {
      return this._value;
    }
    throw this._error || new Error('Unwrap failed');
  }

  unwrapOr(defaultValue: T): T {
    return this._isSuccess && this._value !== undefined ? this._value : defaultValue;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess && this._value !== undefined) {
      try {
        return Result.ok(fn(this._value));
      } catch (error) {
        return Result.err(error as E);
      }
    }
    return Result.err(this._error!);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    if (!this._isSuccess && this._error !== undefined) {
      return Result.err(fn(this._error));
    }
    return Result.ok(this._value!);
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isSuccess && this._value !== undefined) {
      return fn(this._value);
    }
    return Result.err(this._error!);
  }

  orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F> {
    if (!this._isSuccess && this._error !== undefined) {
      return fn(this._error);
    }
    return Result.ok(this._value!);
  }
}

// Safe memory operations using Result pattern
export class SafeMemoryOperations {
  constructor(private storage: StorageAdapter) {}

  async safeCreate(content: string, options?: CreateOptions): Promise<Result<MemoryItem, MemoryError>> {
    try {
      // Validation
      if (!content || content.trim().length === 0) {
        return Result.err(new ValidationError('Content cannot be empty'));
      }

      if (content.length > 100000) {
        return Result.err(new ValidationError('Content too large'));
      }

      // Sanitization
      const sanitizationResult = await this.sanitizeContent(content);
      if (sanitizationResult.isErr()) {
        return Result.err(sanitizationResult.error());
      }

      // Classification
      const classificationResult = await this.classifyContent(sanitizationResult.value());
      if (classificationResult.isErr()) {
        return Result.err(classificationResult.error());
      }

      // Storage
      const memory = {
        content: sanitizationResult.value(),
        type: classificationResult.value(),
        importance: options?.importance || 0.5,
        timestamp: new Date(),
        accessCount: 0,
        decay: 0.1,
        tags: options?.tags || [],
        metadata: options?.metadata || {},
        relations: []
      };

      const stored = await this.storage.create(memory);
      return Result.ok(stored);

    } catch (error) {
      return Result.err(new StorageError('Failed to create memory', error));
    }
  }

  async safeGet(id: string): Promise<Result<MemoryItem | null, MemoryError>> {
    try {
      if (!this.isValidId(id)) {
        return Result.err(new ValidationError('Invalid memory ID format'));
      }

      const memory = await this.storage.get(id);
      return Result.ok(memory);

    } catch (error) {
      return Result.err(new StorageError('Failed to retrieve memory', error));
    }
  }

  async safeQuery(query: MemoryQuery): Promise<Result<MemoryItem[], MemoryError>> {
    try {
      const validationResult = this.validateQuery(query);
      if (validationResult.isErr()) {
        return Result.err(validationResult.error());
      }

      const memories = await this.storage.query(query);
      return Result.ok(memories);

    } catch (error) {
      return Result.err(new StorageError('Failed to query memories', error));
    }
  }

  private async sanitizeContent(content: string): Promise<Result<string, SanitizationError>> {
    try {
      const sanitizer = new ContentSanitizer();
      const result = sanitizer.sanitizeContent(content);

      if (!result.safe) {
        return Result.err(new SanitizationError('Content contains unsafe elements', result.removed));
      }

      return Result.ok(result.sanitized);
    } catch (error) {
      return Result.err(new SanitizationError('Sanitization failed', [], error));
    }
  }

  private async classifyContent(content: string): Promise<Result<MemoryType, ClassificationError>> {
    try {
      const classifier = new MemoryClassifier();
      const result = classifier.classify(content);

      if (result.confidence < 0.5) {
        return Result.err(new ClassificationError('Low confidence classification', result.confidence));
      }

      return Result.ok(result.type);
    } catch (error) {
      return Result.err(new ClassificationError('Classification failed', 0, error));
    }
  }

  private validateQuery(query: MemoryQuery): Result<MemoryQuery, ValidationError> {
    if (query.limit && (query.limit < 1 || query.limit > 10000)) {
      return Result.err(new ValidationError('Invalid limit: must be between 1 and 10000'));
    }

    if (query.offset && query.offset < 0) {
      return Result.err(new ValidationError('Invalid offset: must be non-negative'));
    }

    if (query.minImportance !== undefined && (query.minImportance < 0 || query.minImportance > 1)) {
      return Result.err(new ValidationError('Invalid minImportance: must be between 0 and 1'));
    }

    if (query.maxImportance !== undefined && (query.maxImportance < 0 || query.maxImportance > 1)) {
      return Result.err(new ValidationError('Invalid maxImportance: must be between 0 and 1'));
    }

    if (query.minImportance !== undefined &&
        query.maxImportance !== undefined &&
        query.minImportance > query.maxImportance) {
      return Result.err(new ValidationError('minImportance cannot be greater than maxImportance'));
    }

    return Result.ok(query);
  }

  private isValidId(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}

// Custom error types
export abstract class MemoryError extends Error {
  abstract readonly type: string;
}

export class ValidationError extends MemoryError {
  readonly type = 'validation';
}

export class SanitizationError extends MemoryError {
  readonly type = 'sanitization';

  constructor(
    message: string,
    public readonly removedElements: string[] = [],
    public readonly cause?: Error
  ) {
    super(message);
  }
}

export class ClassificationError extends MemoryError {
  readonly type = 'classification';

  constructor(
    message: string,
    public readonly confidence: number,
    public readonly cause?: Error
  ) {
    super(message);
  }
}

export class StorageError extends MemoryError {
  readonly type = 'storage';

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
  }
}
```

This comprehensive guide provides the foundation for understanding and implementing the design patterns that make the Kuzu Memory library robust, maintainable, and extensible. These patterns ensure consistent architecture across the codebase and provide clear guidelines for future development.