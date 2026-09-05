import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { cards, pathFor } from '../services/knowledge-catalog';
import { NOINDEX_PATHS, PRERENDER_PATHS, metaFor } from '../services/seo';
import { adminSectionFromPath } from './admin';
import {
  LOG_FORMAT,
  RECORD,
  UNIT,
  assignVersions,
  buildChangelog,
  cardIdFrom,
  dirsOf,
  kindFor,
  parseLog,
  prFrom,
  taskFrom,
  themeFor,
} from '../../../scripts/changelog-parse.mjs';

/**
 * Разбор истории репозитория в раздел «Что сделано».
 *
 * Опасность здесь одна и она тихая: разбор, который теряет коммит, ничего не ломает.
 * Экран остаётся зелёным, список — короче на одну строку, и заметить это можно только
 * пересчётом. Поэтому проверок две группы: разбор на заранее записанном выводе `git log`
 * и полный прогон на настоящем репозитории с пересчётом по `git rev-list --count`.
 */

/** Сборка записи `git log` в том же виде, в каком её отдаёт `LOG_FORMAT`. */
function record({
  sha,
  short = sha.slice(0, 7),
  date = '2026-09-01T10:00:00+03:00',
  author = 'wd7b3k',
  parents = 'aaa111',
  subject,
  body = '',
  files = [],
}: {
  sha: string;
  short?: string;
  date?: string;
  author?: string;
  parents?: string;
  subject: string;
  body?: string;
  files?: string[];
}): string {
  return (
    `${RECORD}${sha}${UNIT}${short}${UNIT}${date}${UNIT}${author}${UNIT}${parents}${UNIT}` +
    `${subject}${UNIT}${body}${UNIT}\n\n${files.join('\n')}\n`
  );
}

const FIXTURE = [
  record({
    sha: 'f0000000000000000000000000000000000000aa',
    subject: 'Merge pull request #75 from wd7b3k/docs/session-20260905',
    parents: 'bbb222 ccc333',
    body: 'Тело слияния.',
  }),
  record({
    sha: 'd1111111111111111111111111111111111111bb',
    subject: 'Счётчик воронки отправляет все шесть целей',
    body: 'Разбор в docs/tasks/T-20260831-01-infra-backups-to-main.md.\n\nBoard: done inf-vps\n',
    files: ['app/src/services/counters.ts', 'app/src/modules/analytics/port.ts'],
  }),
  record({
    sha: 'c2222222222222222222222222222222222222cc',
    subject: 'Каталог переехал в миграцию',
    files: ['supabase/migrations/20260901_catalog.sql', 'docs/CURRENT_STATE.md'],
  }),
  record({
    sha: 'b3333333333333333333333333333333333333dd',
    subject: 'chore: migrate frontend',
    files: ['app/package.json'],
  }),
  record({
    sha: 'a4444444444444444444444444444444444444ee',
    subject: 'Первый коммит',
    files: ['README.md'],
  }),
].join('');

const CARDS = [{ id: 'inf-vps', title: 'Сервер в Москве поднят', epic: 'infra', type: 'infra' }];
const TASKS = ['docs/tasks/T-20260831-01-infra-backups-to-main.md'];

describe('разбор вывода git log', () => {
  const commits = parseLog(FIXTURE);

  it('не теряет и не задваивает записи', () => {
    expect(commits).toHaveLength(5);
    expect(new Set(commits.map((commit) => commit.sha)).size).toBe(5);
  });

  it('отличает слияние по числу родителей, а не по слову «Merge»', () => {
    expect(commits[0].merge).toBe(true);
    expect(commits[1].merge).toBe(false);
  });

  it('читает многострочное тело и список файлов', () => {
    expect(commits[1].body).toContain('Board: done inf-vps');
    expect(commits[1].paths).toEqual([
      'app/src/services/counters.ts',
      'app/src/modules/analytics/port.ts',
    ]);
  });

  it('переживает разделитель полей, попавший в тело сообщения', () => {
    const dirty = record({
      sha: 'e5555555555555555555555555555555555555ff',
      subject: 'Строка с управляющим символом',
      body: `до${UNIT}после`,
      files: ['app/src/redesign/admin.tsx'],
    });
    const [parsed] = parseLog(dirty);
    expect(parsed.body).toBe(`до${UNIT}после`);
    expect(parsed.paths).toEqual(['app/src/redesign/admin.tsx']);
  });
});

