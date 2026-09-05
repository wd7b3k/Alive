#!/usr/bin/env node
/**
 * Список того, что сделано, — из git, на сборке.
 *
 * Зачем. Ответ на вопрос «что уже внедрено» до 05.09.2026 собирался вручную из записей
 * сессий, карточек доски и памяти, и эти три источника расходились между собой: про
 * бэкапы за четыре дня в репозитории лежало три несовместимых утверждения. Ручной
 * реестр отстал бы на первой же неделе — поэтому реестра нет, есть разбор истории.
 *
 * Что делает: один вызов `git log` на всю историю, отдельный вызов на коммиты, менявшие
 * `app/package.json`, и `git show` на каждый из них ради номера версии. Результат —
 * `app/src/generated/changelog.json`, который попадает в чанк админки при обычной
 * сборке. Файл производный и в git не хранится.
 *
 * Git недоступен — скрипт не падает и не выдумывает: пишет файл с полем `unavailable` и
 * причиной, а раздел показывает причину вместо пустого списка. Правило витрин из
 * `AGENTS.md`: непосчитанное возвращает причину, а не ноль.
 *
 * Разбор живёт рядом, в `changelog-parse.mjs`, и проверяется на фикстуре тестом
 * `app/src/redesign/admin-releases.test.ts`.
 *
 * Запуск: `node scripts/build-changelog.mjs` из корня репозитория, либо
 * `npm run changelog` из `app/` — туда же он подцеплен как `pre`-шаг сборки, типов,
 * тестов и dev-сервера.
 *
 * Решение и принятый риск — `docs/decisions/ADR-0018-changelog-from-git.md`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOG_FORMAT, buildChangelog, parseLog, unavailableChangelog } from './changelog-parse.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
// Путь вывода можно задать первым аргументом. Нужен он одному месту — тесту, который
// проверяет поведение без git: без подмены он затёр бы настоящий файл раздела.
const out = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, 'app', 'src', 'generated', 'changelog.json');

function git(args) {
  // maxBuffer: история из трёхсот коммитов с телами сообщений и списками файлов не
  // помещается в стандартный мегабайт, и переполнение выглядит как обрыв истории.
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function write(payload) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

/** Карточки доски: по трейлеру `Board:` берутся заголовок, направление и тип. */
function boardCards() {
  try {
    const file = join(root, 'docs', 'board', 'cards.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : (parsed.cards ?? []);
  } catch {
    // Доска — не обязательное условие списка изменений. Нет её — коммиты просто
    // останутся без карточек, и это видно на экране.
    return [];
  }
}

/** Постановки, которые действительно лежат в репозитории. Ссылка на несуществующий файл хуже её отсутствия. */
function taskFiles() {
  try {
    return readdirSync(join(root, 'docs', 'tasks'))
      .filter((name) => /^[TR]-\d{8}/.test(name))
      .map((name) => `docs/tasks/${name}`);
  } catch {
    return [];
  }
}

/**
 * Коммиты, поднявшие номер версии.
 *
 * `git log -- app/package.json` даёт коммиты, тронувшие файл; версию в них меняет не
 * каждый. Поэтому значение читается один раз на коммит-кандидат, а не на все триста, и
 * в список попадают только те, где оно отличается от предыдущего. Это и есть требование
 * «не читать package.json на каждом коммите».
 */
function versionBumps() {
  const shas = git(['log', '--format=%H', '--follow', '--', 'app/package.json'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  // От старых к новым: «изменилась ли версия» — вопрос про предыдущее значение.
  const bumps = [];
  let previous = null;
  for (const sha of [...shas].reverse()) {
    let version = null;
    try {
      version = JSON.parse(git(['show', `${sha}:app/package.json`])).version ?? null;
    } catch {
      continue;
    }
    if (version && version !== previous) {
      bumps.push({ sha, version });
      previous = version;
    }
  }
  return bumps;
}

try {
  git(['rev-parse', '--git-dir']);
} catch (error) {
  const reason = `git недоступен в контексте сборки: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`;
  write(unavailableChangelog(reason));
  console.warn(`changelog: ${reason}`);
  console.warn('changelog: раздел «Что сделано» покажет причину вместо списка.');
  process.exit(0);
}

try {
  const raw = git(['log', '--name-only', `--format=${LOG_FORMAT}`, 'HEAD']);
  const commits = parseLog(raw);
  const expected = Number(git(['rev-list', '--count', 'HEAD']).trim());
  if (commits.length !== expected) {
    // Расхождение здесь означает потерянный или задвоенный коммит — ровно ту ошибку,
    // ради которой раздел затевался. Молчать о ней нельзя, но и ронять сборку из-за
    // служебного экрана не стоит: причина уезжает в сам файл.
    console.warn(
      `changelog: разобрано ${commits.length} записей при ${expected} коммитах в HEAD.`,
    );
  }
  const packageVersion = JSON.parse(
    readFileSync(join(root, 'app', 'package.json'), 'utf8'),
  ).version;
  const payload = buildChangelog({
    commits,
    bumps: versionBumps(),
    cards: boardCards(),
    tasks: taskFiles(),
    head: git(['rev-parse', 'HEAD']).trim(),
    version: packageVersion,
  });
  if (commits.length !== expected) {
    payload.unavailable = `Разбор неполон: ${commits.length} записей при ${expected} коммитах в HEAD.`;
  }
  write(payload);
  const size = existsSync(out) ? readFileSync(out).length : 0;
  console.log(
    `changelog: ${payload.total} изменений, ${payload.groups.length} групп по версиям, ${Math.round(size / 1024)} КБ`,
  );
} catch (error) {
  const reason = `история не разобралась: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`;
  write(unavailableChangelog(reason));
  console.warn(`changelog: ${reason}`);
  process.exit(0);
}
