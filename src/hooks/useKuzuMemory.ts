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

  // Deeply memoize config to prevent unnecessary re-initializations
  const configMemo = useMemo(() => {
    // Create a stable config object with proper defaults
    const stableConfig = {
      storage: config.storage || 'memory',
      dbName: config.dbName || 'kuzu-memory',
      version: config.version || 1,
      autoSync: config.autoSync ?? false,
      syncInterval: config.syncInterval ?? 60000,
      maxMemories: config.maxMemories ?? 10000,
      decayEnabled: config.decayEnabled ?? true,
      decayInterval: config.decayInterval ?? 86400000,
      embeddingProvider: config.embeddingProvider,
      nlp: config.nlp,
    };

    // Only include defined values to maintain referential stability
    return Object.fromEntries(
      Object.entries(stableConfig).filter(([_, value]) => value !== undefined)
    );
  }, [
    config.storage,
    config.dbName,
    config.version,
    config.autoSync,
    config.syncInterval,
    config.maxMemories,
    config.decayEnabled,
    config.decayInterval,
    config.embeddingProvider,
    config.nlp,
  ]);

  const initialize = useCallback(async () => {
    // Prevent multiple concurrent initializations with better race condition handling
    if (initializedRef.current) {
      return; // Already initialized
    }

    if (initPromiseRef.current) {
      // Already initializing, wait for it to complete
      try {
        await initPromiseRef.current;
      } catch {
        // Ignore errors here, they will be handled in the UI state
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
        // Add timeout for initialization to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Initialization timeout after 30 seconds')), 30000);
        });

        const memoryClient = await Promise.race([
          createMemoryClient(configMemo),
          timeoutPromise
        ]);

        // Double-check component is still mounted and we're still initializing
        if (initPromiseRef.current && !initializedRef.current) {
          clientRef.current = memoryClient;
          setClient(memoryClient);
          setIsInitialized(true);
          initializedRef.current = true;
        } else {
          // Component was unmounted or re-initialized during setup, cleanup
          memoryClient.destroy();
        }
      } catch (err) {
        if (initPromiseRef.current) {
          const error = err as Error;
          setError(error);
          console.error('Failed to initialize KuzuMemory:', error);
        }
      } finally {
        if (initPromiseRef.current) {
          setIsInitializing(false);
          initPromiseRef.current = null;
        }
      }
    })();

    initPromiseRef.current = initPromise;

    try {
      await initPromise;
    } catch {
      // Error handling is done in the promise itself
    }
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
    let mounted = true;

    if (autoInit && !isServerSide && mounted) {
      // Use a small delay to batch multiple rapid re-initializations
      const timeoutId = setTimeout(() => {
        if (mounted) {
          initialize();
        }
      }, 0);

      return () => {
        mounted = false;
        clearTimeout(timeoutId);
      };
    }

    return () => {
      mounted = false;
    };
  }, [autoInit, initialize]);

  // Separate cleanup effect to ensure proper cleanup order
  useEffect(() => {
    return () => {
      // Mark as unmounted first
      if (initPromiseRef.current) {
        initPromiseRef.current = null;
      }

      // Then cleanup client
      if (clientRef.current) {
        try {
          clientRef.current.destroy();
        } catch (error) {
          console.warn('Error during KuzuMemory cleanup:', error);
        } finally {
          clientRef.current = null;
        }
      }

      // Reset state
      initializedRef.current = false;
    };
  }, []);

  return {
    client,
    isInitialized,
    isInitializing,
    error,
    initialize,
    reset,
  };
}
