import { EventEmitter } from 'events';

/**
 * Domain event interface
 */
export interface DomainEvent {
  aggregateId: string;
  eventType: string;
  eventData: any;
  timestamp: Date;
  version: number;
}

/**
 * Event store for capturing and replaying domain events
 */
export class EventStore extends EventEmitter {
  private events: DomainEvent[] = [];
  private snapshots: Map<string, any> = new Map();
  private version: number = 0;

  /**
   * Append an event to the store
   */
  async append(event: Omit<DomainEvent, 'timestamp' | 'version'>): Promise<void> {
    const fullEvent: DomainEvent = {
      ...event,
      timestamp: new Date(),
      version: ++this.version,
    };

    this.events.push(fullEvent);
    this.emit('event:appended', fullEvent);

    // Emit specific event type
    this.emit(event.eventType, fullEvent);
  }

  /**
   * Get all events for an aggregate
   */
  getEvents(aggregateId: string, fromVersion?: number): DomainEvent[] {
    return this.events.filter(event =>
      event.aggregateId === aggregateId &&
      (!fromVersion || event.version > fromVersion),
    );
  }

  /**
   * Get all events of a specific type
   */
  getEventsByType(eventType: string): DomainEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  /**
   * Get events within a time range
   */
  getEventsByTimeRange(start: Date, end: Date): DomainEvent[] {
    const startTime = start.getTime();
    const endTime = end.getTime();

    return this.events.filter(event => {
      const eventTime = event.timestamp.getTime();
      return eventTime >= startTime && eventTime <= endTime;
    });
  }

  /**
   * Save a snapshot of an aggregate state
   */
  saveSnapshot(aggregateId: string, state: any, version: number): void {
    this.snapshots.set(aggregateId, {
      state,
      version,
      timestamp: new Date(),
    });
  }

  /**
   * Get the latest snapshot for an aggregate
   */
  getSnapshot(aggregateId: string): { state: any; version: number } | null {
    const snapshot = this.snapshots.get(aggregateId);
    return snapshot || null;
  }

  /**
   * Replay events to rebuild state
   */
  replay<T>(
    aggregateId: string,
    applyEvent: (state: T, event: DomainEvent) => T,
    initialState?: T,
  ): T | null {
    // Try to get snapshot first
    const snapshot = this.getSnapshot(aggregateId);
    let state = initialState ?? (snapshot?.state as T);

    if (!state) {
      return null;
    }

    // Get events after snapshot
    const fromVersion = snapshot?.version || 0;
    const events = this.getEvents(aggregateId, fromVersion);

    // Apply each event to rebuild state
    for (const event of events) {
      state = applyEvent(state, event);
    }

    return state;
  }

  /**
   * Clear all events before a certain date
   */
  prune(before: Date): number {
    const beforeTime = before.getTime();
    const originalLength = this.events.length;

    this.events = this.events.filter(event =>
      event.timestamp.getTime() >= beforeTime,
    );

    return originalLength - this.events.length;
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEvents: number;
    eventTypes: Record<string, number>;
    aggregates: Set<string>;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  } {
    const stats = {
      totalEvents: this.events.length,
      eventTypes: {} as Record<string, number>,
      aggregates: new Set<string>(),
      oldestEvent: null as Date | null,
      newestEvent: null as Date | null,
    };

    if (this.events.length === 0) {
      return stats;
    }

    for (const event of this.events) {
      // Count event types
      stats.eventTypes[event.eventType] = (stats.eventTypes[event.eventType] || 0) + 1;

      // Track unique aggregates
      stats.aggregates.add(event.aggregateId);
    }

    // Get date range
    stats.oldestEvent = this.events[0]!.timestamp;
    stats.newestEvent = this.events[this.events.length - 1]!.timestamp;

    return stats;
  }

  /**
   * Export events for persistence
   */
  export(): DomainEvent[] {
    return [...this.events];
  }

  /**
   * Import events from persistence
   */
  import(events: DomainEvent[]): void {
    // Sort by version to ensure correct order
    const sorted = [...events].sort((a, b) => a.version - b.version);

    this.events = sorted;

    // Update version counter
    if (sorted.length > 0) {
      this.version = sorted[sorted.length - 1]!.version;
    }
  }

  /**
   * Clear all events and snapshots
   */
  clear(): void {
    this.events = [];
    this.snapshots.clear();
    this.version = 0;
    this.emit('store:cleared');
  }
}
