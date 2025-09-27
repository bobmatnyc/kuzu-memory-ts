import type { MemoryItem, RecallStrategy } from '../types';

export interface StrategyWeight {
  strategy: RecallStrategy;
  weight: number;
}

// Optimized LRU cache with TTL support
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 500, ttl: number = 5 * 60 * 1000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used) - optimized
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    const now = Date.now();
    const entry = { value, timestamp: now };

    // Delete existing key to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest entries (up to 10% of cache size for batch efficiency)
      const removeCount = Math.max(1, Math.floor(this.maxSize * 0.1));
      const keysToRemove = Array.from(this.cache.keys()).slice(0, removeCount);
      keysToRemove.forEach(k => this.cache.delete(k));
    }

    this.cache.set(key, entry);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  // Get cache statistics
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

export class CompositeStrategy implements RecallStrategy {
  name = 'composite';

  private strategies: StrategyWeight[];
  private scoreCache: LRUCache<string, number>;

  constructor(config: { strategies: StrategyWeight[] } | StrategyWeight[]) {
    // Handle both object with strategies property and direct array
    const strategies = Array.isArray(config) ? config : config.strategies;

    // Validate strategies
    if (!strategies || strategies.length === 0) {
      throw new Error('CompositeStrategy requires at least one strategy');
    }

    // Validate weights
    for (const s of strategies) {
      if (s.weight < 0) {
        throw new Error('Strategy weights must be non-negative');
      }
    }

    // Normalize weights to sum to 1
    const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight <= 0) {
      throw new Error('Total weight must be greater than zero');
    }

    this.strategies = strategies.map(s => ({
      strategy: s.strategy,
      weight: s.weight / totalWeight,
    }));

    // Initialize optimized score cache with TTL
    this.scoreCache = new LRUCache<string, number>(1000, 10 * 60 * 1000); // 10 minutes TTL
  }

  // Generate a cache key for memory-query pairs
  private getCacheKey(memoryId: string, query: string): string {
    return `${memoryId}:${query}`;
  }

  async recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]> {
    if (!memories.length) return [];
    if (!query?.trim()) return memories;

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

    // Pre-process memories for faster text matching
    const preprocessedMemories = memories.map(memory => ({
      memory,
      contentLower: memory.content.toLowerCase(),
      tagsLower: memory.tags.map(tag => tag.toLowerCase()),
      metadataStr: memory.metadata ? JSON.stringify(memory.metadata).toLowerCase() : '',
    }));

    // Use batch processing for large memory sets
    const batchSize = 100;
    const allScoredMemories: { memory: MemoryItem; score: number }[] = [];

    for (let i = 0; i < preprocessedMemories.length; i += batchSize) {
      const batch = preprocessedMemories.slice(i, i + batchSize);

      const batchScored = await Promise.all(
        batch.map(async ({ memory, contentLower, tagsLower, metadataStr }) => {
          // Fast text matching using preprocessed data
          const allWordsInContent = queryWords.every(word => contentLower.includes(word));
          const allWordsInTags = queryWords.every(word =>
            tagsLower.some(tag => tag.includes(word))
          );
          const allWordsInMetadata = queryWords.every(word => metadataStr.includes(word));

          const matches = allWordsInContent || allWordsInTags || allWordsInMetadata;

          if (!matches) {
            return { memory, score: 0 };
          }

          // Check cache first for this memory-query combination
          const cacheKey = this.getCacheKey(memory.id, query);
          const cachedScore = this.scoreCache.get(cacheKey);

          if (cachedScore !== undefined) {
            return { memory, score: cachedScore };
          }

          // Calculate weighted score from all strategies
          let totalScore = 0;
          for (const { strategy, weight } of this.strategies) {
            const score = strategy.score(memory, query);
            totalScore += score * weight;
          }

          // Cache the result
          this.scoreCache.set(cacheKey, totalScore);

          return { memory, score: totalScore };
        })
      );

      allScoredMemories.push(...batchScored);
    }

    // Filter out zero scores and sort by score (use native sort for better performance)
    const relevant = allScoredMemories
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return relevant.map(item => item.memory);
  }

  score(memory: MemoryItem, query: string): number {
    // Check cache first
    const cacheKey = this.getCacheKey(memory.id, query);
    const cachedScore = this.scoreCache.get(cacheKey);

    if (cachedScore !== undefined) {
      return cachedScore;
    }

    // Calculate score
    let totalScore = 0;

    for (const { strategy, weight } of this.strategies) {
      const score = strategy.score(memory, query);
      totalScore += score * weight;
    }

    // Cache the result
    this.scoreCache.set(cacheKey, totalScore);

    return totalScore;
  }

  addStrategy(strategy: RecallStrategy, weight: number): void {
    this.strategies.push({ strategy, weight });
    this.normalizeWeights();
    // Clear cache since scoring will change
    this.scoreCache.clear();
  }

  removeStrategy(strategyName: string): void {
    this.strategies = this.strategies.filter(
      s => s.strategy.name !== strategyName,
    );
    this.normalizeWeights();
    // Clear cache since scoring will change
    this.scoreCache.clear();
  }

  updateWeight(strategyName: string, newWeight: number): void {
    const strategy = this.strategies.find(
      s => s.strategy.name === strategyName,
    );
    if (strategy) {
      strategy.weight = newWeight;
      this.normalizeWeights();
      // Clear cache since scoring will change
      this.scoreCache.clear();
    }
  }

  private normalizeWeights(): void {
    const totalWeight = this.strategies.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight > 0) {
      this.strategies.forEach(s => {
        s.weight = s.weight / totalWeight;
      });
    }
  }
}
