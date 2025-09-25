# UAT Test Suite for Kuzu Memory

This directory contains User Acceptance Testing (UAT) tests for the Kuzu Memory TypeScript library. These tests validate the library's functionality from an end-user perspective, ensuring that all features work correctly in real-world scenarios.

## Test Structure

### Test Files

- **`storage.uat.test.ts`** - Storage operations testing
  - Different content types (plain text, code, JSON, markdown)
  - Various memory types (episodic, semantic, procedural, working, sensory)
  - Metadata and tags handling
  - Bulk operations and edge cases

- **`recall.uat.test.ts`** - Recall strategy testing
  - Keyword-based queries
  - Time-based queries
  - Importance-based filtering
  - Strategy performance and accuracy

- **`patterns.uat.test.ts`** - Pattern extraction testing
  - Identity patterns ("I am...", "My name is...")
  - Preference patterns ("I prefer...", "I like...")
  - Decision patterns ("We decided...", "The solution is...")
  - Code patterns and technology mentions
  - URL and email extraction

- **`integration.uat.test.ts`** - End-to-end scenarios
  - Complete user workflows
  - Multi-user contexts
  - Session management
  - Real-world use cases

- **`performance.uat.test.ts`** - Performance benchmarks
  - Storage speed (<20ms target)
  - Recall speed (<10ms target)
  - Bulk operations
  - Memory usage monitoring

- **`hooks.uat.test.ts`** - React hooks testing
  - useKuzuMemory hook
  - useMemoryQuery hook
  - useMemoryMutation hook
  - useMemorySubscription hook

### Test Fixtures

The `fixtures/` directory contains:

- **`sample-memories.ts`** - Pre-built memory data for testing
- **`test-patterns.ts`** - Pattern definitions and expected results
- **`mock-adapters.ts`** - Mock storage adapters for testing
- **`index.ts`** - Exports all fixtures

## Running UAT Tests

### All UAT Tests
```bash
npm test -- tests/uat
```

### Specific Test Suite
```bash
# Storage tests
npm test -- tests/uat/storage.uat.test.ts

# Recall tests
npm test -- tests/uat/recall.uat.test.ts

# Pattern extraction tests
npm test -- tests/uat/patterns.uat.test.ts

# Integration tests
npm test -- tests/uat/integration.uat.test.ts

# Performance tests
npm test -- tests/uat/performance.uat.test.ts

# React hooks tests
npm test -- tests/uat/hooks.uat.test.ts
```

### With Coverage
```bash
npm test -- --coverage tests/uat
```

## Performance Targets

The UAT tests validate against the following performance targets:

- **Storage Time**: < 20ms per memory
- **Retrieval Time**: < 10ms per memory
- **Query Time**: < 50ms for complex queries
- **Recall Time**: < 100ms for strategy-based recall
- **Bulk Storage**: < 1000ms for 1000 memories
- **Memory Usage**: < 50MB for large datasets

## Test Categories

### Storage Tests
- ✅ Basic CRUD operations
- ✅ Content type handling (text, JSON, code, markdown)
- ✅ Metadata and tags storage
- ✅ Bulk operations
- ✅ Concurrent operations
- ✅ Error handling

### Recall Tests
- ✅ Recency strategy
- ✅ Importance strategy
- ✅ Frequency strategy
- ✅ Similarity strategy
- ✅ Composite strategy
- ✅ Performance benchmarks

### Pattern Extraction Tests
- ✅ Identity patterns
- ✅ Preference patterns
- ✅ Decision patterns
- ✅ Contact information
- ✅ Code patterns
- ✅ Custom patterns

### Integration Tests
- ✅ Complete user workflows
- ✅ Project development lifecycle
- ✅ Multi-user contexts
- ✅ Session management
- ✅ Event handling

### Performance Tests
- ✅ Storage performance across adapters
- ✅ Recall strategy performance
- ✅ End-to-end workflow performance
- ✅ Memory pressure handling
- ✅ Concurrent operations

### Hook Tests
- ✅ useKuzuMemory initialization
- ✅ useMemoryQuery operations
- ✅ useMemoryMutation CRUD
- ✅ useMemorySubscription events
- ✅ Hook integration scenarios

## Test Data

The test suite uses realistic data samples including:

- **Identity Data**: Names, roles, personal information
- **Preferences**: Tool preferences, UI preferences
- **Decisions**: Team decisions, technical choices
- **Code Samples**: TypeScript, JavaScript, various languages
- **Documentation**: Markdown, JSON configurations
- **Contact Info**: Emails, URLs, dates
- **Large Content**: Performance testing data

## Edge Cases Tested

- Empty and null inputs
- Unicode and special characters
- Large content (>10KB per memory)
- Corrupted data recovery
- Network failures simulation
- Memory cleanup and pruning
- Concurrent operation conflicts

## Validation Criteria

Tests validate:

1. **Functionality**: All features work as specified
2. **Performance**: Meet performance targets
3. **Reliability**: Handle errors gracefully
4. **Scalability**: Work with large datasets
5. **Usability**: React hooks provide good DX
6. **Compatibility**: Work across different storage adapters

## Continuous Integration

These UAT tests are designed to run in CI/CD pipelines to ensure:

- No regressions in functionality
- Performance targets are maintained
- New features work with existing code
- Edge cases are handled properly

## Contributing

When adding new features:

1. Add corresponding UAT tests
2. Update test fixtures if needed
3. Ensure performance targets are met
4. Test edge cases and error scenarios
5. Update this README if needed