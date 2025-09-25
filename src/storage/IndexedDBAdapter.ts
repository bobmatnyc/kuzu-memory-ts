import Dexie, { Table } from 'dexie';
import type { MemoryItem, MemoryQuery, StorageAdapter, MemoryType } from '../types';
import { generateUUID } from '../utils/helpers';

export class IndexedDBAdapter implements StorageAdapter {
  private db: Dexie;
  private memories: Table<MemoryItem, string>;

  constructor(dbName: string = 'kuzu-memory', version: number = 1) {
    this.db = new Dexie(dbName);

    this.db.version(version).stores({
      memories: 'id, type, timestamp, importance, accessCount, *tags',
    });

    this.memories = this.db.table('memories');
  }

  private normalizeItem(item: any): MemoryItem {
    return {
      ...item,
      timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
      lastAccessed: item.lastAccessed instanceof Date ? item.lastAccessed : new Date(item.lastAccessed),
    };
  }

  async init(): Promise<void> {
    await this.db.open();
  }

  async get(id: string): Promise<MemoryItem | null> {
    const item = await this.memories.get(id);
    if (item) {
      // Ensure dates are properly converted from strings if needed
      const normalizedItem = this.normalizeItem(item);
      await this.memories.update(id, {
        lastAccessed: new Date(),
        accessCount: (item.accessCount || 0) + 1,
      });
      return { ...normalizedItem, lastAccessed: new Date(), accessCount: (item.accessCount || 0) + 1 };
    }
    return null;
  }

  async getMany(ids: string[]): Promise<MemoryItem[]> {
    const items = await this.memories.where('id').anyOf(ids).toArray();

    // Update access metadata
    const now = new Date();
    await Promise.all(
      items.map(item =>
        this.memories.update(item.id, {
          lastAccessed: now,
          accessCount: (item.accessCount || 0) + 1,
        })
      )
    );

    return items.map(item => ({
      ...this.normalizeItem(item),
      lastAccessed: now,
      accessCount: (item.accessCount || 0) + 1
    }));
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

    await this.memories.add(newItem);
    return newItem;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    await this.memories.update(id, updates);
    const updated = await this.memories.get(id);
    if (!updated) {
      throw new Error(`Memory with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.memories.delete(id);
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    let collection = this.memories.toCollection();

    // Filter by type
    if (query.type) {
      collection = collection.filter(item => item.type === query.type);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      collection = collection.filter(item =>
        query.tags!.some(tag => item.tags.includes(tag))
      );
    }

    // Filter by date range
    if (query.dateRange) {
      collection = collection.filter(item => {
        const timestamp = new Date(item.timestamp);
        return timestamp >= query.dateRange!.start && timestamp <= query.dateRange!.end;
      });
    }

    // Get all matching items
    let items = await collection.toArray();

    // Text search (simple implementation - could be enhanced with full-text search)
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
          // For relevance, we use importance as a proxy for now
          compareValue = (a.importance || 0) - (b.importance || 0);
          break;
      }

      return query.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    // Apply pagination
    const start = query.offset || 0;
    const end = start + (query.limit || 10);
    return items.slice(start, end).map(item => this.normalizeItem(item));
  }

  async clear(): Promise<void> {
    await this.memories.clear();
  }

  async getStats(): Promise<{
    totalItems: number;
    byType: Record<MemoryType, number>;
    avgAccessCount: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }> {
    const allItems = await this.memories.toArray();

    const byType: Record<string, number> = {};
    let totalAccessCount = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    for (const item of allItems) {
      // Count by type
      byType[item.type] = (byType[item.type] || 0) + 1;

      // Sum access counts
      totalAccessCount += item.accessCount || 0;

      // Track dates
      const itemDate = new Date(item.timestamp);
      if (!oldestDate || itemDate < oldestDate) {
        oldestDate = itemDate;
      }
      if (!newestDate || itemDate > newestDate) {
        newestDate = itemDate;
      }
    }

    return {
      totalItems: allItems.length,
      byType: byType as Record<MemoryType, number>,
      avgAccessCount: allItems.length > 0 ? totalAccessCount / allItems.length : 0,
      oldestItem: oldestDate,
      newestItem: newestDate,
    };
  }
}