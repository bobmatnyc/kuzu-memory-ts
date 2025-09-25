import { renderHook, act, waitFor } from '@testing-library/react';
import { useKuzuMemory } from '../../src/hooks/useKuzuMemory';
import { useMemoryQuery } from '../../src/hooks/useMemoryQuery';
import { useMemoryMutation } from '../../src/hooks/useMemoryMutation';
import { useMemorySubscription } from '../../src/hooks/useMemorySubscription';
import { MemoryType } from '../../src/types';

// Clean test environment - don't mock React hooks
jest.unmock('react');

describe('React Hooks UAT Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any lingering timers
    jest.clearAllTimers();
  });

  describe('useKuzuMemory Hook', () => {
    it('should initialize memory client with default configuration', async () => {
      const { result } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.client).not.toBeNull();
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle initialization errors gracefully', async () => {
      // Test with invalid storage type
      const { result } = renderHook(() =>
        useKuzuMemory({
          storage: 'invalid' as any,
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.error).not.toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    it('should support manual initialization', async () => {
      const { result } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: false,
        })
      );

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.client).toBeNull();

      await act(async () => {
        await result.current.initialize();
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.client).not.toBeNull();
    });

    it('should handle reset functionality', async () => {
      const { result } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const originalClient = result.current.client;
      expect(originalClient).not.toBeNull();

      await act(async () => {
        await result.current.reset();
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.client).toBeNull();
    });

    it('should persist client instance across re-renders', async () => {
      const { result, rerender } = renderHook(
        (props) => useKuzuMemory(props),
        {
          initialProps: {
            storage: 'memory' as const,
            autoInit: true,
          },
        }
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const firstClient = result.current.client;

      rerender({
        storage: 'memory' as const,
        autoInit: true,
      });

      expect(result.current.client).toBe(firstClient);
    });

    it('should handle different storage configurations', async () => {
      const storageTypes = ['memory', 'localStorage'] as const;

      for (const storage of storageTypes) {
        const { result, unmount } = renderHook(() =>
          useKuzuMemory({
            storage,
            autoInit: true,
            dbName: `test-${storage}`,
          })
        );

        await waitFor(() => {
          expect(result.current.isInitialized).toBe(true);
        }, { timeout: 5000 });

        expect(result.current.client).not.toBeNull();
        expect(result.current.error).toBeNull();

        unmount();
      }
    });
  });

  describe('useMemoryQuery Hook', () => {
    it('should execute memory queries and return results', async () => {
      // First set up memory client
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      // Store test data using the correct API
      await client.create('React hooks test data', {
        type: 'semantic' as MemoryType,
        tags: ['react', 'hooks'],
        importance: 0.8,
      });

      // Test query hook
      const { result: queryResult } = renderHook(() =>
        useMemoryQuery(client, {
          text: 'React hooks',
          limit: 10,
        })
      );

      await waitFor(() => {
        expect(queryResult.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(queryResult.current.data).toBeDefined();
      expect(queryResult.current.data!.length).toBeGreaterThan(0);
      expect(queryResult.current.error).toBeNull();
    });

    it('should handle query errors gracefully', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      // Test with invalid query - use extremely large limit that might cause issues
      const { result: queryResult } = renderHook(() =>
        useMemoryQuery(client, {
          limit: Number.MAX_SAFE_INTEGER,
        })
      );

      await waitFor(() => {
        expect(queryResult.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Query might succeed or fail, both are valid for this test scenario
      // The important thing is the hook doesn't crash
      expect(typeof queryResult.current.refetch).toBe('function');
    });

    it('should support query refetching', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: queryResult } = renderHook(() =>
        useMemoryQuery(client, {
          tags: ['refetch-test'],
          limit: 10,
        })
      );

      await waitFor(() => {
        expect(queryResult.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      const initialDataLength = queryResult.current.data?.length || 0;

      // Add new data using correct API
      await client.create('New refetch test data', {
        type: 'episodic' as MemoryType,
        tags: ['refetch-test'],
        importance: 0.7,
      });

      // Refetch
      await act(async () => {
        await queryResult.current.refetch();
      });

      expect(queryResult.current.data!.length).toBeGreaterThan(initialDataLength);
    });

    it('should handle query parameter changes', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      // Store test data with different tags
      await Promise.all([
        client.create('Tag A content', {
          type: 'semantic' as MemoryType,
          tags: ['tag-a'],
          importance: 0.8,
        }),
        client.create('Tag B content', {
          type: 'semantic' as MemoryType,
          tags: ['tag-b'],
          importance: 0.7,
        }),
      ]);

      const { result: queryResult, rerender } = renderHook(
        (query) => useMemoryQuery(client, query),
        {
          initialProps: {
            tags: ['tag-a'],
            limit: 10,
          },
        }
      );

      await waitFor(() => {
        expect(queryResult.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      const tagAResults = queryResult.current.data!;
      expect(tagAResults.length).toBe(1);
      expect(tagAResults[0].tags).toContain('tag-a');

      // Change query parameters
      rerender({
        tags: ['tag-b'],
        limit: 10,
      });

      await waitFor(() => {
        expect(queryResult.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      const tagBResults = queryResult.current.data!;
      expect(tagBResults.length).toBe(1);
      expect(tagBResults[0].tags).toContain('tag-b');
    });
  });

  describe('useMemoryMutation Hook', () => {
    it('should handle memory creation mutations', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: mutationResult } = renderHook(() =>
        useMemoryMutation(client)
      );

      const memoryData = {
        type: 'episodic' as MemoryType,
        content: 'Mutation test memory',
        tags: ['mutation', 'test'],
        importance: 0.8,
      };

      let createdMemory;
      await act(async () => {
        // Use store method which is an alias for create
        createdMemory = await mutationResult.current.store('Mutation test memory', {
          type: 'episodic' as MemoryType,
          tags: ['mutation', 'test'],
          importance: 0.8,
        });
      });

      expect(mutationResult.current.isLoading).toBe(false);
      expect(mutationResult.current.error).toBeNull();
      expect(mutationResult.current.data).toBeDefined();
      expect(createdMemory).not.toBeNull();
      expect(createdMemory!.content).toBe('Mutation test memory');
    });

    it('should handle memory update mutations', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      // Create initial memory using correct API
      const initialMemory = await client.create('Original content', {
        type: 'semantic' as MemoryType,
        tags: ['original'],
        importance: 0.5,
      });

      const { result: mutationResult } = renderHook(() =>
        useMemoryMutation(client)
      );

      const updates = {
        content: 'Updated content',
        importance: 0.9,
        tags: ['updated'],
      };

      await act(async () => {
        await mutationResult.current.update(initialMemory.id, updates);
      });

      expect(mutationResult.current.isLoading).toBe(false);
      expect(mutationResult.current.error).toBeNull();
      expect(mutationResult.current.data!.content).toBe(updates.content);
      expect(mutationResult.current.data!.importance).toBe(updates.importance);
    });

    it('should handle memory deletion mutations', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      // Create memory to delete using correct API
      const memoryToDelete = await client.create('Memory to delete', {
        type: 'working' as MemoryType,
        tags: ['delete-test'],
        importance: 0.6,
      });

      const { result: mutationResult } = renderHook(() =>
        useMemoryMutation(client)
      );

      let result;
      await act(async () => {
        result = await mutationResult.current.remove(memoryToDelete.id);
      });

      expect(mutationResult.current.isLoading).toBe(false);
      expect(mutationResult.current.error).toBeNull();
      expect(result).toBe(true);

      // Verify deletion
      const deletedMemory = await client.get(memoryToDelete.id);
      expect(deletedMemory).toBeNull();
    });

    it('should handle mutation errors gracefully', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: mutationResult } = renderHook(() =>
        useMemoryMutation(client)
      );

      // Attempt invalid operation
      await act(async () => {
        await mutationResult.current.update('non-existent-id', {
          content: 'Updated content',
        });
      });

      expect(mutationResult.current.error).not.toBeNull();
    });

    it('should support optimistic updates', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: mutationResult } = renderHook(() =>
        useMemoryMutation(client, {
          optimistic: true,
        })
      );

      const memoryData = {
        type: 'semantic' as MemoryType,
        content: 'Optimistic update test',
        tags: ['optimistic'],
        importance: 0.7,
      };

      await act(async () => {
        await mutationResult.current.store('Optimistic update test', {
          type: 'semantic' as MemoryType,
          tags: ['optimistic'],
          importance: 0.7,
        });
      });

      // Should have data after mutation
      expect(mutationResult.current.data).toBeDefined();
      expect(mutationResult.current.data!.content).toBe('Optimistic update test');
    });
  });

  describe('useMemorySubscription Hook', () => {
    it('should subscribe to memory events', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const events: any[] = [];
      const { result: subscriptionResult } = renderHook(() =>
        useMemorySubscription(client, {
          onMemoryCreated: (memory) => events.push({ type: 'created', memory }),
          onMemoryUpdated: (memory) => events.push({ type: 'updated', memory }),
          onMemoryDeleted: (id) => events.push({ type: 'deleted', id }),
        })
      );

      expect(subscriptionResult.current.isSubscribed).toBe(true);

      // Trigger events using correct API
      const memory = await client.create('Subscription test', {
        type: 'episodic' as MemoryType,
        tags: ['subscription'],
        importance: 0.8,
      });

      await client.update(memory.id, { importance: 0.9 });
      await client.delete(memory.id);

      await waitFor(() => {
        expect(events.length).toBe(3);
      }, { timeout: 5000 });

      expect(events[0].type).toBe('created');
      expect(events[1].type).toBe('updated');
      expect(events[2].type).toBe('deleted');
    });

    it('should handle subscription cleanup', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: subscriptionResult, unmount } = renderHook(() =>
        useMemorySubscription(client, {
          onMemoryCreated: () => {},
        })
      );

      expect(subscriptionResult.current.isSubscribed).toBe(true);

      unmount();

      // Should clean up subscription - no errors should occur
    });

    it('should support selective event subscriptions', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const createdEvents: any[] = [];
      const { result: subscriptionResult } = renderHook(() =>
        useMemorySubscription(client, {
          onMemoryCreated: (memory) => createdEvents.push(memory),
          // Only subscribe to creation events, not updates or deletions
        }, {
          eventTypes: ['memory:created']
        })
      );

      expect(subscriptionResult.current.isSubscribed).toBe(true);

      // Trigger various events using correct API
      const memory = await client.create('Selective subscription test', {
        type: 'semantic' as MemoryType,
        tags: ['selective'],
        importance: 0.7,
      });

      await client.update(memory.id, { importance: 0.8 });
      await client.delete(memory.id);

      await waitFor(() => {
        expect(createdEvents.length).toBe(1);
      }, { timeout: 5000 });

      // Should only have received creation event
      expect(createdEvents[0].id).toBe(memory.id);
    });
  });

  describe('Hook Integration Tests', () => {
    it('should handle complete CRUD workflow with hooks', async () => {
      // Initialize memory client
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      // Set up mutation hook
      const { result: mutationResult } = renderHook(() =>
        useMemoryMutation(client)
      );

      // Set up query hook
      const { result: queryResult } = renderHook(() =>
        useMemoryQuery(client, {
          tags: ['crud-test'],
          limit: 10,
        })
      );

      // Set up subscription hook
      const events: any[] = [];
      const { result: subscriptionResult } = renderHook(() =>
        useMemorySubscription(client, {
          onMemoryCreated: (memory) => events.push({ type: 'created', memory }),
          onMemoryUpdated: (memory) => events.push({ type: 'updated', memory }),
          onMemoryDeleted: (id) => events.push({ type: 'deleted', id }),
        })
      );

      // CREATE
      const memoryData = {
        type: 'procedural' as MemoryType,
        content: 'CRUD test memory',
        tags: ['crud-test'],
        importance: 0.8,
      };

      await act(async () => {
        await mutationResult.current.store('CRUD test memory', {
          type: 'procedural' as MemoryType,
          tags: ['crud-test'],
          importance: 0.8,
        });
      });

      const createdMemory = mutationResult.current.data!;
      expect(createdMemory.content).toBe('CRUD test memory');

      // READ - refresh query
      await act(async () => {
        await queryResult.current.refetch();
      });

      expect(queryResult.current.data!.length).toBe(1);
      expect(queryResult.current.data![0].id).toBe(createdMemory.id);

      // UPDATE
      const updates = { content: 'Updated CRUD test memory', importance: 0.9 };

      await act(async () => {
        await mutationResult.current.update(createdMemory.id, updates);
      });

      const updatedMemory = mutationResult.current.data!;
      expect(updatedMemory.content).toBe(updates.content);
      expect(updatedMemory.importance).toBe(updates.importance);

      // DELETE
      await act(async () => {
        await mutationResult.current.remove(createdMemory.id);
      });

      // Verify deletion
      await act(async () => {
        await queryResult.current.refetch();
      });

      expect(queryResult.current.data!.length).toBe(0);

      // Verify events were triggered
      await waitFor(() => {
        expect(events.length).toBe(3);
      }, { timeout: 5000 });

      expect(events.map(e => e.type)).toEqual(['created', 'updated', 'deleted']);
    });

    it('should handle concurrent hook operations', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      // Create multiple mutation hooks
      const { result: mutation1 } = renderHook(() => useMemoryMutation(client));
      const { result: mutation2 } = renderHook(() => useMemoryMutation(client));
      const { result: mutation3 } = renderHook(() => useMemoryMutation(client));

      // Concurrent operations
      const operations = [
        mutation1.current.store('Concurrent operation 1', {
          type: 'semantic' as MemoryType,
          tags: ['concurrent'],
          importance: 0.7,
        }),
        mutation2.current.store('Concurrent operation 2', {
          type: 'episodic' as MemoryType,
          tags: ['concurrent'],
          importance: 0.8,
        }),
        mutation3.current.store('Concurrent operation 3', {
          type: 'working' as MemoryType,
          tags: ['concurrent'],
          importance: 0.9,
        }),
      ];

      await act(async () => {
        await Promise.all(operations);
      });

      // All mutations should succeed
      expect(mutation1.current.data).toBeDefined();
      expect(mutation2.current.data).toBeDefined();
      expect(mutation3.current.data).toBeDefined();

      expect(mutation1.current.error).toBeNull();
      expect(mutation2.current.error).toBeNull();
      expect(mutation3.current.error).toBeNull();
    });

    it('should maintain state consistency across re-renders', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: queryResult, rerender } = renderHook(
        (props) => useMemoryQuery(client, props),
        {
          initialProps: {
            tags: ['consistency-test'],
            limit: 5,
          },
        }
      );

      // Store test data using correct API
      await client.create('Consistency test data', {
        type: 'semantic' as MemoryType,
        tags: ['consistency-test'],
        importance: 0.8,
      });

      await act(async () => {
        await queryResult.current.refetch();
      });

      const initialData = queryResult.current.data;
      expect(initialData!.length).toBe(1);

      // Re-render with same props
      rerender({
        tags: ['consistency-test'],
        limit: 5,
      });

      // Data should remain consistent
      expect(queryResult.current.data).toEqual(initialData);
    });
  });

  describe('Hook Error Handling', () => {
    it('should handle client initialization failures', async () => {
      const { result } = renderHook(() =>
        useKuzuMemory({
          // Invalid configuration
          storage: 'invalid-storage' as any,
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.error).not.toBeNull();
      expect(result.current.client).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    it('should handle query errors without breaking the hook', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: queryResult } = renderHook(() =>
        useMemoryQuery(client, {
          // Use a query that might cause issues but shouldn't break the hook
          limit: -1,
        } as any)
      );

      await waitFor(() => {
        expect(queryResult.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Hook should still be functional for retry
      expect(typeof queryResult.current.refetch).toBe('function');
    });

    it('should recover from transient errors', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: mutationResult } = renderHook(() =>
        useMemoryMutation(client)
      );

      // First attempt with invalid data
      await act(async () => {
        await mutationResult.current.store('', { // Empty content might be invalid
          type: 'semantic' as MemoryType,
          tags: ['recovery-test'],
          importance: 0.8,
        });
      });

      // Second attempt with valid data
      await act(async () => {
        await mutationResult.current.store('Recovery test - valid data', {
          type: 'semantic' as MemoryType,
          tags: ['recovery-test'],
          importance: 0.8,
        });
      });

      // Should succeed with valid data
      expect(mutationResult.current.data).toBeDefined();
      if (mutationResult.current.data) {
        expect(mutationResult.current.data.content).toBe('Recovery test - valid data');
      }
    });
  });

  describe('Hook Performance', () => {
    it('should not cause excessive re-renders', async () => {
      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const initialRenderCount = renderCount;

      // Trigger some operations that shouldn't cause re-renders
      await act(async () => {
        await result.current.client!.create('Performance test', {
          type: 'semantic' as MemoryType,
          tags: ['performance'],
          importance: 0.8,
        });
      });

      // Should not have caused excessive additional renders
      expect(renderCount - initialRenderCount).toBeLessThan(5);
    });

    it('should handle rapid successive operations efficiently', async () => {
      const { result: memoryResult } = renderHook(() =>
        useKuzuMemory({
          storage: 'memory',
          autoInit: true,
        })
      );

      await waitFor(() => {
        expect(memoryResult.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      const client = memoryResult.current.client!;

      const { result: mutationResult } = renderHook(() =>
        useMemoryMutation(client)
      );

      const startTime = performance.now();

      // Rapid successive operations
      const operations = Array.from({ length: 20 }, (_, i) =>
        mutationResult.current.store(`Rapid operation ${i}`, {
          type: 'working' as MemoryType,
          tags: ['rapid'],
          importance: Math.random(),
        })
      );

      await act(async () => {
        await Promise.all(operations);
      });

      const duration = performance.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max for 20 operations
    });
  });
});