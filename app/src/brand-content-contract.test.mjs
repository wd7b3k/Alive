import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSourceUrl = new URL('./RedesignApp.tsx', import.meta.url);
const logoUrl = new URL('./assets/brand-logo-full.png', import.meta.url);
const approvedLogoSha256 = '6b58071efb328d970d921ea6e03d30e15a148d8c36a92f6e9ec05455a830d832';

test('approved owner logo remains the rendered brand asset', async () => {
  const [source, logo] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(logoUrl),
  ]);

  assert.match(source, /import logoUrl from '\.\/assets\/brand-logo-full\.png';/);
  assert.doesNotMatch(source, /brand-logo-classic-om/);
  assert.equal(createHash('sha256').update(logo).digest('hex'), approvedLogoSha256);
});

test('Facts and Myths remains a first-class user surface', async () => {
  const source = await readFile(appSourceUrl, 'utf8');

  assert.match(source, /path==='\/facts'/);
  assert.match(source, /<FactsPage data=\{data\}\/>/);
  assert.match(source, />Факты и мифы</);
  assert.match(source, />Факты</);
  assert.match(source, />Мифы</);
});

test('static user headings do not end with a period', async () => {
  const source = await readFile(appSourceUrl, 'utf8');
  const staticHeadings = [...source.matchAll(/<h[1-6][^>]*>([^<{]*?)<\/h[1-6]>/gs)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  assert.ok(staticHeadings.length > 0);
  assert.deepEqual(staticHeadings.filter((heading) => heading.endsWith('.')), []);
});
