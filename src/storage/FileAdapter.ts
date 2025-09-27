import type { StorageAdapter, MemoryItem, MemoryQuery, MemoryType } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Node.js modules - dynamically imported
let fs: any;
let path: any;
let os: any;

// Only load Node.js dependencies if we're in Node environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  fs = require('fs');
  path = require('path');
  os = require('os');
}

export class FileAdapter implements StorageAdapter {
  private memories: Map<string, MemoryItem> = new Map();
  private dbPath: string;
  private initialized = false;

  constructor(dbPath?: string) {
    if (path && os) {
      this.dbPath = dbPath || path.join(os.homedir(), '.kuzu-memory-ts', 'memories.json');
    } else {
      this.dbPath = dbPath || '.kuzu-memory-ts/memories.json';
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs || !path) {
      throw new Error('FileAdapter is only available in Node.js environments');
    }

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing memories if file exists
    if (fs.existsSync(this.dbPath)) {
      try {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(data);
        for (const memory of parsed) {
          // Convert date strings back to Date objects
          memory.timestamp = new Date(memory.timestamp);
          if (memory.lastAccessed) {
            memory.lastAccessed = new Date(memory.lastAccessed);
          }
          this.memories.set(memory.id, memory);
        }
      } catch (error) {
        console.error('Error loading memories from file:', error);
      }
    }

    this.initialized = true;
  }

  private async save(): Promise<void> {
    if (!fs) return;

    const memoriesArray = Array.from(this.memories.values());
    fs.writeFileSync(this.dbPath, JSON.stringify(memoriesArray, null, 2));
  }

  async get(id: string): Promise<MemoryItem | null> {
    const memory = this.memories.get(id);
    if (memory) {
      // Update access count and last accessed
      memory.accessCount++;
      memory.lastAccessed = new Date();
      await this.save();
    }
    return memory || null;
  }

  async getMany(ids: string[]): Promise<MemoryItem[]> {
    return ids
      .map(id => this.memories.get(id))
      .filter((m): m is MemoryItem => m !== undefined);
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const id = uuidv4();
    const memory: MemoryItem = { ...item, id };
    this.memories.set(id, memory);
    await this.save();
    return memory;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const existing = this.memories.get(id);
    if (!existing) throw new Error(`Memory with id ${id} not found`);

    const updated = { ...existing, ...updates };
    this.memories.set(id, updated);
    await this.save();
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.memories.delete(id);
    await this.save();
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    let results = Array.from(this.memories.values());

    // Apply filters
    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }

    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(m =>
        m.content.toLowerCase().includes(searchText) ||
        (m.tags && m.tags.some(tag => tag.toLowerCase().includes(searchText)))
      );
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(m =>
        m.tags && query.tags!.some(tag => m.tags!.includes(tag))
      );
    }

    if (query.dateRange) {
      const startTime = query.dateRange.start.getTime();
      const endTime = query.dateRange.end.getTime();
      results = results.filter(m => {
        const memTime = new Date(m.timestamp).getTime();
        return memTime >= startTime && memTime <= endTime;
      });
    }

    // Sort
    results.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (query.sortBy) {
        case 'timestamp':
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case 'importance':
          aVal = a.importance;
          bVal = b.importance;
          break;
        case 'accessCount':
          aVal = a.accessCount;
          bVal = b.accessCount;
          break;
        default: // relevance - use importance as proxy
          aVal = a.importance;
          bVal = b.importance;
      }

      if (query.sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Apply pagination
    const start = query.offset;
    const end = start + query.limit;
    return results.slice(start, end);
  }

  async clear(): Promise<void> {
    this.memories.clear();
    await this.save();
  }

  async getStats(): Promise<{
    totalItems: number;
    byType: Record<MemoryType, number>;
    avgAccessCount: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }> {
    const allMemories = Array.from(this.memories.values());
    const byType: Partial<Record<MemoryType, number>> = {};
    let totalAccess = 0;
    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const memory of allMemories) {
      // Count by type
      byType[memory.type] = (byType[memory.type] || 0) + 1;

      // Sum access counts
      totalAccess += memory.accessCount;

      // Track oldest and newest
      const timestamp = new Date(memory.timestamp);
      if (!oldest || timestamp < oldest) oldest = timestamp;
      if (!newest || timestamp > newest) newest = timestamp;
    }

    return {
      totalItems: allMemories.length,
      byType: byType as Record<MemoryType, number>,
      avgAccessCount: allMemories.length > 0 ? totalAccess / allMemories.length : 0,
      oldestItem: oldest,
      newestItem: newest
    };
  }

  // Cleanup
  destroy(): void {
    this.memories.clear();
    this.initialized = false;
  }
}