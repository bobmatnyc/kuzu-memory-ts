import type { MemoryQuery, MemoryType } from '../types';

/**
 * Fluent query builder for complex memory queries
 * Provides a more intuitive API for building queries
 */
export class MemoryQueryBuilder {
  private query: Partial<MemoryQuery> = {
    limit: 10,
    offset: 0,
    sortBy: 'relevance',
    sortOrder: 'desc',
  };

  /**
   * Set the text search query
   */
  withText(text: string): this {
    this.query.text = text;
    return this;
  }

  /**
   * Filter by memory type
   */
  ofType(type: MemoryType): this {
    this.query.type = type;
    return this;
  }

  /**
   * Filter by tags (any match)
   */
  withTags(...tags: string[]): this {
    this.query.tags = tags;
    return this;
  }

  /**
   * Filter by all tags (must have all)
   */
  withAllTags(...tags: string[]): this {
    // Store in metadata for custom handling
    if (!this.query.tags) {
      this.query.tags = [];
    }
    this.query.tags = [...new Set([...this.query.tags, ...tags])];
    return this;
  }

  /**
   * Filter by date range
   */
  between(start: Date, end: Date): this {
    this.query.dateRange = { start, end };
    return this;
  }

  /**
   * Filter by date - memories after this date
   */
  after(date: Date): this {
    this.query.dateRange = {
      start: date,
      end: new Date('2100-01-01'), // Far future date
    };
    return this;
  }

  /**
   * Filter by date - memories before this date
   */
  before(date: Date): this {
    this.query.dateRange = {
      start: new Date('1970-01-01'), // Unix epoch
      end: date,
    };
    return this;
  }

  /**
   * Memories from the last N days
   */
  inLastDays(days: number): this {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return this.between(start, end);
  }

  /**
   * Memories from the last N hours
   */
  inLastHours(hours: number): this {
    const end = new Date();
    const start = new Date();
    start.setHours(start.getHours() - hours);
    return this.between(start, end);
  }

  /**
   * Set the result limit
   */
  limit(limit: number): this {
    if (limit <= 0) {
      throw new Error('Limit must be positive');
    }
    this.query.limit = limit;
    return this;
  }

  /**
   * Set the offset for pagination
   */
  offset(offset: number): this {
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }
    this.query.offset = offset;
    return this;
  }

  /**
   * Paginate results
   */
  page(pageNumber: number, pageSize: number = 10): this {
    if (pageNumber < 1) {
      throw new Error('Page number must be >= 1');
    }
    return this.limit(pageSize).offset((pageNumber - 1) * pageSize);
  }

  /**
   * Sort by a specific field
   */
  sortBy(field: 'relevance' | 'timestamp' | 'importance' | 'accessCount'): this {
    this.query.sortBy = field;
    return this;
  }

  /**
   * Set sort order
   */
  orderBy(order: 'asc' | 'desc'): this {
    this.query.sortOrder = order;
    return this;
  }

  /**
   * Sort by most recent
   */
  mostRecent(): this {
    return this.sortBy('timestamp').orderBy('desc');
  }

  /**
   * Sort by most important
   */
  mostImportant(): this {
    return this.sortBy('importance').orderBy('desc');
  }

  /**
   * Sort by most accessed
   */
  mostAccessed(): this {
    return this.sortBy('accessCount').orderBy('desc');
  }

  /**
   * Sort by relevance (default for text searches)
   */
  byRelevance(): this {
    return this.sortBy('relevance').orderBy('desc');
  }

  /**
   * Get all memories without limit
   */
  all(): this {
    this.query.limit = 10000; // Practical upper limit
    return this;
  }

  /**
   * Get just the first result
   */
  first(): this {
    return this.limit(1);
  }

  /**
   * Build the final query
   */
  build(): MemoryQuery {
    // Ensure all required fields have defaults
    const finalQuery: MemoryQuery = {
      limit: this.query.limit ?? 10,
      offset: this.query.offset ?? 0,
      sortBy: this.query.sortBy ?? 'relevance',
      sortOrder: this.query.sortOrder ?? 'desc',
      ...this.query,
    };

    return finalQuery;
  }

  /**
   * Clone the builder for reuse
   */
  clone(): MemoryQueryBuilder {
    const newBuilder = new MemoryQueryBuilder();
    newBuilder.query = { ...this.query };
    if (this.query.dateRange) {
      newBuilder.query.dateRange = { ...this.query.dateRange };
    }
    if (this.query.tags) {
      newBuilder.query.tags = [...this.query.tags];
    }
    return newBuilder;
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.query = {
      limit: 10,
      offset: 0,
      sortBy: 'relevance',
      sortOrder: 'desc',
    };
    return this;
  }
}

/**
 * Factory function for creating a new query builder
 */
export function memoryQuery(): MemoryQueryBuilder {
  return new MemoryQueryBuilder();
}

/**
 * Preset query builders for common use cases
 */
export const MemoryQueries = {
  /**
   * Get recent memories
   */
  recent: (limit: number = 10) =>
    memoryQuery().mostRecent().limit(limit),

  /**
   * Get important memories
   */
  important: (limit: number = 10) =>
    memoryQuery().mostImportant().limit(limit),

  /**
   * Get frequently accessed memories
   */
  frequent: (limit: number = 10) =>
    memoryQuery().mostAccessed().limit(limit),

  /**
   * Search memories by text
   */
  search: (text: string, limit: number = 10) =>
    memoryQuery().withText(text).byRelevance().limit(limit),

  /**
   * Get memories by type
   */
  byType: (type: MemoryType, limit: number = 10) =>
    memoryQuery().ofType(type).mostRecent().limit(limit),

  /**
   * Get today's memories
   */
  today: () =>
    memoryQuery().inLastHours(24).mostRecent(),

  /**
   * Get this week's memories
   */
  thisWeek: () =>
    memoryQuery().inLastDays(7).mostRecent(),

  /**
   * Get memories with specific tags
   */
  tagged: (...tags: string[]) =>
    memoryQuery().withTags(...tags).mostRecent(),
};
