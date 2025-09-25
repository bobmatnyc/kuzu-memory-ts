# Kuzu Memory - Troubleshooting Guide

**Production Ready**: ✅ 97+ tests passing | ✅ All storage adapters functional

This guide helps you resolve common issues when integrating Kuzu Memory into your Next.js applications.

## Quick Diagnostics

### Health Check Commands
```bash
# Check overall project health
make status

# Detailed test status
make test-status

# Run specific test suites
make test-uat-storage      # Storage functionality
make test-uat-hooks        # React integration
make test-uat-performance  # Performance validation
```

## Common Integration Issues

### 1. IndexedDB Not Working in Browser

**Symptoms:**
- "Failed to initialize IndexedDB" errors
- Memory creation fails in browser
- Storage operations timeout

**Solutions:**
```typescript
// Check browser support
if (!('indexedDB' in window)) {
  // Fall back to localStorage
  const memory = await createMemoryClient({
    storage: 'localStorage',
  });
}

// Enable debugging
const memory = await createMemoryClient({
  storage: 'indexeddb',
  debug: true, // Shows detailed error logs
});
```

**Browser Compatibility:**
- ✅ Chrome 24+
- ✅ Firefox 16+
- ✅ Safari 10+
- ✅ Edge 12+

### 2. React Hooks Not Working

**Symptoms:**
- "useKuzuMemory is not a function"
- Hooks don't update when data changes
- TypeScript errors in React components

**Solutions:**
```typescript
// Correct import pattern
import { useKuzuMemory, useMemoryQuery } from 'kuzu-memory/hooks';

// Ensure React version compatibility
// Requires React >=16.8.0 for hooks support

// Check proper initialization
function MyComponent() {
  const { client, isInitialized, error } = useKuzuMemory({
    storage: 'indexeddb',
    autoInit: true,
  });

  if (error) {
    console.error('Kuzu Memory initialization failed:', error);
  }

  if (!isInitialized) {
    return <div>Loading memory system...</div>;
  }

  // Safe to use client here
}
```

**Common React Issues:**
```typescript
// ❌ Wrong: Using client before initialization
const { client } = useKuzuMemory({ storage: 'indexeddb' });
const result = await client.create('content'); // May fail

// ✅ Correct: Check initialization first
const { client, isInitialized } = useKuzuMemory({ storage: 'indexeddb' });
if (isInitialized) {
  const result = await client.create('content');
}
```

### 3. Next.js SSR/SSG Issues

**Symptoms:**
- "window is not defined" errors
- Hydration mismatches
- IndexedDB errors during build

**Solutions:**
```typescript
// Use dynamic imports to avoid SSR issues
import dynamic from 'next/dynamic';

const MemoryComponent = dynamic(() => import('./MemoryComponent'), {
  ssr: false,
  loading: () => <div>Loading memory system...</div>,
});

// Or check for browser environment
import { useEffect, useState } from 'react';

function useClientOnly() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

function MyComponent() {
  const isClient = useClientOnly();
  const { client } = useKuzuMemory({
    storage: isClient ? 'indexeddb' : 'memory',
    autoInit: isClient,
  });

  if (!isClient) return null;

  // Safe to use browser APIs here
}
```

### 4. Memory Operations Slow/Timing Out

**Symptoms:**
- Operations take >100ms consistently
- Browser becomes unresponsive
- Memory usage grows excessively

**Performance Debugging:**
```typescript
// Enable performance monitoring
const memory = await createMemoryClient({
  storage: 'indexeddb',
  performanceMonitoring: true,
});

// Check storage statistics
const stats = await memory.getStats();
console.log('Memory count:', stats.totalMemories);
console.log('Storage size:', stats.storageSize);

// Optimize queries
const results = await memory.query({
  limit: 50, // Don't load too many at once
  sortBy: 'importance',
  tags: ['specific'], // Use specific filters
});
```

**Performance Limits:**
- **Storage**: ~10,000 memories (configurable)
- **Query Speed**: <100ms for typical operations
- **Memory Usage**: ~1MB per 1000 memories

### 5. TypeScript Compilation Errors

**Symptoms:**
- Type errors in imports
- Missing type definitions
- Build failures in TypeScript projects

**Solutions:**
```bash
# Install type dependencies
npm install --save-dev @types/node @types/react @types/react-dom

# Check TypeScript version (requires >=4.5)
npm list typescript

# Verify type imports
import type { MemoryItem, KuzuConfig } from 'kuzu-memory';
```

