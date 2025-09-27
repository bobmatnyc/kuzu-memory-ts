# Kuzu Memory - Project Patterns

**Memory Type**: Project Architecture Patterns
**Created**: 2025-09-25
**Importance**: High

## Core Architecture Patterns

### Strategy Pattern Implementation
- Storage adapters (IndexedDB, localStorage, memory)
- Recall strategies (recency, importance, frequency, similarity, composite)
- Pattern extractors (email, URL, code, dates)
- **Key Insight**: Factory pattern creates runtime strategy selection

### Event-Driven Architecture
- KuzuMemory extends EventEmitter
- All CRUD operations emit events
- React hooks subscribe to event streams
- **Pattern**: Observer pattern for state management

### Type-Safe API Design
- Zod schemas for runtime validation
- TypeScript interfaces for compile-time safety
- Schema composition and reuse
- **Pattern**: Schema-first API development

### Modular Export Strategy
```typescript
// Main entry point
export * from './types';
export { KuzuMemory, createMemoryClient } from './core';

// Separate hooks export
export * from './hooks' // via package.json exports
```

## Memory Management Patterns

### Decay System
- Background process reduces importance over time
- Configurable decay intervals and thresholds
- Automatic pruning of forgotten memories
- **Pattern**: Time-based resource management

### Storage Abstraction
- Common interface across all storage backends
- Async/await throughout for consistent API
- Error handling at adapter boundaries
- **Pattern**: Repository pattern with async operations

### React Integration
- Custom hooks for memory operations
- Automatic re-rendering on data changes
- Optimistic updates for better UX
- **Pattern**: React Query-style data fetching

## Development Patterns

### Build System
- tsup for fast TypeScript compilation
- Dual CJS/ESM output
- Tree-shaking friendly exports
- **Pattern**: Modern library bundling

### Testing Strategy
- Jest with TypeScript support
- Fake IndexedDB for browser API mocking
- Coverage thresholds enforced
- **Pattern**: Comprehensive unit + integration testing

### Code Quality
- ESLint + Prettier for consistency
- TypeScript strict mode
- Zod runtime validation
- **Pattern**: Multi-layer validation (compile + runtime)

## Performance Patterns

### Lazy Loading
- Storage adapters created on demand
- Pattern extractors loaded per need
- React hooks with proper dependencies
- **Pattern**: Deferred initialization

### Memory Optimization
- Configurable memory limits
- LRU-based pruning strategies
- Event listener cleanup
- **Pattern**: Resource lifecycle management

### Query Optimization
- Debounced search operations
- Indexed query patterns
- Result caching opportunities
- **Pattern**: Database-style query optimization

## Security Patterns

### Input Sanitization
- XSS prevention in content
- URL and script tag removal
- Validation at API boundaries
- **Pattern**: Defense in depth

### Storage Security
- Origin-based isolation (IndexedDB)
- No eval() or code execution
- UUID-based identifiers
- **Pattern**: Secure by default

## Extension Patterns

### Plugin Architecture
- Strategy interfaces for extensibility
- Factory pattern for registration
- Configuration-driven selection
- **Pattern**: Open/closed principle

### API Evolution
- Semantic versioning
- Backward compatibility layers
- Migration utilities
- **Pattern**: Version-aware API design

## Common Anti-Patterns Avoided

### ❌ God Class
- **Avoided by**: Modular architecture with clear separation
- **Instead**: Single responsibility principle per module

### ❌ Tight Coupling
- **Avoided by**: Interface-based abstractions
- **Instead**: Dependency injection via factories

### ❌ Magic Strings
- **Avoided by**: Enum types and constants
- **Instead**: Type-safe string unions

### ❌ Callback Hell
- **Avoided by**: Async/await throughout
- **Instead**: Promise-based async operations

## Key Learning Points

1. **Type Safety**: Zod + TypeScript provides both compile and runtime safety
2. **Strategy Pattern**: Excellent for algorithms that might change
3. **Event-Driven**: Natural fit for React integration
4. **Factory Pattern**: Essential for plugin architectures
5. **Resource Management**: Important for long-running applications