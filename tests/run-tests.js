/**
 * Master Test Runner for Lead Generation Extension
 * Executes all modular unit tests and asserts specification compliance.
 */

import { runNormalizeTests } from './normalize.test.js';
import { runExtractionTests } from './extraction.test.js';
import { runDedupeTests } from './dedupe.test.js';
import { runExportTests } from './export.test.js';
import { runFixtureTests } from './fixtures.test.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

console.log('=====================================================');
console.log('   Lead Capture Local - Automated Test Suite');
console.log('=====================================================');

try {
  runNormalizeTests(assert);
  runExtractionTests(assert);
  runDedupeTests(assert);
  runExportTests(assert);
  runFixtureTests(assert);

  console.log('\n=====================================================');
  console.log(`Test Execution Complete: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
} catch (err) {
  console.error('\nFatal test execution error:', err);
  process.exit(1);
}
