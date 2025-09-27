// Setup for NLP tests in Node environment
// Add polyfills if needed for Node.js environment

// Set up TextEncoder/TextDecoder for Node.js if not available
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock indexedDB for Node environment
global.indexedDB = undefined;