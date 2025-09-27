# Kuzu Memory Library Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Components](#core-components)
3. [Data Flow](#data-flow)
4. [Storage Layer](#storage-layer)
5. [Memory Types](#memory-types)
6. [Recall Strategies](#recall-strategies)
7. [NLP Integration](#nlp-integration)
8. [Event System](#event-system)
9. [Domain Model](#domain-model)
10. [Performance Optimizations](#performance-optimizations)
11. [Security Model](#security-model)
12. [API Contract](#api-contract)
13. [Cross-Platform Considerations](#cross-platform-considerations)

## System Overview

Kuzu Memory is a semantic memory management library designed for TypeScript/JavaScript applications with a focus on Next.js and React integration. The architecture follows Domain-Driven Design (DDD) principles and event-driven architecture patterns to provide a scalable, maintainable, and cross-platform compatible memory system.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ React Hooks (useKuzuMemory, useMemoryQuery, etc.)      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ KuzuMemory Core Class (Main API)                       ││
│  │ QueryBuilder (Fluent Query Interface)                  ││
│  │ Client Factory (Configuration & Initialization)        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│  ┌─────────────────────────┬─────────────────────────────────┐│
│  │ Memory Value Objects    │ Domain Services                 ││
│  │ - MemoryItem           │ - MemoryClassifier              ││
│  │ - MemoryQuery          │ - PatternExtractor              ││
│  │ - Pattern              │ - Decay Engine                  ││
│  └─────────────────────────┴─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
│  ┌─────────────────────────┬─────────────────────────────────┐│
│  │ Storage Adapters        │ Recall Strategies               ││
│  │ - IndexedDBAdapter      │ - CompositeStrategy             ││
│  │ - LocalStorageAdapter   │ - SimilarityStrategy            ││
│  │ - MemoryAdapter         │ - RecencyStrategy               ││
│  │                         │ - FrequencyStrategy             ││
│  │                         │ - ImportanceStrategy            ││
│  └─────────────────────────┴─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Clear boundaries between layers and components
2. **Dependency Inversion**: High-level modules don't depend on low-level modules
3. **Strategy Pattern**: Pluggable algorithms for storage and recall
4. **Factory Pattern**: Centralized object creation and configuration
5. **Event-Driven Architecture**: Loose coupling through events
6. **Immutability**: Value objects are immutable where possible
7. **Type Safety**: Full TypeScript support with Zod validation

## Core Components

### 1. KuzuMemory Class (Application Core)

The main orchestrator that coordinates all memory operations:

```typescript
// TypeScript Implementation Pattern
class KuzuMemory extends EventEmitter {
  private storage: StorageAdapter;
  private recallStrategy: RecallStrategy;
  private classifier: MemoryClassifier;
  private extractor: PatternExtractor;

  // Core methods
  async create(content: string, metadata?: Partial<MemoryItem>): Promise<MemoryItem>
  async recall(query: string, options?: RecallOptions): Promise<MemoryItem[]>
  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem>
  async delete(id: string): Promise<void>
}
```

**Cross-Platform Equivalent (Python)**:
```python
# Python Implementation Pattern
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

class KuzuMemory:
    def __init__(self, storage: StorageAdapter, recall_strategy: RecallStrategy):
        self.storage = storage
        self.recall_strategy = recall_strategy
        self.classifier = MemoryClassifier()
        self.extractor = PatternExtractor()
        self.event_emitter = EventEmitter()

    async def create(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> MemoryItem:
        # Implementation follows same flow as TypeScript version
        pass
```

### 2. Storage Adapters (Infrastructure Layer)

Abstract storage interface implemented by concrete adapters:

```typescript
// TypeScript Interface
interface StorageAdapter {
  init(): Promise<void>;
  get(id: string): Promise<MemoryItem | null>;
  getMany(ids: string[]): Promise<MemoryItem[]>;
  create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem>;
  update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem>;
  delete(id: string): Promise<void>;
  query(query: MemoryQuery): Promise<MemoryItem[]>;
  clear(): Promise<void>;
  getStats(): Promise<StorageStats>;
}
```

**Cross-Platform Equivalent (Python)**:
```python
# Python Abstract Base Class
from abc import ABC, abstractmethod

class StorageAdapter(ABC):
    @abstractmethod
    async def init(self) -> None: pass

    @abstractmethod
    async def get(self, item_id: str) -> Optional[MemoryItem]: pass

    @abstractmethod
    async def create(self, item: MemoryItemData) -> MemoryItem: pass

    # ... other methods
```

### 3. Recall Strategies (Domain Services)

Pluggable algorithms for memory retrieval and ranking:

```typescript
interface RecallStrategy {
  name: string;
  recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]>;
  score(memory: MemoryItem, query: string): number;
}
```

### 4. NLP Classification Pipeline

Natural language processing for automatic memory categorization:

```typescript
class MemoryClassifier {
  private classifier: natural.BayesClassifier;
  private tokenizer: natural.WordTokenizer;
  private tfidf: natural.TfIdf;
  private sentimentAnalyzer: any;

  async classify(content: string): Promise<ClassificationResult>;
  calculateImportance(content: string): number;
  extractKeywords(content: string): string[];
}
```

## Data Flow

### Memory Creation Flow

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client    │───▶│   KuzuMemory    │───▶│ PatternExtractor│
│  create()   │    │    create()     │    │   extract()     │
└─────────────┘    └─────────────────┘    └─────────────────┘
                             │                        │
                             ▼                        ▼
                   ┌─────────────────┐    ┌─────────────────┐
                   │ MemoryClassifier│    │ Storage Adapter │
                   │   classify()    │───▶│    create()     │
                   └─────────────────┘    └─────────────────┘
                             │                        │
                             ▼                        ▼
                   ┌─────────────────┐    ┌─────────────────┐
                   │ Event Emitter   │    │  MemoryItem     │
                   │  emit:created   │    │   (created)     │
                   └─────────────────┘    └─────────────────┘
```

### Memory Recall Flow

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client    │───▶│   KuzuMemory    │───▶│ Storage Adapter │
│   recall()  │    │    recall()     │    │    query()      │
└─────────────┘    └─────────────────┘    └─────────────────┘
                             │                        │
                             ▼                        ▼
                   ┌─────────────────┐    ┌─────────────────┐
                   │ RecallStrategy  │◀───│ MemoryItem[]    │
                   │    recall()     │    │ (candidates)    │
                   └─────────────────┘    └─────────────────┘
                             │
                             ▼
                   ┌─────────────────┐
                   │ MemoryItem[]    │
                   │   (ranked)      │
                   └─────────────────┘
```

## Storage Layer

### Storage Architecture

The storage layer implements the Repository pattern with multiple adapters:

1. **MemoryAdapter**: In-memory storage for testing and temporary data
2. **LocalStorageAdapter**: Browser localStorage for simple persistence
3. **IndexedDBAdapter**: Full-featured browser database with indexing

### Storage Factory Pattern

```typescript
// TypeScript Factory
export function createStorageAdapter(config: {
  type: 'memory' | 'localStorage' | 'indexeddb';
  dbName?: string;
  version?: number;
}): StorageAdapter {
  switch (config.type) {
    case 'memory':
      return new MemoryAdapter();
    case 'localStorage':
      return new LocalStorageAdapter(config.dbName);
    case 'indexeddb':
      return new IndexedDBAdapter(config.dbName, config.version);
    default:
      throw new Error(`Unknown storage type: ${config.type}`);
  }
}
```

**Cross-Platform Python Equivalent**:
```python
def create_storage_adapter(config: StorageConfig) -> StorageAdapter:
    if config.type == 'memory':
        return MemoryAdapter()
    elif config.type == 'sqlite':
        return SQLiteAdapter(config.db_name)
    elif config.type == 'postgresql':
        return PostgreSQLAdapter(config.connection_string)
    else:
        raise ValueError(f"Unknown storage type: {config.type}")
```

### IndexedDB Schema Design

```typescript
// Database Schema
interface MemoryDB {
  memories: {
    id: string;           // Primary key
    type: MemoryType;     // Index
    content: string;      // Full-text searchable
    timestamp: Date;      // Index
    importance: number;   // Index
    accessCount: number;  // Index
    tags: string[];       // Multi-entry index
    // ... other fields
  };

  patterns: {
    id: string;
    name: string;
    regex: string;
    priority: number;
  };
}
```

## Memory Types

The system supports six distinct memory types based on cognitive psychology:

### 1. Episodic Memory
- **Description**: Personal experiences and events
- **Characteristics**: Time-bound, contextual, autobiographical
- **Indicators**: "I remember", "yesterday", "when I", temporal references
- **Decay**: Moderate decay rate, importance-based retention

### 2. Semantic Memory
- **Description**: General knowledge and facts
- **Characteristics**: Timeless, conceptual, objective
- **Indicators**: "The fact that", "always", "generally", definitions
- **Decay**: Slow decay, high retention for important facts

### 3. Procedural Memory
- **Description**: Skills and procedures
- **Characteristics**: Action-oriented, step-by-step, practical
- **Indicators**: "How to", "steps", "process", "method", instructions
- **Decay**: Very slow decay, reinforced through use

### 4. Working Memory
- **Description**: Temporary, active information processing
- **Characteristics**: Short-term, task-focused, volatile
- **Indicators**: "Currently", "now", "temporary", "todo"
- **Decay**: Fast decay, low importance threshold

### 5. Sensory Memory
- **Description**: Immediate sensory impressions
- **Characteristics**: Brief, vivid, sense-related
- **Indicators**: "I saw", "heard", "felt", "smelled", sensory verbs
- **Decay**: Very fast decay, filtered by importance

### 6. Preference Memory
- **Description**: User preferences, settings, and personal choices
- **Characteristics**: Personal, subjective, choice-oriented
- **Indicators**: "I prefer", "I like", "don't like", "favorite", "love", "hate"
- **Decay**: Slow decay, stable personal preferences

### Classification Algorithm & Training Data

The NLP classification system includes 169 training examples distributed across 6 memory types:

**Training Data Distribution**:
- **Episodic**: 23 examples (personal experiences, temporal references)
- **Semantic**: 23 examples (facts, definitions, general knowledge)
- **Procedural**: 23 examples (instructions, processes, how-to content)
- **Working**: 24 examples (tasks, reminders, current activities)
- **Sensory**: 23 examples (sensory descriptions, perceptions)
- **Preference**: 30 examples (personal choices, preferences, likes/dislikes)

**Sample Training Examples**:
```typescript
const trainingExamples = {
  episodic: [
    "Yesterday I went to the park with my family",
    "I remember when we first met at the coffee shop",
    "Last week I attended a conference in San Francisco"
  ],
  semantic: [
    "The Earth orbits around the Sun",
    "Water boils at 100 degrees Celsius",
    "JavaScript is a programming language"
  ],
  procedural: [
    "To make coffee, first boil water, then add grounds",
    "How to tie a tie: start with the wide end on the right",
    "Step 1: Open the application. Step 2: Click on File"
  ],
  working: [
    "Need to finish the report by tomorrow",
    "Don't forget to call mom tonight",
    "Remind me to buy milk on the way home"
  ],
  sensory: [
    "The coffee smells like fresh roasted beans",
    "It feels smooth and silky to the touch",
    "The music sounds like gentle rain falling"
  ],
  preference: [
    "I prefer dark mode over light mode",
    "My favorite color is blue",
    "I don't like spicy food"
  ]
};
```

**Type Indicator Keywords**:
```typescript
const memoryTypeIndicators = {
  episodic: [
    'yesterday', 'last week', 'remember when', 'I went', 'I did', 'I saw',
    'that time', 'when I', 'we used to', 'I recall', 'I visited', 'I met'
  ],
  semantic: [
    'is a', 'are', 'defined as', 'means', 'refers to', 'consists of',
    'is the', 'stands for', 'represents', 'equals', 'contains', 'involves'
  ],
  procedural: [
    'how to', 'step', 'first', 'then', 'next', 'finally', 'begin',
    'start by', 'process', 'method', 'procedure', 'instructions'
  ],
  working: [
    'need to', 'must', 'have to', 'don\'t forget', 'remind me', 'todo',
    'deadline', 'by tomorrow', 'task', 'currently', 'working on'
  ],
  sensory: [
    'smells like', 'tastes like', 'sounds like', 'feels like', 'looks like',
    'texture', 'aroma', 'flavor', 'smooth', 'rough', 'bright', 'loud'
  ],
  preference: [
    'I prefer', 'I like', 'I don\'t like', 'favorite', 'love', 'hate',
    'my choice', 'I choose', 'rather than', 'I enjoy', 'ideal', 'best for me'
  ]
};
```

**Importance Level Indicators**:
```typescript
const importanceIndicators = {
  high: [
    'urgent', 'critical', 'important', 'essential', 'must', 'vital',
    'crucial', 'emergency', 'asap', 'immediately', 'priority', 'deadline'
  ],
  medium: [
    'should', 'need', 'required', 'necessary', 'significant', 'notable',
    'relevant', 'meaningful', 'valuable'
  ],
  low: [
    'maybe', 'perhaps', 'might', 'could', 'sometime', 'eventually',
    'possibly', 'optional', 'minor', 'trivial'
  ]
};
```

**Classification Process**:
1. **Naive Bayes**: Base classification using trained model
2. **Keyword Matching**: Check for strong type indicators
3. **Confidence Adjustment**: Boost if indicators match, use indicators if confidence < 0.7
4. **Importance Calculation**: Analyze urgency keywords, sentiment, and content features
5. **Sentiment Analysis**: Extract emotional polarity (-1 to +1)
6. **Keyword Extraction**: TF-IDF based with stop word filtering

**Mathematical Confidence Formula**:
- Base: `confidence = P(type|content)` from Naive Bayes
- Indicator boost: `confidence_new = min(confidence × 1.2, 1.0)`
- Fallback threshold: Use indicators if `confidence < 0.7`
- Final: `max(bayes_confidence, indicator_confidence)`

## Recall Strategies

### Strategy Pattern Implementation

```typescript
interface RecallStrategy {
  name: string;
  recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]>;
  score(memory: MemoryItem, query: string): number;
}
```

### 1. Composite Strategy (Default)

Combines multiple strategies with weighted scoring:

```typescript
class CompositeStrategy implements RecallStrategy {
  private strategies: Array<{
    strategy: RecallStrategy;
    weight: number;
  }>;

  async recall(query: string, memories: MemoryItem[]): Promise<MemoryItem[]> {
    // Score memories using all strategies
    const scoredMemories = memories.map(memory => {
      const scores = this.strategies.map(({strategy, weight}) => ({
        score: strategy.score(memory, query) * weight,
        strategy: strategy.name
      }));

      const totalScore = scores.reduce((sum, {score}) => sum + score, 0);

      return {
        memory,
        score: totalScore,
        breakdown: scores
      };
    });

    // Sort by score and return memories
    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .map(item => item.memory);
  }
}
```

### 2. Similarity Strategy

Uses text similarity and embeddings for semantic matching:

```typescript
class SimilarityStrategy implements RecallStrategy {
  score(memory: MemoryItem, query: string): number {
    // Text similarity (Jaccard + word overlap)
    const textScore = this.textSimilarity(memory.content, query);

    // Embedding similarity (if available)
    const embeddingScore = memory.embedding
      ? this.cosineSimilarity(memory.embedding, queryEmbedding)
      : 0;

    // Keyword overlap
    const keywordScore = this.jaccardSimilarity(
      memory.metadata?.keywords || [],
      this.extractKeywords(query)
    );

    return embeddingScore > 0
      ? (textScore * 0.3) + (embeddingScore * 0.5) + (keywordScore * 0.2)
      : (textScore * 0.7) + (keywordScore * 0.3);
  }

  private textSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const content2Lower = text2.toLowerCase();

    // Check if all query words appear in content
    const allWordsFound = words1.every(word => content2Lower.includes(word));
    if (allWordsFound) {
      return 0.8 + (0.2 * this.jaccardSimilarity(words1, words2));
    }

    // Partial word matching
    const foundWords = words1.filter(word => content2Lower.includes(word));
    const foundRatio = foundWords.length / words1.length;
    const jaccardScore = this.jaccardSimilarity(words1, words2);

    return (foundRatio * 0.6) + (jaccardScore * 0.4);
  }

  private jaccardSimilarity(set1: string[], set2: string[]): number {
    const s1 = new Set(set1);
    const s2 = new Set(set2);

    if (s1.size === 0 || s2.size === 0) return 0;

    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);

    return intersection.size / union.size;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
```

**Mathematical Formulas**:

- **Jaccard Similarity**: `J(A,B) = |A ∩ B| / |A ∪ B|`
- **Cosine Similarity**: `cos(θ) = (A · B) / (||A|| × ||B||)`
- **Text Similarity**: `score = foundRatio × 0.6 + jaccardScore × 0.4`
- **Final Score**: `textScore × w1 + embeddingScore × w2 + keywordScore × w3`

### 3. Recency Strategy

Prioritizes recently created or accessed memories:

```typescript
class RecencyStrategy implements RecallStrategy {
  score(memory: MemoryItem, query: string): number {
    const now = Date.now();
    const timeSinceCreation = now - memory.timestamp.getTime();
    const timeSinceAccess = memory.lastAccessed
      ? now - memory.lastAccessed.getTime()
      : timeSinceCreation;

    // Exponential decay with 24-hour half-life
    return Math.exp(-timeSinceAccess / (1000 * 60 * 60 * 24));
  }
}
```

**Mathematical Formula**:
- **Exponential Decay**: `score = e^(-t/τ)` where `t` is time elapsed and `τ` is time constant
- **Time Constant**: `τ = 24 hours = 86400000 ms`

### 4. Frequency Strategy

Prioritizes memories based on access patterns:

```typescript
class FrequencyStrategy implements RecallStrategy {
  score(memory: MemoryItem, query: string): number {
    const accessCount = memory.accessCount || 0;
    const daysSinceCreation = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);

    // Frequency score normalized by time
    return accessCount / Math.max(1, daysSinceCreation);
  }
}
```

**Mathematical Formula**:
- **Frequency Score**: `score = accessCount / max(1, daysSinceCreation)`

### 5. Importance Strategy

Prioritizes memories based on importance with decay:

```typescript
class ImportanceStrategy implements RecallStrategy {
  score(memory: MemoryItem, query: string): number {
    const baseImportance = memory.importance || 0.5;
    const daysSinceAccess = (Date.now() - (memory.lastAccessed?.getTime() || memory.timestamp.getTime())) / (1000 * 60 * 60 * 24);

    // Apply decay to importance
    const decayFactor = Math.exp(-0.693 * (daysSinceAccess / 30)); // 30-day half-life
    return baseImportance * decayFactor;
  }
}
```

**Mathematical Formula**:
- **Decay Formula**: `decayedImportance = importance × e^(-0.693 × (t/t₁/₂))`
- **Half-life**: `t₁/₂ = 30 days`

## NLP Integration

### Classification Pipeline

The NLP classification system uses a multi-stage approach:

```
Input Text
    │
    ▼
┌─────────────────┐
│   Tokenization  │ ─── Word tokenization, normalization
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Pattern Matching│ ─── Type indicator detection
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Naive Bayes     │ ─── Trained classifier
│ Classification  │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Confidence      │ ─── Threshold-based decisions
│ Evaluation      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Final Result    │ ─── Type, confidence, keywords
└─────────────────┘
```

### TypeScript to Python NLP Mapping

| TypeScript (Natural.js) | Python (NLTK/spaCy) | Purpose |
|-------------------------|---------------------|---------|
| `natural.BayesClassifier` | `nltk.NaiveBayesClassifier` | Text classification |
| `natural.WordTokenizer` | `nltk.word_tokenize` | Tokenization |
| `natural.TfIdf` | `sklearn.TfidfVectorizer` | TF-IDF calculation |
| `natural.PorterStemmer` | `nltk.PorterStemmer` | Word stemming |
| `natural.SentimentAnalyzer` | `nltk.sentiment.SentimentIntensityAnalyzer` | Sentiment analysis |

### Training Data Structure

```typescript
interface TrainingExample {
  text: string;
  type: MemoryType;
}

const episodicTrainingData: TrainingExample[] = [
  { text: "I went to the store yesterday and bought groceries", type: "episodic" },
  { text: "Remember when we had that meeting last Tuesday", type: "episodic" },
  // ... more examples
];
```

**Python Equivalent**:
```python
@dataclass
class TrainingExample:
    text: str
    memory_type: MemoryType

episodic_training_data = [
    TrainingExample("I went to the store yesterday and bought groceries", MemoryType.EPISODIC),
    TrainingExample("Remember when we had that meeting last Tuesday", MemoryType.EPISODIC),
    # ... more examples
]
```

## Event System

### Event-Driven Architecture

The system uses events for loose coupling between components:

```typescript
type MemoryEvent =
  | { type: 'memory:created'; memory: MemoryItem }
  | { type: 'memory:updated'; memory: MemoryItem; previous: MemoryItem }
  | { type: 'memory:deleted'; id: string }
  | { type: 'memory:accessed'; memory: MemoryItem }
  | { type: 'sync:started' }
  | { type: 'sync:completed'; count: number }
  | { type: 'sync:failed'; error: Error };
```

### Event Subscription Pattern

```typescript
// TypeScript Event Subscription
const unsubscribe = memory.subscribe((event) => {
  switch (event.type) {
    case 'memory:created':
      console.log('New memory created:', event.memory.id);
      break;
    case 'memory:updated':
      console.log('Memory updated:', event.memory.id);
      break;
    // ... handle other events
  }
});

// Cleanup
unsubscribe();
```

**Python Equivalent**:
```python
from typing import Callable, Union
from dataclasses import dataclass

class EventEmitter:
    def __init__(self):
        self.listeners = {}

    def on(self, event_type: str, callback: Callable):
        if event_type not in self.listeners:
            self.listeners[event_type] = []
        self.listeners[event_type].append(callback)

    def emit(self, event_type: str, data):
        if event_type in self.listeners:
            for callback in self.listeners[event_type]:
                callback(data)
```

## Domain Model

### Value Objects

All domain entities are implemented as immutable value objects:

```typescript
// Memory Item (Aggregate Root)
export interface MemoryItem {
  readonly id: string;           // UUID
  readonly type: MemoryType;     // Enum
  readonly content: string;      // Sanitized content
  readonly timestamp: Date;      // Creation time
  readonly importance: number;   // 0-1 scale
  readonly decay: number;        // Decay rate
  readonly relations: MemoryRelation[];
  readonly metadata: Record<string, any>;
  readonly tags: string[];
  // Access tracking
  readonly accessCount: number;
  readonly lastAccessed?: Date;
  // Optional features
  readonly embedding?: number[];
  readonly source?: string;
}
```

### Domain Services

```typescript
// Pattern Extraction Service
class PatternExtractor {
  private patterns: Pattern[] = [];

  async extract(text: string): Promise<ExtractionResult[]> {
    return this.patterns
      .sort((a, b) => b.priority - a.priority)
      .flatMap(pattern => this.applyPattern(pattern, text))
      .filter(result => result.confidence > 0.5);
  }
}

// Decay Service
class DecayEngine {
  applyDecay(memories: MemoryItem[]): MemoryItem[] {
    return memories.map(memory => ({
      ...memory,
      importance: this.calculateDecayedImportance(memory)
    }));
  }

  private calculateDecayedImportance(memory: MemoryItem): number {
    const timeSinceCreation = Date.now() - memory.timestamp.getTime();
    const daysSinceCreation = timeSinceCreation / (1000 * 60 * 60 * 24);

    // Exponential decay with access count boost
    const accessBoost = Math.log10(memory.accessCount + 1) / 10;
    return Math.max(0.1, memory.importance * Math.exp(-memory.decay * daysSinceCreation) + accessBoost);
  }
}
```

## Performance Optimizations

### 1. Lazy Loading Strategy

```typescript
// Lazy loading for large datasets
export const lazyKuzuMemory = () => Promise.all([
  import('./core/KuzuMemory'),
  import('./storage/IndexedDBAdapter'),
  import('./recall/CompositeStrategy')
]).then(([KuzuMemory, IndexedDBAdapter, CompositeStrategy]) => ({
  KuzuMemory: KuzuMemory.KuzuMemory,
  IndexedDBAdapter: IndexedDBAdapter.IndexedDBAdapter,
  CompositeStrategy: CompositeStrategy.CompositeStrategy
}));
```

### 2. Memory Streaming for Large Datasets

```typescript
// Streaming memory processing
class KuzuMemory {
  private async *streamMemories(batchSize: number = 100) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.storage.query({
        limit: batchSize,
        offset,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch;
        offset += batch.length;
        hasMore = batch.length === batchSize;
      }
    }
  }
}
```

### 3. Indexing Strategy

```typescript
// IndexedDB indexes for fast queries
const DB_SCHEMA = {
  memories: {
    keyPath: 'id',
    indexes: {
      type: { keyPath: 'type', unique: false },
      timestamp: { keyPath: 'timestamp', unique: false },
      importance: { keyPath: 'importance', unique: false },
      tags: { keyPath: 'tags', unique: false, multiEntry: true },
      content: { keyPath: 'content', unique: false } // For full-text search
    }
  }
};
```

### 4. Caching Layer

```typescript
// LRU Cache for frequently accessed memories
class MemoryCache {
  private cache = new Map<string, MemoryItem>();
  private maxSize = 100;

  get(id: string): MemoryItem | null {
    const item = this.cache.get(id);
    if (item) {
      // Move to end (most recently used)
      this.cache.delete(id);
      this.cache.set(id, item);
    }
    return item || null;
  }

  set(id: string, memory: MemoryItem): void {
    if (this.cache.has(id)) {
      this.cache.delete(id);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(id, memory);
  }
}
```

## Security Model

### 1. Input Sanitization

```typescript
import DOMPurify from 'dompurify';

export function sanitizeMemoryContent(content: string): string {
  // Remove potentially dangerous HTML/JS
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });

  // Additional validation
  if (sanitized.length > 10000) {
    throw new Error('Content too long');
  }

  return sanitized.trim();
}
```

### 2. ReDoS Protection

```typescript
// Safe regex patterns with timeouts
class SafeRegexMatcher {
  private static readonly TIMEOUT_MS = 100;

  static test(pattern: RegExp, text: string): boolean {
    return new Promise((resolve) => {
      const worker = new Worker(`
        const pattern = new RegExp(${JSON.stringify(pattern.source)}, '${pattern.flags}');
        const result = pattern.test(${JSON.stringify(text)});
        postMessage(result);
      `);

      const timeout = setTimeout(() => {
        worker.terminate();
        resolve(false); // Assume no match on timeout
      }, this.TIMEOUT_MS);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(e.data);
      };
    });
  }
}
```

### 3. Validation Layer

All data structures use Zod for runtime validation:

```typescript
import { z } from 'zod';

export const MemoryItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['episodic', 'semantic', 'procedural', 'working', 'sensory', 'preference']),
  content: z.string().max(10000),
  timestamp: z.date(),
  importance: z.number().min(0).max(1),
  // ... other fields with validation
});

// Python equivalent using Pydantic
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from uuid import UUID

class MemoryItem(BaseModel):
    id: UUID
    type: MemoryType
    content: str
    timestamp: datetime
    importance: float

    @validator('importance')
    def validate_importance(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Importance must be between 0 and 1')
        return v

    @validator('content')
    def validate_content(cls, v):
        if len(v) > 10000:
            raise ValueError('Content too long')
        return v
```

## API Contract

### Public API Surface

The library exposes a minimal, stable API:

```typescript
// Main API exports
export { createMemoryClient } from './core/client';
export { KuzuMemory } from './core/KuzuMemory';
export { QueryBuilder } from './core/QueryBuilder';

// React hooks
export {
  useKuzuMemory,
  useMemoryQuery,
  useMemoryMutation,
  useMemorySubscription
} from './hooks';

// Types (stable contract)
export type {
  MemoryItem,
  MemoryType,
  MemoryQuery,
  KuzuConfig,
  StorageAdapter,
  RecallStrategy
} from './types';
```

### Versioning Strategy

- **Major version**: Breaking API changes
- **Minor version**: New features, backward compatible
- **Patch version**: Bug fixes, no API changes

### Breaking Change Policy

```typescript
// Deprecated API (marked for removal)
/** @deprecated Use createMemoryClient instead */
export function createKuzuMemory(config: KuzuConfig): KuzuMemory {
  console.warn('createKuzuMemory is deprecated. Use createMemoryClient instead.');
  return createMemoryClient(config);
}
```

## Cross-Platform Considerations

### 1. Language-Agnostic Design Patterns

The architecture uses patterns that translate well across languages:

| Pattern | TypeScript | Python | Java | C# |
|---------|------------|--------|------|-----|
| Factory | `createStorageAdapter()` | `create_storage_adapter()` | `StorageAdapterFactory.create()` | `StorageAdapterFactory.Create()` |
| Strategy | `RecallStrategy` interface | `RecallStrategy` ABC | `RecallStrategy` interface | `IRecallStrategy` interface |
| Observer | `EventEmitter` | `EventEmitter` class | `Observable` pattern | `IObservable<T>` |
| Repository | `StorageAdapter` | `StorageAdapter` ABC | `IRepository<T>` | `IRepository<T>` |

### 2. Data Structure Compatibility

```typescript
// TypeScript schema
interface MemoryItem {
  id: string;           // UUID
  type: MemoryType;     // Enum
  content: string;      // UTF-8 text
  timestamp: Date;      // ISO 8601 datetime
  importance: number;   // IEEE 754 double
  metadata: Record<string, any>; // JSON object
}
```

```python
# Python equivalent
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any
from uuid import UUID

@dataclass
class MemoryItem:
    id: UUID
    type: MemoryType
    content: str
    timestamp: datetime
    importance: float
    metadata: Dict[str, Any]
```

```java
// Java equivalent
public class MemoryItem {
    private final UUID id;
    private final MemoryType type;
    private final String content;
    private final Instant timestamp;
    private final double importance;
    private final Map<String, Object> metadata;

    // Constructor, getters, equals, hashCode
}
```

### 3. Configuration Management

```typescript
// TypeScript configuration
interface KuzuConfig {
  storage: 'indexeddb' | 'memory' | 'localStorage';
  dbName: string;
  version: number;
  maxMemories: number;
  decayEnabled: boolean;
}
```

**Cross-Platform Config Format (JSON/YAML)**:
```yaml
# kuzu-config.yaml
storage:
  type: "sqlite"  # or "postgresql", "memory"
  database: "kuzu_memory.db"
  version: 1

memory:
  max_items: 10000
  decay_enabled: true
  decay_interval: 86400000  # 24 hours in ms

nlp:
  auto_classify: true
  confidence_threshold: 0.6
  language: "en"
```

### 4. Error Handling Patterns

```typescript
// TypeScript Result type
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

async function createMemory(content: string): Promise<Result<MemoryItem, Error>> {
  try {
    const memory = await memoryService.create(content);
    return { success: true, data: memory };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

**Python Equivalent**:
```python
from typing import Union, TypeVar, Generic
from dataclasses import dataclass

T = TypeVar('T')
E = TypeVar('E')

@dataclass
class Ok(Generic[T]):
    value: T

@dataclass
class Err(Generic[E]):
    error: E

Result = Union[Ok[T], Err[E]]

async def create_memory(content: str) -> Result[MemoryItem, Exception]:
    try:
        memory = await memory_service.create(content)
        return Ok(memory)
    except Exception as e:
        return Err(e)
```

### 5. Testing Strategy Alignment

```typescript
// TypeScript test structure
describe('MemoryCreation', () => {
  test('should create episodic memory', async () => {
    const memory = await client.create('I went to the store');
    expect(memory.type).toBe('episodic');
  });
});
```

**Python Equivalent**:
```python
import pytest

class TestMemoryCreation:
    @pytest.mark.asyncio
    async def test_should_create_episodic_memory(self, client):
        memory = await client.create('I went to the store')
        assert memory.type == MemoryType.EPISODIC
```

### 6. Package Structure

```
TypeScript Package:
kuzu-memory/
├── src/
│   ├── core/
│   ├── storage/
│   ├── recall/
│   ├── nlp/
│   └── types/
├── dist/
└── package.json

Python Package:
kuzu-memory/
├── kuzu_memory/
│   ├── core/
│   ├── storage/
│   ├── recall/
│   ├── nlp/
│   └── types/
├── tests/
├── setup.py
└── pyproject.toml
```

This architecture provides a solid foundation for cross-platform implementation while maintaining consistency across different runtime environments and programming languages. The use of well-established design patterns, clear interfaces, and language-agnostic data structures ensures that the core concepts can be easily translated while preserving the system's functionality and performance characteristics.