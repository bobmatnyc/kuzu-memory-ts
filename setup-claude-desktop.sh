#!/bin/bash

echo "Setting up Kuzu Memory MCP service for Claude Desktop..."

# Get the current directory
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Build the project
echo "Building the project..."
npm run build

# Create the Claude Desktop config directory if it doesn't exist
CONFIG_DIR="$HOME/Library/Application Support/Claude"
mkdir -p "$CONFIG_DIR"

# Check if claude_desktop_config.json exists
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

if [ -f "$CONFIG_FILE" ]; then
    echo "Backing up existing configuration to $CONFIG_FILE.backup"
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup"

    # Use node to merge configurations
    node -e "
    const fs = require('fs');
    const existing = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
    existing.mcpServers = existing.mcpServers || {};
    existing.mcpServers['kuzu-memory'] = {
      command: 'node',
      args: ['$CURRENT_DIR/dist/mcp/server.js'],
      env: {}
    };
    fs.writeFileSync('$CONFIG_FILE', JSON.stringify(existing, null, 2));
    console.log('Configuration merged successfully');
    "
else
    # Create new configuration
    echo "Creating new Claude Desktop configuration..."
    cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "kuzu-memory": {
      "command": "node",
      "args": [
        "$CURRENT_DIR/dist/mcp/server.js"
      ],
      "env": {}
    }
  }
}
EOF
fi

echo "✅ Setup complete!"
echo ""
echo "Kuzu Memory MCP service has been configured for Claude Desktop."
echo "Configuration location: $CONFIG_FILE"
echo ""
echo "Available tools in Claude:"
echo "  - create_memory: Store new information"
echo "  - recall_memories: Retrieve memories based on query"
echo "  - get_memory: Get specific memory by ID"
echo "  - update_memory: Update existing memory"
echo "  - delete_memory: Delete a memory"
echo "  - clear_memories: Clear all or specific type of memories"
echo "  - get_memory_stats: Get memory statistics"
echo ""
echo "Please restart Claude Desktop for the changes to take effect."