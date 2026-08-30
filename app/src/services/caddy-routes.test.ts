import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NOINDEX_PATHS, PRERENDER_PATHS } from './seo';

/**
 * Список адресов в конфигурации веб-сервера против списка в коде.
 *
 * С 30.08.2026 неизвестный путь отдаёт 404, а не подставленную главную. У этой правки
 * есть цена: экраны, которые рисует клиент, своего файла на диске не имеют, и если
 * такой адрес не перечислен в матчере `@app`, он начнёт отдавать 404 при обновлении
 * страницы. Это хуже мягкого 404, ради которого всё затевалось: человек теряет свой
 * личный раздел, а не ошибается в ссылке.
 *
 * Держать два списка в согласии вниманием нельзя — они лежат в разных языках и разных
 * каталогах. Поэтому здесь.
 */
const caddyfile = readFileSync(
  fileURLToPath(new URL('../../../infra/caddy/Caddyfile', import.meta.url)),
  'utf8',
);

const appMatcher = caddyfile.match(/@app\s+path\s+([^\n]+)/);
const appPaths = (appMatcher?.[1] ?? '').trim().split(/\s+/);

describe('маршруты в Caddyfile', () => {
  it('матчер @app в конфигурации вообще есть', () => {
    expect(appMatcher, 'без @app клиентские экраны начнут отдавать 404').not.toBeNull();
    expect(appPaths.length).toBeGreaterThan(3);
  });

  it('перечисляет главную и каждый экран, который рисует клиент', () => {
    expect(appPaths).toContain('/');
    for (const path of NOINDEX_PATHS) {
      expect(appPaths, `${path} не перечислен — обновление страницы даст 404`).toContain(path);
    }
  });

  it('пускает разделы админки, живущие на /admin/<раздел>', () => {
    expect(appPaths).toContain('/admin/*');
  });

  it('не подменяет предрендеренные адреса главной', () => {
    // У них есть свой файл на диске, и подстановка index.html вернула бы им общий
    // canonical — ровно то, что сессия предрендера убрала.
    for (const path of PRERENDER_PATHS) {
      expect(appPaths, `${path} должен отдаваться файлом, а не подстановкой`).not.toContain(path);
    }
  });

  it('оставляет 404 неизвестному пути', () => {
    expect(caddyfile).toContain('try_files {path} {path}/index.html');
    expect(caddyfile, 'подстановка главной на любой путь — это мягкий 404').not.toMatch(
      /try_files[^\n]*\s\/index\.html\s*$/m,
    );
  });

  it('сохраняет редирект www на apex', () => {
    expect(caddyfile).toMatch(/www\.habitoff\.ru\s*\{[\s\S]*redir https:\/\/habitoff\.ru/);
  });

  it('не содержит ключа: в репозитории лежит только имя переменной', () => {
    expect(caddyfile).toContain('{env.HABITOFF_SUPABASE_PUBLISHABLE_KEY}');
    expect(caddyfile).not.toMatch(/sb_(publishable|secret)_[A-Za-z0-9_-]{10,}/);
    expect(caddyfile).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });
});
