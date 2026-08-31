import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NAV_PATHS, renderNotFound, renderRoute, renderSitemap } from './prerender';
import { PUBLIC_NAV } from '../redesign/shared';
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

  it('у каждого раздела своё тело, а не оболочка главной', () => {
    // Ровно эта проверка отсутствовала 30.08: голова подменялась, тело бралось от
    // главной, и пять адресов из карты сайта отдавали 2240 знаков одного текста при
    // разных canonical. Все тесты вокруг пререндера были при этом зелёными.
    const body = (html: string) =>
      html.match(/<main class="r-prerender">([\s\S]*?)<\/main>/)?.[1] ?? '';
    const home = body(template);
    for (const path of PRERENDER_PATHS) {
      const own = body(renderRoute(template, path));
      expect(own, path).not.toBe(home);
      expect(own.length, `${path}: пустое тело`).toBeGreaterThan(300);
    }
  });

  it('каждый раздел ссылается на соседние — не меньше четырёх ссылок', () => {
    for (const path of ['/', ...PRERENDER_PATHS]) {
      const links = [...renderRoute(template, path).matchAll(/<a[^>]*href="(\/[^"]*)"/g)].map(
        (m) => m[1],
      );
      expect(links.length, path).toBeGreaterThanOrEqual(4);
      expect(links, `${path} ссылается сам на себя`).not.toContain(path);
    }
  });

  it('копий каталога в статику не приезжает', () => {
    // Факты, мифы, связки и смыслы правятся миграциями, и копия разошлась бы с базой
    // на первой же — docs/SEO_AND_ANALYTICS.md отказался от неё сознательно. Проверить
    // это содержимым нельзя: базы здесь нет. Зато можно проверить единственный способ,
    // которым каталог мог бы сюда попасть, — импорт.
    //
    // Утверждения для разметки `/knowledge` приезжают не импортом, а файлом выгрузки,
    // который кладёт выкладка, и в git его нет.
    for (const [file, allowed] of [
      ['./prerender.ts', ['../redesign/releases', './schema', './seo']],
      ['./schema.ts', ['./seo']],
    ] as const) {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
      const imports = [...source.matchAll(/^import[^;]*from '([^']+)';/gm)].map((m) => m[1]);
      expect(imports.sort(), file).toEqual([...allowed]);
    }
  });

  it('несуществующий адрес получает своё тело, ссылки и noindex', () => {
    const html = renderNotFound(template);
    expect(html).toContain('<h1>Такой страницы нет</h1>');
    expect(html).toContain('content="noindex, follow"');
    expect(html).toContain('<a href="/knowledge">');
    expect(html).toContain('<link rel="canonical" href="https://habitoff.ru/" />');
  });

  it('навигация для краулера ведёт туда же, куда меню продукта', () => {
    // Два списка живут в разных мирах: один в сборке, другой в рантайме. Разъезжаются
    // они молча — новый публичный раздел появится в меню и не появится у робота.
    for (const [href] of PUBLIC_NAV) {
      expect(NAV_PATHS, `${href} есть в меню, но не в навигации для краулера`).toContain(href);
    }
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
