#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createMemoryClient } from "../core/client.js";
import { KuzuMemory } from "../core/KuzuMemory.js";
import type { MemoryQuery } from "../types/index.js";
import { z } from "zod";

// Server metadata
const serverInfo = {
  name: "kuzu-memory-mcp",
  version: "0.2.0",
  vendor: "kuzu-memory",
  description: "Semantic memory management for AI applications",
};

// Schema for tool parameters
const CreateMemorySchema = z.object({
  content: z.string().describe("The content to store in memory"),
  type: z.enum(['episodic', 'semantic', 'procedural', 'working', 'sensory']).optional(),
  importance: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
});

const RecallMemorySchema = z.object({
  query: z.string().describe("Query string to search memories"),
  limit: z.number().optional().default(10),
  strategy: z.enum(['recency', 'frequency', 'importance', 'similarity', 'composite']).optional(),
  threshold: z.number().min(0).max(1).optional(),
});

const UpdateMemorySchema = z.object({
  id: z.string().describe("Memory item ID to update"),
  content: z.string().optional(),
  importance: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
});

const DeleteMemorySchema = z.object({
  id: z.string().describe("Memory item ID to delete"),
});

const GetMemorySchema = z.object({
  id: z.string().describe("Memory item ID to retrieve"),
});

const ClearMemoriesSchema = z.object({
  type: z.enum(['episodic', 'semantic', 'procedural', 'working', 'sensory']).optional(),
});

