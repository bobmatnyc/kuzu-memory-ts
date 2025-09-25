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
  options: UseMemoryQueryOptions = {}
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

  // Memoize the query to prevent unnecessary re-fetches
  const queryMemo = useMemo(() => queryObj, [
    queryObj.text,
    queryObj.type,
    JSON.stringify(queryObj.tags),
    JSON.stringify(queryObj.dateRange),
    queryObj.limit,
    queryObj.offset,
    queryObj.sortBy,
    queryObj.sortOrder
  ]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!client || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await client.query(queryMemo);

      // Check if the request was aborted
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
      console.error('Failed to query memories:', error);
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

  // Initial data fetch
  useEffect(() => {
    if (enabled && client) {
      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      fetchData(abortController.signal);
    } else if (!enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
    }
  }, [client, enabled, fetchData]);

  // Handle refetch interval
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0 && enabled && client) {
      intervalRef.current = setInterval(() => {
        refetch();
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [refetchInterval, enabled, client, refetch]);

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