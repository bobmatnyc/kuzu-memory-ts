#!/usr/bin/env node

/**
 * Script to clear all test data from the Kùzu memory database
 * Usage: node clear-test-data.js
 */

const { createMemoryClient } = require('./dist/index.js');

// Polyfill localStorage for Node.js
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    store: {},
    getItem(key) {
      return this.store[key] || null;
    },
    setItem(key, value) {
      this.store[key] = value.toString();
    },
    removeItem(key) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    },
    get length() {
      return Object.keys(this.store).length;
    },
    key(index) {
      const keys = Object.keys(this.store);
      return keys[index] || null;
    }
  };
}

async function clearTestData() {
  console.log('🧹 Starting test data cleanup...\n');

  try {
    // Initialize the memory client with localStorage storage (works in Node.js with polyfill)
    const memory = await createMemoryClient({
      storage: 'localStorage',
      storageOptions: {
        prefix: 'kuzu_test_'
      }
    });

    console.log('✅ Memory client initialized');

    // Query all existing memories
    const allMemories = await memory.query({});
    console.log(`📊 Found ${allMemories.length} memories in database`);

    if (allMemories.length === 0) {
      console.log('✨ Database is already empty!');
      return;
    }

    // Show a sample of what will be deleted
    console.log('\n📝 Sample of memories to be deleted:');
    allMemories.slice(0, 5).forEach(mem => {
      const preview = mem.content.substring(0, 50);
      console.log(`  - [${mem.type}] ${preview}...`);
    });

    if (allMemories.length > 5) {
      console.log(`  ... and ${allMemories.length - 5} more`);
    }

    // Clear all memories
    console.log('\n🗑️  Clearing all memories...');
    await memory.clear();

    // Verify deletion
    const remainingMemories = await memory.query({});
    if (remainingMemories.length === 0) {
      console.log('✅ All test data successfully cleared!');
      console.log(`🎯 Deleted ${allMemories.length} memories`);
    } else {
      console.error('❌ Failed to clear all memories');
      console.error(`   ${remainingMemories.length} memories still remain`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    process.exit(1);
  }
}

// Run the cleanup
clearTestData().then(() => {
  console.log('\n✨ Cleanup complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});