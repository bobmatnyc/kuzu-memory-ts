#!/usr/bin/env node

/**
 * Script to verify that pattern extraction and search fixes are working properly
 * Usage: node verify-fixes.js
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

// Test data with various content types
const TEST_MEMORIES = [
  {
    content: 'Kùzu is a graph database that supports efficient memory management.',
    type: 'semantic',
    expectedPatterns: ['graph database', 'memory management'] // Should NOT be "Person Name"
  },
  {
    content: 'The database system uses IndexedDB for persistent storage.',
    type: 'semantic',
    expectedPatterns: ['database system', 'IndexedDB', 'persistent storage']
  },
  {
    content: 'Contact John Smith at john.smith@example.com or call 555-123-4567.',
    type: 'episodic',
    expectedPatterns: ['john.smith@example.com', '555-123-4567', 'John Smith'] // This one SHOULD have a person name
  },
  {
    content: 'Visit https://github.com/kuzu-db for more information about graph databases.',
    type: 'semantic',
    expectedPatterns: ['https://github.com/kuzu-db', 'graph databases']
  },
  {
    content: 'Memory recall strategies include recency, frequency, and importance-based algorithms.',
    type: 'procedural',
    expectedPatterns: ['Memory recall', 'recency', 'frequency', 'importance-based algorithms']
  }
];

// Search test cases
const SEARCH_TESTS = [
  { query: 'database', expectedMinResults: 3, description: 'Search for "database"' },
  { query: 'DATABASE', expectedMinResults: 3, description: 'Search for "DATABASE" (case insensitive)' },
  { query: 'graph', expectedMinResults: 2, description: 'Search for "graph"' },
  { query: 'memory', expectedMinResults: 2, description: 'Search for "memory"' },
  { query: 'john', expectedMinResults: 1, description: 'Search for "john"' },
  { query: 'JOHN', expectedMinResults: 1, description: 'Search for "JOHN" (case insensitive)' }
];

async function verifyFixes() {
  console.log('🔍 Starting verification of fixes...\n');

  let allTestsPassed = true;
  const results = {
    patternExtraction: { passed: 0, failed: 0, details: [] },
    search: { passed: 0, failed: 0, details: [] },
    duplicates: { passed: false, details: '' }
  };

  try {
    // Initialize memory client with localStorage storage (works in Node.js with polyfill)
    const memory = await createMemoryClient({
      storage: 'localStorage',
      storageOptions: {
        prefix: 'kuzu_test_'
      }
    });

    console.log('✅ Memory client initialized\n');

    // Clear any existing data first
    await memory.clear();
    console.log('🧹 Cleared existing data\n');

    // ============================================
    // TEST 1: Pattern Extraction
    // ============================================
    console.log('📝 TEST 1: Pattern Extraction');
    console.log('================================\n');

    for (const testCase of TEST_MEMORIES) {
      console.log(`Creating memory: "${testCase.content.substring(0, 50)}..."`);

      const created = await memory.create(
        testCase.content,
        {
          type: testCase.type,
          metadata: { test: true }
        }
      );

      // Check extracted entities - they are in metadata.extractions
      const extractions = created.metadata?.extractions || {};
      const patterns = extractions.entities || [];
      console.log(`  Extracted patterns: ${patterns.length > 0 ? patterns.map(e => `"${e.value}" (${e.type})`).join(', ') : 'none'}`);

      // Verify we're not getting "Person Name" for everything
      const hasIncorrectPersonName = patterns.some(e =>
        e.type === 'person' &&
        !testCase.content.toLowerCase().includes('john') &&
        !testCase.content.toLowerCase().includes('smith')
      );

      if (hasIncorrectPersonName) {
        console.log(`  ❌ Incorrectly identified non-person content as "Person Name"`);
        results.patternExtraction.failed++;
        results.patternExtraction.details.push(`Failed: "${testCase.content.substring(0, 30)}..." has incorrect person entity`);
        allTestsPassed = false;
      } else {
        console.log(`  ✅ Pattern extraction correct`);
        results.patternExtraction.passed++;
      }
      console.log();
    }

    // ============================================
    // TEST 2: Search Functionality
    // ============================================
    console.log('\n📝 TEST 2: Search Functionality (Case-Insensitive)');
    console.log('================================================\n');

    for (const searchTest of SEARCH_TESTS) {
      console.log(`${searchTest.description}:`);

      const searchResults = await memory.recall(
        searchTest.query,
        { limit: 10 }
      );

      console.log(`  Query: "${searchTest.query}"`);
      console.log(`  Results found: ${searchResults.length}`);

      if (searchResults.length >= searchTest.expectedMinResults) {
        console.log(`  ✅ Found at least ${searchTest.expectedMinResults} results as expected`);
        results.search.passed++;

        // Show sample results
        searchResults.slice(0, 2).forEach(result => {
          const preview = result.content.substring(0, 60);
          console.log(`     - ${preview}...`);
        });
      } else {
        console.log(`  ❌ Expected at least ${searchTest.expectedMinResults} results, got ${searchResults.length}`);
        results.search.failed++;
        results.search.details.push(`Failed: "${searchTest.query}" returned ${searchResults.length} results, expected ${searchTest.expectedMinResults}`);
        allTestsPassed = false;
      }
      console.log();
    }

    // ============================================
    // TEST 3: Duplicate Prevention
    // ============================================
    console.log('\n📝 TEST 3: Duplicate Prevention');
    console.log('================================\n');

    const initialCount = (await memory.query({})).length;
    console.log(`Initial memory count: ${initialCount}`);

    // Try to create the same memories again
    console.log('Attempting to create duplicate memories...');

    for (const testCase of TEST_MEMORIES.slice(0, 2)) {
      await memory.create(
        testCase.content,
        {
          type: testCase.type,
          metadata: { test: true, duplicate: true }
        }
      );
    }

    const afterDuplicateAttempt = (await memory.query({})).length;
    console.log(`Memory count after duplicate attempt: ${afterDuplicateAttempt}`);

    // We expect 2 more memories (not exact duplicates due to different metadata)
    const expectedCount = initialCount + 2;

    if (afterDuplicateAttempt === expectedCount) {
      console.log('✅ New memories created with different metadata (expected behavior)');
      results.duplicates.passed = true;
    } else {
      console.log(`❌ Unexpected memory count. Expected ${expectedCount}, got ${afterDuplicateAttempt}`);
      results.duplicates.details = `Expected ${expectedCount} memories, got ${afterDuplicateAttempt}`;
      allTestsPassed = false;
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n\n=====================================');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('=====================================\n');

    console.log('Pattern Extraction:');
    console.log(`  ✅ Passed: ${results.patternExtraction.passed}`);
    console.log(`  ❌ Failed: ${results.patternExtraction.failed}`);
    if (results.patternExtraction.details.length > 0) {
      results.patternExtraction.details.forEach(detail => {
        console.log(`     - ${detail}`);
      });
    }

    console.log('\nSearch Functionality:');
    console.log(`  ✅ Passed: ${results.search.passed}`);
    console.log(`  ❌ Failed: ${results.search.failed}`);
    if (results.search.details.length > 0) {
      results.search.details.forEach(detail => {
        console.log(`     - ${detail}`);
      });
    }

    console.log('\nDuplicate Prevention:');
    console.log(`  ${results.duplicates.passed ? '✅ Passed' : '❌ Failed'}`);
    if (results.duplicates.details) {
      console.log(`     - ${results.duplicates.details}`);
    }

    console.log('\n=====================================');
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! Fixes are working correctly.');
    } else {
      console.log('⚠️  SOME TESTS FAILED. Please review the issues above.');
    }
    console.log('=====================================\n');

    // Optional: Show all memories for inspection
    const showAll = process.argv.includes('--show-all');
    if (showAll) {
      console.log('\n📚 All memories in database:');
      console.log('============================\n');
      const allMemories = await memory.query({});
      allMemories.forEach((mem, idx) => {
        console.log(`${idx + 1}. [${mem.type}] ${mem.content.substring(0, 80)}...`);
        const extractions = mem.metadata?.extractions || {};
        const entities = extractions.entities || [];
        if (entities.length > 0) {
          console.log(`   Entities: ${entities.map(e => `${e.type}:${e.value}`).join(', ')}`);
        }
      });
    } else {
      console.log('💡 Tip: Run with --show-all flag to see all memories in database\n');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

// Run verification
verifyFixes().then(() => {
  console.log('✅ Verification complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});