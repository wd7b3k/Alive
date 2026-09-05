import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NOINDEX_PATHS } from './seo';

/**
 * Кто закрывает личные экраны — и от чего именно.
 *
 * Здесь сходятся три списка, которые иначе разъезжаются молча: `NOINDEX_PATHS` в
 * `seo.ts`, группы в `robots.txt` и матчер `@private` в `infra/caddy/Caddyfile`.
 *
 * История, из-за которой этот тест существует, длиннее одной правки. До 30.08.2026
 * `robots.txt` не закрывал личные экраны для GPTBot, ClaudeBot, PerplexityBot и
 * YandexBot: у каждого была своя группа, а группы не складываются — робот подчиняется
 * только своей. Документ при этом утверждал обратное.
 *
 * 05.09.2026 выяснилось, что и починенный `Disallow` не закрывал того, что все считали
 * закрытым. `Disallow` запрещает **обход**, а не показ; мета-тег `noindex` ставит
 * JavaScript, которого краулер не выполняет. Настоящего запрета индексации не
 * существовало ни для одного робота — а с включением обхода по счётчикам Метрики робот
 * узнаёт адреса личных страниц из данных счётчика.
 *
 * Поэтому теперь: обход разрешён всем, а индексацию запрещает заголовок
 * `X-Robots-Tag`, который робот увидит, потому что ему разрешено зайти.
 */
const robots = readFileSync(
  fileURLToPath(new URL('../../public/robots.txt', import.meta.url)),
  'utf8',
);
const caddyfile = readFileSync(
  fileURLToPath(new URL('../../../infra/caddy/Caddyfile', import.meta.url)),
  'utf8',
);

type Group = { agents: string[]; disallow: string[] };

function groups(text: string): Group[] {
  const parsed: Group[] = [];
  let current: Group | null = null;
  let expectingAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [field, ...rest] = line.split(':');
    const key = field.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      if (!current || !expectingAgents) {
        current = { agents: [], disallow: [] };
        parsed.push(current);
        expectingAgents = true;
      }
      current.agents.push(value);
    } else if (current) {
      expectingAgents = false;
      if (key === 'disallow') current.disallow.push(value);
    }
  }
  return parsed;
}

describe('robots.txt', () => {
  const parsed = groups(robots);

  it('описывает те группы, ради которых файл написан', () => {
    const agents = parsed.flatMap((group) => group.agents);
    for (const agent of ['*', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'YandexBot']) {
      expect(agents, agent).toContain(agent);
    }
  });

  /**
   * Обход личных экранов больше не запрещён — и это не забывчивость, а условие того,
   * чтобы запрет индексации вообще работал.
   *
   * `Disallow` запрещает обход, а не показ: робот, которому запрещено зайти, не увидит
   * на странице никакого `noindex` и вправе оставить адрес в выдаче голой ссылкой. С
   * 05.09.2026 узнать адрес ему есть откуда — включён обход по счётчикам Метрики, а
   * счётчик по ADR-0015 стоит и на личных страницах.
   */
  it('обход личных экранов не запрещён: иначе noindex до робота не доедет', () => {
    expect(parsed.length).toBeGreaterThan(1);
    for (const group of parsed) {
      for (const path of NOINDEX_PATHS) {
        expect(group.disallow, `${group.agents.join(', ')} → ${path}`).not.toContain(path);
      }
    }
  });

  it('запрет индексации стоит заголовком на всех личных путях', () => {
    // Три списка — `seo.ts`, `robots.txt` и `Caddyfile` — сходятся здесь, а не в голове
    // у того, кто правит один из них.
    const matcher = caddyfile.match(/@private path ([^\n]+)/);
    expect(matcher, 'в Caddyfile нет матчера @private').toBeTruthy();
    const guarded = matcher![1].trim().split(/\s+/);
    for (const path of NOINDEX_PATHS) {
      expect(guarded, `${path}: нет в @private`).toContain(path);
      // Вложенные адреса тоже: `/admin/analytics` — такой же личный экран, как `/admin`.
      expect(guarded, `${path}/*: вложенные адреса не закрыты`).toContain(`${path}/*`);
    }
    expect(caddyfile).toMatch(/header @private X-Robots-Tag "noindex, nofollow"/);
  });

  it('публичные адреса заголовок не получают', () => {
    const matcher = caddyfile.match(/@private path ([^\n]+)/);
    const guarded = matcher![1].trim().split(/\s+/);
    for (const path of ['/', '/knowledge', '/links', '/meanings', '/experiment', '/releases']) {
      expect(guarded, `${path} попал под запрет индексации`).not.toContain(path);
    }
  });

  it('не содержит директиву Host: Яндекс не читает её с 2018 года', () => {
    expect(robots).not.toMatch(/^\s*Host\s*:/im);
  });

  it('называет карту сайта', () => {
    expect(robots).toMatch(/^Sitemap:\s*https:\/\/habitoff\.ru\/sitemap\.xml$/m);
  });
});
