const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PUBLIC_FILES } = require('../scripts/build_demo.cjs');
const read = name => fs.readFileSync(path.join(__dirname, '../demo', name), 'utf8');

test('research tools are linked and their offline assets explicitly published', () => {
  assert.match(read('index.html'), /href="\.\/research\.html"/);
  for (const name of ['research.html', 'research.css', 'research.js', 'navigator.js', 'attack-flow.js', 'robustness.js', 'lab-exchange.js', 'car.js', 'car-catalog.js']) assert.ok(PUBLIC_FILES.includes(name), name);
  const html = read('research.html');
  assert.match(html, /connect-src 'none'/);
  for (const id of ['coverage', 'car', 'flow', 'robustness', 'versions', 'lab']) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /<script[^>]*src="https?:/);
});

test('research controller uses literal DOM and no remote calls or persistent context', () => {
  const code = read('research.js');
  assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/);
  assert.match(code, /textContent/);
  assert.match(code, /MAX_IMPORT_BYTES/);
});
