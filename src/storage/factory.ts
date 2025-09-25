import { IndexedDBAdapter } from './IndexedDBAdapter';
import { MemoryAdapter } from './MemoryAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import type { StorageAdapter } from '../types';

export type StorageType = 'indexeddb' | 'memory' | 'localStorage';

export interface StorageOptions {
  type: StorageType;
  dbName?: string;
  version?: number;
  storageKey?: string;
}

export function createStorageAdapter(options: StorageOptions): StorageAdapter {
  switch (options.type) {
    case 'indexeddb':
      return new IndexedDBAdapter(options.dbName, options.version);
    case 'localStorage':
      return new LocalStorageAdapter(options.storageKey);
    case 'memory':
      return new MemoryAdapter();
    default:
      throw new Error(`Unknown storage type: ${options.type}`);
  }
}