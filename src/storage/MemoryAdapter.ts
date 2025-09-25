import type { MemoryItem, MemoryQuery, StorageAdapter, MemoryType } from '../types';
import { generateUUID } from '../utils/helpers';

export class MemoryAdapter implements StorageAdapter {
  private memories: Map<string, MemoryItem> = new Map();

  async init(): Promise<void> {
    // No initialization needed for in-memory storage
  }

  async get(id: string): Promise<MemoryItem | null> {
    const item = this.memories.get(id);
    if (item) {
      item.lastAccessed = new Date();
      item.accessCount = (item.accessCount || 0) + 1;
      this.memories.set(id, item);
    }
    return item || null;
  }

  async getMany(ids: string[]): Promise<MemoryItem[]> {
    const now = new Date();
    const items: MemoryItem[] = [];

    for (const id of ids) {
      const item = this.memories.get(id);
      if (item) {
        item.lastAccessed = now;
        item.accessCount = (item.accessCount || 0) + 1;
        this.memories.set(id, item);
        items.push(item);
      }
    }

    return items;
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const newItem: MemoryItem = {
      ...item,
      id: generateUUID(),
      timestamp: item.timestamp || new Date(),
      accessCount: item.accessCount ?? 0,
      tags: item.tags || [],
      importance: item.importance ?? 0.5,
      decay: item.decay ?? 0.1,
      relations: item.relations || [],
    };

    this.memories.set(newItem.id, newItem);
    return newItem;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const existing = this.memories.get(id);
    if (!existing) {
      throw new Error(`Memory with id ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    this.memories.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.memories.delete(id);
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    // Validate query parameters
    if (query.limit !== undefined && query.limit < 0) {
      throw new Error('Query limit must be non-negative');
    }
    if (query.offset !== undefined && query.offset < 0) {
      throw new Error('Query offset must be non-negative');
    }

    let items = Array.from(this.memories.values());

    // Filter by type
    if (query.type) {
      items = items.filter(item => item.type === query.type);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      items = items.filter(item =>
        query.tags!.some(tag => item.tags.includes(tag))
      );
    }

    // Filter by date range
    if (query.dateRange) {
      items = items.filter(item => {
        const timestamp = new Date(item.timestamp);
        return timestamp >= query.dateRange!.start && timestamp <= query.dateRange!.end;
      });
    }

    // Text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      items = items.filter(item =>
        item.content.toLowerCase().includes(searchText) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchText))
      );
    }

    // Sort items
    items.sort((a, b) => {
      let compareValue = 0;

      switch (query.sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'importance':
          compareValue = (a.importance || 0) - (b.importance || 0);
          break;
        case 'accessCount':
          compareValue = (a.accessCount || 0) - (b.accessCount || 0);
          break;
        case 'relevance':
        default:
          compareValue = (a.importance || 0) - (b.importance || 0);
          break;
      }

      return query.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    // Apply pagination
    const start = query.offset || 0;
    const end = start + (query.limit || 10);
    return items.slice(start, end);
  }

  async clear(): Promise<void> {
    this.memories.clear();
  }

  async getStats(): Promise<{
    totalItems: number;
    byType: Record<MemoryType, number>;
    avgAccessCount: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }> {
    const items = Array.from(this.memories.values());
    const byType: Record<string, number> = {};
    let totalAccessCount = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    for (const item of items) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalAccessCount += item.accessCount || 0;

      const itemDate = new Date(item.timestamp);
      if (!oldestDate || itemDate < oldestDate) {
        oldestDate = itemDate;
      }
      if (!newestDate || itemDate > newestDate) {
        newestDate = itemDate;
      }
    }

    return {
      totalItems: items.length,
      byType: byType as Record<MemoryType, number>,
      avgAccessCount: items.length > 0 ? totalAccessCount / items.length : 0,
      oldestItem: oldestDate,
      newestItem: newestDate,
    };
  }
}