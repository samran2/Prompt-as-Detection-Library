const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sources = require('../demo/research-sources.js');
const { PUBLIC_FILES } = require('../scripts/build_demo.cjs');

test('three deduplicated projects include all requested official destinations', () => {
  const cards = sources.cardsFor();
  assert.deepEqual(cards.map(card => card.name), ['LOLBAS', 'GTFOBins', 'LOLDrivers']);
  const urls = cards.flatMap(card => card.links.map(link => link.url));
  for (const url of ['https://github.com/LOLBAS-Project/LOLBAS', 'https://lolbas-project.github.io/', 'https://gtfobins.org/', 'https://www.loldrivers.io/detections/', 'https://github.com/magicsword-io/LOLDrivers']) assert.ok(urls.includes(url));
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(cards.every(card => card.links.some(link => /license/i.test(link.label))));
});

test('only exact public ATT&CK IDs create repository-scoped research searches', () => {
  for (const id of ['T1001', 'T1059.001', 'T0800']) {
    for (const card of sources.cardsFor(id)) {
      const url = new URL(card.search.url);
      assert.equal(url.origin, 'https://github.com');
      assert.equal(url.pathname, `/${card.repository}/search`);
      assert.equal(url.searchParams.get('q'), `"${id}"`);
      assert.equal(url.searchParams.get('type'), 'code');
      assert.equal([...url.searchParams].length, 2);
      assert.match(card.search.label, new RegExp(id.replace('.', '\\.')));
    }
  }
});

test('ATLAS, malformed IDs and analyst text never enter external URLs', () => {
  for (const id of [undefined, null, 17, {}, '', 'AML.T0001', 'T1001\n', 'T1001\r\n', 't1001', ' T1001', 'T1001 private-context', '<img src=x>', 'T1059.01', 'T1001?q=secret', 'x'.repeat(100000)]) {
    assert.ok(sources.cardsFor(id).every(card => card.search === null));
  }
});

test('caller mutations cannot alter later cards or destinations', () => {
  const cards = sources.cardsFor('T1001');
  cards[0].name = '<script>bad</script>'; cards[0].links[0].url = 'javascript:bad';
  cards[0].search.url = 'https://untrusted.invalid/'; cards.pop();
  const next = sources.cardsFor('T0800');
  assert.equal(next.length, 3); assert.equal(next[0].name, 'LOLBAS');
  assert.equal(next[0].links[0].url, 'https://lolbas-project.github.io/');
  assert.equal(new URL(next[0].search.url).searchParams.get('q'), '"T0800"');
});

function dom() {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attributes[key] = value; }
    all(tag) { return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.all(tag)]); }
  }
  return { document: { createElement: tag => new Element(tag) }, root: new Element('div') };
}

test('renderer uses safe named links, correct headings and honest search boundaries', () => {
  const view = dom();
  sources.render({ ...view, techniqueId: 'T1001', headingLevel: 4 });
  assert.equal(view.root.all('article').length, 3);
  assert.deepEqual(view.root.all('h4').map(node => node.textContent), ['LOLBAS', 'GTFOBins', 'LOLDrivers']);
  for (const link of view.root.all('a')) {
    assert.equal(new URL(link.href).protocol, 'https:');
    assert.equal(link.target, '_blank'); assert.equal(link.rel, 'noopener noreferrer');
    assert.equal(link.referrerPolicy, 'no-referrer'); assert.ok(link.textContent);
  }
  assert.match(view.root.all('p').map(node => node.textContent).join(' '), /not verified mappings/);
  sources.render({ ...view, techniqueId: 'AML.T0001', headingLevel: 3 });
  assert.equal(view.root.all('article').length, 3);
  assert.equal(view.root.all('h3').length, 3);
  assert.ok(view.root.all('a').every(link => !link.href.includes('/search?')));
  assert.match(view.root.all('p').map(node => node.textContent).join(' '), /No ATLAS mappings/);
  assert.throws(() => sources.render({ ...view, headingLevel: 'script' }), /heading/);
});

test('both pages publish the shared module without remote execution or storage', () => {
  assert.ok(PUBLIC_FILES.includes('research-sources.js'));
  for (const name of ['index.html', 'research.html']) assert.match(fs.readFileSync(path.join(__dirname, '../demo', name), 'utf8'), /src="\.\/research-sources\.js"/);
  const code = fs.readFileSync(path.join(__dirname, '../demo/research-sources.js'), 'utf8');
  assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML|\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|\beval\s*\(/);
});

test('cards expose documented exact associations separately from speculative searches', () => {
  const lolbas = sources.cardsFor('T1218.005')[0];
  assert.ok(lolbas.mappings.some(link => link.name === 'Mshta.exe' && link.basis === 'upstream-id'));
  assert.equal(sources.cardsFor('T1218')[1].mappings[0].basis, 'mitre-citation');
  const drivers = sources.cardsFor('T1068')[2];
  assert.equal(drivers.mappings.length, 6);
  assert.ok(drivers.mappings.every(link => link.basis === 'rule-tag' && link.evidence.sha256.length === 64));
  assert.equal(sources.cardsFor('T1543.003')[2].mappings.length, 6);
  for (const id of ['T1001', 'T0800', 'AML.T0051.001', 'T1218.006']) assert.ok(sources.cardsFor(id).every(card => card.mappings.length === 0));
  assert.ok(sources.cardsFor('T0894')[1].mappings.some(link => link.basis === 'mitre-citation'));
});

test('renderer shows source evidence and rule-level limitations without promoting review', () => {
  const view = dom(); sources.render({ ...view, techniqueId: 'T1068' });
  const paragraphs = view.root.all('p').map(node => node.textContent).join(' ');
  assert.match(paragraphs, /rule-level/);
  assert.match(paragraphs, /not validated/);
  assert.match(paragraphs, /Upstream rule status: experimental/);
  assert.ok(view.root.all('a').some(link => link.href.includes('/blob/67ac4a76')));
  const card = sources.cardsFor('T1068')[2]; card.mappings[0].locators.push('fake');
  assert.equal(sources.cardsFor('T1068')[2].mappings[0].locators.includes('fake'), false);
  sources.render({ ...view, techniqueId: 'T1218.005' });
  assert.match(view.root.all('p').map(node => node.textContent).join(' '), /Retrieved 2026-09-19.*live API may change/);
});

test('missing browser index is unavailable, not a false zero-mapping claim', () => {
  const vm = require('node:vm'); const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../demo/research-sources.js'), 'utf8'), { ...sandbox, globalThis: sandbox, URL });
  assert.equal(sandbox.PAD_RESEARCH_SOURCES.cardsFor('T1068')[2].mappingStatus, 'unavailable');
});
