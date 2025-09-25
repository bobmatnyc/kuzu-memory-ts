import type { MemoryItem } from '../types';

// UUID v4 generation for environments without crypto.randomUUID
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers and Node 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function groupMemoriesByType(memories: MemoryItem[]): Map<string, MemoryItem[]> {
  const grouped = new Map<string, MemoryItem[]>();

  for (const memory of memories) {
    const group = grouped.get(memory.type) || [];
    group.push(memory);
    grouped.set(memory.type, group);
  }

  return grouped;
}

export function groupMemoriesByTag(memories: MemoryItem[]): Map<string, MemoryItem[]> {
  const grouped = new Map<string, MemoryItem[]>();

  for (const memory of memories) {
    for (const tag of memory.tags) {
      const group = grouped.get(tag) || [];
      group.push(memory);
      grouped.set(tag, group);
    }
  }

  return grouped;
}

export function mergeMemoryMetadata(
  existing: Record<string, any> | undefined,
  updates: Record<string, any>
): Record<string, any> {
  return { ...(existing || {}), ...updates };
}

export function calculateMemoryScore(
  memory: MemoryItem,
  weights: {
    importance?: number;
    recency?: number;
    frequency?: number;
  } = {}
): number {
  const {
    importance = 0.4,
    recency = 0.3,
    frequency = 0.3,
  } = weights;

  // Importance score (already 0-1)
  const importanceScore = memory.importance || 0;

  // Recency score (exponential decay based on days)
  const daysSinceAccess = (Date.now() - new Date(memory.lastAccessed || memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.exp(-daysSinceAccess / 30); // 30-day half-life

  // Frequency score (logarithmic scale)
  const frequencyScore = Math.min(1, Math.log10((memory.accessCount || 0) + 1) / 2); // Cap at 100 accesses

  return (
    importanceScore * importance +
    recencyScore * recency +
    frequencyScore * frequency
  );
}

export function createMemoryGraph(memories: MemoryItem[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const memory of memories) {
    if (!graph.has(memory.id)) {
      graph.set(memory.id, new Set());
    }

    for (const relation of memory.relations) {
      graph.get(memory.id)!.add(relation.targetId);

      // Add reverse edge for bidirectional graph
      if (!graph.has(relation.targetId)) {
        graph.set(relation.targetId, new Set());
      }
      graph.get(relation.targetId)!.add(memory.id);
    }
  }

  return graph;
}