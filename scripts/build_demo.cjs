const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const PUBLIC_FILES = Object.freeze(['index.html', 'style.css', 'catalog.js', 'atlas-catalog.js', 'd3fend-catalog.js', 'core.js', 'defenses.js', 'defenses-ui.js', 'app.js', 'research.html', 'research.css', 'research.js', 'navigator.js', 'car-catalog.js', 'car.js', 'attack-flow.js', 'robustness.js', 'lab-exchange.js', 'favicon.svg', 'THIRD_PARTY_LICENSE.txt', 'ATLAS_LICENSE.txt', 'D3FEND_LICENSE.txt', '.nojekyll']);
const DEFAULT_FILE_LIMIT = 2 * 1024 * 1024;
const CATALOG_FILE_LIMIT = 16 * 1024 * 1024;
const signatures = [
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
];

function build(root = path.resolve(__dirname, '..')) {
  const source = path.join(root, 'demo');
  const output = path.join(root, 'dist');
  if (fs.existsSync(output) || (() => { try { return fs.lstatSync(output).isSymbolicLink(); } catch { return false; } })()) throw new Error('Output dist already exists; preserve or move it before rebuilding.');
  if (fs.lstatSync(source).isSymbolicLink() || !fs.lstatSync(source).isDirectory()) throw new Error('Demo source must be a regular directory');
  for (const name of fs.readdirSync(source)) if (!PUBLIC_FILES.includes(name)) throw new Error(`Unexpected public file: ${name}`);
  // Capture validated bytes once so publishing cannot accidentally reread different content.
  const captured = PUBLIC_FILES.map(name => {
    const file = path.join(source, name);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Expected regular file: ${name}`);
    // Full source descriptions and linked analytics need more room than UI assets.
    const limit = ['catalog.js', 'atlas-catalog.js', 'd3fend-catalog.js'].includes(name) ? CATALOG_FILE_LIMIT : DEFAULT_FILE_LIMIT;
    if (stat.size > limit) throw new Error(`Public file exceeds size limit: ${name}`);
    const bytes = fs.readFileSync(file);
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new Error(`Expected UTF-8 text: ${name}`); }
    if (text.includes('\0')) throw new Error(`Expected UTF-8 text without NUL: ${name}`);
    for (const [index, line] of text.split('\n').entries()) if (signatures.some(pattern => pattern.test(line))) throw new Error(`Credential pattern: ${name}:${index + 1}`);
    return [name, bytes];
  });
  fs.mkdirSync(output);
  try { for (const [name, bytes] of captured) fs.writeFileSync(path.join(output, name), bytes, { flag: 'wx' }); }
  catch (error) { throw new Error(`Build incomplete; inspect the newly created dist directory. ${error.code || 'Write failed'}`); }
  return output;
}
if (require.main === module) {
  try { console.log(`Workbench built: ${build()}. Selected credential patterns only, not a comprehensive audit.`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { build, PUBLIC_FILES };
