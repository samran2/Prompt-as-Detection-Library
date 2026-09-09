const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, PUBLIC_FILES } = require('../scripts/build_demo.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pad-build-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'demo'));
  for (const name of PUBLIC_FILES) fs.writeFileSync(path.join(root, 'demo', name), 'synthetic fixture');
  return root;
}
test('static build copies exactly the public allowlist', t => {
  const root = fixture(t);
  build(root);
  assert.deepEqual(fs.readdirSync(path.join(root, 'dist')).sort(), [...PUBLIC_FILES].sort());
});
test('unreviewed files in the public directory fail closed', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'demo', '.env.example'), 'synthetic');
  assert.throws(() => build(root), /Unexpected public file/);
  assert.equal(fs.existsSync(path.join(root, 'dist')), false);
});
test('secret-shaped content in any public file fails without echoing its value', t => {
  for (const name of PUBLIC_FILES) {
    const root = fixture(t); const fake = 'ghp_' + 'x'.repeat(36);
    fs.writeFileSync(path.join(root, 'demo', name), fake);
    assert.throws(() => build(root), error => /Credential pattern/.test(error.message) && !error.message.includes(fake));
    assert.equal(fs.existsSync(path.join(root, 'dist')), false);
  }
});
test('binary and symlink inputs are rejected before publishing', t => {
  const binary = fixture(t); fs.writeFileSync(path.join(binary, 'demo', 'index.html'), Buffer.from([0, 255]));
  assert.throws(() => build(binary), /UTF-8 text/);
  const linked = fixture(t); fs.unlinkSync(path.join(linked, 'demo', 'index.html'));
  fs.symlinkSync('style.css', path.join(linked, 'demo', 'index.html'));
  assert.throws(() => build(linked), /regular file/);
});
test('an existing output is never overwritten, followed or deleted', t => {
  const root = fixture(t); fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, 'dist', 'keep.txt'), 'keep');
  assert.throws(() => build(root), /already exists/);
  assert.equal(fs.readFileSync(path.join(root, 'dist', 'keep.txt'), 'utf8'), 'keep');
});
test('the full catalog has a bounded larger allowance and preserves its bytes', t => {
  const root = fixture(t);
  const catalog = Buffer.alloc(2 * 1024 * 1024 + 1, 32);
  fs.writeFileSync(path.join(root, 'demo', 'catalog.js'), catalog);
  fs.mkdirSync(path.join(root, 'sources'));
  fs.writeFileSync(path.join(root, 'sources', 'private-fixture.json'), '{}');
  build(root);
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist', 'catalog.js')), catalog);
  assert.deepEqual(fs.readdirSync(path.join(root, 'dist')).sort(), [...PUBLIC_FILES].sort());
});
test('the catalog allowance does not relax other asset limits', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'demo', 'app.js'), Buffer.alloc(2 * 1024 * 1024 + 1, 32));
  assert.throws(() => build(root), /Public file exceeds size limit: app\.js/);
  assert.equal(fs.existsSync(path.join(root, 'dist')), false);
});
test('the ATLAS catalog and license are allowlisted with bounded catalog size', t => {
  assert.ok(PUBLIC_FILES.includes('atlas-catalog.js'));
  assert.ok(PUBLIC_FILES.includes('ATLAS_LICENSE.txt'));
  const root = fixture(t);
  const bytes = Buffer.alloc(2 * 1024 * 1024 + 1, 32);
  fs.writeFileSync(path.join(root, 'demo', 'atlas-catalog.js'), bytes);
  build(root);
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist', 'atlas-catalog.js')), bytes);
  const oversized = fixture(t);
  fs.writeFileSync(path.join(oversized, 'demo', 'atlas-catalog.js'), Buffer.alloc(16 * 1024 * 1024 + 1, 32));
  assert.throws(() => build(oversized), /Public file exceeds size limit: atlas-catalog\.js/);
  assert.equal(fs.existsSync(path.join(oversized, 'dist')), false);
});
test('an oversized full catalog fails before creating an output directory', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'demo', 'catalog.js'), Buffer.alloc(16 * 1024 * 1024 + 1, 32));
  assert.throws(() => build(root), /Public file exceeds size limit: catalog\.js/);
  assert.equal(fs.existsSync(path.join(root, 'dist')), false);
});
