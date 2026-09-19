const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async function sourceChecks({ page, base, check, output, screenshot }) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL('?technique=T1059.001', base).href);
  await page.locator('#prompt').waitFor();
  const draft = 'Synthetic analyst draft retained across external source research.';
  await page.locator('#prompt').fill(draft);
  await page.locator('.context-box > summary').click();
  await page.locator('#context').fill('synthetic local context, never a search query');
  await page.locator('#tab-source').click();
  const cards = page.locator('#desk-external-sources');
  await check('source cards expose three projects and only public-ID search queries', async () => {
    assert.equal(await cards.locator('article').count(), 3);
    assert.match(await cards.textContent(), /not verified mappings/);
    const links = await cards.locator('a').evaluateAll(nodes => nodes.map(node => ({ href: node.href, rel: node.rel, target: node.target, referrer: node.referrerPolicy })));
    assert.equal(links.length, 12);
    for (const link of links) {
      assert.equal(link.rel, 'noopener noreferrer'); assert.equal(link.target, '_blank'); assert.equal(link.referrer, 'no-referrer');
      const url = new URL(link.href);
      if (url.search) assert.equal(url.searchParams.get('q'), '"T1059.001"');
      assert.equal(link.href.includes('synthetic'), false);
    }
  });
  await check('source searches follow selection without rebasing edited prompts', async () => {
    await page.locator('#search').fill('T0800');
    await page.locator('#techniques button').first().click();
    assert.equal(await cards.getByRole('link', { name: 'Search LOLBAS for T0800', exact: true }).count(), 1);
    await page.locator('#search').fill('T1059.001');
    await page.locator('#techniques button').first().click();
    await page.locator('#tab-prompt').click();
    assert.equal(await page.locator('#prompt').inputValue(), draft);
    await page.locator('#search').fill('AML.T0051.001');
    await page.locator('#techniques button').first().click();
    await page.locator('#tab-source').click();
    assert.equal(await cards.locator('article').count(), 3);
    assert.equal(await cards.locator('a[href*="/search?"]').count(), 0);
    assert.match(await cards.textContent(), /No ATLAS mappings/);
  });
  await page.goto(new URL('?technique=T1001', base).href);
  await page.locator('#tab-source').click();
  for (const [width, theme] of [[1440, 'dark'], [768, 'contrast'], [320, 'light']]) {
    await check(`external source cards fit ${width}px in ${theme} theme with visible link focus`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      if (!await page.locator('#tab-source').isVisible()) {
        await page.locator('#techniques button[data-id="T1001"]').click();
        await page.locator('#tab-source').click();
      }
      await page.locator('#theme').selectOption(theme);
      const first = cards.locator('a').first(); await first.focus();
      const key = process.env.BROWSER_ENGINE === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(() => {
        const focused = document.activeElement;
        return Boolean(focused?.closest('#desk-external-sources')) && focused.tagName === 'A'
          && getComputedStyle(focused).outlineStyle !== 'none';
      }), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const boxes = await cards.locator('article').evaluateAll(nodes => nodes.map(node => ({ left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })));
      assert.ok(boxes.every(box => box.left >= 0 && box.right <= width));
      await screenshot({ path: path.join(output, `external-sources-${width}.png`), fullPage: true });
    });
  }
  await check('research directory reuses cards without implying a selected technique', async () => {
    await page.goto(new URL('research.html#external-sources', base).href);
    await page.locator('#research-content').waitFor();
    assert.equal(await page.locator('#research-external-sources article').count(), 3);
    assert.equal(await page.locator('#research-external-sources a[href*="/search?"]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  });
};
