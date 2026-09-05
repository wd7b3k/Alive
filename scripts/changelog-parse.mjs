/**
 * Разбор истории репозитория в список изменений. Чистая часть: ни одного обращения к
 * диску, к сети и к `git`.
 *
 * Она отделена от `build-changelog.mjs` ровно затем, чтобы её можно было проверить на
 * фикстуре. Разбор вывода `git log` — то место, где ошибка не падает, а тихо теряет
 * коммиты: сообщение с пустой строкой, слияние без файлов, тело с кавычками. Такое
 * ловится тестом на заранее записанном выводе, а не глазами на трёхстах записях.
 *
 * Зависимостей нет намеренно: скрипт запускается перед сборкой, в том числе в CI, где
 * `npm ci` для него не делается.
 */

/** Разделитель записей и полей. Управляющие символы в сообщениях коммитов не встречаются. */
export const RECORD = '\u001e';
export const UNIT = '\u001f';

/**
 * Формат одного вызова `git log`.
 *
 * `%P` — список родителей: по числу родителей отличается слияние, и это надёжнее, чем
 * угадывание по слову «Merge» в заголовке. Список файлов приезжает после последнего
 * разделителя полей, потому что `--name-only` печатает его следом за форматом.
 */
export const LOG_FORMAT = `${RECORD}%H${UNIT}%h${UNIT}%aI${UNIT}%an${UNIT}%P${UNIT}%s${UNIT}%b${UNIT}`;

/** Темы направлений. Тот же список, что `docs/tasks/README.md` и `epic` на доске. */
export const THEMES = [
  'infra',
  'process',
  'design',
  'content',
  'pilot',
  'seo',
  'brand',
  'perf',
  'release',
  'auth',
  'flow',
  'privacy',
  'money',
  'legal',
  'knowledge',
  'social',
];

/**
 * Путь → тема. Первое совпадение выигрывает, поэтому порядок от частного к общему.
 *
 * Это эвристика, а не факт: каталог не обязан совпадать с направлением работы, и один
 * коммит нередко трогает два. Экран так её и называет. Достоверной тема считается
 * только там, где у коммита есть карточка доски — у карточки направление проставлено
 * человеком.
 */
export const THEME_BY_PATH = [
  ['docs/ai_sessions/', 'process'],
  ['docs/board/', 'process'],
  ['docs/tasks/', 'process'],
  ['docs/decisions/', 'process'],
  ['docs/DESIGN_SYSTEM', 'design'],
  ['docs/SCREENS', 'design'],
  ['docs/V3_', 'design'],
  ['docs/BRANDBOOK', 'brand'],
  ['docs/TONE_OF_VOICE', 'content'],
  ['docs/GLOSSARY', 'content'],
  ['docs/SEO_', 'seo'],
  ['docs/METRICS', 'seo'],
  ['docs/HYPOTHESES', 'seo'],
  ['docs/PRIVACY_AND_DATA', 'privacy'],
  ['docs/AUTH_PROVIDERS', 'auth'],
  ['docs/INFRASTRUCTURE_STATE', 'infra'],
  ['docs/RUNBOOK_ALERTS', 'infra'],
  ['docs/ROLLOUT', 'infra'],
  ['docs/RELEASE_POLICY', 'release'],
  ['docs/PRODUCTION_READINESS', 'pilot'],
  ['docs/ARCHITECTURE', 'perf'],
  ['docs/MODULES', 'perf'],
  ['docs/METHODOLOGY', 'knowledge'],
  ['docs/SOURCE_REGISTER', 'knowledge'],
  ['docs/ORIGINS', 'knowledge'],
  ['docs/PRODUCT_PRINCIPLES', 'flow'],
  ['docs/', 'process'],
  ['releases/', 'release'],
  ['infra/', 'infra'],
  ['supabase/', 'infra'],
  ['.github/', 'process'],
  ['scripts/', 'process'],
  ['app/src/assets/', 'brand'],
  ['app/public/', 'brand'],
  ['app/src/redesign.css', 'design'],
  ['app/src/styles.css', 'design'],
  ['app/src/visual-', 'design'],
  ['app/src/modules/analytics/', 'seo'],
  ['app/src/modules/monitoring/', 'infra'],
  ['app/src/services/seo', 'seo'],
  ['app/src/services/prerender', 'seo'],
  ['app/src/services/schema', 'seo'],
  ['app/src/services/counters', 'seo'],
  ['app/src/services/knowledge-catalog', 'knowledge'],
  ['app/src/auth-providers', 'auth'],
  ['app/src/domain/', 'flow'],
  ['app/src/redesign/', 'flow'],
  ['app/src/', 'flow'],
  ['app/', 'perf'],
  ['AGENTS.md', 'process'],
  ['CLAUDE.md', 'process'],
  ['BACKLOG.md', 'process'],
  ['README.md', 'process'],
];

