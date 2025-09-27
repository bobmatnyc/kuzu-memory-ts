import { EventEmitter } from 'events';

/**
 * Metric types for memory operations
 */
export interface MemoryMetrics {
  operations: {
    creates: number;
    reads: number;
    updates: number;
    deletes: number;
    queries: number;
    recalls: number;
  };
  performance: {
    avgCreateTime: number;
    avgReadTime: number;
    avgUpdateTime: number;
    avgDeleteTime: number;
    avgQueryTime: number;
    avgRecallTime: number;
  };
  storage: {
    totalMemories: number;
    byType: Record<string, number>;
    totalSize: number;
    avgMemorySize: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    lastError: Error | null;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

/**
 * Operation timing interface
 */
interface OperationTiming {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: Error;
}

/**
 * Metrics collector for monitoring memory system performance
 */
export class MetricsCollector extends EventEmitter {
  private metrics: MemoryMetrics;
  private timings: OperationTiming[] = [];
  private maxTimingsHistory = 1000;

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): MemoryMetrics {
    return {
      operations: {
        creates: 0,
        reads: 0,
        updates: 0,
        deletes: 0,
        queries: 0,
        recalls: 0,
      },
      performance: {
        avgCreateTime: 0,
        avgReadTime: 0,
        avgUpdateTime: 0,
        avgDeleteTime: 0,
        avgQueryTime: 0,
        avgRecallTime: 0,
      },
      storage: {
        totalMemories: 0,
        byType: {},
        totalSize: 0,
        avgMemorySize: 0,
      },
      errors: {
        total: 0,
        byType: {},
        lastError: null,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
    };
  }

  /**
   * Start timing an operation
   */
  startOperation(operation: string): string {
    const id = `${operation}-${Date.now()}-${Math.random()}`;
    const timing: OperationTiming = {
      operation,
      startTime: performance.now(),
      success: false,
    };

    this.timings.push(timing);

    // Keep timings history bounded
    if (this.timings.length > this.maxTimingsHistory) {
      this.timings.shift();
    }

    return id;
  }

  /**
   * End timing an operation
   */
  endOperation(id: string, success: boolean = true, error?: Error): void {
    const timing = this.timings.find(t =>
      `${t.operation}-${t.startTime}` === id.substring(0, id.lastIndexOf('-')),
    );

    if (!timing) {
      return;
    }

    timing.endTime = performance.now();
    timing.duration = timing.endTime - timing.startTime;
    timing.success = success;
    timing.error = error;

    // Update metrics
    this.updateOperationMetrics(timing);

    // Emit timing event
    this.emit('operation:complete', timing);
  }

  private updateOperationMetrics(timing: OperationTiming): void {
    if (!timing.duration) return;

    const operation = timing.operation.toLowerCase();

    // Update operation counts
    if (operation.includes('create')) {
      this.metrics.operations.creates++;
      this.updateAverageTime('avgCreateTime', timing.duration, this.metrics.operations.creates);
    } else if (operation.includes('read') || operation.includes('get')) {
      this.metrics.operations.reads++;
      this.updateAverageTime('avgReadTime', timing.duration, this.metrics.operations.reads);
    } else if (operation.includes('update')) {
      this.metrics.operations.updates++;
      this.updateAverageTime('avgUpdateTime', timing.duration, this.metrics.operations.updates);
    } else if (operation.includes('delete')) {
      this.metrics.operations.deletes++;
      this.updateAverageTime('avgDeleteTime', timing.duration, this.metrics.operations.deletes);
    } else if (operation.includes('query')) {
      this.metrics.operations.queries++;
      this.updateAverageTime('avgQueryTime', timing.duration, this.metrics.operations.queries);
    } else if (operation.includes('recall')) {
      this.metrics.operations.recalls++;
      this.updateAverageTime('avgRecallTime', timing.duration, this.metrics.operations.recalls);
    }

    // Update error metrics
    if (!timing.success && timing.error) {
      this.recordError(timing.error);
    }
  }

  private updateAverageTime(
    metricKey: keyof MemoryMetrics['performance'],
    newDuration: number,
    count: number,
  ): void {
    const currentAvg = this.metrics.performance[metricKey];
    this.metrics.performance[metricKey] = ((currentAvg * (count - 1)) + newDuration) / count;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  private updateCacheHitRate(): void {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? this.metrics.cache.hits / total : 0;
  }

  /**
   * Record an error
   */
  recordError(error: Error): void {
    this.metrics.errors.total++;
    this.metrics.errors.lastError = error;

    const errorType = error.constructor.name;
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;

    this.emit('error:recorded', error);
  }

  /**
   * Update storage metrics
   */
  updateStorageMetrics(stats: {
    totalMemories: number;
    byType: Record<string, number>;
    totalSize?: number;
  }): void {
    this.metrics.storage.totalMemories = stats.totalMemories;
    this.metrics.storage.byType = stats.byType;

    if (stats.totalSize !== undefined) {
      this.metrics.storage.totalSize = stats.totalSize;
      this.metrics.storage.avgMemorySize =
        stats.totalMemories > 0 ? stats.totalSize / stats.totalMemories : 0;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): MemoryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    slowestOperation: string;
    fastestOperation: string;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const recentTimings = this.timings.filter(t => t.duration !== undefined);

    if (recentTimings.length === 0) {
      return {
        slowestOperation: 'N/A',
        fastestOperation: 'N/A',
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      };
    }

    // Sort by duration
    const sorted = recentTimings.sort((a, b) => (a.duration || 0) - (b.duration || 0));

    // Calculate percentiles
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    // Calculate average
    const totalDuration = sorted.reduce((sum, t) => sum + (t.duration || 0), 0);
    const avgResponseTime = totalDuration / sorted.length;

    return {
      slowestOperation: sorted[sorted.length - 1]!.operation,
      fastestOperation: sorted[0]!.operation,
      avgResponseTime,
      p95ResponseTime: sorted[p95Index]?.duration || 0,
      p99ResponseTime: sorted[p99Index]?.duration || 0,
    };
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    errorRate: number;
    mostCommonError: string;
    recentErrors: Error[];
  } {
    const totalOps = Object.values(this.metrics.operations).reduce((sum, count) => sum + count, 0);
    const errorRate = totalOps > 0 ? this.metrics.errors.total / totalOps : 0;

    // Find most common error
    let mostCommonError = 'None';
    let maxCount = 0;
    for (const [errorType, count] of Object.entries(this.metrics.errors.byType)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = errorType;
      }
    }

    // Get recent errors from timings
    const recentErrors = this.timings
      .filter(t => t.error)
      .map(t => t.error!)
      .slice(-10);

    return {
      errorRate,
      mostCommonError,
      recentErrors,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.timings = [];
    this.emit('metrics:reset');
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      metrics: this.metrics,
      performanceSummary: this.getPerformanceSummary(),
      errorSummary: this.getErrorSummary(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }
}
