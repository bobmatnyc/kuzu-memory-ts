# Kuzu Memory - Claude Code Integration Guide

**Project Type**: TypeScript Library for Memory Management
**Target**: Next.js/React Applications
**Architecture**: Modular library with hooks for React integration

## 🔴 CRITICAL - Security & Memory Handling

### Production Status
- **Test Coverage**: 97+ tests passing (98 total, 1 skipped)
- **Storage Systems**: All 3 adapters fully functional (Memory, localStorage, IndexedDB)
- **UAT Suite**: Comprehensive user acceptance testing implemented
- **Performance**: Meets speed requirements (<100ms operations)
- **Production Ready**: ✅ Core functionality validated

### Memory Security Requirements
- All user content is sanitized via `sanitizeMemoryContent()` before storage
- No eval() or code execution in pattern extraction
- IndexedDB storage is sandboxed to origin
- Memory items use UUID validation for IDs
- Maximum memory limit enforced (default: 10,000 items)

### API Contracts (Zod Validated)
```typescript
// Core memory structure - NEVER change without version bump
MemoryItemSchema: {
  id: string (UUID)
  type: 'episodic' | 'semantic' | 'procedural' | 'working' | 'sensory'
  content: string (sanitized)
  importance: number (0-1)
  timestamp: Date
  relations: Array<{targetId, type, strength}>
}

// Storage adapters must implement
StorageAdapter: {
  init(), get(), create(), update(), delete(), query(), clear()
}
```

### Critical File Dependencies
- `/src/types/index.ts` - Core type definitions (DO NOT BREAK)
- `/src/core/KuzuMemory.ts` - Main API class
- `/src/utils/validators.ts` - Security sanitization
- `/src/storage/factory.ts` - Storage adapter creation

## 🟡 IMPORTANT - Architecture & Key Workflows

### Project Structure
```
src/
├── types/           # Core type definitions (Zod schemas)
├── core/           # Main KuzuMemory class and client factory
├── storage/        # Storage adapters (IndexedDB, localStorage, memory)
├── recall/         # Memory retrieval strategies
├── extraction/     # Pattern extraction from text
├── hooks/          # React hooks for Next.js integration
├── utils/          # Helpers, decay logic, validators
└── index.ts        # Main entry point
```

### Single-Path Commands (Makefile Standard)
```bash
# THE way to build
make build

# THE way to test (all tests including UAT)
make test

# THE way to test UAT specifically
make test:uat

# THE way to develop
make dev

# THE way to type-check
make type-check

# THE way to lint
make lint

# THE way to publish
make publish

# THE way to run quality checks
make quality

# THE way to get help
make help
```

### Core Workflow: Memory Lifecycle
1. **Creation**: `memory.create(content, metadata?)` → sanitize → extract patterns → store
2. **Retrieval**: `memory.recall(query)` → storage query → apply recall strategy → return ranked results
3. **Updates**: `memory.update(id, changes)` → validate → update → emit events
4. **Decay**: Background process reduces importance over time, deletes forgotten memories

### Integration Pattern for Next.js
```typescript
// 1. Initialize client
const { client } = useKuzuMemory({ storage: 'indexeddb', autoInit: true });

// 2. Query memories reactively
const { data: memories } = useMemoryQuery({ client, query: {...} });

// 3. Mutations with optimistic updates
const { create, update, remove } = useMemoryMutation({ client });
```

## 🟢 STANDARD - Common Operations

### Development Setup
```bash
npm install          # Install dependencies
npm run dev          # Watch mode development
npm run type-check   # TypeScript validation
npm run lint         # ESLint checking
npm run build        # Production build
```

### Adding New Storage Adapter
1. Implement `StorageAdapter` interface in `/src/storage/`
2. Add to factory in `/src/storage/factory.ts`
3. Update type union in `/src/types/index.ts`
4. Test with all existing recall strategies

### Adding New Recall Strategy
1. Implement `RecallStrategy` interface in `/src/recall/`
2. Add to factory in `/src/recall/factory.ts`
3. Implement scoring function for memory ranking
4. Test with different memory types and queries

### Pattern Extraction
- Built-in patterns: emails, URLs, dates, phone numbers, code snippets
- Add custom patterns via `memory.addPattern({ id, name, regex, priority })`
- Higher priority patterns are processed first

## ⚪ OPTIONAL - Future Enhancements

### Embedding Integration
```typescript
const memory = createMemoryClient({
  embeddingProvider: async (text) => {
    // Your embedding service (OpenAI, Cohere, etc.)
    return embeddings;
  }
});
```

### Performance Optimizations
- Implement LRU cache for frequently accessed memories
- Background indexing for large datasets
- Streaming query results for massive datasets
- Web Worker support for heavy processing

### Advanced Features
- Memory clustering and topic modeling
- Export/import functionality (JSON, CSV)
- Memory analytics and insights
- Multi-user support with permissions
- Real-time synchronization across devices

## Key Files by Priority

### 🔴 CRITICAL (Never break these)
- `src/types/index.ts` - Core type definitions
- `src/core/KuzuMemory.ts` - Main API class
- `src/index.ts` - Public API surface

### 🟡 IMPORTANT (Major features)
- `src/storage/IndexedDBAdapter.ts` - Primary storage
- `src/hooks/useKuzuMemory.ts` - React integration
- `src/recall/CompositeStrategy.ts` - Default recall

### 🟢 STANDARD (Implementation details)
- `src/extraction/PatternExtractor.ts` - Text processing
- `src/utils/decay.ts` - Memory aging logic
- `src/storage/factory.ts` - Adapter creation

## Claude Code Integration Notes

- **Memory System**: Already initialized in `.claude-mpm/` with comprehensive project context
- **Git Status**: Not a git repo - consider `git init` for version control
- **Build System**: Uses tsup for fast TypeScript compilation
- **Testing**: ✅ 97+ UAT tests passing, comprehensive test suite implemented
- **Documentation**: Complete documentation hierarchy established

## Essential Documentation

### 🔴 CRITICAL - Read First
- **CLAUDE.md** (this file) - Priority-based development guide
- **README.md** - Project overview with production status

### 🟡 IMPORTANT - Implementation Context
- **EXAMPLES.md** - Complete usage patterns and integration examples
- **TROUBLESHOOTING.md** - Common issues and debugging guide
- **DEVELOPER.md** - Contributor and development patterns

### 🟢 STANDARD - Technical Reference
- **CODE_STRUCTURE.md** - Architectural documentation
- **Makefile** - Single-path command reference
- **package.json** - Dependencies and scripts

## Quick Start for Development

```bash
cd /Users/masa/Projects/managed/kuzu-memory-ts
npm install
npm run dev  # Start development mode
npm run type-check  # Validate TypeScript
npm run build  # Test production build
```

The library is well-structured with clear separation of concerns, comprehensive type safety, and excellent documentation. Focus on maintaining the existing architecture patterns when making changes.