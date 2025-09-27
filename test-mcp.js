#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

// Start the MCP server
const server = spawn('node', ['dist/mcp/server.js']);

// Create readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Handle server stdout
server.stdout.on('data', (data) => {
  console.log('Server Response:', data.toString());
});

// Handle server stderr
server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

// Send test commands
async function testServer() {
  console.log('Testing MCP Server...\n');

  // Test initialize
  const initRequest = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '0.1.0',
      capabilities: {}
    },
    id: 1
  };

  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test list tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test create memory
  const createMemoryRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'create_memory',
      arguments: {
        content: 'This is a test memory from MCP server',
        type: 'semantic',
        importance: 0.8
      }
    },
    id: 3
  };

  server.stdin.write(JSON.stringify(createMemoryRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\nTest completed. Press Ctrl+C to exit.');
}

// Handle exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  process.exit();
});

testServer();