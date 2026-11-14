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
test('visible Settings labels remain the controls accessible names', () => {
  const page = html();
  assert.match(page, /<button[^>]+id="settings-open"[^>]*><span[^>]+aria-hidden="true"[^>]*>⚙<\/span><span>Settings<\/span><\/button>/);
  assert.match(page, /<label[^>]+for="theme"[^>]*><span>Color theme<\/span><select id="theme">/);
  assert.doesNotMatch(page, /<select id="theme"[^>]+aria-label=/);
});
test('core evidence stays visible while optional research modules are configurable', () => {
  const page = html();
  for (const id of ['tab-prompt', 'tab-source', 'workspace-open', 'settings-open', 'guide-open', 'about-open']) {
    assert.match(page, new RegExp(`id="${id}"`), id);
  }
  assert.doesNotMatch(page, /id="module-evidence"/);
  for (const id of ['module-compare', 'module-defenses', 'module-flow', 'module-research']) {
    assert.match(page, new RegExp(`id="${id}"`), id);
  }
});
