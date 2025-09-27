import type { MemoryItem, RecallStrategy } from '../types';

export class RecencyStrategy implements RecallStrategy {
  name = 'recency';

  async recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]> {
    // Filter by query if provided
    let filtered = memories;
    if (query && query.trim()) {
      const queryLower = query.toLowerCase();
      filtered = memories.filter(memory =>
        memory.content.toLowerCase().includes(queryLower) ||
        memory.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
        (memory.metadata && JSON.stringify(memory.metadata).toLowerCase().includes(queryLower)),
      );
    }

    // Sort by timestamp, most recent first
    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }

  score(memory: MemoryItem, _query: string): number {
    // Score based on how recent the memory is
    const now = Date.now();
    const memoryTime = new Date(memory.timestamp).getTime();
    const ageInHours = (now - memoryTime) / (1000 * 60 * 60);

    // Exponential decay: more recent = higher score
    // Score approaches 0 as age increases
    return Math.exp(-ageInHours / 24); // Half-life of ~24 hours
  }
}
