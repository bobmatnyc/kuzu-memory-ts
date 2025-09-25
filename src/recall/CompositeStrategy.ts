import type { MemoryItem, RecallStrategy } from '../types';

export interface StrategyWeight {
  strategy: RecallStrategy;
  weight: number;
}

export class CompositeStrategy implements RecallStrategy {
  name = 'composite';

  private strategies: StrategyWeight[];

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
  }

  async recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]> {
    // Filter by query if provided (similar to individual strategies)
    let filtered = memories;
    if (query && query.trim()) {
      const queryLower = query.toLowerCase();
      filtered = memories.filter(memory =>
        memory.content.toLowerCase().includes(queryLower) ||
        memory.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
        (memory.metadata && JSON.stringify(memory.metadata).toLowerCase().includes(queryLower))
      );
    }

    // Calculate composite scores for each filtered memory
    const scoredMemories = await Promise.all(
      filtered.map(async memory => {
        let totalScore = 0;

        for (const { strategy, weight } of this.strategies) {
          const score = strategy.score(memory, query);
          totalScore += score * weight;
        }

        return { memory, score: totalScore };
      })
    );

    // Sort by composite score
    scoredMemories.sort((a, b) => b.score - a.score);

    return scoredMemories.map(item => item.memory);
  }

  score(memory: MemoryItem, query: string): number {
    let totalScore = 0;

    for (const { strategy, weight } of this.strategies) {
      const score = strategy.score(memory, query);
      totalScore += score * weight;
    }

    return totalScore;
  }

  addStrategy(strategy: RecallStrategy, weight: number): void {
    this.strategies.push({ strategy, weight });
    this.normalizeWeights();
  }

  removeStrategy(strategyName: string): void {
    this.strategies = this.strategies.filter(
      s => s.strategy.name !== strategyName
    );
    this.normalizeWeights();
  }

  updateWeight(strategyName: string, newWeight: number): void {
    const strategy = this.strategies.find(
      s => s.strategy.name === strategyName
    );
    if (strategy) {
      strategy.weight = newWeight;
      this.normalizeWeights();
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