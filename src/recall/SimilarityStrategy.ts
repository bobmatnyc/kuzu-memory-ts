import type { MemoryItem, RecallStrategy } from '../types';

export class SimilarityStrategy implements RecallStrategy {
  name = 'similarity';

  private embeddingFunction?: (text: string) => Promise<number[]>;

  constructor(embeddingFunction?: (text: string) => Promise<number[]>) {
    this.embeddingFunction = embeddingFunction;
  }

  async recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]> {
    // Handle empty query - return empty array
    if (!query || !query.trim()) {
      return [];
    }

    // If no embedding function, fall back to text similarity
    if (!this.embeddingFunction) {
      return this.textSimilarityRecall(query, memories);
    }

    // Get query embedding
    const queryEmbedding = await this.embeddingFunction(query);

    // Calculate cosine similarity for each memory with embedding
    const scoredMemories = memories.map(memory => ({
      memory,
      score: memory.embedding
        ? this.cosineSimilarity(queryEmbedding, memory.embedding)
        : this.textSimilarity(query, memory.content),
    }));

    // Sort by similarity score
    scoredMemories.sort((a, b) => b.score - a.score);

    return scoredMemories.map(item => item.memory);
  }

  score(memory: MemoryItem, query: string): number {
    // If memory has embedding and we can compute query embedding, use cosine similarity
    if (memory.embedding && this.embeddingFunction) {
      // This is async, so we'd need to handle this differently in practice
      // For now, return text similarity
      return this.textSimilarity(query, memory.content);
    }

    return this.textSimilarity(query, memory.content);
  }

  private textSimilarityRecall(query: string, memories: MemoryItem[]): MemoryItem[] {
    // Handle empty query
    if (!query || !query.trim()) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const scoredMemories = memories.map(memory => ({
      memory,
      score: this.textSimilarity(query, memory.content),
      // Also check for exact matches in content/tags
      hasMatch: memory.content.toLowerCase().includes(queryLower) ||
                memory.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
                (memory.metadata && JSON.stringify(memory.metadata).toLowerCase().includes(queryLower)),
    }));

    // Filter out memories with no matches and very low similarity scores
    const filtered = scoredMemories.filter(item =>
      item.hasMatch || item.score > 0.1, // Keep if has exact match or decent similarity
    );

    // Return empty if no relevant results
    if (filtered.length === 0) {
      return [];
    }

    filtered.sort((a, b) => b.score - a.score);
    return filtered.map(item => item.memory);
  }

  private textSimilarity(text1: string, text2: string): number {
    // Enhanced text similarity with multiple factors
    const queryWords = text1.toLowerCase().split(/\s+/);
    const contentWords = text2.toLowerCase().split(/\s+/);
    const contentLower = text2.toLowerCase();

    // 1. Check if all query words appear in content (even if not adjacent)
    const allQueryWordsFound = queryWords.every(word => contentLower.includes(word));
    if (allQueryWordsFound) {
      // Boost score significantly if all query words are found
      return 0.8 + (0.2 * this.jaccardSimilarity(queryWords, contentWords));
    }

    // 2. Count how many query words are found
    const foundWords = queryWords.filter(word => contentLower.includes(word));
    const foundRatio = foundWords.length / queryWords.length;

    // 3. Jaccard similarity
    const jaccardScore = this.jaccardSimilarity(queryWords, contentWords);

    // Combine scores with weights
    return (foundRatio * 0.6) + (jaccardScore * 0.4);
  }

  private jaccardSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(w => set2.has(w)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i]! * vec2[i]!;
      norm1 += vec1[i]! * vec1[i]!;
      norm2 += vec2[i]! * vec2[i]!;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
