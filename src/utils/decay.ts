import { differenceInDays } from 'date-fns';
import type { MemoryItem } from '../types';

export interface DecayOptions {
  halfLife: number; // in days
  minImportance: number; // minimum importance value
}

export function calculateDecay(
  memory: MemoryItem,
  options: DecayOptions = { halfLife: 30, minImportance: 0.1 }
): number {
  const daysSinceAccess = differenceInDays(
    new Date(),
    memory.lastAccessed || memory.timestamp
  );

  const decayFactor = Math.exp(-0.693 * (daysSinceAccess / options.halfLife));
  const decayedImportance = (memory.importance || 0.5) * decayFactor;

  return Math.max(options.minImportance, decayedImportance);
}

export function applyDecayToMemories(
  memories: MemoryItem[],
  options?: DecayOptions
): MemoryItem[] {
  return memories.map(memory => ({
    ...memory,
    importance: calculateDecay(memory, options),
  }));
}

export function shouldForget(
  memory: MemoryItem,
  threshold: number = 0.1
): boolean {
  const currentImportance = calculateDecay(memory);
  return currentImportance < threshold;
}