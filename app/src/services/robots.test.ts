import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NOINDEX_PATHS } from './seo';

/**
 * `robots.txt` против собственного текста документации.
 *
 * `docs/SEO_AND_ANALYTICS.md` утверждает «закрыты личные экраны». До 30.08.2026 это
 * было неправдой для GPTBot, ClaudeBot, PerplexityBot и YandexBot: у каждого была
 * своя группа, а группы в robots.txt не складываются — робот подчиняется только своей.
 * Утечки не было (без входа там пусто), но документ расходился с фактом, и заметить
 * это можно было только чтением файла глазами. Теперь падает тест.
 */
const robots = readFileSync(
  fileURLToPath(new URL('../../public/robots.txt', import.meta.url)),
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

  it('каждая группа закрывает каждый личный экран', () => {
    expect(parsed.length).toBeGreaterThan(1);
    for (const group of parsed) {
      for (const path of NOINDEX_PATHS) {
        expect(group.disallow, `${group.agents.join(', ')} → ${path}`).toContain(path);
      }
    }
  });

  it('не содержит директиву Host: Яндекс не читает её с 2018 года', () => {
    expect(robots).not.toMatch(/^\s*Host\s*:/im);
  });

  it('называет карту сайта', () => {
    expect(robots).toMatch(/^Sitemap:\s*https:\/\/habitoff\.ru\/sitemap\.xml$/m);
  });
});
