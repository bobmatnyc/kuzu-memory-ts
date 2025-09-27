# Kuzu Memory - Code Structure Analysis

**Generated**: 2025-09-25
**Purpose**: Comprehensive overview of the TypeScript library architecture

## 🏗️ High-Level Architecture

Kuzu Memory follows a **modular, layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│               React Hooks              │  ← Next.js Integration
├─────────────────────────────────────────┤
│              Core API                  │  ← Main KuzuMemory Class
├─────────────────────────────────────────┤
│   Storage    │  Recall   │ Extraction  │  ← Strategy Patterns
│   Adapters   │ Strategies│  Patterns   │
├─────────────────────────────────────────┤
│          Types & Validation            │  ← Zod Schemas
├─────────────────────────────────────────┤
│               Utilities                │  ← Helpers & Utils
└─────────────────────────────────────────┘
```

## 📦 Module Breakdown

### `/src/types/` - Type System Foundation
**Core Schemas (Zod-based)**:
- `MemoryTypeEnum` - Memory classification system
- `MemoryItemSchema` - Core memory structure with relations
- `PatternSchema` - Text extraction patterns
- `MemoryQuerySchema` - Query filtering and sorting
- `KuzuConfigSchema` - Library configuration

**Interfaces**:
- `StorageAdapter` - Storage backend contract
- `RecallStrategy` - Memory retrieval strategy contract
- `ExtractionResult` - Pattern extraction output

### `/src/core/` - Main API Layer
**KuzuMemory Class** (`KuzuMemory.ts`):
- **Inherits**: EventEmitter for event-driven architecture
- **Key Methods**:
  - `create(content, metadata)` → Memory creation with pattern extraction
  - `recall(query, options)` → Intelligent memory retrieval
  - `query(memoryQuery)` → Filtered searching
  - `update/delete/get` → CRUD operations
- **Internal Systems**:
  - Automatic pattern extraction on content
  - Memory decay and pruning
  - Event emission for all operations
  - Configurable sync intervals

**Client Factory** (`client.ts`):
- `createMemoryClient(config)` - Main entry point
- Default client singleton management
- Configuration validation

### `/src/storage/` - Storage Layer (Strategy Pattern)
**Adapters**:
- `IndexedDBAdapter` - Browser persistent storage (primary)
- `LocalStorageAdapter` - Simple browser storage
- `MemoryAdapter` - In-memory storage (testing)

**Factory Pattern**: `createStorageAdapter(options)` - Runtime adapter selection

**Common Interface**:
```typescript
interface StorageAdapter {
  init(): Promise<void>
  get/getMany/create/update/delete: CRUD operations
  query(MemoryQuery): Promise<MemoryItem[]>
  getStats(): Promise<StorageStats>
}
```

### `/src/recall/` - Memory Retrieval Strategies
**Strategy Classes**:
- `RecencyStrategy` - Time-based ranking
- `ImportanceStrategy` - Importance score ranking
- `FrequencyStrategy` - Access count ranking
- `SimilarityStrategy` - Text/embedding similarity
- `CompositeStrategy` - Weighted combination of strategies

**Factory**: `createRecallStrategy(options)` - Strategy composition

**Scoring System**: Each strategy implements `score(memory, query): number`

### `/src/extraction/` - Pattern Extraction System
**PatternExtractor Class**:
- Configurable pattern library
- Priority-based extraction order
- Result confidence scoring

**Built-in Extractors** (`extractors.ts`):
- Email, URL, phone number patterns
- Code snippet detection (multiple languages)
- Date/time extraction
- Task and question detection
- Entity recognition patterns
- Keyword and sentence extraction

**Default Patterns** (`patterns.ts`): Pre-configured extraction library

### `/src/hooks/` - React Integration Layer
**Primary Hooks**:
- `useKuzuMemory(options)` - Client initialization and lifecycle
- `useMemoryQuery(query)` - Reactive memory querying
- `useMemoryMutation()` - Create/update/delete operations
- `useMemorySubscription(handler)` - Event stream subscription

**Features**:
- Automatic re-rendering on data changes
- Error boundary integration
- Loading states management
- Optimistic updates for mutations

### `/src/utils/` - Utility Layer
**Validation** (`validators.ts`):
- `sanitizeMemoryContent()` - XSS prevention
- Schema validation helpers
- Input sanitization

**Helpers** (`helpers.ts`):
- `debounce/throttle` - Performance optimization
- `groupMemoriesByType/Tag` - Data organization
- `calculateMemoryScore` - Composite scoring
- `createMemoryGraph` - Relationship mapping

**Formatters** (`formatters.ts`):
- `formatTimestamp/RelativeTime` - Date formatting
- `formatMemoryForDisplay` - UI formatting
- `truncateContent` - Content truncation

**Decay System** (`decay.ts`):
- `calculateDecay()` - Importance degradation over time
- `applyDecayToMemories()` - Batch decay processing
- `shouldForget()` - Forgetting threshold logic

## 🔄 Data Flow Patterns

### Memory Creation Flow:
```
User Input → Sanitization → Pattern Extraction → Storage → Event Emission
```

### Memory Recall Flow:
```
Query → Storage Filter → Recall Strategy → Scoring → Ranked Results
```

### React Hook Flow:
```
Component → useMemoryQuery → Storage Query → State Update → Re-render
```

## 🎯 Design Patterns Used

1. **Strategy Pattern**: Storage adapters and recall strategies
2. **Factory Pattern**: Adapter and strategy creation
3. **Observer Pattern**: Event system for state changes
4. **Repository Pattern**: Storage abstraction layer
5. **Builder Pattern**: Complex query construction
6. **Singleton Pattern**: Default client management

## 🔗 Key Dependencies

### Runtime Dependencies:
- **Dexie**: IndexedDB abstraction and React hooks
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date formatting and manipulation
- **uuid**: Unique identifier generation

### Development Dependencies:
- **TypeScript**: Type system and compilation
- **tsup**: Fast TypeScript bundler
- **ESLint**: Code linting
- **Jest**: Testing framework
- **Prettier**: Code formatting

## 📊 Complexity Analysis

### High Complexity:
- `KuzuMemory.ts` (317 lines) - Central orchestration
- `IndexedDBAdapter.ts` - Database operations
- `CompositeStrategy.ts` - Multi-strategy coordination

### Medium Complexity:
- Type definitions (`types/index.ts`) - 132 lines of schemas
- Pattern extraction system
- React hooks implementation

### Low Complexity:
- Individual recall strategies
- Utility functions
- Simple storage adapters

## 🔒 Security Considerations

### Input Sanitization:
- All content passes through `sanitizeMemoryContent()`
- XSS prevention in pattern extraction
- Schema validation on all inputs

### Storage Security:
- IndexedDB origin isolation
- No eval() or code execution
- UUID-based identifiers

### Memory Management:
- Configurable memory limits
- Automatic pruning of old memories
- Decay-based forgetting

## 🚀 Performance Characteristics

### Optimizations:
- Lazy loading of storage adapters
- Debounced query execution
- Background decay processing
- Tree-shaking friendly exports

### Scalability Limits:
- Default 10,000 memory limit
- IndexedDB browser storage limits
- Single-threaded JavaScript execution

## 📈 Extension Points

### Easy Extensions:
- New storage adapters (Redis, SQLite, etc.)
- Additional recall strategies
- Custom pattern extractors
- New memory types

### Architecture Extensions:
- Multi-user support
- Real-time synchronization
- Machine learning integration
- Analytics and insights

## 🧪 Testing Strategy

### Current Setup:
- Jest test framework configured
- TypeScript test support
- JSDOM environment for browser APIs

### Recommended Tests:
- Unit tests for each strategy
- Integration tests for storage adapters
- React hook testing with testing-library
- End-to-end workflow tests

## 📝 API Surface Summary

### Public Exports (`src/index.ts`):
```typescript
// Types
export * from './types'

// Core API
export { KuzuMemory, createMemoryClient }

// Strategies (re-exported)
export * from './storage'
export * from './recall'
export * from './extraction'
export * from './utils'

// Version
export const VERSION = '0.1.0'
```

### React Hooks (`src/hooks/index.ts`):
```typescript
export {
  useKuzuMemory,
  useMemoryQuery,
  useMemoryMutation,
  useMemorySubscription
}
```

The architecture demonstrates excellent separation of concerns, comprehensive type safety, and extensible design patterns. The codebase is well-structured for both library consumers and contributors.