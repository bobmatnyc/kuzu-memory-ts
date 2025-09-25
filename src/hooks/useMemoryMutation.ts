import { useState, useCallback, useRef, useEffect } from 'react';
import type { KuzuMemory } from '../core/KuzuMemory';
import type { MemoryItem } from '../types';

export interface UseMemoryMutationOptions {
  onSuccess?: (memory: MemoryItem) => void;
  onError?: (error: Error) => void;
  optimistic?: boolean;
}

export interface UseMemoryMutationReturn {
  // Aliases for compatibility
  store: (content: string | Omit<MemoryItem, 'id'>, metadata?: Partial<MemoryItem>) => Promise<MemoryItem | null>;
  create: (content: string, metadata?: Partial<MemoryItem>) => Promise<MemoryItem | null>;
  update: (id: string, updates: Partial<MemoryItem>) => Promise<MemoryItem | null>;
  remove: (id: string) => Promise<boolean>;
  delete: (id: string) => Promise<boolean>;
  isLoading: boolean;
  error: Error | null;
  data: MemoryItem | null;
  reset: () => void;
}

// Overloaded function signatures for flexibility
export function useMemoryMutation(client: KuzuMemory | null, options?: UseMemoryMutationOptions): UseMemoryMutationReturn;
export function useMemoryMutation(options: UseMemoryMutationOptions & { client: KuzuMemory | null }): UseMemoryMutationReturn;

export function useMemoryMutation(
  clientOrOptions: KuzuMemory | null | (UseMemoryMutationOptions & { client: KuzuMemory | null }),
  options: UseMemoryMutationOptions = {}
): UseMemoryMutationReturn {
  // Handle both call patterns
  let client: KuzuMemory | null;
  let opts: UseMemoryMutationOptions;

  if (typeof clientOrOptions === 'object' && clientOrOptions && 'client' in clientOrOptions) {
    // Called with options object
    client = clientOrOptions.client;
    opts = { ...clientOrOptions };
    delete (opts as any).client;
  } else {
    // Called with separate parameters
    client = clientOrOptions;
    opts = options;
  }
  const { onSuccess, onError, optimistic = false } = opts;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<MemoryItem | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  const executeWithOptimistic = useCallback(
    async <T>(
      operation: () => Promise<T>,
      optimisticData?: MemoryItem
    ): Promise<T | null> => {
      if (!client) {
        const err = new Error('KuzuMemory client not initialized');
        setError(err);
        onError?.(err);
        return null;
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      // Set optimistic data if provided
      if (optimistic && optimisticData) {
        setData(optimisticData);
      }

      try {
        const result = await operation();

        if (abortControllerRef.current.signal.aborted) {
          return null;
        }

        // Update with actual result
        if (result && typeof result === 'object' && 'id' in result) {
          setData(result as MemoryItem);
          onSuccess?.(result as MemoryItem);
        }

        return result;
      } catch (err) {
        if (abortControllerRef.current.signal.aborted) {
          return null;
        }

        const error = err as Error;
        setError(error);
        onError?.(error);
        console.error('Memory operation failed:', error);

        // Revert optimistic update
        if (optimistic) {
          setData(null);
        }

        return null;
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [client, onSuccess, onError, optimistic]
  );

  const create = useCallback(
    async (
      content: string,
      metadata?: Partial<MemoryItem>
    ): Promise<MemoryItem | null> => {
      // Create optimistic data if enabled
      const optimisticData = optimistic ? {
        id: `temp-${Date.now()}`,
        content,
        timestamp: new Date(),
        type: metadata?.type || 'semantic',
        importance: metadata?.importance || 0.5,
        decay: metadata?.decay || 0.1,
        tags: metadata?.tags || [],
        relations: metadata?.relations || [],
        accessCount: 0,
        ...metadata,
      } as MemoryItem : undefined;

      return executeWithOptimistic(
        () => client!.create(content, metadata),
        optimisticData
      );
    },
    [client, executeWithOptimistic, optimistic]
  );

  // store is an alias for create for compatibility with tests
  const store = useCallback(
    async (
      contentOrData: string | Omit<MemoryItem, 'id'>,
      metadata?: Partial<MemoryItem>
    ): Promise<MemoryItem | null> => {
      if (typeof contentOrData === 'string') {
        return create(contentOrData, metadata);
      } else {
        // Extract content from the data object
        const { content, ...rest } = contentOrData;
        return create(content, { ...rest, ...metadata });
      }
    },
    [create]
  );

  const update = useCallback(
    async (
      id: string,
      updates: Partial<MemoryItem>
    ): Promise<MemoryItem | null> => {
      return executeWithOptimistic(
        () => client!.update(id, updates)
      );
    },
    [client, executeWithOptimistic]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!client) {
        const err = new Error('KuzuMemory client not initialized');
        setError(err);
        onError?.(err);
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        await client.delete(id);
        setData(null);
        return true;
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
        console.error('Failed to delete memory:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [client, onError]
  );

  // delete is an alias for remove
  const deleteMemory = useCallback((id: string) => remove(id), [remove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    store,
    create,
    update,
    remove,
    delete: deleteMemory,
    isLoading,
    error,
    data,
    reset,
  };
}