describe('что вытаскивается из сообщения', () => {
  it('берёт карточку из трейлера Board:', () => {
    expect(cardIdFrom('Board: done inf-vps\n')).toBe('inf-vps');
    expect(cardIdFrom('Board: new bug P1 perf "Каталог"')).toBe('bug');
    expect(cardIdFrom('просто текст')).toBeNull();
  });

  it('берёт номер PR из заголовка слияния', () => {
    expect(prFrom('Merge pull request #75 from wd7b3k/x')).toBe(75);
    expect(prFrom('Обычный заголовок')).toBeNull();
  });

  it('ссылается только на постановку, которая существует', () => {
    expect(taskFrom('см. docs/tasks/T-20260831-01-infra-backups-to-main.md', TASKS)).toBe(TASKS[0]);
    expect(taskFrom('см. docs/tasks/T-19990101-99-нет-такого.md', TASKS)).toBeNull();
  });

  it('сводит файлы к каталогам', () => {
    expect(dirsOf(['app/src/a.ts', 'app/src/b.ts', 'docs/X.md', 'README.md'])).toEqual([
      '.',
      'app/src/',
      'docs/',
    ]);
  });
});

describe('тема по путям — эвристика с голосованием', () => {
  it('выбирает направление, за которое больше путей', () => {
    expect(themeFor(['app/src/services/seo.ts', 'app/src/services/prerender.ts'])).toBe('seo');
    expect(themeFor(['infra/caddy/Caddyfile'])).toBe('infra');
    expect(themeFor(['docs/board/cards.json', 'BACKLOG.md'])).toBe('process');
  });

  it('не отдаёт направление одному документу против восьми файлов кода', () => {
    const paths = [
      'docs/CURRENT_STATE.md',
      ...Array.from({ length: 8 }, (_, i) => `app/src/${i}.ts`),
    ];
    expect(themeFor(paths)).toBe('flow');
  });

  it('молчит там, где путей нет', () => {
    expect(themeFor([])).toBeNull();
  });
});

describe('тип изменения', () => {
  it('достоверен по карточке доски и догадка без неё', () => {
    expect(kindFor({ cardType: 'bug', subject: 'что угодно' })).toEqual({
      kind: 'fix',
      confident: true,
    });
    expect(kindFor({ subject: 'Починено падение', paths: ['app/src/a.ts'] })).toEqual({
      kind: 'fix',
      confident: false,
    });
  });

  it('слияние остаётся слиянием', () => {
    expect(kindFor({ merge: true, subject: 'Merge pull request #1 from x' }).kind).toBe('merge');
  });

  it('различает документацию и инфраструктуру там, где кода нет', () => {
    expect(kindFor({ paths: ['docs/A.md', 'docs/B.md'], subject: 'Запись' }).kind).toBe('docs');
    expect(kindFor({ paths: ['infra/caddy/Caddyfile'], subject: 'Конфиг' }).kind).toBe('infra');
  });
});

describe('интервалы версий', () => {
  const commits = parseLog(FIXTURE);
  const bumps = [
    { sha: 'c2222222222222222222222222222222222222cc', version: '3.1.0' },
    { sha: 'b3333333333333333333333333333333333333dd', version: '3.0.0' },
  ];

  it('номер закрывает версию, а не открывает её', () => {
    const marked = assignVersions(commits, bumps);
    // Новее последнего поднятия — номера под них не поднимали.
    expect(marked[0].version).toBeNull();
    expect(marked[1].version).toBeNull();
    // Сам коммит поднятия закрывает свою версию.
    expect(marked[2].version).toBe('3.1.0');
    expect(marked[3].version).toBe('3.0.0');
  });

  it('коммиты старше первого поднятия относит к самому раннему номеру', () => {
    const marked = assignVersions(commits, bumps);
    expect(marked[4].version).toBe('3.0.0');
  });

  it('без единого поднятия оставляет всё невыпущенным', () => {
    expect(assignVersions(commits, []).every((commit) => commit.version === null)).toBe(true);
  });
});

describe('собранный файл раздела', () => {
  const changelog = buildChangelog({
    commits: parseLog(FIXTURE),
    bumps: [
      { sha: 'c2222222222222222222222222222222222222cc', version: '3.1.0' },
      { sha: 'b3333333333333333333333333333333333333dd', version: '3.0.0' },
    ],
    cards: CARDS,
    tasks: TASKS,
    head: 'f0000000000000000000000000000000000000aa',
    version: '3.1.0',
    generatedAt: '2026-09-05T00:00:00.000Z',
  });
  const entries = changelog.groups.flatMap((group) => group.entries);

  it('сохраняет каждый коммит ровно один раз', () => {
    expect(changelog.total).toBe(5);
    expect(entries).toHaveLength(5);
    expect(new Set(entries.map((entry) => entry.sha)).size).toBe(5);
  });

  it('берёт направление и тип из карточки, когда она есть', () => {
    const withCard = entries.find((entry) => entry.card?.id === 'inf-vps');
    expect(withCard?.theme).toBe('infra');
    expect(withCard?.themeConfident).toBe(true);
    expect(withCard?.kindConfident).toBe(true);
    expect(withCard?.task).toBe(TASKS[0]);
  });

  it('помечает миграцию и номер PR', () => {
    expect(entries.find((entry) => entry.migration)?.subject).toBe('Каталог переехал в миграцию');
    expect(entries.find((entry) => entry.pr === 75)?.merge).toBe(true);
  });

  it('коммит без карточки, без PR и без постановки не выпадает из списка', () => {
    const plain = entries.find((entry) => entry.short === 'a444444');
    expect(plain).toBeTruthy();
    expect(plain?.card).toBeNull();
    expect(plain?.pr).toBeNull();
    expect(plain?.task).toBeNull();
    expect(plain?.kindConfident).toBe(false);
  });

  it('считает шапку группы по её же записям', () => {
    for (const group of changelog.groups) {
      expect(group.count).toBe(group.entries.length);
      expect(group.migrations).toBe(group.entries.filter((entry) => entry.migration).length);
    }
  });
});