// Initialize memory client with connection pooling and caching
let memoryClient: KuzuMemory | null = null;
let initializationPromise: Promise<KuzuMemory> | null = null;
let lastInitTime = 0;
const INIT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function initializeMemory(): Promise<KuzuMemory> {
  // Return cached client if still valid
  if (memoryClient && Date.now() - lastInitTime < INIT_CACHE_DURATION) {
    return memoryClient;
  }

  // Return ongoing initialization if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Cleanup existing client if needed
      if (memoryClient) {
        memoryClient.destroy();
      }

      // Use Kùzu graph database for persistent storage with optimized config
      memoryClient = await createMemoryClient({
        storage: 'kuzu',
        maxMemories: 50000, // Increased capacity for MCP usage
        decayInterval: 3600000, // 1 hour
        autoSync: false, // Disable auto-sync for server usage
      });

      lastInitTime = Date.now();
      return memoryClient;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

// Create MCP server
const server = new Server(serverInfo, {
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_memory",
        description: "Store new information in semantic memory",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The content to store in memory",
            },
            type: {
              type: "string",
              enum: ["episodic", "semantic", "procedural", "working", "sensory"],
              description: "Type of memory",
              default: "semantic",
            },
            importance: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Importance score (0-1)",
              default: 0.5,
            },
            metadata: {
              type: "object",
              description: "Additional metadata",
            },
          },
          required: ["content"],
        },
      },
      {
        name: "recall_memories",
        description: "Retrieve memories based on a query",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Query string to search memories",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              description: "Maximum number of memories to retrieve",
              default: 10,
            },
            strategy: {
              type: "string",
              enum: ["recency", "frequency", "importance", "similarity", "composite"],
              description: "Recall strategy to use",
              default: "composite",
            },
            threshold: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Minimum relevance threshold",
              default: 0.3,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_memory",
        description: "Retrieve a specific memory by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Memory item ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "update_memory",
        description: "Update an existing memory",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Memory item ID to update",
            },
            content: {
              type: "string",
              description: "Updated content",
            },
            importance: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Updated importance score",
            },
            metadata: {
              type: "object",
              description: "Updated metadata",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_memory",
        description: "Delete a memory by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Memory item ID to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "clear_memories",
        description: "Clear all memories or memories of a specific type",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["episodic", "semantic", "procedural", "working", "sensory"],
              description: "Type of memories to clear (omit to clear all)",
            },
          },
        },
      },
      {
        name: "get_memory_stats",
        description: "Get statistics about stored memories",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const memory = await initializeMemory();

  try {
    switch (request.params.name) {
      case "create_memory": {
        const params = CreateMemorySchema.parse(request.params.arguments);
        const item = await memory.create(params.content, {
          type: params.type,
          importance: params.importance,
          metadata: params.metadata,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                memory: item,
                message: `Memory created with ID: ${item.id}`,
              }, null, 2),
            },
          ],
        };
      }

      case "recall_memories": {
        const params = RecallMemorySchema.parse(request.params.arguments);
        const memories = await memory.recall(params.query, {
          limit: params.limit,
          type: undefined, // Optional type filter
          strategy: undefined, // Use default strategy
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                count: memories.length,
                memories,
              }, null, 2),
            },
          ],
        };
      }

      case "get_memory": {
        const params = GetMemorySchema.parse(request.params.arguments);
        const item = await memory.get(params.id);
        if (!item) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Memory with ID ${params.id} not found`
          );
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                memory: item,
              }, null, 2),
            },
          ],
        };
      }

      case "update_memory": {
        const params = UpdateMemorySchema.parse(request.params.arguments);
        const updated = await memory.update(params.id, {
          content: params.content,
          importance: params.importance,
          metadata: params.metadata,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                memory: updated,
                message: `Memory ${params.id} updated successfully`,
              }, null, 2),
            },
          ],
        };
      }

      case "delete_memory": {
        const params = DeleteMemorySchema.parse(request.params.arguments);
        await memory.delete(params.id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Memory ${params.id} deleted successfully`,
              }, null, 2),
            },
          ],
        };
      }

      case "clear_memories": {
        const params = ClearMemoriesSchema.parse(request.params.arguments);
        if (params.type) {
          // Clear memories of specific type with batch processing
          let deletedCount = 0;
          let offset = 0;
          const batchSize = 100;

          while (true) {
            const query: MemoryQuery = {
              type: params.type,
              limit: batchSize,
              offset,
              sortBy: 'timestamp',
              sortOrder: 'desc'
            };
            const memories = await memory.query(query);

            if (memories.length === 0) break;

            // Delete in parallel batches for better performance
            await Promise.all(memories.map(item => memory.delete(item.id)));
            deletedCount += memories.length;

            // If we got fewer results than batch size, we're done
            if (memories.length < batchSize) break;
            offset += batchSize;
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: `Cleared ${deletedCount} ${params.type} memories`,
                }, null, 2),
              },
            ],
          };
        } else {
          // Clear all memories
          await memory.clear();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: "All memories cleared",
                }, null, 2),
              },
            ],
          };
        }
      }

      case "get_memory_stats": {
        // Use optimized stats method from storage adapter if available
        let stats;
        try {
          stats = await memory.getStats();
        } catch {
          // Fallback to manual calculation if getStats fails
          const allMemories = await memory.query({
            limit: 50000, // Increased limit for comprehensive stats
            offset: 0,
            sortBy: 'timestamp',
            sortOrder: 'desc'
          });

          stats = {
            totalItems: allMemories.length,
            byType: {} as Record<string, number>,
            avgAccessCount: 0,
            oldestItem: null as Date | null,
            newestItem: null as Date | null,
          };

          // Calculate statistics efficiently
          let totalImportance = 0;
          let totalAccessCount = 0;
          for (const item of allMemories) {
            // Count by type
            stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;

            // Sum importance and access count
            totalImportance += item.importance;
            totalAccessCount += item.accessCount || 0;

            // Track oldest and newest (only check if needed)
            const timestamp = new Date(item.timestamp);
            if (!stats.oldestItem || timestamp < stats.oldestItem) {
              stats.oldestItem = timestamp;
            }
            if (!stats.newestItem || timestamp > stats.newestItem) {
              stats.newestItem = timestamp;
            }
          }

          if (allMemories.length > 0) {
            stats.avgAccessCount = totalAccessCount / allMemories.length;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                stats,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool ${request.params.name} not found`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Define resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "memory://stats",
        name: "Memory Statistics",
        description: "Current memory system statistics",
        mimeType: "application/json",
      },
      {
        uri: "memory://recent",
        name: "Recent Memories",
        description: "Most recently created memories",
        mimeType: "application/json",
      },
    ],
  };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const memory = await initializeMemory();

  switch (request.params.uri) {
    case "memory://stats": {
      // Use optimized stats from storage adapter
      let stats;
      try {
        const storageStats = await memory.getStats();
        stats = {
          total: storageStats.totalItems,
          byType: storageStats.byType,
          averageImportance: 0, // Calculate if needed
          averageAccessCount: storageStats.avgAccessCount,
          oldestMemory: storageStats.oldestItem,
          newestMemory: storageStats.newestItem,
        };
      } catch {
        // Fallback to querying if getStats not available
        const allMemories = await memory.query({
          limit: 10000,
          offset: 0,
          sortBy: 'timestamp',
          sortOrder: 'desc'
        });

        stats = {
          total: allMemories.length,
          byType: {} as Record<string, number>,
          averageImportance: 0,
        };

        let totalImportance = 0;
        for (const item of allMemories) {
          stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
          totalImportance += item.importance;
        }

        if (allMemories.length > 0) {
          stats.averageImportance = totalImportance / allMemories.length;
        }
      }

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }

    case "memory://recent": {
      const allMemories = await memory.query({
        limit: 10,
        offset: 0,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      const recent = allMemories
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify(recent, null, 2),
          },
        ],
      };
    }

    default:
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Resource ${request.params.uri} not found`
      );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kuzu Memory MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});