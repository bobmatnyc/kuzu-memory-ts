import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { KuzuMemory } from '../core/KuzuMemory';
import type { MemoryItem, MemoryQuery } from '../types';

export interface UseMemoryQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: MemoryItem[]) => void;
}

export interface UseMemoryQueryReturn {
  data: MemoryItem[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Overloaded function signatures for flexibility
export function useMemoryQuery(
  client: KuzuMemory | null,
  query: MemoryQuery,
  options?: UseMemoryQueryOptions
): UseMemoryQueryReturn;
export function useMemoryQuery(
  options: UseMemoryQueryOptions & {
    client: KuzuMemory | null;
    query: MemoryQuery;
  }
): UseMemoryQueryReturn;

export function useMemoryQuery(
  clientOrOptions: KuzuMemory | null | (UseMemoryQueryOptions & { client: KuzuMemory | null; query: MemoryQuery }),
  query?: MemoryQuery,
  options: UseMemoryQueryOptions = {},
): UseMemoryQueryReturn {
  // Handle both call patterns
  let client: KuzuMemory | null;
  let queryObj: MemoryQuery;
  let opts: UseMemoryQueryOptions;

  if (typeof clientOrOptions === 'object' && clientOrOptions && 'client' in clientOrOptions) {
    // Called with options object
    client = clientOrOptions.client;
    queryObj = clientOrOptions.query;
    opts = { ...clientOrOptions };
    delete (opts as any).client;
    delete (opts as any).query;
  } else {
    // Called with separate parameters
    client = clientOrOptions;
    queryObj = query!;
    opts = options;
  }
  const { enabled = true, refetchInterval, onError, onSuccess } = opts;

  const [data, setData] = useState<MemoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stable query memoization with optimized dependency tracking
  const queryMemo = useMemo(() => {
    // Create a stable query object with sorted tags and normalized date range
    const stabilizedQuery: MemoryQuery = {
      ...queryObj,
      tags: queryObj.tags ? [...queryObj.tags].sort() : undefined,
      dateRange: queryObj.dateRange ? {
        start: new Date(queryObj.dateRange.start),
        end: new Date(queryObj.dateRange.end)
      } : undefined
    };
    return stabilizedQuery;
  }, [
    queryObj.text,
    queryObj.type,
    queryObj.tags?.join(','), // More efficient than JSON.stringify
    queryObj.dateRange?.start?.toISOString(),
    queryObj.dateRange?.end?.toISOString(),
    queryObj.limit,
    queryObj.offset,
    queryObj.sortBy,
    queryObj.sortOrder,
  ]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!client || !enabled) {
      return;
    }

    // Prevent duplicate loading states
    setIsLoading(prev => prev ? prev : true);
    setError(null);

    try {
      // Add timeout to prevent hanging queries
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Query timeout after 10 seconds'));
        }, 10000);

        // Clear timeout if signal is aborted
        signal?.addEventListener('abort', () => clearTimeout(timeout));
      });

      const results = await Promise.race([
        client.query(queryMemo),
        timeoutPromise
      ]);

      // Check if the request was aborted after completion
      if (signal?.aborted) {
        return;
      }

      setData(results);
      onSuccess?.(results);
    } catch (err) {
      // Check if the request was aborted
      if (signal?.aborted) {
        return;
      }

      const error = err as Error;
      setError(error);
      onError?.(error);

      // Only log non-abort errors
      if (error.name !== 'AbortError') {
        console.error('Failed to query memories:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [client, queryMemo, enabled, onSuccess, onError]);

  const refetch = useCallback(async () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    await fetchData(abortController.signal);
  }, [fetchData]);

  // Optimized data fetching with debouncing
  useEffect(() => {
    if (enabled && client) {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Debounce rapid query changes
      const timeoutId = setTimeout(() => {
        // Create new abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        fetchData(abortController.signal);
      }, 100); // 100ms debounce

      return () => {
        clearTimeout(timeoutId);
      };
    } else if (!enabled) {
      // Reset state when disabled
      setData(null);
      setIsLoading(false);
      setError(null);

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
    return undefined;
  }, [client, enabled, fetchData]);

  // Optimized refetch interval with better cleanup
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0 && enabled && client) {
      // Use a minimum interval to prevent excessive requests
      const safeInterval = Math.max(1000, refetchInterval); // Min 1 second

      intervalRef.current = setInterval(() => {
        // Only refetch if not currently loading
        if (!isLoading) {
          refetch();
        }
      }, safeInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    // Clear interval if conditions not met
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return undefined;
  }, [refetchInterval, enabled, client, refetch, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
