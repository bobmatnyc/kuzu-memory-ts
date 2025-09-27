import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'index.lazy': 'src/index.lazy.ts',
    'hooks/index': 'src/hooks/index.ts',
    'core/QueryBuilder': 'src/core/QueryBuilder.ts',
    'monitoring/MetricsCollector': 'src/monitoring/MetricsCollector.ts',
    'domain/index': 'src/domain/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: true, // Enable code splitting for better tree shaking
  treeshake: true,
  external: ['react', 'react-dom', 'jsdom', 'kuzu'],
  target: 'es2020',
  platform: 'neutral',
  bundle: true,
  // Optimize for lazy loading
  esbuildOptions(options) {
    options.chunkNames = 'chunks/[name]-[hash]';
    options.entryNames = '[dir]/[name]';
  },
});