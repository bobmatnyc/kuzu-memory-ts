import { MemoryItem, MemoryType } from '../../src/types';
import { generateUUID } from '../../src/utils/helpers';

export const sampleMemories: Omit<MemoryItem, 'id' | 'timestamp' | 'lastAccessed'>[] = [
  // Identity patterns
  {
    type: 'episodic' as MemoryType,
    content: 'My name is John Doe and I work as a software developer.',
    metadata: { category: 'identity' },
    tags: ['identity', 'personal'],
    importance: 0.9,
    accessCount: 5,
    decay: 0.1,
    relations: [],
  },
  {
    type: 'semantic' as MemoryType,
    content: 'I am a passionate developer who loves TypeScript and React.',
    metadata: { category: 'identity', skills: ['TypeScript', 'React'] },
    tags: ['identity', 'skills'],
    importance: 0.8,
    accessCount: 3,
    decay: 0.1,
    relations: [],
  },

  // Preference patterns
  {
    type: 'semantic' as MemoryType,
    content: 'I prefer dark mode over light mode for coding environments.',
    metadata: { category: 'preference', preference_type: 'ui' },
    tags: ['preference', 'coding'],
    importance: 0.6,
    accessCount: 2,
    decay: 0.2,
    relations: [],
  },
  {
    type: 'episodic' as MemoryType,
    content: 'I like using VS Code with the Material Theme Dark extension.',
    metadata: { category: 'preference', tool: 'vscode' },
    tags: ['preference', 'tools', 'ide'],
    importance: 0.7,
    accessCount: 4,
    decay: 0.15,
    relations: [],
  },

  // Decision patterns
  {
    type: 'procedural' as MemoryType,
    content: 'We decided to use Jest for testing instead of Vitest due to better React Testing Library integration.',
    metadata: {
      category: 'decision',
      context: 'project_setup',
      alternatives: ['Jest', 'Vitest'],
      chosen: 'Jest'
    },
    tags: ['decision', 'testing', 'tools'],
    importance: 0.9,
    accessCount: 8,
    decay: 0.05,
    relations: [],
  },

  // Code patterns
  {
    type: 'semantic' as MemoryType,
    content: `
// TypeScript function to calculate memory score
function calculateMemoryScore(importance: number, frequency: number): number {
  return importance * 0.7 + frequency * 0.3;
}
    `.trim(),
    metadata: {
      category: 'code',
      language: 'typescript',
      function_name: 'calculateMemoryScore'
    },
    tags: ['code', 'typescript', 'function'],
    importance: 0.8,
    accessCount: 6,
    decay: 0.1,
    relations: [],
  },

  // JSON data
  {
    type: 'semantic' as MemoryType,
    content: JSON.stringify({
      config: {
        apiEndpoint: 'https://api.example.com',
        timeout: 5000,
        retries: 3
      }
    }),
    metadata: {
      category: 'configuration',
      format: 'json',
      service: 'api'
    },
    tags: ['config', 'api', 'json'],
    importance: 0.7,
    accessCount: 2,
    decay: 0.1,
    relations: [],
  },

  // Markdown content
  {
    type: 'semantic' as MemoryType,
    content: `
# Project Setup

## Installation
\`\`\`bash
npm install kuzu-memory
\`\`\`

## Usage
Import and initialize the memory system:
\`\`\`typescript
import { KuzuMemory } from 'kuzu-memory';
const memory = new KuzuMemory();
\`\`\`
    `.trim(),
    metadata: {
      category: 'documentation',
      format: 'markdown',
      topic: 'setup'
    },
    tags: ['documentation', 'setup', 'markdown'],
    importance: 0.8,
    accessCount: 10,
    decay: 0.05,
    relations: [],
  },

  // Large content
  {
    type: 'semantic' as MemoryType,
    content: 'Large content: ' + 'A'.repeat(10000),
    metadata: {
      category: 'large_content',
      size: 'large'
    },
    tags: ['large', 'test'],
    importance: 0.5,
    accessCount: 1,
    decay: 0.3,
    relations: [],
  },

  // URL and email patterns
  {
    type: 'episodic' as MemoryType,
    content: 'Contact support at support@example.com or visit https://docs.example.com for more information.',
    metadata: {
      category: 'contact',
      urls: ['https://docs.example.com'],
      emails: ['support@example.com']
    },
    tags: ['contact', 'support', 'links'],
    importance: 0.6,
    accessCount: 3,
    decay: 0.2,
    relations: [],
  },

  // Time-sensitive content
  {
    type: 'working' as MemoryType,
    content: 'Remember to submit the quarterly report by Friday, March 15th.',
    metadata: {
      category: 'task',
      deadline: '2024-03-15',
      priority: 'high'
    },
    tags: ['task', 'deadline', 'work'],
    importance: 0.9,
    accessCount: 5,
    decay: 0.4, // Higher decay for time-sensitive content
    relations: [],
  }
];

export const createSampleMemory = (overrides: Partial<MemoryItem> = {}): MemoryItem => {
  const base = sampleMemories[0];
  return {
    id: generateUUID(),
    timestamp: new Date(),
    lastAccessed: new Date(),
    ...base,
    ...overrides,
  };
};

export const createMemoryBatch = (count: number): MemoryItem[] => {
  return Array.from({ length: count }, (_, index) => {
    const baseIndex = index % sampleMemories.length;
    const base = sampleMemories[baseIndex];
    return {
      id: generateUUID(),
      timestamp: new Date(Date.now() - index * 60000), // Spread across time
      lastAccessed: new Date(Date.now() - Math.random() * 86400000),
      ...base,
      content: `${base.content} - Variation ${index}`,
      accessCount: Math.floor(Math.random() * 10),
      importance: Math.random(),
    };
  });
};