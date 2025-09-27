import { z } from 'zod';

// Core memory types
export const MemoryTypeEnum = z.enum([
  'episodic',
  'semantic',
  'procedural',
  'working',
  'sensory',
  'preference',
]);

export type MemoryType = z.infer<typeof MemoryTypeEnum>;

// Memory item schema
export const MemoryItemSchema = z.object({
  id: z.string().uuid(),
  type: MemoryTypeEnum,
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  timestamp: z.date(),
  lastAccessed: z.date().optional(),
  accessCount: z.number().default(0),
  importance: z.number().min(0).max(1).default(0.5),
  decay: z.number().min(0).max(1).default(0.1),
  relations: z.array(z.object({
    targetId: z.string().uuid(),
    type: z.string(),
    strength: z.number().min(0).max(1).default(0.5),
  })).default([]),
});

export type MemoryItem = z.infer<typeof MemoryItemSchema>;

// Pattern types for extraction
export const PatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  regex: z.string().optional(),
  extractor: z.function().args(z.string()).returns(z.any()).optional(),
  priority: z.number().default(0),
});

export type Pattern = z.infer<typeof PatternSchema>;

// Query types
export const MemoryQuerySchema = z.object({
  text: z.string().optional(),
  type: MemoryTypeEnum.optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  limit: z.number().int().min(1).default(10),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['relevance', 'timestamp', 'importance', 'accessCount']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;

// Storage adapter interface
export interface StorageAdapter {
  init(): Promise<void>;
  get(id: string): Promise<MemoryItem | null>;
  getMany(ids: string[]): Promise<MemoryItem[]>;
  create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem>;
  update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem>;
  delete(id: string): Promise<void>;
  query(query: MemoryQuery): Promise<MemoryItem[]>;
  clear(): Promise<void>;
  getStats(): Promise<{
    totalItems: number;
    byType: Record<MemoryType, number>;
    avgAccessCount: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }>;
}

// Recall strategy interface
export interface RecallStrategy {
  name: string;
  recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]>;
  score(memory: MemoryItem, query: string): number;
}

// Extraction result
export interface ExtractionResult {
  pattern: string;
  value: any;
  confidence: number;
  metadata?: Record<string, any>;
}

// Configuration
export const KuzuConfigSchema = z.object({
  storage: z.enum(['indexeddb', 'memory', 'localStorage', 'kuzu']).default('indexeddb'),
  dbName: z.string().default('kuzu-memory'),
  version: z.number().positive().default(1),
  autoSync: z.boolean().default(false),
  syncInterval: z.number().positive().default(60000), // 1 minute
  maxMemories: z.number().positive().default(10000),
  decayEnabled: z.boolean().default(true),
  decayInterval: z.number().positive().default(86400000), // 24 hours
  embeddingProvider: z.function().args(z.string()).returns(z.promise(z.array(z.number()))).optional(),
  nlp: z.object({
    autoClassify: z.boolean().default(true),
    autoImportance: z.boolean().default(true),
    confidenceThreshold: z.number().min(0).max(1).default(0.6),
    customTrainingData: z.array(z.object({
      text: z.string(),
      type: MemoryTypeEnum,
    })).optional(),
  }).optional(),
});

export type KuzuConfig = z.infer<typeof KuzuConfigSchema>;

// Event types
export type MemoryEvent =
  | { type: 'memory:created'; memory: MemoryItem }
  | { type: 'memory:updated'; memory: MemoryItem; previous: MemoryItem }
  | { type: 'memory:deleted'; id: string }
  | { type: 'memory:accessed'; memory: MemoryItem }
  | { type: 'sync:started' }
  | { type: 'sync:completed'; count: number }
  | { type: 'sync:failed'; error: Error };

// Export all schemas for validation
export const schemas = {
  MemoryTypeEnum,
  MemoryItemSchema,
  PatternSchema,
  MemoryQuerySchema,
  KuzuConfigSchema,
};
