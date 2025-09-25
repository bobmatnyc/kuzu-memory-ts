import { MemoryItem, MemoryQuery, MemoryType, StorageAdapter } from '../../src/types';
import { generateUUID } from '../../src/utils/helpers';

export class MockStorageAdapter implements StorageAdapter {
  private memories: Map<string, MemoryItem> = new Map();
  private failNextOperation = false;
  private latencyMs = 0;

  async init(): Promise<void> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage initialization failed');
    }
  }

  async get(id: string): Promise<MemoryItem | null> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage get operation failed');
    }
    return this.memories.get(id) || null;
  }

  async getMany(ids: string[]): Promise<MemoryItem[]> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage getMany operation failed');
    }
    return ids.map(id => this.memories.get(id)).filter(Boolean) as MemoryItem[];
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage create operation failed');
    }

    const memory: MemoryItem = {
      id: generateUUID(),
      ...item,
    };

    this.memories.set(memory.id, memory);
    return memory;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage update operation failed');
    }

    const existing = this.memories.get(id);
    if (!existing) {
      throw new Error('Memory not found');
    }

    const updated = { ...existing, ...updates };
    this.memories.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage delete operation failed');
    }
    this.memories.delete(id);
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage query operation failed');
    }

    let results = Array.from(this.memories.values());

    // Filter by type
    if (query.type) {
      results = results.filter(memory => memory.type === query.type);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(memory =>
        query.tags!.some(tag => memory.tags.includes(tag))
      );
    }

    // Filter by date range
    if (query.dateRange) {
      results = results.filter(memory =>
        memory.timestamp >= query.dateRange!.start &&
        memory.timestamp <= query.dateRange!.end
      );
    }

    // Simple text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(memory =>
        memory.content.toLowerCase().includes(searchText)
      );
    }

    // Sort results
    results.sort((a, b) => {
      switch (query.sortBy) {
        case 'timestamp':
          return query.sortOrder === 'asc'
            ? a.timestamp.getTime() - b.timestamp.getTime()
            : b.timestamp.getTime() - a.timestamp.getTime();
        case 'importance':
          return query.sortOrder === 'asc'
            ? a.importance - b.importance
            : b.importance - a.importance;
        case 'accessCount':
          return query.sortOrder === 'asc'
            ? a.accessCount - b.accessCount
            : b.accessCount - a.accessCount;
        default: // relevance
          return 0;
      }
    });

    // Apply pagination
    const start = query.offset || 0;
    const end = start + (query.limit || 10);
    return results.slice(start, end);
  }

  async clear(): Promise<void> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage clear operation failed');
    }
    this.memories.clear();
  }

  async getStats(): Promise<{
    totalItems: number;
    byType: Record<MemoryType, number>;
    avgAccessCount: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }> {
    await this.simulateLatency();
    if (this.failNextOperation) {
      this.failNextOperation = false;
      throw new Error('Mock storage getStats operation failed');
    }

    const memories = Array.from(this.memories.values());
    const byType: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      working: 0,
      sensory: 0,
    };

    let totalAccess = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    for (const memory of memories) {
      byType[memory.type]++;
      totalAccess += memory.accessCount;

      if (!oldestDate || memory.timestamp < oldestDate) {
        oldestDate = memory.timestamp;
      }
      if (!newestDate || memory.timestamp > newestDate) {
        newestDate = memory.timestamp;
      }
    }

    return {
      totalItems: memories.length,
      byType,
      avgAccessCount: memories.length > 0 ? totalAccess / memories.length : 0,
      oldestItem: oldestDate,
      newestItem: newestDate,
    };
  }

  // Test utilities
  setLatency(ms: number): void {
    this.latencyMs = ms;
  }

  failNext(): void {
    this.failNextOperation = true;
  }

  getMemoryCount(): number {
    return this.memories.size;
  }

  private async simulateLatency(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }
  }
}

export class SlowStorageAdapter extends MockStorageAdapter {
  constructor(latencyMs = 100) {
    super();
    this.setLatency(latencyMs);
  }
}

export class FailingStorageAdapter extends MockStorageAdapter {
  constructor() {
    super();
    this.failNext();
  }
}