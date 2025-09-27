# Kuzu Memory - Usage Examples

**Production Ready**: ✅ 97+ tests passing | ✅ All storage adapters functional

Complete examples for integrating Kuzu Memory into your Next.js applications.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Next.js Integration](#nextjs-integration)
- [React Hooks Examples](#react-hooks-examples)
- [Memory Types and Organization](#memory-types-and-organization)
- [Advanced Features](#advanced-features)
- [Performance Optimization](#performance-optimization)

## Basic Usage

### 1. Simple Memory Storage

```typescript
import { createMemoryClient } from 'kuzu-memory';

async function basicExample() {
  // Initialize memory client
  const memory = await createMemoryClient({
    storage: 'indexeddb',
    dbName: 'my-app-memories',
  });

  // Store different types of content
  const learningNote = await memory.create(
    'React hooks provide a way to use state in functional components',
    {
      type: 'semantic',
      tags: ['react', 'hooks', 'frontend'],
      importance: 0.8,
    }
  );

  const taskMemory = await memory.create(
    'Remember to update the API documentation after adding the new endpoint',
    {
      type: 'procedural',
      tags: ['todo', 'documentation', 'api'],
      importance: 0.9,
      metadata: {
        priority: 'high',
        dueDate: '2024-02-01',
      },
    }
  );

  const preferenceMemory = await memory.create(
    'I prefer using TypeScript over JavaScript for large projects',
    {
      type: 'preference',
      tags: ['development', 'typescript', 'preferences'],
      importance: 0.7,
      metadata: {
        category: 'tooling-preference',
      },
    }
  );

  // Search for memories
  const reactNotes = await memory.recall('React hooks useState', {
    limit: 5,
  });

  console.log('Found memories:', reactNotes);
}
```

### 2. Memory with Relations

```typescript
async function relatedMemoriesExample() {
  const memory = await createMemoryClient({ storage: 'indexeddb' });

  // Create base concept
  const jsMemory = await memory.create(
    'JavaScript is a dynamic, interpreted programming language',
    {
      type: 'semantic',
      tags: ['javascript', 'programming', 'fundamentals'],
    }
  );

  // Create related concept
  const tsMemory = await memory.create(
    'TypeScript adds static type checking to JavaScript',
    {
      type: 'semantic',
      tags: ['typescript', 'javascript', 'types'],
      relations: [
        {
          targetId: jsMemory.id,
          type: 'extends',
          strength: 0.9,
        },
      ],
    }
  );

  // Create implementation memory
  await memory.create(
    'Use `tsc` command to compile TypeScript to JavaScript',
    {
      type: 'procedural',
      tags: ['typescript', 'compilation', 'cli'],
      relations: [
        {
          targetId: tsMemory.id,
          type: 'implements',
          strength: 0.7,
        },
      ],
    }
  );
}
```

## Next.js Integration

### 1. App Router Implementation

```typescript
// app/memory/MemoryProvider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useKuzuMemory } from 'kuzu-memory/hooks';
import type { KuzuMemoryClient } from 'kuzu-memory';

interface MemoryContextType {
  client: KuzuMemoryClient | null;
  isInitialized: boolean;
  error?: Error;
}

const MemoryContext = createContext<MemoryContextType | null>(null);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const { client, isInitialized, error } = useKuzuMemory({
    storage: 'indexeddb',
    dbName: 'my-app-memories',
    autoInit: true,
  });

  return (
    <MemoryContext.Provider value={{ client, isInitialized, error }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemoryContext() {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemoryContext must be used within a MemoryProvider');
  }
  return context;
}
```

```typescript
// app/layout.tsx
import { MemoryProvider } from './memory/MemoryProvider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <MemoryProvider>
          {children}
        </MemoryProvider>
      </body>
    </html>
  );
}
```

### 2. Memory Dashboard Component

```typescript
// app/dashboard/MemoryDashboard.tsx
'use client';

import { useState } from 'react';
import { useMemoryQuery, useMemoryMutation } from 'kuzu-memory/hooks';
import { useMemoryContext } from '../memory/MemoryProvider';

export default function MemoryDashboard() {
  const { client, isInitialized } = useMemoryContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [newMemoryContent, setNewMemoryContent] = useState('');

  // Query memories
  const { data: memories, isLoading, refetch } = useMemoryQuery({
    client,
    query: {
      tags: searchQuery ? [searchQuery] : undefined,
      limit: 20,
      sortBy: 'timestamp',
    },
    enabled: isInitialized,
  });

  // Memory mutations
  const { create, update, remove } = useMemoryMutation({
    client,
    onSuccess: () => {
      refetch();
      setNewMemoryContent('');
    },
  });

  if (!isInitialized) {
    return <div className="loading">Initializing memory system...</div>;
  }

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;

    await create(newMemoryContent, {
      type: 'semantic',
      tags: ['dashboard'],
      importance: 0.7,
    });
  };

  return (
    <div className="memory-dashboard">
      <h1>Memory Dashboard</h1>

      {/* Search */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Add Memory */}
      <form onSubmit={handleCreateMemory} className="add-memory-form">
        <textarea
          value={newMemoryContent}
          onChange={(e) => setNewMemoryContent(e.target.value)}
          placeholder="Enter a new memory..."
          className="memory-input"
          rows={3}
        />
        <button type="submit" disabled={!newMemoryContent.trim()}>
          Add Memory
        </button>
      </form>

      {/* Memory List */}
      <div className="memory-list">
        {isLoading ? (
          <div>Loading memories...</div>
        ) : (
          memories?.map((memory) => (
            <div key={memory.id} className="memory-card">
              <div className="memory-content">{memory.content}</div>
              <div className="memory-meta">
                <span className="memory-type">{memory.type}</span>
                <span className="memory-importance">
                  Importance: {(memory.importance * 100).toFixed(0)}%
                </span>
                {memory.tags.length > 0 && (
                  <div className="memory-tags">
                    {memory.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => remove(memory.id)}
                className="delete-button"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

## React Hooks Examples

### 1. Smart Memory Search

```typescript
// components/SmartSearch.tsx
import { useState, useEffect } from 'react';
import { useMemoryQuery } from 'kuzu-memory/hooks';
import { useMemoryContext } from '../memory/MemoryProvider';

export function SmartSearch() {
  const { client } = useMemoryContext();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Smart recall query
  const { data: results, isLoading } = useMemoryQuery({
    client,
    query: {
      recall: debouncedQuery,
      limit: 10,
    },
    enabled: Boolean(debouncedQuery && client),
  });

  return (
    <div className="smart-search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memories intelligently..."
        className="search-input"
      />

      {isLoading && <div>Searching...</div>}

      {results && results.length > 0 && (
        <div className="search-results">
          <h3>Found {results.length} memories</h3>
          {results.map((memory) => (
            <div key={memory.id} className="search-result">
              <div className="content">{memory.content}</div>
              <div className="relevance">
                Relevance: {(memory.importance * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && debouncedQuery && (
        <div>No memories found for "{debouncedQuery}"</div>
      )}
    </div>
  );
}
```

### 2. Memory Analytics

```typescript
// components/MemoryAnalytics.tsx
import { useEffect, useState } from 'react';
import { useMemoryContext } from '../memory/MemoryProvider';

interface AnalyticsData {
  totalMemories: number;
  memoryTypes: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  importanceDistribution: Record<string, number>;
}

export function MemoryAnalytics() {
  const { client, isInitialized } = useMemoryContext();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!isInitialized || !client) return;

    const generateAnalytics = async () => {
      // Get all memories
      const memories = await client.query({ limit: 1000 });

      // Calculate analytics
      const data: AnalyticsData = {
        totalMemories: memories.length,
        memoryTypes: {},
        topTags: [],
        importanceDistribution: {
          'High (0.8-1.0)': 0,
          'Medium (0.5-0.8)': 0,
          'Low (0.0-0.5)': 0,
        },
      };

      // Memory types
      memories.forEach((memory) => {
        data.memoryTypes[memory.type] = (data.memoryTypes[memory.type] || 0) + 1;

        // Importance distribution
        if (memory.importance >= 0.8) {
          data.importanceDistribution['High (0.8-1.0)']++;
        } else if (memory.importance >= 0.5) {
          data.importanceDistribution['Medium (0.5-0.8)']++;
        } else {
          data.importanceDistribution['Low (0.0-0.5)']++;
        }
      });

      // Top tags
      const tagCounts: Record<string, number> = {};
      memories.forEach((memory) => {
        memory.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      data.topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      setAnalytics(data);
    };

    generateAnalytics();
  }, [client, isInitialized]);

  if (!analytics) return <div>Loading analytics...</div>;

  return (
    <div className="memory-analytics">
      <h2>Memory Analytics</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Memories</h3>
          <div className="stat-value">{analytics.totalMemories}</div>
        </div>

        <div className="stat-card">
          <h3>Memory Types</h3>
          {Object.entries(analytics.memoryTypes).map(([type, count]) => (
            <div key={type} className="stat-item">
              {type}: {count}
            </div>
          ))}
        </div>

        <div className="stat-card">
          <h3>Top Tags</h3>
          {analytics.topTags.slice(0, 5).map(({ tag, count }) => (
            <div key={tag} className="stat-item">
              {tag}: {count}
            </div>
          ))}
        </div>

        <div className="stat-card">
          <h3>Importance Distribution</h3>
          {Object.entries(analytics.importanceDistribution).map(([range, count]) => (
            <div key={range} className="stat-item">
              {range}: {count}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Memory Types and Organization

### 1. Learning Journal

```typescript
// utils/learningJournal.ts
import type { KuzuMemoryClient } from 'kuzu-memory';

export class LearningJournal {
  constructor(private memory: KuzuMemoryClient) {}

  async addLearning(content: string, topic: string, source?: string) {
    return this.memory.create(content, {
      type: 'semantic',
      tags: ['learning', topic.toLowerCase()],
      importance: 0.8,
      metadata: {
        source,
        category: 'learning',
        dateAdded: new Date().toISOString(),
      },
    });
  }

  async addPracticeNote(content: string, skill: string, difficulty: number) {
    return this.memory.create(content, {
      type: 'procedural',
      tags: ['practice', skill.toLowerCase()],
      importance: difficulty / 10, // Convert 1-10 scale to 0-1
      metadata: {
        skill,
        difficulty,
        category: 'practice',
      },
    });
  }

  async addExperience(content: string, project: string, outcome: 'success' | 'failure' | 'learning') {
    return this.memory.create(content, {
      type: 'episodic',
      tags: ['experience', project.toLowerCase(), outcome],
      importance: outcome === 'failure' ? 0.9 : 0.7, // Learn more from failures
      metadata: {
        project,
        outcome,
        category: 'experience',
      },
    });
  }

  async addPreference(content: string, category: string, strength: 'strong' | 'moderate' | 'mild') {
    return this.memory.create(content, {
      type: 'preference',
      tags: ['preference', category.toLowerCase()],
      importance: strength === 'strong' ? 0.8 : strength === 'moderate' ? 0.6 : 0.4,
      metadata: {
        category,
        strength,
        type: 'user-preference',
      },
    });
  }

  async getTopicsOverview() {
    const memories = await this.memory.query({
      tags: ['learning'],
      limit: 100,
    });

    const topics = new Map<string, number>();
    memories.forEach(memory => {
      memory.tags.forEach(tag => {
        if (tag !== 'learning') {
          topics.set(tag, (topics.get(tag) || 0) + 1);
        }
      });
    });

    return Array.from(topics.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }
}

// Usage example
export async function useLearningJournal(client: KuzuMemoryClient) {
  const journal = new LearningJournal(client);

  // Add different types of learning content
  await journal.addLearning(
    'React Context provides a way to pass data through the component tree without prop drilling',
    'React',
    'React Documentation'
  );

  await journal.addPracticeNote(
    'Built a custom hook for API data fetching with loading and error states',
    'React Hooks',
    7 // difficulty out of 10
  );

  await journal.addExperience(
    'Successfully migrated the user authentication system from JWT to OAuth2, improving security and user experience',
    'Auth Migration',
    'success'
  );

  await journal.addPreference(
    'I prefer using functional programming patterns over object-oriented approaches',
    'Programming Style',
    'strong'
  );

  return journal;
}
```

### 2. Project Knowledge Base

```typescript
// utils/projectKnowledge.ts
export class ProjectKnowledgeBase {
  constructor(private memory: KuzuMemoryClient) {}

  async addArchitecturalDecision(
    decision: string,
    reasoning: string,
    alternatives: string[],
    project: string
  ) {
    const content = `Decision: ${decision}\n\nReasoning: ${reasoning}\n\nAlternatives considered: ${alternatives.join(', ')}`;

    return this.memory.create(content, {
      type: 'semantic',
      tags: ['architecture', 'decision', project.toLowerCase()],
      importance: 0.9,
      metadata: {
        type: 'architectural-decision',
        project,
        alternatives,
        dateDecided: new Date().toISOString(),
      },
    });
  }

  async addBugReport(
    description: string,
    reproduction: string,
    solution: string,
    project: string
  ) {
    const content = `Bug: ${description}\n\nReproduction: ${reproduction}\n\nSolution: ${solution}`;

    return this.memory.create(content, {
      type: 'procedural',
      tags: ['bug', 'solution', project.toLowerCase()],
      importance: 0.8,
      metadata: {
        type: 'bug-report',
        project,
        status: 'resolved',
        dateResolved: new Date().toISOString(),
      },
    });
  }

  async addAPIDocumentation(
    endpoint: string,
    description: string,
    parameters: Record<string, any>,
    examples: string,
    project: string
  ) {
    const content = `Endpoint: ${endpoint}\n\n${description}\n\nParameters: ${JSON.stringify(parameters, null, 2)}\n\nExamples:\n${examples}`;

    return this.memory.create(content, {
      type: 'semantic',
      tags: ['api', 'documentation', project.toLowerCase()],
      importance: 0.7,
      metadata: {
        type: 'api-documentation',
        endpoint,
        project,
        lastUpdated: new Date().toISOString(),
      },
    });
  }

  async searchProjectKnowledge(project: string, query: string) {
    return this.memory.recall(query, {
      tags: [project.toLowerCase()],
      limit: 10,
    });
  }
}
```

## Advanced Features

### 1. Semantic Search with Embeddings

```typescript
// utils/semanticSearch.ts
export async function setupSemanticMemory() {
  const memory = await createMemoryClient({
    storage: 'indexeddb',
    embeddingProvider: async (text: string) => {
      // Example using OpenAI embeddings (requires API key)
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      return data.embedding;
    },
  });

  return memory;
}

// api/embeddings.ts (Next.js API route)
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    const response = await openai.createEmbedding({
      model: 'text-embedding-ada-002',
      input: text,
    });

    res.status(200).json({
      embedding: response.data.data[0].embedding,
    });
  } catch (error) {
    console.error('Embedding error:', error);
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
}
```

### 2. Memory Synchronization

```typescript
// utils/memorySync.ts
export class MemorySync {
  constructor(
    private memory: KuzuMemoryClient,
    private syncEndpoint: string
  ) {}

  async syncToServer() {
    const memories = await this.memory.query({ limit: 1000 });

    const response = await fetch(`${this.syncEndpoint}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memories }),
    });

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    return response.json();
  }

  async syncFromServer(lastSyncTime: Date) {
    const response = await fetch(
      `${this.syncEndpoint}/sync?since=${lastSyncTime.toISOString()}`
    );

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    const { memories } = await response.json();

    for (const memory of memories) {
      await this.memory.create(memory.content, {
        ...memory,
        id: memory.id, // Preserve server ID
      });
    }

    return memories.length;
  }

  async startAutoSync(intervalMs: number = 300000) { // 5 minutes
    setInterval(async () => {
      try {
        await this.syncToServer();
        console.log('Auto-sync completed');
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, intervalMs);
  }
}
```

## Performance Optimization

### 1. Memory Cleanup and Management

```typescript
// utils/memoryMaintenance.ts
export class MemoryMaintenance {
  constructor(private memory: KuzuMemoryClient) {}

  async cleanupOldMemories(maxAge: number = 30 * 24 * 60 * 60 * 1000) { // 30 days
    const cutoffDate = new Date(Date.now() - maxAge);

    const oldMemories = await this.memory.query({
      before: cutoffDate,
      limit: 1000,
    });

    for (const memory of oldMemories) {
      if (memory.importance < 0.5) { // Only cleanup less important memories
        await this.memory.delete(memory.id);
      }
    }

    return oldMemories.length;
  }

  async optimizeImportance() {
    const memories = await this.memory.query({ limit: 1000 });

    for (const memory of memories) {
      const daysSinceAccess = Math.floor(
        (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Decay importance over time
      const decayFactor = Math.exp(-daysSinceAccess / 30); // 30-day half-life
      const newImportance = memory.importance * decayFactor;

      if (Math.abs(newImportance - memory.importance) > 0.01) {
        await this.memory.update(memory.id, {
          importance: newImportance,
        });
      }
    }
  }

  async getStorageStats() {
    const stats = await this.memory.getStats();

    return {
      totalMemories: stats.totalMemories,
      storageSize: stats.storageSize,
      averageImportance: stats.averageImportance,
      memoryTypes: stats.memoryTypeDistribution,
      recommendation: this.getOptimizationRecommendation(stats),
    };
  }

  private getOptimizationRecommendation(stats: any) {
    if (stats.totalMemories > 8000) {
      return 'Consider running cleanup for old, low-importance memories';
    }

    if (stats.averageImportance < 0.3) {
      return 'Consider optimizing importance scores';
    }

    return 'Memory storage is well optimized';
  }
}

// Usage in component
export function useMemoryMaintenance() {
  const { client } = useMemoryContext();
  const [maintenance, setMaintenance] = useState<MemoryMaintenance | null>(null);

  useEffect(() => {
    if (client) {
      setMaintenance(new MemoryMaintenance(client));
    }
  }, [client]);

  return maintenance;
}
```

### 2. Batch Operations

```typescript
// utils/batchOperations.ts
export class BatchMemoryOperations {
  constructor(private memory: KuzuMemoryClient) {}

  async batchCreate(contents: Array<{
    content: string;
    metadata?: any;
    tags?: string[];
    type?: string;
    importance?: number;
  }>) {
    const results = [];
    const batchSize = 50; // Process in batches of 50

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);

      const batchPromises = batch.map(item =>
        this.memory.create(item.content, {
          type: item.type as any || 'semantic',
          tags: item.tags || [],
          importance: item.importance || 0.5,
          ...item.metadata,
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid overwhelming the storage
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  async batchUpdate(updates: Array<{
    id: string;
    updates: any;
  }>) {
    const batchSize = 50;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      const batchPromises = batch.map(item =>
        this.memory.update(item.id, item.updates)
      );

      await Promise.all(batchPromises);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async importFromJSON(jsonData: any[]) {
    console.log(`Importing ${jsonData.length} memories...`);

    const mappedData = jsonData.map(item => ({
      content: item.content || item.text || '',
      type: item.type || 'semantic',
      tags: Array.isArray(item.tags) ? item.tags : [],
      importance: typeof item.importance === 'number' ? item.importance : 0.5,
      metadata: item.metadata || {},
    }));

    return this.batchCreate(mappedData);
  }
}
```

## Testing Examples

### 1. Component Testing

```typescript
// __tests__/MemoryDashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryClient } from 'kuzu-memory';
import MemoryDashboard from '../components/MemoryDashboard';
import { MemoryProvider } from '../memory/MemoryProvider';

// Mock the memory client
jest.mock('kuzu-memory', () => ({
  createMemoryClient: jest.fn(),
}));

const mockMemoryClient = {
  create: jest.fn(),
  query: jest.fn(),
  recall: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn(),
};

beforeEach(() => {
  (createMemoryClient as jest.Mock).mockResolvedValue(mockMemoryClient);
  mockMemoryClient.query.mockResolvedValue([
    {
      id: '1',
      content: 'Test memory',
      type: 'semantic',
      tags: ['test'],
      importance: 0.8,
      timestamp: new Date(),
    },
  ]);
});

test('renders memory dashboard', async () => {
  render(
    <MemoryProvider>
      <MemoryDashboard />
    </MemoryProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('Memory Dashboard')).toBeInTheDocument();
  });

  expect(screen.getByText('Test memory')).toBeInTheDocument();
});

test('creates new memory', async () => {
  mockMemoryClient.create.mockResolvedValue({
    id: '2',
    content: 'New memory',
    type: 'semantic',
    tags: ['dashboard'],
    importance: 0.7,
  });

  render(
    <MemoryProvider>
      <MemoryDashboard />
    </MemoryProvider>
  );

  await waitFor(() => {
    expect(screen.getByPlaceholderText('Enter a new memory...')).toBeInTheDocument();
  });

  const textarea = screen.getByPlaceholderText('Enter a new memory...');
  const submitButton = screen.getByText('Add Memory');

  fireEvent.change(textarea, { target: { value: 'New memory content' } });
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(mockMemoryClient.create).toHaveBeenCalledWith('New memory content', {
      type: 'semantic',
      tags: ['dashboard'],
      importance: 0.7,
    });
  });
});
```

### 2. Integration Testing

```typescript
// __tests__/integration.test.ts
import { createMemoryClient } from 'kuzu-memory';

describe('Memory Integration Tests', () => {
  let memory: any;

  beforeEach(async () => {
    memory = await createMemoryClient({
      storage: 'memory', // Use in-memory for tests
    });
  });

  test('full memory lifecycle', async () => {
    // Create
    const created = await memory.create('Integration test memory', {
      type: 'semantic',
      tags: ['integration', 'test'],
      importance: 0.8,
    });

    expect(created.id).toBeDefined();
    expect(created.content).toBe('Integration test memory');

    // Read
    const retrieved = await memory.get(created.id);
    expect(retrieved).toEqual(created);

    // Update
    const updated = await memory.update(created.id, {
      importance: 0.9,
      tags: ['integration', 'test', 'updated'],
    });
    expect(updated.importance).toBe(0.9);
    expect(updated.tags).toContain('updated');

    // Query
    const queried = await memory.query({
      tags: ['integration'],
      limit: 10,
    });
    expect(queried).toHaveLength(1);
    expect(queried[0].id).toBe(created.id);

    // Delete
    await memory.delete(created.id);
    const afterDelete = await memory.get(created.id);
    expect(afterDelete).toBeNull();
  });

  test('recall functionality', async () => {
    // Create test memories
    await memory.create('JavaScript is a programming language', {
      type: 'semantic',
      tags: ['javascript', 'programming'],
    });

    await memory.create('React is a JavaScript library', {
      type: 'semantic',
      tags: ['react', 'javascript', 'library'],
    });

    // Recall by content
    const results = await memory.recall('JavaScript programming', {
      limit: 5,
    });

    expect(results).toHaveLength(2);
    expect(results.some(r => r.content.includes('JavaScript'))).toBe(true);
  });
});
```

## Production Deployment

### 1. Environment Configuration

```typescript
// config/memory.ts
export const memoryConfig = {
  development: {
    storage: 'memory' as const,
    debug: true,
    maxMemories: 1000,
  },
  test: {
    storage: 'memory' as const,
    debug: false,
    maxMemories: 100,
  },
  production: {
    storage: 'indexeddb' as const,
    debug: false,
    maxMemories: 10000,
    dbName: 'prod-memories',
    version: 1,
    decayEnabled: true,
    decayInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
};

export function getMemoryConfig() {
  const env = process.env.NODE_ENV || 'development';
  return memoryConfig[env as keyof typeof memoryConfig];
}
```

### 2. Error Handling and Monitoring

```typescript
// utils/memoryWithMonitoring.ts
export async function createMonitoredMemoryClient() {
  const config = getMemoryConfig();

  const memory = await createMemoryClient({
    ...config,
    onError: (error, operation) => {
      // Log to monitoring service
      console.error(`Memory operation ${operation} failed:`, error);

      // Send to error tracking (e.g., Sentry)
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(error, {
          tags: {
            component: 'kuzu-memory',
            operation,
          },
        });
      }
    },
    onPerformanceMetric: (metric) => {
      // Track performance metrics
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('memory_performance', metric);
      }
    },
  });

  return memory;
}
```

This comprehensive examples guide shows how to integrate Kuzu Memory into real-world Next.js applications with production-ready patterns and best practices.