**TypeScript Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "lib": ["DOM", "ES2020"]
  }
}
```

## Storage-Specific Issues

### IndexedDB Issues

**Quota Exceeded Errors:**
```typescript
try {
  await memory.create(content);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Clean up old memories
    await memory.cleanup({
      maxAge: '30d',
      maxCount: 5000
    });

    // Or switch to localStorage
    const fallbackMemory = await createMemoryClient({
      storage: 'localStorage',
    });
  }
}
```

**Database Corruption:**
```bash
# Clear corrupted IndexedDB (in DevTools Console)
indexedDB.deleteDatabase('kuzu-memory');

# Then reinitialize
const memory = await createMemoryClient({
  storage: 'indexeddb',
  version: Date.now(), // Force new version
});
```

### LocalStorage Issues

**Storage Limit Reached:**
```typescript
// Monitor localStorage usage
const usage = JSON.stringify(localStorage).length;
const limit = 5 * 1024 * 1024; // ~5MB typical limit

if (usage > limit * 0.8) {
  console.warn('LocalStorage nearly full, consider cleanup');
  await memory.cleanup({ maxCount: 1000 });
}
```

## Testing Issues

### Test Environment Setup

**Jest Configuration Issues:**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // Mock IndexedDB for tests
  setupFiles: ['fake-indexeddb/auto'],
};
```

**Running Tests:**
```bash
# Run all tests with debugging
make test-coverage

# Run specific test suites
make test-uat-storage      # Storage functionality
make test-uat-integration  # Full integration tests

# Debug failing tests
npm run test -- --verbose --no-cache
```

### Mock Issues in Tests

```typescript
// Mock memory client for testing
import { createMemoryClient } from 'kuzu-memory';

// Mock the module
jest.mock('kuzu-memory', () => ({
  createMemoryClient: jest.fn(() => ({
    create: jest.fn(),
    query: jest.fn(() => []),
    recall: jest.fn(() => []),
  })),
}));

// Use in tests
const mockMemory = createMemoryClient as jest.MockedFunction<typeof createMemoryClient>;
```

## Development Environment Issues

### Build Issues

**Bundle Size Too Large:**
```bash
# Check bundle size
make size-check

# Use tree-shaking imports
import { createMemoryClient } from 'kuzu-memory';
// Instead of: import * as Kuzu from 'kuzu-memory';

# Exclude from SSR bundle
const Memory = dynamic(() => import('kuzu-memory'), { ssr: false });
```

**Development Setup:**
```bash
# Complete setup for new contributors
make bootstrap

# Individual setup steps
make install          # Dependencies
make setup-prettier   # Code formatting
make quality          # All quality checks
```

### Dependency Conflicts

**React Version Mismatch:**
```bash
# Check React version
npm list react react-dom

# Kuzu Memory requires React >=16.8.0
npm install react@^18.0.0 react-dom@^18.0.0
```

**Peer Dependency Warnings:**
```bash
# Install peer dependencies
npm install react react-dom

# Or use --legacy-peer-deps for older projects
npm install kuzu-memory --legacy-peer-deps
```

## Production Deployment Issues

### Build Optimization

**Bundle Size Optimization:**
```javascript
// webpack.config.js or next.config.js
module.exports = {
  webpack: (config) => {
    // Tree-shake unused code
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };
    return config;
  },
};
```

### Performance Monitoring

**Production Performance Monitoring:**
```typescript
// Set up performance tracking
const memory = await createMemoryClient({
  storage: 'indexeddb',
  onPerformanceMetric: (metric) => {
    // Send to your analytics service
    analytics.track('kuzu_memory_performance', metric);
  },
});
```

## Getting Help

### Debugging Information
When reporting issues, please include:

```bash
# System information
make info

# Test results
make test-status

# Error logs with stack traces
# Browser console errors
# Network requests (if applicable)
```

### Diagnostic Commands
```bash
# Full health check
make status

# Performance validation
make test-uat-performance

# Check build integrity
make build && make size-check
```

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: [README.md](./README.md), [DEVELOPER.md](./DEVELOPER.md)
- **Examples**: See `/examples` directory (if available)

### Known Issues & Workarounds

1. **Integration Test Failures**: 8 integration tests currently fail (non-critical, core functionality works)
2. **Safari Private Mode**: IndexedDB may be disabled, fallback to localStorage automatically
3. **Older Node Versions**: Requires Node >=16.0.0 for development

### Quick Fixes Checklist

- [ ] Check React version (>=16.8.0)
- [ ] Verify browser IndexedDB support
- [ ] Ensure proper async/await usage
- [ ] Check for SSR/SSG compatibility issues
- [ ] Validate TypeScript configuration
- [ ] Clear browser storage if corrupted
- [ ] Run `make quality` to validate setup
- [ ] Check console for detailed error messages

This troubleshooting guide covers the most common issues. For specific problems not covered here, please check the GitHub issues or create a new issue with detailed information.