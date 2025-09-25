#!/usr/bin/env node

/**
 * UAT Test Runner Script
 *
 * This script provides convenient ways to run UAT tests with different configurations.
 *
 * Usage:
 *   node tests/run-uat.js [test-suite] [options]
 *
 * Examples:
 *   node tests/run-uat.js                    # Run all UAT tests
 *   node tests/run-uat.js storage           # Run storage tests only
 *   node tests/run-uat.js --coverage        # Run with coverage
 *   node tests/run-uat.js --performance     # Run performance tests only
 *   node tests/run-uat.js --watch           # Run in watch mode
 */

const { execSync } = require('child_process');
const path = require('path');

// Test suites mapping
const TEST_SUITES = {
  storage: 'tests/uat/storage.uat.test.ts',
  recall: 'tests/uat/recall.uat.test.ts',
  patterns: 'tests/uat/patterns.uat.test.ts',
  integration: 'tests/uat/integration.uat.test.ts',
  performance: 'tests/uat/performance.uat.test.ts',
  hooks: 'tests/uat/hooks.uat.test.ts',
};

// Parse command line arguments
const args = process.argv.slice(2);
const testSuite = args.find(arg => !arg.startsWith('--'));
const options = args.filter(arg => arg.startsWith('--'));

// Build Jest command
let jestCommand = 'npx jest';

// Add test path
if (testSuite && TEST_SUITES[testSuite]) {
  jestCommand += ` ${TEST_SUITES[testSuite]}`;
} else if (testSuite) {
  console.error(`Unknown test suite: ${testSuite}`);
  console.error('Available test suites:', Object.keys(TEST_SUITES).join(', '));
  process.exit(1);
} else {
  jestCommand += ' tests/uat';
}

// Add options
if (options.includes('--coverage')) {
  jestCommand += ' --coverage';
}

if (options.includes('--watch')) {
  jestCommand += ' --watch';
}

if (options.includes('--verbose')) {
  jestCommand += ' --verbose';
}

if (options.includes('--bail')) {
  jestCommand += ' --bail';
}

// Add performance-specific timeout for performance tests
if (testSuite === 'performance' || options.includes('--performance')) {
  jestCommand += ' --testTimeout=30000';
}

// Display information
console.log('🧪 Running Kuzu Memory UAT Tests');
console.log('================================');
console.log(`Command: ${jestCommand}`);
console.log(`Test Suite: ${testSuite || 'all'}`);
console.log(`Options: ${options.length > 0 ? options.join(' ') : 'none'}`);
console.log('');

// Run the tests
try {
  execSync(jestCommand, {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('');
  console.log('✅ All UAT tests completed successfully!');
} catch (error) {
  console.log('');
  console.error('❌ UAT tests failed');
  process.exit(error.status || 1);
}

// Display help information
function showHelp() {
  console.log('UAT Test Runner');
  console.log('===============');
  console.log('');
  console.log('Usage: node tests/run-uat.js [test-suite] [options]');
  console.log('');
  console.log('Test Suites:');
  Object.keys(TEST_SUITES).forEach(suite => {
    console.log(`  ${suite.padEnd(12)} - ${TEST_SUITES[suite]}`);
  });
  console.log('');
  console.log('Options:');
  console.log('  --coverage    - Run with coverage reporting');
  console.log('  --watch       - Run in watch mode');
  console.log('  --verbose     - Show verbose output');
  console.log('  --bail        - Stop on first failure');
  console.log('  --performance - Run performance tests with extended timeout');
  console.log('  --help        - Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node tests/run-uat.js                    # Run all UAT tests');
  console.log('  node tests/run-uat.js storage           # Run storage tests only');
  console.log('  node tests/run-uat.js --coverage        # Run with coverage');
  console.log('  node tests/run-uat.js performance       # Run performance tests');
  console.log('  node tests/run-uat.js --watch           # Run in watch mode');
}

if (options.includes('--help')) {
  showHelp();
  process.exit(0);
}