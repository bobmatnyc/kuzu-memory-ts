// Jest test setup file
import 'whatwg-fetch';

// Polyfill structuredClone for Node < 17
if (!globalThis.structuredClone) {
  globalThis.structuredClone = (obj: any) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Mock IndexedDB for testing
const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

Object.defineProperty(globalThis, 'indexedDB', {
  value: new FDBFactory(),
  enumerable: true,
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'IDBKeyRange', {
  value: FDBKeyRange,
  enumerable: true,
  configurable: true,
  writable: true,
});

// Mock localStorage with proper implementation
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

const localStorageMock = new LocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  enumerable: true,
  configurable: true,
  writable: true,
});

// Mock console.error to avoid noise in tests
const originalError = console.error;
console.error = (...args: any[]) => {
  // Only show errors that are not expected test errors
  if (!args[0]?.toString?.().includes('Warning:')) {
    originalError(...args);
  }
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});