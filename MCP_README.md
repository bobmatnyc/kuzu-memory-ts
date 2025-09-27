# Kuzu Memory MCP Service

Semantic memory management for Claude Desktop via Model Context Protocol (MCP).

## Installation

### For Development/Testing

1. Clone the repository:
```bash
git clone https://github.com/bobmatnyc/kuzu-memory-ts.git
cd kuzu-memory-ts
```

2. Install dependencies and build:
```bash
npm install
npm run build
```

3. Run the setup script:
```bash
./setup-claude-desktop.sh
```

4. Restart Claude Desktop

## Available Tools

The Kuzu Memory MCP service provides the following tools in Claude:

### `create_memory`
Store new information in semantic memory.

**Parameters:**
- `content` (required): The text content to store
- `type` (optional): Memory type - "episodic", "semantic", "procedural", "working", "sensory"
- `importance` (optional): Importance score from 0-1
- `metadata` (optional): Additional metadata object

**Example:**
```
Use the create_memory tool to store: "The user's favorite color is blue"
```

### `recall_memories`
Retrieve memories based on a query.

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results (default: 10)
- `strategy` (optional): Recall strategy - "recency", "frequency", "importance", "similarity", "composite"
- `threshold` (optional): Minimum relevance threshold (0-1)

**Example:**
```
Use recall_memories to find memories about "favorite color"
```

### `get_memory`
Retrieve a specific memory by its ID.

**Parameters:**
- `id` (required): The UUID of the memory item

### `update_memory`
Update an existing memory.

**Parameters:**
- `id` (required): Memory ID to update
- `content` (optional): Updated content
- `importance` (optional): Updated importance score
- `metadata` (optional): Updated metadata

### `delete_memory`
Delete a memory by ID.

**Parameters:**
- `id` (required): Memory ID to delete

### `clear_memories`
Clear all memories or memories of a specific type.

**Parameters:**
- `type` (optional): Type of memories to clear. If omitted, clears all memories.

### `get_memory_stats`
Get statistics about stored memories.

**Returns:**
- Total number of memories
- Breakdown by type
- Average importance
- Oldest and newest memory timestamps

## Resources

The service also provides these resources:

- `memory://stats` - Current memory system statistics
- `memory://recent` - Most recently created memories

## Usage Examples in Claude

Once installed, you can interact with your memory system directly in Claude Desktop:

1. **Store information:**
   "Use the create_memory tool to remember that I prefer TypeScript over JavaScript for large projects"

2. **Recall information:**
   "Use recall_memories to find what programming languages I prefer"

3. **Get statistics:**
   "Use get_memory_stats to show me how many memories are stored"

## Storage

Currently, the MCP service uses in-memory storage. This means memories are temporary and will be lost when the service restarts. Future versions will support persistent storage options including:

- File-based storage in `~/.kuzu-memory-ts/`
- SQLite database
- Cloud synchronization

## Architecture

The MCP service acts as a bridge between Claude Desktop and the Kuzu Memory library, exposing memory management capabilities through the Model Context Protocol.

```
Claude Desktop <--> MCP Protocol <--> Kuzu Memory Service <--> Memory Storage
```

## Development

### Testing the MCP Server

```bash
# Run the test script
node test-mcp.js

# Or test directly with stdio
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | node dist/mcp/server.js
```

### Building for Production

```bash
npm run build
```

### Creating an MCPB Package

Coming soon: Instructions for packaging as .mcpb file for distribution.

## Configuration

The service is configured in Claude Desktop's configuration file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

## Troubleshooting

1. **Service not appearing in Claude Desktop:**
   - Ensure Claude Desktop is fully restarted after setup
   - Check the configuration file exists and contains the kuzu-memory entry
   - Verify the path to `dist/mcp/server.js` is correct

2. **Tools not working:**
   - Check that the project is built (`npm run build`)
   - Ensure Node.js is in your PATH
   - Check Claude Desktop's developer console for errors

3. **Memory errors:**
   - The current version uses in-memory storage with a 10,000 item limit
   - Clear memories if approaching the limit using `clear_memories` tool

## License

MIT - See LICENSE file for details

## Support

For issues or questions:
- GitHub Issues: https://github.com/bobmatnyc/kuzu-memory-ts/issues
- Documentation: https://github.com/bobmatnyc/kuzu-memory-ts#readme