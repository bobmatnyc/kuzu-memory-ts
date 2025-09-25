import type { MemoryItem, RecallStrategy } from '../types';

export class FrequencyStrategy implements RecallStrategy {
  name = 'frequency';

  async recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]> {
    // Filter by query if provided
    let filtered = memories;
    if (query && query.trim()) {
      const queryLower = query.toLowerCase();
      filtered = memories.filter(memory =>
        memory.content.toLowerCase().includes(queryLower) ||
        memory.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
        (memory.metadata && JSON.stringify(memory.metadata).toLowerCase().includes(queryLower))
      );
    }

    // Sort by access count, most accessed first
    return [...filtered].sort((a, b) => {
      const countA = a.accessCount || 0;
      const countB = b.accessCount || 0;
      return countB - countA;
    });
  }

  score(memory: MemoryItem, query: string): number {
    // Normalize access count to 0-1 range
    // Using logarithmic scale to handle large differences
    const accessCount = memory.accessCount || 0;
    if (accessCount === 0) return 0;

    // Log scale with base 10, capped at 1
    return Math.min(1, Math.log10(accessCount + 1) / 3); // Assumes 1000 accesses = max score
  }
}