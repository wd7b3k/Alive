import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderRoute, renderSitemap } from './prerender';
import { RELEASES } from '../redesign/releases';
import { PRERENDER_PATHS, metaFor } from './seo';

/**
 * Предрендер проверяется на настоящем `index.html`, а не на выдуманной строке.
 *
 * Смысл этих проверок — не «функция подставляет строку», а «пять адресов из карты
 * сайта перестали быть одним и тем же документом с canonical на главную». Подделанный
 * шаблон доказал бы первое и промолчал бы о втором.
 */
const template = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

function tag(html: string, pattern: RegExp): string {
  const found = html.match(pattern);
  return found ? found[1] : '';
}

const canonicalOf = (html: string) => tag(html, /<link rel="canonical" href="([^"]*)"/);
const ogUrlOf = (html: string) => tag(html, /<meta property="og:url" content="([^"]*)"/);
const titleOf = (html: string) => tag(html, /<title>([\s\S]*?)<\/title>/);

describe('предрендер публичных адресов', () => {
  it('каждый адрес указывает canonical на себя, а не на главную', () => {
    for (const path of PRERENDER_PATHS) {
      const html = renderRoute(template, path);
      expect(canonicalOf(html), path).toBe(`https://habitoff.ru${path}`);
      expect(ogUrlOf(html), path).toBe(`https://habitoff.ru${path}`);
    }
  });

  it('заголовок и описание берутся из seo.ts, а не пишутся второй раз', () => {
    for (const path of PRERENDER_PATHS) {
      const html = renderRoute(template, path);
      expect(titleOf(html), path).toBe(metaFor(path).title);
      expect(html, path).toContain(metaFor(path).description);
    }
  });

  it('в исходнике не остаётся ни одного canonical на главную', () => {
    for (const path of PRERENDER_PATHS) {
      expect(renderRoute(template, path), path).not.toContain(
        '<link rel="canonical" href="https://habitoff.ru/"',
      );
    }
  });

  it('тела двух разных адресов не совпадают', () => {
    const knowledge = renderRoute(template, '/knowledge');
    const links = renderRoute(template, '/links');
    expect(knowledge).not.toBe(links);
    expect(knowledge).not.toBe(template);
  });

  it('«Что нового» отдаёт тексты релизов без JavaScript', () => {
    const html = renderRoute(template, '/releases');
    for (const release of RELEASES) {
      expect(html, release.version).toContain(release.title);
      expect(html, release.version).toContain(release.summary);
    }
  });

  it('разделы, живущие данными из базы, копии этих данных не получают', () => {
    // Копия каталога в статике расходится с базой на первой же миграции —
    // docs/SEO_AND_ANALYTICS.md отказался от неё сознательно. Меняется только голова.
    const knowledge = renderRoute(template, '/knowledge');
    const body = (html: string) => html.slice(html.indexOf('<main class="r-prerender">'));
    expect(body(knowledge)).toBe(body(template));
  });

  it('падает, а не молчит, если разметка index.html разошлась с шаблоном', () => {
    expect(() => renderRoute('<html><head></head><body></body></html>', '/knowledge')).toThrow(
      /Предрендер/,
    );
  });
});

describe('карта сайта', () => {
  const xml = renderSitemap(
    ['/', ...PRERENDER_PATHS].map((path) => ({ path, lastmod: '2026-08-30' })),
  );

  it('перечисляет главную и все предрендеренные адреса, включая «Что нового»', () => {
    for (const path of ['/', ...PRERENDER_PATHS]) {
      expect(xml, path).toContain(`<loc>https://habitoff.ru${path}</loc>`);
    }
    expect(xml).toContain('<loc>https://habitoff.ru/releases</loc>');
  });

  it('у каждого адреса есть lastmod', () => {
    const locs = xml.match(/<loc>/g) ?? [];
    const mods = xml.match(/<lastmod>/g) ?? [];
    expect(locs.length).toBe(mods.length);
    expect(locs.length).toBe(PRERENDER_PATHS.length + 1);
  });
});
