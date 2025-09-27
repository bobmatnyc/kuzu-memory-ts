import { useEffect, useRef, useState, useCallback } from 'react';
import type { KuzuMemory } from '../core/KuzuMemory';
import type { MemoryEvent, MemoryItem } from '../types';

export type EventHandler = (event: MemoryEvent) => void;

export interface UseMemorySubscriptionCallbacks {
  onMemoryCreated?: (memory: MemoryItem) => void;
  onMemoryUpdated?: (memory: MemoryItem, previous?: MemoryItem) => void;
  onMemoryDeleted?: (id: string) => void;
  onMemoryAccessed?: (memory: MemoryItem) => void;
  onSyncStarted?: () => void;
  onSyncCompleted?: (count: number) => void;
  onSyncFailed?: (error: Error) => void;
  onEvent?: EventHandler;
}

export interface UseMemorySubscriptionOptions extends UseMemorySubscriptionCallbacks {
  eventTypes?: MemoryEvent['type'][];
  enabled?: boolean;
}

export interface UseMemorySubscriptionReturn {
  isSubscribed: boolean;
  lastEvent: MemoryEvent | null;
  eventCount: number;
  unsubscribe: () => void;
}

// Overloaded function signatures for flexibility
export function useMemorySubscription(
  client: KuzuMemory | null,
  callbacks: UseMemorySubscriptionCallbacks,
  options?: { eventTypes?: MemoryEvent['type'][]; enabled?: boolean }
): UseMemorySubscriptionReturn;
export function useMemorySubscription(
  options: UseMemorySubscriptionOptions & { client: KuzuMemory | null }
): UseMemorySubscriptionReturn;

export function useMemorySubscription(
  clientOrOptions: KuzuMemory | null | (UseMemorySubscriptionOptions & { client: KuzuMemory | null }),
  callbacks?: UseMemorySubscriptionCallbacks,
  options: { eventTypes?: MemoryEvent['type'][]; enabled?: boolean } = {},
): UseMemorySubscriptionReturn {
  // Handle both call patterns
  let client: KuzuMemory | null;
  let opts: UseMemorySubscriptionOptions;

  if (typeof clientOrOptions === 'object' && clientOrOptions && 'client' in clientOrOptions) {
    // Called with options object
    client = clientOrOptions.client;
    opts = { ...clientOrOptions };
    delete (opts as any).client;
  } else {
    // Called with separate parameters
    client = clientOrOptions;
    opts = { ...callbacks, ...options };
  }
  const {
    onMemoryCreated,
    onMemoryUpdated,
    onMemoryDeleted,
    onMemoryAccessed,
    onSyncStarted,
    onSyncCompleted,
    onSyncFailed,
    onEvent,
    eventTypes,
    enabled = true,
  } = opts;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastEvent, setLastEvent] = useState<MemoryEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const callbacksRef = useRef<UseMemorySubscriptionCallbacks>({});

  // Update callback refs to avoid re-subscribing on every render
  useEffect(() => {
    callbacksRef.current = {
      onMemoryCreated,
      onMemoryUpdated,
      onMemoryDeleted,
      onMemoryAccessed,
      onSyncStarted,
      onSyncCompleted,
      onSyncFailed,
      onEvent,
    };
  }, [
    onMemoryCreated,
    onMemoryUpdated,
    onMemoryDeleted,
    onMemoryAccessed,
    onSyncStarted,
    onSyncCompleted,
    onSyncFailed,
    onEvent,
  ]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    if (!client || !enabled) {
      unsubscribe();
      return undefined;
    }

    const handler: EventHandler = (event) => {
      // Filter by event types if specified
      if (eventTypes && !eventTypes.includes(event.type)) {
        return;
      }

      // Update state
      setLastEvent(event);
      setEventCount(prev => prev + 1);

      // Call specific callbacks based on event type
      const callbacks = callbacksRef.current;

      switch (event.type) {
        case 'memory:created':
          callbacks.onMemoryCreated?.(event.memory);
          break;
        case 'memory:updated':
          callbacks.onMemoryUpdated?.(event.memory, event.previous);
          break;
        case 'memory:deleted':
          callbacks.onMemoryDeleted?.(event.id);
          break;
        case 'memory:accessed':
          callbacks.onMemoryAccessed?.(event.memory);
          break;
        case 'sync:started':
          callbacks.onSyncStarted?.();
          break;
        case 'sync:completed':
          callbacks.onSyncCompleted?.(event.count);
          break;
        case 'sync:failed':
          callbacks.onSyncFailed?.(event.error);
          break;
      }

      // Call generic event handler
      callbacks.onEvent?.(event);
    };

    try {
      // Subscribe to events
      const unsubscribeFn = client.subscribe(handler);
      unsubscribeRef.current = unsubscribeFn;
      setIsSubscribed(true);

      // Cleanup function
      return () => {
        unsubscribeFn();
        unsubscribeRef.current = null;
        setIsSubscribed(false);
      };
    } catch (error) {
      console.error('Failed to subscribe to memory events:', error);
      setIsSubscribed(false);
      return undefined;
    }
  }, [client, enabled, eventTypes, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    isSubscribed,
    lastEvent,
    eventCount,
    unsubscribe,
  };
}
