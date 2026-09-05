#!/usr/bin/env node
/**
 * Отстаёт ли прод от main.
 *
 * Зачем это существует. К концу августа 2026 по репозиторию прошло четыре сессии
 * подряд, каждая закончилась словами «осталось владельцу: запушить», и ни одна не была
 * причиной беспорядка сама по себе. Причина была в том, что между «код готов и
 * провалидирован» и «это в main и на проде» не стояло ни одной автоматической проверки —
 * только память человека. 27.08.2026 живой habitoff.ru отдавал заголовок «ALIVE», хотя
 * ребрендинг лежал в main уже сутки, и обнаружилось это тем, что кто-то открыл сайт.
 *
 * Что делает: берёт коммит живой сборки из <origin>/version.json и сравнивает с
 * origin/main. Совпало — молчит и выходит нулём. Не совпало — печатает, на сколько
 * коммитов и на какие именно прод отстал, и выходит единицей.
 *
 * Как пользоваться:
 *   node scripts/check-deploy-drift.mjs                  # против https://habitoff.ru
 *   node scripts/check-deploy-drift.mjs http://localhost:4173
 *
 * Ограничение, которое надо знать: сборка старше 27.08.2026 не отдаёт /version.json
 * вовсе. Отсутствие файла здесь — это тоже расхождение, и оно так и трактуется.
 */
import { execFileSync } from 'node:child_process';

const origin = (process.argv[2] ?? 'https://habitoff.ru').replace(/\/+$/, '');
const REF = process.env.DRIFT_REF ?? 'origin/main';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

let head;
// DRIFT_NO_FETCH — для мониторинга. Проверка на сервере идёт от root, а клон
// принадлежит пользователю выкладки: `git fetch` от root оставил бы в `.git` файлы с
// чужим владельцем и уронил бы следующую выкладку на `git pull`. Ссылки там обновляет
// сам владелец каталога, до вызова этого скрипта — см. infra/monitoring/lib/fingerprint.sh.
if (!process.env.DRIFT_NO_FETCH) {
  try {
    git('fetch', '--quiet', 'origin', 'main');
  } catch {
    console.warn('Не удалось обновить origin/main — сравниваю с тем, что уже есть локально.');
  }
}
try {
  head = git('rev-parse', REF);
} catch {
  fail(`Не нашёл ${REF}. Запускать из репозитория Habitoff.`);
}

let live;
let body;
try {
  const response = await fetch(`${origin}/version.json`, { cache: 'no-store' });
  if (!response.ok) {
    fail(
      `РАСХОЖДЕНИЕ: ${origin}/version.json отвечает ${response.status}. Прод собран до появления отпечатка — выкладка не запускалась.`,
    );
  }
  body = await response.text();
} catch (error) {
  fail(
    `Не смог достучаться до ${origin}/version.json: ${error instanceof Error ? error.message : error}`,
  );
}

try {
  live = JSON.parse(body);
} catch {
  // Caddy отдаёт index.html на любой неизвестный путь — так устроено одностраничное
  // приложение. Значит сборка старше 27.08.2026 и version.json в ней просто нет.
  // Это расхождение, а не поломка проверки, и говорить об этом надо словами, а не
  // ошибкой парсера JSON.
  const looksLikeHtml = body.trimStart().slice(0, 9).toLowerCase() === '<!doctype';
  fail(
    [
      'РАСХОЖДЕНИЕ: прод не отдаёт version.json.',
      looksLikeHtml
        ? `  ${origin}/version.json вернул HTML — это index.html, подставленный на неизвестный путь.`
        : `  ${origin}/version.json вернул не JSON: ${body.slice(0, 80)}`,
      '  Значит живая сборка сделана до того, как появился отпечаток, и выкладка с текущего main не запускалась.',
      '',
      'Лечится передеплоем: ssh alive@habitoff.ru, затем',
      '  cd /srv/alive/repo && git checkout main && git fetch origin && git merge --ff-only origin/main && /srv/alive/deploy.sh',
    ].join('\n'),
  );
}

const liveCommit = String(live.commit ?? '');
if (!liveCommit) {
  fail(`${origin}/version.json не содержит коммита. Собрано без отпечатка — считаю расхождением.`);
}

if (liveCommit === head) {
  console.log(`Совпадает: прод и ${REF} на ${head.slice(0, 7)} (версия ${live.version ?? '—'}).`);
  process.exit(0);
}

let behind = '?';
let commits = '';
try {
  behind = git('rev-list', '--count', `${liveCommit}..${head}`);
  commits = git('log', '--oneline', `${liveCommit}..${head}`);
} catch {
  commits = 'Коммита прода нет в этом клоне — сделайте git fetch.';
}

console.error(
  [
    `РАСХОЖДЕНИЕ: прод отстаёт от ${REF} на ${behind} коммит(ов).`,
    `  прод: ${liveCommit.slice(0, 7)} (версия ${live.version ?? '—'}, собран ${live.builtAt ?? '—'})`,
    `  ${REF}: ${head.slice(0, 7)}`,
    '',
    commits,
    '',
    'Лечится передеплоем: ssh alive@habitoff.ru, затем',
    '  cd /srv/alive/repo && git checkout main && git fetch origin && git merge --ff-only origin/main && /srv/alive/deploy.sh',
  ].join('\n'),
);
process.exit(1);
