// Main entry point for kuzu-memory library
export * from './types';
export * from './storage';
export * from './extraction';
export * from './recall';
export * from './utils';

// Core API
export { KuzuMemory } from './core/KuzuMemory';
export { createMemoryClient } from './core/client';

// Version
export const VERSION = '0.1.0';