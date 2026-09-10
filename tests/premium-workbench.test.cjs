const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = () => fs.readFileSync(path.join(root, 'demo/index.html'), 'utf8');
test('premium desk offers four focused tabs and separate comparison', () => {
  const page = html();
  assert.equal((page.match(/role="tab"/g) || []).length, 4);
  for (const id of ['tab-prompt','tab-source','tab-defenses','tab-flow','comparison-dialog','compare-open']) assert.ok(page.includes(`id="${id}"`), id);
});
test('workspace controls expose consent, import preview and deletion separately', () => {
  const page = html();
  for (const id of ['workspace-dialog','workspace-file','workspace-preview','workspace-import-confirm','workspace-import-cancel','workspace-autosave','workspace-delete-local','favorite-toggle','collection-create']) assert.ok(page.includes(`id="${id}"`), id);
  assert.doesNotMatch(page, /id="workspace-autosave"[^>]*checked/);
  assert.match(page, /connect-src 'none'/);
});
test('keyboard and mobile controls remain native accessible elements', () => {
  const page = html();
  assert.match(page, /<input[^>]+id="pane-resize"[^>]+type="range"/);
  for (const id of ['pane-reset','mobile-back','mobile-open','command-open','command-close']) assert.match(page, new RegExp(`<button[^>]+id="${id}"`));
  assert.match(page, /<dialog[^>]+id="command-dialog"/);
});
