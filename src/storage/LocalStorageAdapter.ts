import type { MemoryItem, MemoryQuery, StorageAdapter, MemoryType } from '../types';
import { generateUUID } from '../utils/helpers';

export class LocalStorageAdapter implements StorageAdapter {
  private readonly storageKey: string;

  constructor(storageKey: string = 'kuzu-memories') {
    this.storageKey = storageKey;
  }

  private getMemories(): Map<string, MemoryItem> {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return new Map();

      const parsed = JSON.parse(data);
      const map = new Map<string, MemoryItem>();

      for (const [id, item] of Object.entries(parsed)) {
        const memory = item as any;
        // Convert date strings back to Date objects
        memory.timestamp = new Date(memory.timestamp);
        if (memory.lastAccessed) {
          memory.lastAccessed = new Date(memory.lastAccessed);
        }
        map.set(id, memory as MemoryItem);
      }

      return map;
    } catch (error) {
      console.error('Error loading memories from localStorage:', error);
      return new Map();
    }
  }

  private saveMemories(memories: Map<string, MemoryItem>): void {
    try {
      const obj: Record<string, MemoryItem> = {};
      for (const [id, item] of memories) {
        obj[id] = item;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (error) {
      console.error('Error saving memories to localStorage:', error);
      throw error;
    }
  }

  async init(): Promise<void> {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }
  }

  async get(id: string): Promise<MemoryItem | null> {
    const memories = this.getMemories();
    const item = memories.get(id);

    if (item) {
      item.lastAccessed = new Date();
      item.accessCount = (item.accessCount || 0) + 1;
      memories.set(id, item);
      this.saveMemories(memories);
    }

    return item || null;
  }

  async getMany(ids: string[]): Promise<MemoryItem[]> {
    const memories = this.getMemories();
    const now = new Date();
    const items: MemoryItem[] = [];

    for (const id of ids) {
      const item = memories.get(id);
      if (item) {
        item.lastAccessed = now;
        item.accessCount = (item.accessCount || 0) + 1;
        memories.set(id, item);
        items.push(item);
      }
    }

    if (items.length > 0) {
      this.saveMemories(memories);
    }

    return items;
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const memories = this.getMemories();
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

    memories.set(newItem.id, newItem);
    this.saveMemories(memories);
    return newItem;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const memories = this.getMemories();
    const existing = memories.get(id);

    if (!existing) {
      throw new Error(`Memory with id ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    memories.set(id, updated);
    this.saveMemories(memories);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const memories = this.getMemories();
    memories.delete(id);
    this.saveMemories(memories);
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    const memories = this.getMemories();
    let items = Array.from(memories.values());

    // Filter by type
    if (query.type) {
      items = items.filter(item => item.type === query.type);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      items = items.filter(item =>
        query.tags!.some(tag => item.tags.includes(tag)),
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
        item.tags.some(tag => tag.toLowerCase().includes(searchText)),
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
    localStorage.removeItem(this.storageKey);
  }

  async getStats(): Promise<{
    totalItems: number;
    byType: Record<MemoryType, number>;
    avgAccessCount: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }> {
    const memories = this.getMemories();
    const items = Array.from(memories.values());
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