/** Типы изменения. Порядок — тот, в котором они полезны читателю. */
export const KINDS = ['feature', 'fix', 'docs', 'infra', 'merge'];

/** Тип карточки доски → тип изменения. Карточку заполнял человек, ей верим. */
const KIND_BY_CARD_TYPE = {
  feature: 'feature',
  bug: 'fix',
  docs: 'docs',
  research: 'docs',
  infra: 'infra',
  tech: 'infra',
};

/** Глаголы починки в заголовке. Только те, что действительно встречаются в этой истории. */
const FIX_WORDS =
  /(^|\W)(fix|hotfix|почин|исправ|чинит|лечит|перестал|переста[её]т|больше не|падал|ломал|разъеха|устаре|не даёт|не отдаёт|не работал|молча)/i;

export function themeOf(path) {
  for (const [prefix, theme] of THEME_BY_PATH) {
    if (path.startsWith(prefix)) return theme;
  }
  return null;
}

/**
 * Тема коммита — та, за которую проголосовало больше путей.
 *
 * Не «первый попавшийся файл»: коммит, который правит один документ и восемь файлов
 * кода, — про код. При равенстве голосов выигрывает более ранний путь в списке файлов:
 * так результат не зависит от порядка обхода объекта.
 */
export function themeFor(paths) {
  const votes = new Map();
  for (const path of paths) {
    const theme = themeOf(path);
    if (!theme) continue;
    if (!votes.has(theme)) votes.set(theme, 0);
    votes.set(theme, votes.get(theme) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [theme, count] of votes) {
    if (count > bestCount) {
      best = theme;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Тип изменения. Достоверен только с карточкой доски; всё остальное — догадка по путям
 * и заголовку, и она помечается на экране как догадка.
 */
export function kindFor({ paths = [], subject = '', merge = false, cardType = null }) {
  if (merge) return { kind: 'merge', confident: true };
  if (cardType && KIND_BY_CARD_TYPE[cardType]) {
    return { kind: KIND_BY_CARD_TYPE[cardType], confident: true };
  }
  if (FIX_WORDS.test(subject)) return { kind: 'fix', confident: false };
  const code = paths.filter((path) => path.startsWith('app/') || path.startsWith('supabase/'));
  if (code.length === 0 && paths.length > 0) {
    const ops = paths.filter(
      (path) =>
        path.startsWith('infra/') || path.startsWith('scripts/') || path.startsWith('.github/'),
    );
    return { kind: ops.length > 0 ? 'infra' : 'docs', confident: false };
  }
  return { kind: 'feature', confident: false };
}

/** `Board: done <id>` в теле. Берётся первый: карточка у коммита одна. */
export function cardIdFrom(body) {
  const match = body.match(/^\s*Board:\s+(?:done|doing|new)\s+([a-z0-9-]+)/im);
  return match ? match[1] : null;
}

/** `Merge pull request #NN` в заголовке слияния. */
export function prFrom(subject) {
  const match = subject.match(/Merge pull request #(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Файл постановки, упомянутый в сообщении. Проверяется по списку существующих: ссылка на
 * файл, которого нет, хуже отсутствия ссылки.
 */
export function taskFrom(text, knownTasks) {
  const mentions = text.match(/docs\/tasks\/[TR]-[0-9A-Za-z._-]+\.md/g) ?? [];
  for (const mention of mentions) {
    if (knownTasks.includes(mention)) return mention;
  }
  return null;
}

/** Каталоги, которых коснулся коммит. Файлов бывает сотня, каталогов — единицы. */
export function dirsOf(paths) {
  const dirs = new Set();
  for (const path of paths) {
    const cut = path.lastIndexOf('/');
    dirs.add(cut === -1 ? '.' : path.slice(0, cut + 1));
  }
  return [...dirs].sort();
}

/**
 * Разбор вывода `git log --name-only` с форматом `LOG_FORMAT`.
 *
 * Поля берутся с начала записи, список файлов — с конца. Так разбор переживает и
 * разделитель полей, случайно оказавшийся внутри тела сообщения, и пустое тело.
 */
export function parseLog(raw) {
  return raw
    .split(RECORD)
    .slice(1)
    .map((chunk) => {
      const parts = chunk.split(UNIT);
      const [sha, short, date, author, parents, subject] = parts;
      const body = parts.slice(6, -1).join(UNIT).trim();
      const paths = (parts[parts.length - 1] ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      return {
        sha,
        short,
        date,
        author,
        subject: subject ?? '',
        body,
        paths,
        merge: (parents ?? '').trim().split(/\s+/).filter(Boolean).length > 1,
      };
    });
}

/**
 * Версия каждого коммита.
 *
 * Правило: **номер закрывает версию.** Коммит, поднявший `version` в `package.json`,
 * и всё, что было до него со времени предыдущего поднятия, относятся к новому номеру.
 * Всё, что легло после последнего поднятия, номера своего не получило — это `null`, на
 * экране «Не выпущено».
 *
 * «Не выпущено» здесь не значит «не на проде»: эти коммиты уехали в сборках с прежним
 * номером. Значит оно ровно то, что сказано, — под них номер не поднимали. Раздел
 * говорит это словами, потому что иначе строка читается наоборот.
 *
 * Коммиты старше самого первого поднятия относятся к самому раннему известному номеру:
 * до появления `package.json` версии не было, но выкинуть их из списка нельзя.
 *
 * Сравнение идёт по положению в списке `git log`, а не обходом графа: список упорядочен
 * по дате, и для этой истории это то же самое. Точный ответ потребовал бы `git rev-list`
 * на каждое поднятие — три сотни лишних вызовов ради совпадающего результата.
 */
export function assignVersions(commits, bumps) {
  const positionOf = new Map(commits.map((commit, index) => [commit.sha, index]));
  // Положение считается от новых к старым: 0 — HEAD.
  const marks = bumps
    .map((bump) => ({ ...bump, at: positionOf.get(bump.sha) }))
    .filter((bump) => bump.at !== undefined)
    .sort((a, b) => a.at - b.at);
  const oldest = marks[marks.length - 1];
  return commits.map((commit, index) => {
    if (marks.length === 0) return { ...commit, version: null };
    if (index < marks[0].at) return { ...commit, version: null };
    const mark = marks.find((candidate) => candidate.at >= index) ?? oldest;
    return { ...commit, version: mark.version };
  });
}

/**
 * Собрать файл раздела. Ничего не читает: и коммиты, и поднятия версии, и карточки
 * приходят снаружи.
 */
export function buildChangelog({
  commits,
  bumps = [],
  cards = [],
  tasks = [],
  head = '',
  version = '',
  generatedAt = new Date().toISOString(),
}) {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const withVersion = assignVersions(commits, bumps);

  const entries = withVersion.map((commit) => {
    const cardId = cardIdFrom(commit.body);
    const card = cardId ? (cardById.get(cardId) ?? null) : null;
    const { kind, confident } = kindFor({
      paths: commit.paths,
      subject: commit.subject,
      merge: commit.merge,
      cardType: card?.type ?? null,
    });
    const theme = card?.epic ?? themeFor(commit.paths);
    return {
      sha: commit.sha,
      short: commit.short,
      date: commit.date,
      author: commit.author,
      subject: commit.subject,
      body: commit.body,
      dirs: dirsOf(commit.paths),
      files: commit.paths.length,
      theme,
      themeConfident: Boolean(card?.epic),
      kind,
      kindConfident: confident,
      card: card ? { id: card.id, title: card.title, epic: card.epic ?? null } : null,
      cardId: cardId && !card ? cardId : null,
      task: taskFrom(`${commit.subject}\n${commit.body}`, tasks),
      pr: prFrom(commit.subject),
      migration: commit.paths.some((path) => path.startsWith('supabase/migrations/')),
      merge: commit.merge,
      version: commit.version,
    };
  });

  const order = [];
  const byVersion = new Map();
  for (const entry of entries) {
    const key = entry.version ?? '';
    if (!byVersion.has(key)) {
      byVersion.set(key, []);
      order.push(key);
    }
    byVersion.get(key).push(entry);
  }

  const groups = order.map((key) => {
    const list = byVersion.get(key);
    const dates = list.map((entry) => entry.date).sort();
    return {
      version: key || null,
      count: list.length,
      migrations: list.filter((entry) => entry.migration).length,
      from: dates[0] ?? null,
      to: dates[dates.length - 1] ?? null,
      entries: list,
    };
  });

  return { generatedAt, head, version, total: entries.length, unavailable: null, groups };
}

/** Файл, который раздел получит, если git при сборке недоступен. */
export function unavailableChangelog(reason, generatedAt = new Date().toISOString()) {
  return {
    generatedAt,
    head: '',
    version: '',
    total: 0,
    unavailable: reason,
    groups: [],
  };
}
