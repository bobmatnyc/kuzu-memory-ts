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
        }),
      ),
    );

    return items.map(item => ({
      ...this.normalizeItem(item),
      lastAccessed: now,
      accessCount: (item.accessCount || 0) + 1,
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

  /**
   * Apply filters to the collection
   */
  private applyFilters(collection: Dexie.Collection<MemoryItem, string>, query: MemoryQuery): Dexie.Collection<MemoryItem, string> {
    let filtered = collection;

    // Filter by type
    if (query.type) {
      filtered = filtered.filter(item => item.type === query.type);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter(item =>
        query.tags!.some(tag => item.tags.includes(tag)),
      );
    }

    // Filter by date range
    if (query.dateRange) {
      filtered = filtered.filter(item => {
        const timestamp = new Date(item.timestamp);
        return timestamp >= query.dateRange!.start && timestamp <= query.dateRange!.end;
      });
    }

    return filtered;
  }

  /**
   * Apply text search to items
   */
  private applyTextSearch(items: MemoryItem[], searchText: string | undefined): MemoryItem[] {
    if (!searchText) {
      return items;
    }

    const normalizedSearch = searchText.toLowerCase();
    return items.filter(item =>
      this.itemMatchesText(item, normalizedSearch),
    );
  }

  /**
   * Check if an item matches search text
   */
  private itemMatchesText(item: MemoryItem, searchText: string): boolean {
    // Check content
    if (item.content.toLowerCase().includes(searchText)) {
      return true;
    }

    // Check tags
    if (item.tags.some(tag => tag.toLowerCase().includes(searchText))) {
      return true;
    }

    // Check metadata
    if (item.metadata) {
      const metadataStr = JSON.stringify(item.metadata).toLowerCase();
      if (metadataStr.includes(searchText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sort items according to query parameters
   */
  private sortItems(items: MemoryItem[], query: MemoryQuery): MemoryItem[] {
    const sorted = [...items];

    sorted.sort((a, b) => {
      const compareValue = this.compareItems(a, b, query.sortBy);
      return query.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }

  /**
   * Compare two items for sorting
   */
  private compareItems(a: MemoryItem, b: MemoryItem, sortBy: string): number {
    switch (sortBy) {
      case 'timestamp':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

      case 'importance':
        return (a.importance || 0) - (b.importance || 0);

      case 'accessCount':
        return (a.accessCount || 0) - (b.accessCount || 0);

      case 'relevance':
      default:
        // For relevance, we use importance as a proxy for now
        // In a real implementation, this would use text similarity scores
        return (a.importance || 0) - (b.importance || 0);
    }
  }

  /**
   * Apply pagination to results
   */
  private paginate<T>(items: T[], offset: number, limit: number): T[] {
    const start = Math.max(0, offset);
    const end = start + Math.max(1, limit);
    return items.slice(start, end);
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    // Step 1: Apply database-level filters
    const collection = this.applyFilters(this.memories.toCollection(), query);

    // Step 2: Get all matching items from database
    let items = await collection.toArray();

    // Step 3: Apply text search (in-memory)
    items = this.applyTextSearch(items, query.text);

    // Step 4: Sort items
    items = this.sortItems(items, query);

    // Step 5: Apply pagination
    items = this.paginate(items, query.offset || 0, query.limit || 10);

    // Step 6: Normalize items before returning
    return items.map(item => this.normalizeItem(item));
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
