#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

console.log('Testing Kuzu Memory MCP Server with Graph Database...\n');

// Start the MCP server
const server = spawn('node', ['dist/mcp/server.js']);

// Handle server stdout
let responseBuffer = '';
server.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // Try to parse complete JSON messages
  const lines = responseBuffer.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      try {
        const response = JSON.parse(line);
        console.log('Server Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        // Not a complete JSON message yet
      }
    }
  }
  responseBuffer = lines[lines.length - 1];
});

// Handle server stderr
server.stderr.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('MCP server running')) {
    console.error('Server Error:', message);
  }
});

// Send test commands
async function testServer() {
  // Test initialize
  const initRequest = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    },
    id: 1
  };

  console.log('1. Initializing MCP server...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test list tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  };

  console.log('\n2. Listing available tools...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test create memory
  const createMemoryRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'create_memory',
      arguments: {
        content: 'Kùzu is a graph database that provides excellent performance for connected data',
        type: 'semantic',
        importance: 0.9,
        metadata: {
          source: 'test-kuzu.js',
          category: 'database'
        }
      }
    },
    id: 3
  };

  console.log('\n3. Creating first memory in Kùzu database...');
  server.stdin.write(JSON.stringify(createMemoryRequest) + '\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Create a second memory with relation
  const createMemory2Request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'create_memory',
      arguments: {
        content: 'Graph databases are ideal for storing memories with relationships',
        type: 'semantic',
        importance: 0.8,
        metadata: {
          source: 'test-kuzu.js',
          category: 'database'
        }
      }
    },
    id: 4
  };

  console.log('\n4. Creating second memory...');
  server.stdin.write(JSON.stringify(createMemory2Request) + '\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test recall memories
  const recallRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'recall_memories',
      arguments: {
        query: 'graph database',
        limit: 5
      }
    },
    id: 5
  };

  console.log('\n5. Recalling memories about "graph database"...');
  server.stdin.write(JSON.stringify(recallRequest) + '\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test get memory stats
  const statsRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'get_memory_stats',
      arguments: {}
    },
    id: 6
  };

  console.log('\n6. Getting memory statistics from Kùzu...');
  server.stdin.write(JSON.stringify(statsRequest) + '\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n✅ Test completed! Memories are now stored in ~/.kuzu-memory-ts/memories.db');
  console.log('Press Ctrl+C to exit.');
}

// Handle exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  process.exit();
});

// Wait for server to start
setTimeout(() => {
  testServer().catch(console.error);
}, 1000);