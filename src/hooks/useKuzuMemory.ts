import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { KuzuMemory } from '../core/KuzuMemory';
import type { KuzuConfig } from '../types';
import { createMemoryClient } from '../core/client';

export interface UseKuzuMemoryOptions extends Partial<KuzuConfig> {
  autoInit?: boolean;
}

export interface UseKuzuMemoryReturn {
  client: KuzuMemory | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
  reset: () => Promise<void>;
}

// Check if we're in SSR environment
const isServerSide = typeof window === 'undefined';

export function useKuzuMemory(options: UseKuzuMemoryOptions = {}): UseKuzuMemoryReturn {
  const { autoInit = true, ...config } = options;

  const [client, setClient] = useState<KuzuMemory | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef<KuzuMemory | null>(null);
  const initializedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  // Memoize config to prevent unnecessary re-initializations
  const configMemo = useMemo(() => {
    return {
      storage: config.storage || 'memory',
      dbName: config.dbName || 'kuzu-memory',
      version: config.version || 1,
      ...config,
    };
  }, [
    config.storage,
    config.dbName,
    config.version,
    config.autoSync,
    config.syncInterval,
    config.maxMemories,
    config.decayEnabled,
    config.decayInterval,
    config.embeddingProvider
  ]);

  const initialize = useCallback(async () => {
    // Prevent multiple initializations
    if (initializedRef.current || initPromiseRef.current) {
      if (initPromiseRef.current) {
        await initPromiseRef.current;
      }
      return;
    }

    // Don't initialize on server side unless explicitly configured for memory storage
    if (isServerSide && configMemo.storage !== 'memory') {
      return;
    }

    setIsInitializing(true);
    setError(null);

    const initPromise = (async () => {
      try {
        const memoryClient = await createMemoryClient(configMemo);

        // Check if component is still mounted
        if (initPromiseRef.current) {
          clientRef.current = memoryClient;
          setClient(memoryClient);
          setIsInitialized(true);
          initializedRef.current = true;
        } else {
          // Component was unmounted during initialization, cleanup
          memoryClient.destroy();
        }
      } catch (err) {
        if (initPromiseRef.current) {
          setError(err as Error);
          console.error('Failed to initialize KuzuMemory:', err);
        }
      } finally {
        if (initPromiseRef.current) {
          setIsInitializing(false);
          initPromiseRef.current = null;
        }
      }
    })();

    initPromiseRef.current = initPromise;
    await initPromise;
  }, [configMemo]);

  const reset = useCallback(async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.clear();
        clientRef.current.destroy();
      } catch (err) {
        console.error('Error during reset:', err);
      } finally {
        clientRef.current = null;
        setClient(null);
        setIsInitialized(false);
        initializedRef.current = false;
        setError(null);
      }
    }
  }, []);

  useEffect(() => {
    if (autoInit && !isServerSide) {
      initialize();
    }

    return () => {
      // Cleanup on unmount
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
      if (initPromiseRef.current) {
        initPromiseRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [autoInit, initialize]);

  return {
    client,
    isInitialized,
    isInitializing,
    error,
    initialize,
    reset,
  };
}