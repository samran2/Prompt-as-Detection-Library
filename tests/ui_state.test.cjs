const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// This DOM fake models only the browser boundary used by app.js. The application,
// filtering and composition run unchanged, and elements come from the real HTML.
class Element {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this._text = '';
    this._value = '';
  }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  set innerHTML(_) { throw new Error('Untrusted UI text must not enter innerHTML'); }
  get value() { return this._value; }
  set value(value) { this._value = String(value); }
  get href() { return this.getAttribute('href') || ''; }
  set href(value) { this.setAttribute('href', value); }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.ownerDocument.ids.set(String(value), this);
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
    if (name === 'value') this.value = value;
    if (name === 'hidden' || name === 'disabled') this[name] = true;
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'hidden' || name === 'disabled') this[name] = false;
  }
  append(...children) {
    for (const child of children) {
      if (typeof child === 'string') {
        const text = new Element('#text', this.ownerDocument); text.textContent = child;
        this.append(text);
      } else {
        child.parentElement = this;
        this.children.push(child);
      }
    }
    if (this.tagName === 'SELECT' && !this._value) this._value = this.children[0]?.value || '';
  }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) {
    this.children = []; this._text = '';
    if (this.tagName === 'SELECT') this._value = '';
    this.append(...children);
  }
  querySelectorAll(selector) {
    const attribute = selector.match(/^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
    const matches = node => attribute
      ? node.getAttribute(attribute[1]) !== null && (attribute[2] === undefined || node.getAttribute(attribute[1]) === attribute[2])
      : node.tagName.toLowerCase() === selector.toLowerCase();
    return this.children.flatMap(child => [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  dispatch(type) {
    for (const handler of this.listeners.get(type) || []) handler({ type, target: this, currentTarget: this, preventDefault() {} });
  }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.ownerDocument.activeElement = this; }
  select() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
}

function parseDocument(html) {
  const document = { ids: new Map(), createElement(tag) { return new Element(tag, this); }, addEventListener() {} };
  const root = document.createElement('document');
  const stack = [root];
  const voidTags = new Set(['meta', 'link', 'input', 'img', 'br', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
  for (const token of html.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]*>|[^<]+/g) || []) {
    if (token.startsWith('<!')) continue;
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (token.startsWith('<')) {
      const [, tag, attributes] = token.match(/^<([\w-]+)([\s\S]*?)\/?\s*>$/);
      const node = document.createElement(tag);
      for (const match of attributes.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g)) {
        node.setAttribute(match[1], match[2] ?? match[3] ?? match[4] ?? '');
      }
      stack.at(-1).append(node);
      if (tag === 'body') document.body = node;
      if (!voidTags.has(tag) && !token.endsWith('/>')) stack.push(node);
    } else {
      stack.at(-1).append(token.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
    }
  }
  document.getElementById = id => document.ids.get(id) || null;
  document.querySelectorAll = selector => root.querySelectorAll(selector);
  document.activeElement = document.body;
  return document;
}

function records() {
  let index = 0;
  return [['Enterprise', 61], ['Mobile', 40], ['ICS', 20]].flatMap(([domain, count]) =>
    Array.from({ length: count }, (_, localIndex) => {
      const ordinal = index++;
      const child = localIndex % 7 === 1;
      const parentId = child ? `T${1000 + ordinal - 1}` : null;
      const id = child ? `${parentId}.001` : `T${1000 + ordinal}`;
      return {
        id, name: `${domain} record ${localIndex + 1}`, domain,
        kind: child ? 'subtechnique' : 'technique', parentId,
        stixId: `attack-pattern--00000000-0000-4000-8000-${String(ordinal).padStart(12, '0')}`,
        attackVersion: '19.2', tactics: [localIndex % 2 ? 'Discovery' : 'Execution'],
        platforms: domain === 'ICS' ? [] : domain === 'Mobile' ? ['Android'] : ['Windows'],
        behavior: `Synthetic behavior for ${id}.`, telemetry: ['Synthetic audit events'],
        falsePositives: 'Local baseline guidance: verify ordinary administration.',
        sourceUrl: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
        strategies: [], procedureExamples: [], procedureCount: 0,
      };
    }));
}

function launch(catalog = records()) {
  const demo = path.join(__dirname, '..', 'demo');
  const document = parseDocument(fs.readFileSync(path.join(demo, 'index.html'), 'utf8'));
  const context = vm.createContext({
    document, PAD_CATALOG: catalog, URL, Blob,
    window: { confirm: () => true }, navigator: { clipboard: { writeText: async () => {} } },
    setTimeout: () => {},
  });
  for (const name of ['core.js', 'app.js']) vm.runInContext(fs.readFileSync(path.join(demo, name), 'utf8'), context, { filename: name });
  const get = id => { const node = document.getElementById(id); assert.ok(node, `Missing #${id} in demo/index.html`); return node; };
  return {
    catalog, document, get,
    rows: () => get('techniques').querySelectorAll('button'),
    select(id) {
      const button = get('techniques').querySelectorAll('button').find(row => row.dataset.id === id);
      assert.ok(button, `${id} must be present on the current page`); button.click();
    },
    domain(value) {
      const button = document.querySelectorAll('[data-domain]').find(node => node.dataset.domain === value);
      assert.ok(button, `Missing domain button for '${value}'`); button.click();
    },
    input(id, value, event = 'input') { const node = get(id); node.value = value; node.dispatch(event); },
  };
}

test('workbench starts with all domains and reports full-library counts', () => {
  const ui = launch();
  const all = ui.document.querySelectorAll('[data-domain]').find(button => button.dataset.domain === '');
  assert.ok(all, 'All domains control must exist');
  assert.equal(all.getAttribute('aria-pressed'), 'true');
  assert.match(ui.get('library-count').textContent, /\b121\b/);
  assert.doesNotMatch(ui.get('library-count').textContent, /sample/i);
  assert.match(ui.get('coverage-summary').textContent, /103 techniques.*18 sub-techniques.*Enterprise 61.*Mobile 40.*ICS 20/);
  assert.match(ui.get('domain-count').textContent, /All domains: 121 records/);
  assert.equal(ui.get('result-count').textContent, '121 matches');
  ui.domain('Mobile');
  assert.match(ui.get('domain-count').textContent, /Mobile: 40 records.*34 techniques.*6 sub-techniques/);
  assert.match(ui.get('library-count').textContent, /\b121\b/);
});

test('pagination exposes all 121 records in bounded pages with correct boundary controls', () => {
  const ui = launch();
  const ids = ui.catalog.map(record => record.id);
  const pageIds = () => ui.rows().map(button => button.dataset.id);
  assert.deepEqual(pageIds(), ids.slice(0, 50));
  assert.equal(ui.get('page-status').textContent, 'Page 1 of 3');
  assert.equal(ui.get('page-range').textContent, '1–50 of 121');
  assert.equal(ui.get('page-first').disabled, true);
  assert.equal(ui.get('page-previous').disabled, true);
  assert.equal(ui.get('page-next').disabled, false);
  ui.get('page-next').click();
  assert.deepEqual(pageIds(), ids.slice(50, 100));
  assert.equal(ui.get('page-status').textContent, 'Page 2 of 3');
  ui.get('page-last').click();
  assert.deepEqual(pageIds(), ids.slice(100));
  assert.equal(ui.get('page-range').textContent, '101–121 of 121');
  assert.equal(ui.get('page-next').disabled, true);
  assert.equal(ui.get('page-last').disabled, true);
  ui.get('page-previous').click();
  assert.deepEqual(pageIds(), ids.slice(50, 100));
  ui.get('page-first').click();
  assert.deepEqual(pageIds(), ids.slice(0, 50));
});

test('first and last page selections keep their separate edited drafts', () => {
  const ui = launch();
  const first = ui.catalog[0]; const last = ui.catalog.at(-1);
  ui.select(first.id);
  ui.input('prompt', 'First-page analyst edit ${HOME} <script>literal</script>');
  ui.get('page-last').click(); ui.select(last.id);
  assert.equal(ui.get('technique-id').textContent, last.id);
  assert.ok(ui.get('prompt').value.includes(last.behavior));
  ui.input('prompt', 'Last-page analyst edit');
  ui.get('page-first').click(); ui.select(first.id);
  assert.equal(ui.get('prompt').value, 'First-page analyst edit ${HOME} <script>literal</script>');
  assert.equal(ui.get('draft-state').textContent, 'Edited in this tab');
  ui.get('page-last').click(); ui.select(last.id);
  assert.equal(ui.get('prompt').value, 'Last-page analyst edit');
  assert.equal(ui.rows().find(button => button.dataset.id === last.id).getAttribute('aria-current'), 'true');
});

test('search and domain changes restart pagination and include cross-domain matches', () => {
  const ui = launch();
  ui.get('page-last').click();
  ui.input('search', 'Mobile');
  assert.equal(ui.get('page-status').textContent, 'Page 1 of 1');
  assert.equal(ui.rows().length, 40);
  assert.equal(ui.get('result-count').textContent, '40 matches');
  assert.ok(ui.rows().every(button => ui.catalog.find(record => record.id === button.dataset.id).domain === 'Mobile'));
  ui.input('search', ''); ui.get('page-last').click(); ui.domain('Enterprise');
  assert.equal(ui.get('page-status').textContent, 'Page 1 of 2');
  assert.deepEqual(ui.rows().map(button => button.dataset.id), ui.catalog.slice(0, 50).map(record => record.id));
  ui.domain(''); ui.get('page-last').click(); ui.input('tactic', 'Discovery', 'change');
  assert.equal(ui.get('page-status').textContent, 'Page 1 of 2');
  assert.ok(ui.rows().every(button => ui.catalog.find(record => record.id === button.dataset.id).tactics.includes('Discovery')));
  ui.get('clear-filters').click(); ui.get('page-last').click(); ui.input('platform', 'Android', 'change');
  assert.equal(ui.get('page-status').textContent, 'Page 1 of 1');
  assert.equal(ui.rows().length, 40);
});

test('zero-result search clears the selection and clearing filters restores all-domain page one', () => {
  const ui = launch();
  ui.get('page-last').click(); ui.input('search', 'no-such-synthetic-technique');
  assert.equal(ui.rows().length, 0);
  assert.equal(ui.get('empty-results').hidden, false);
  assert.equal(ui.get('selected-detail').hidden, true);
  assert.equal(ui.get('no-selection').hidden, false);
  assert.equal(ui.get('export-library').disabled, true);
  assert.equal(ui.get('page-status').textContent, 'Page 0 of 0');
  for (const id of ['page-first', 'page-previous', 'page-next', 'page-last']) assert.equal(ui.get(id).disabled, true);
  ui.get('clear-filters').click();
  assert.equal(ui.get('search').value, '');
  assert.equal(ui.get('result-count').textContent, '121 matches');
  assert.equal(ui.rows().length, 50);
  assert.equal(ui.get('page-status').textContent, 'Page 1 of 3');
  assert.equal(ui.get('export-library').disabled, false);
  assert.equal(ui.get('empty-results').hidden, true);
});

test('a source record with no platforms renders an explicit missing-platform tag', () => {
  const ui = launch(); ui.domain('ICS');
  assert.equal(ui.get('platform-tags').textContent, 'Platform not specified');
  ui.domain(''); ui.input('platform', '__unspecified__', 'change');
  assert.equal(ui.rows().length, 20);
  assert.ok(ui.rows().every(button => ui.catalog.find(record => record.id === button.dataset.id).domain === 'ICS'));
});

test('technique links allow only HTTPS on the exact MITRE ATT&CK host without credentials or a custom port', () => {
  const valid = launch();
  assert.equal(valid.get('source-link').getAttribute('href'), valid.catalog[0].sourceUrl);
  for (const sourceUrl of [
    'javascript:alert(1)', 'http://attack.mitre.org/techniques/T1000/',
    'https://attack.mitre.org.evil.example/techniques/T1000/', 'https://evil.example/attack.mitre.org',
    'https://user:password@attack.mitre.org/techniques/T1000/', 'https://attack.mitre.org:8443/techniques/T1000/',
    '//attack.mitre.org/techniques/T1000/',
  ]) {
    const catalog = records(); catalog[0].sourceUrl = sourceUrl;
    const ui = launch(catalog);
    assert.ok(!ui.get('source-link').getAttribute('href'), `Unsafe source must not be clickable: ${sourceUrl}`);
    ui.select(catalog[1].id);
    assert.equal(ui.get('source-link').getAttribute('href'), catalog[1].sourceUrl);
    ui.select(catalog[0].id);
    assert.ok(!ui.get('source-link').getAttribute('href'), 'Selecting an unsafe source clears the previous valid link');
  }
});

test('linked strategies, analytics and procedure examples remain literal source text', () => {
  const catalog = records();
  const strategyName = '<img src=x onerror="alert(1)"> strategy';
  const analyticText = 'Literal analytic <script>alert(2)</script> ${HOME} [[SCHEMA]]';
  const actorName = '<svg onload="alert(3)"> actor';
  const procedureText = 'Literal procedure </p><script>alert(4)</script> ${HOME}';
  catalog[0].strategies = [{
    id: 'DET0001', name: strategyName, url: 'https://attack.mitre.org/detectionstrategies/DET0001/',
    analytics: [{ id: 'AN0001', name: 'Synthetic analytic', description: analyticText, platforms: ['Windows'], logSources: [{ name: 'Audit', channel: 'Synthetic', dataComponent: 'Process Creation' }], mutableElements: [] }],
  }];
  catalog[0].procedureCount = 7;
  catalog[0].procedureExamples = [{ id: 'relationship--synthetic', actorId: 'G0001', actorName, description: procedureText, references: [] }];
  const ui = launch(catalog);
  assert.ok(ui.get('strategies').textContent.includes(strategyName));
  assert.ok(ui.get('strategies').textContent.includes(analyticText));
  assert.ok(ui.get('procedure-examples').textContent.includes(actorName));
  assert.ok(ui.get('procedure-examples').textContent.includes(procedureText));
  assert.match(ui.get('procedure-count').textContent, /\b7\b/);
  assert.ok(ui.get('strategies').querySelectorAll('a').some(anchor => anchor.getAttribute('href') === catalog[0].strategies[0].url));
  for (const id of ['strategies', 'procedure-examples']) {
    assert.equal(ui.get(id).querySelectorAll('script').length, 0);
    assert.equal(ui.get(id).querySelectorAll('img').length, 0);
    assert.equal(ui.get(id).querySelectorAll('svg').length, 0);
  }
});
