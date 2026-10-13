'use strict';
// Runs all fixture files in tests/fixtures/ and reports pass/fail
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const fixturesDir = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.js')).sort();

let passed = 0, failed = 0;
const failures = [];

for (const file of files) {
  const filePath = path.join(fixturesDir, file);
  try {
    execSync(`node "${filePath}"`, { stdio: 'inherit' });
    passed++;
  } catch {
    failed++;
    failures.push(file);
  }
}

console.log('\n═══════════════════════════════════════');
console.log(`Fixtures: ${passed + failed} total — ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('Failed:');
  failures.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
} else {
  console.log('All fixtures passed ✓');
}
