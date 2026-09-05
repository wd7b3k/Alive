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

  it('глубокий адрес карточки отдаётся файлом, а не подстановкой главной', () => {
    // У `/knowledge/<код>` есть свой файл: сборка кладёт `knowledge/<код>/index.html`.
    // Это и делает обновление страницы на глубоком адресе равным переходу внутри
    // приложения — оба показывают карточку, а не главную.
    //
    // В матчере `@app` этих адресов нет и быть не должно: попади они туда, Caddy
    // подставил бы `index.html` и статическая карточка перестала бы отдаваться, а
    // несуществующий код отвечал бы 200 вместо 404.
    expect(appPaths.filter((path) => path.startsWith('/knowledge'))).toEqual([]);
    expect(caddyfile).toContain('try_files {path} {path}/index.html');
  });

  it('оставляет 404 неизвестному пути', () => {
    expect(caddyfile).toContain('try_files {path} {path}/index.html');
    expect(caddyfile, 'подстановка главной на любой путь — это мягкий 404').not.toMatch(
      /try_files[^\n]*\s\/index\.html\s*$/m,
    );
  });

  /**
   * `handle_errors` — не упорядоченный обработчик, и вложенным в `handle` Caddy его
   * разбирать отказывается. 31.08.2026 конфиг уехал на сервер именно таким и упал на
   * `caddy validate` — то есть до `reload`, прод не пострадал. Но поймал это сервер, а
   * не репозиторий: файл лежит в git и до этого дня ничем не проверялся.
   *
   * Полноценной проверки без самого Caddy не сделать, а тащить его в CI ради одного
   * файла — перебор. Эта проверка ловит ровно ту ошибку, которая уже случилась.
   */
  it('handle_errors стоит на уровне сайта, а не внутри handle', () => {
    const insideHandle = /handle\s*\{[^}]*handle_errors/s.test(caddyfile);
    expect(insideHandle, 'handle_errors вложен в handle — Caddy откажется разбирать').toBe(false);
    // Один таб отступа — это уровень сайта. Записан escape-последовательностью, а не
    // символом: голый таб в регулярном выражении eslint запрещает, и правильно делает —
    // его не отличить от пробелов при чтении.
    expect(caddyfile).toMatch(/^\thandle_errors \{/m);
  });

  it('страница 404 отдаётся со своим кодом, а не с двумястами', () => {
    // Без явного status file_server отдал бы 404.html с кодом 200 — мягкий 404
    // вернулся бы через заднюю дверь, но выглядел бы починенным.
    expect(caddyfile).toMatch(/file_server \{\s*status 404/);
    expect(caddyfile).toContain('rewrite * /404.html');
    // handle_errors живёт вне блока со статикой, значит root ему нужен свой.
    const errors = caddyfile.slice(caddyfile.indexOf('handle_errors {'));
    expect(errors).toContain('root * /srv/alive/current');
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
