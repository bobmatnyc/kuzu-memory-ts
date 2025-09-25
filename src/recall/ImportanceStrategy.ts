import type { MemoryItem, RecallStrategy } from '../types';

export class ImportanceStrategy implements RecallStrategy {
  name = 'importance';

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

    // Sort by importance score, highest first
    return [...filtered].sort((a, b) => {
      const importanceA = a.importance || 0;
      const importanceB = b.importance || 0;
      return importanceB - importanceA;
    });
  }

  score(memory: MemoryItem, query: string): number {
    // Return the importance score directly
    // Could be enhanced with query relevance
    return memory.importance || 0;
  }
}