describe('сборка без git', () => {
  const script = fileURLToPath(new URL('../../../scripts/build-changelog.mjs', import.meta.url));

  it('не роняет сборку и пишет причину, а не пустой список', () => {
    // git убирается из PATH — ровно то, что бывает в контейнере сборки. Вывод уводится
    // во временный файл: без этого проверка затёрла бы настоящий файл раздела.
    const dir = mkdtempSync(join(tmpdir(), 'habitoff-nogit-'));
    const target = join(dir, 'changelog.json');
    const env: NodeJS.ProcessEnv = { ...process.env };
    // Именно подмена, а не удаление: с пустым окружением поиск исполняемого файла
    // возвращается к PATH родителя, и git находится снова. Здесь PATH ведёт в пустой
    // каталог, и `git` не находится — как в контейнере сборки без него.
    for (const key of Object.keys(env)) {
      if (key.toUpperCase() === 'PATH') delete env[key];
    }
    env.PATH = dir;
    try {
      // Не бросает — значит сборка бы не упала.
      execFileSync(process.execPath, [script, target], { encoding: 'utf8', env });
      const payload = JSON.parse(readFileSync(target, 'utf8'));
      expect(payload.unavailable).toBeTypeOf('string');
      expect(payload.unavailable.length).toBeGreaterThan(0);
      expect(payload.groups).toEqual([]);
      expect(payload.total).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('файл раздела всегда пригоден к чтению: либо список, либо причина', () => {
    const generated = fileURLToPath(new URL('../generated/changelog.json', import.meta.url));
    const payload = JSON.parse(readFileSync(generated, 'utf8'));
    expect(payload).toHaveProperty('groups');
    expect(payload).toHaveProperty('unavailable');
    if (payload.unavailable) expect(payload.total).toBe(0);
    else expect(payload.total).toBeGreaterThan(0);
  });
});

describe('раздел не публичный', () => {
  it('не попадает в предрендер и в карту сайта', () => {
    // Карта сайта строится в vite.config.ts из ['/', ...PRERENDER_PATHS] и адресов
    // карточек каталога. Ни в одном из двух списков раздела быть не должно.
    for (const path of PRERENDER_PATHS) {
      expect(path.startsWith('/admin')).toBe(false);
    }
    expect(PRERENDER_PATHS).not.toContain('/admin/releases');
    expect(cards().every((card) => pathFor(card).startsWith('/knowledge/'))).toBe(true);
  });

  it('несёт noindex — как и любой адрес под /admin', () => {
    expect(NOINDEX_PATHS).toContain('/admin');
    expect(metaFor('/admin/releases').noindex).toBe(true);
  });

  it('отдаётся приложением, а не файлом с диска', () => {
    // Свой файл раздел не получает, значит адрес обязан быть в матчере @app Caddy —
    // иначе обновление страницы на /admin/releases вернёт 404. Матчер уже перечисляет
    // /admin/*, и это проверяет services/caddy-routes.test.ts. Здесь — что раздел
    // действительно живёт под этим префиксом.
    expect(adminSectionFromPath('/admin/releases')?.id).toBe('releases');
    expect(adminSectionFromPath('/admin/releases')?.status).toBe('live');
  });
});

describe('разбор настоящей истории репозитория', () => {
  const root = fileURLToPath(new URL('../../..', import.meta.url));

  it('число записей совпадает с git rev-list --count HEAD', () => {
    const raw = execFileSync('git', ['log', '--name-only', `--format=${LOG_FORMAT}`, 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const commits = parseLog(raw);
    const expected = Number(
      execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    );
    expect(commits).toHaveLength(expected);
    expect(new Set(commits.map((commit) => commit.sha)).size).toBe(expected);
    expect(commits.every((commit) => /^[0-9a-f]{40}$/.test(commit.sha))).toBe(true);
  });
});
