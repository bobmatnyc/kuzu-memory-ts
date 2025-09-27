import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'mcp/server': 'src/mcp/server.ts',
  },
  format: ['cjs'],
  dts: true,
  clean: false, // Don't clean since we're building separately
  sourcemap: true,
  minify: false,
  external: ['kuzu', 'canvas'],
  target: 'node16',
  platform: 'node',
  bundle: true,
});