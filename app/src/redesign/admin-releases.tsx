import { useEffect, useMemo, useState } from 'react';

import { buildInfo } from '../env';
import { reportError } from '../services/error-monitoring';
import rawChangelog from '../generated/changelog.json';

/**
 * Раздел «Что сделано»: всё, что уехало на прод, со ссылкой на коммит.
 *
 * Зачем он есть. Ответ на вопрос «что уже внедрено» собирался из записей сессий,
 * карточек доски и памяти, и эти три источника расходились между собой: про бэкапы за
 * четыре дня в репозитории лежало три несовместимых утверждения. Здесь ответ считается
 * из git и ниоткуда больше.
 *
 * ИСКЛЮЧЕНИЕ ИЗ ПРАВИЛА `admin_*`. `docs/ADMIN.md` требует, чтобы блок админки брал
 * данные через RPC вида `admin_*`, которая сама отказывает не-администратору. Этот блок
 * так не делает, и это осознанное исключение: данных нет в базе — источник целиком
 * лежит в репозитории. Список собирается на сборке скриптом `scripts/build-changelog.mjs`
 * в `src/generated/changelog.json` и попадает в чанк админки. Правило не обходится
 * молча: решение, границы и принятый риск — `docs/decisions/ADR-0018-changelog-from-git.md`.
 *
 * Что здесь эвристика. Тема и тип изменения выведены из путей и заголовка, и рядом с
 * ними стоит пометка «догадка». Достоверны они только там, где у коммита есть карточка
 * доски: у карточки направление и тип проставлены человеком. Правило `AGENTS.md` —
 * эвристика называется эвристикой, а не выдаётся за факт.
 *
 * Чего этот раздел не знает. Он показывает историю той сборки, в которой открыт, —
 * значит ровно то, что на проде. Коммиты, влитые в main позже, сюда не попадают по
 * построению; сверка main и прода — `node scripts/check-deploy-drift.mjs`.
 *
 * Корень — `section`, а не `main`: оболочка админки уже открыла `main`.
 */

/**
 * Адрес репозитория. Одно значение на весь раздел, а не строка в разметке.
 *
 * В GitHub API из браузера раздел не ходит и ходить не будет: репозиторий приватный,
 * токену в клиенте не место, и инвариант `AGENTS.md` «никаких внешних сервисов в
 * рантайме» здесь в силе. Ссылки статические — их открывает человек, а не страница.
 */
export const REPO_URL = (
  import.meta.env.VITE_REPO_URL?.trim() || 'https://github.com/wd7b3k/Alive'
).replace(/\/+$/, '');

type Entry = {
  sha: string;
  short: string;
  date: string;
  author: string;
  subject: string;
  body: string;
  dirs: string[];
  files: number;
  theme: string | null;
  themeConfident: boolean;
  kind: string;
  kindConfident: boolean;
  card: { id: string; title: string; epic: string | null } | null;
  cardId: string | null;
  task: string | null;
  pr: number | null;
  migration: boolean;
  merge: boolean;
  version: string | null;
};

type Group = {
  version: string | null;
  count: number;
  migrations: number;
  from: string | null;
  to: string | null;
  entries: Entry[];
};

type Changelog = {
  generatedAt: string;
  head: string;
  version: string;
  total: number;
  unavailable: string | null;
  groups: Group[];
};

const changelog = rawChangelog as unknown as Changelog;

const KIND_LABEL: Record<string, string> = {
  feature: 'появилось',
  fix: 'починено',
  docs: 'документация',
  infra: 'инфраструктура',
  merge: 'слияние',
};

/**
 * Направления по-русски.
 *
 * Список тем задан `docs/tasks/README.md`, но у коммита с карточкой направление берётся
 * из `epic` доски, а там список свой: в нём нет `money`, `legal`, `knowledge` и `social`,
 * зато есть `next`. Расхождение заведено карточкой; пока оно есть, здесь названы оба
 * набора — иначе на служебном экране появилась бы латиница, чего в надписях быть не
 * должно.
 */
const THEME_LABEL: Record<string, string> = {
  next: 'дальнейшее',
  infra: 'инфраструктура',
  process: 'процесс',
  design: 'дизайн',
  content: 'тексты',
  pilot: 'пилот',
  seo: 'аналитика и поиск',
  brand: 'бренд',
  perf: 'производительность',
  release: 'релизы',
  auth: 'вход',
  flow: 'сценарии',
  privacy: 'приватность',
  money: 'деньги',
  legal: 'право',
  knowledge: 'знание',
  social: 'сообщество',
};

function day(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function label(map: Record<string, string>, key: string | null): string {
  if (!key) return '—';
  return map[key] ?? key;
}

/**
 * Сверка открытой страницы с тем, что отдаёт сервер.
 *
 * Уникальный параметр строки запроса и `no-store` обязательны: 27.08.2026 кэш на пути
 * запроса отдавал сборку семичасовой давности, и проверка «свежее ли это» отвечала на
 * вопрос вчерашним ответом.
 */
function useLiveCommit(): { commit: string | null; failed: boolean } {
  const [commit, setCommit] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('нет файла'))))
      .then((body: { commit?: string }) => {
        if (!cancelled) setCommit(String(body.commit ?? ''));
      })
      .catch((error: unknown) => {
        reportError(error, { surface: 'admin-releases' });
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { commit, failed };
}

/**
 * Фильтры живут в адресе строки запроса.
 *
 * Смысл ровно один: отобранное можно переслать себе же — в задачу, в запись сессии, в
 * соседнюю вкладку. Адрес правится через `replaceState`, а не переходом: у раздела нет
 * своей истории, и кнопка «назад» должна уводить из админки, а не отматывать фильтры.
 */
type Filters = { theme: string; kind: string; migration: boolean; query: string };

const EMPTY: Filters = { theme: '', kind: '', migration: false, query: '' };

function readFilters(): Filters {
  if (typeof window === 'undefined') return EMPTY;
  const params = new URLSearchParams(window.location.search);
  return {
    theme: params.get('theme') ?? '',
    kind: params.get('kind') ?? '',
    migration: params.get('mig') === '1',
    query: params.get('q') ?? '',
  };
}

function writeFilters(filters: Filters): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const set = (key: string, value: string) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };
  set('theme', filters.theme);
  set('kind', filters.kind);
  set('mig', filters.migration ? '1' : '');
  set('q', filters.query);
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}`,
  );
}

function Links({ entry }: { entry: Entry }) {
  return (
    <>
      <a
        className="r-releases-sha"
        href={`${REPO_URL}/commit/${entry.sha}`}
        target="_blank"
        rel="noreferrer"
        title="Открыть коммит на GitHub"
      >
        {entry.short}
      </a>
      {entry.pr !== null && (
        <a
          className="r-releases-link"
          href={`${REPO_URL}/pull/${entry.pr}`}
          target="_blank"
          rel="noreferrer"
        >
          PR #{entry.pr}
        </a>
      )}
      {entry.card && (
        <a
          className="r-releases-link"
          href={`${REPO_URL}/blob/main/docs/board/cards.json`}
          target="_blank"
          rel="noreferrer"
          title={entry.card.title}
        >
          карточка {entry.card.id}
        </a>
      )}
      {entry.task && (
        <a
          className="r-releases-link"
          href={`${REPO_URL}/blob/main/${entry.task}`}
          target="_blank"
          rel="noreferrer"
        >
          постановка
        </a>
      )}
    </>
  );
}

function Row({ entry }: { entry: Entry }) {
  return (
    <details className="r-releases-row">
      <summary>
        <span className={`r-releases-kind kind-${entry.kind}`}>
          {label(KIND_LABEL, entry.kind)}
          {!entry.kindConfident && <i title="Догадка по путям и заголовку, а не факт">?</i>}
        </span>
        <span className="r-releases-theme">
          {label(THEME_LABEL, entry.theme)}
          {entry.theme && !entry.themeConfident && (
            <i title="Догадка по изменённым путям, а не факт">?</i>
          )}
        </span>
        <span className="r-releases-subject">{entry.subject}</span>
        {entry.migration && <b className="r-releases-migration">миграция</b>}
        <span className="r-releases-date">{day(entry.date)}</span>
      </summary>
      <div className="r-releases-body">
        {entry.body ? <pre>{entry.body}</pre> : <p className="r-muted">Тело сообщения пустое.</p>}
        <p className="r-releases-dirs">
          {entry.dirs.length > 0 ? (
            <>
              Затронуто каталогов: {entry.dirs.length}, файлов: {entry.files} —{' '}
              <code>{entry.dirs.join(' ')}</code>
            </>
          ) : (
            'Своих изменений у коммита нет: это слияние, и содержимое лежит в коммитах ветки.'
          )}
        </p>
        <p className="r-releases-links">
          <Links entry={entry} />
          <span className="r-releases-author">{entry.author}</span>
        </p>
        {entry.cardId && (
          <p className="r-muted">
            Трейлер указывает на карточку <code>{entry.cardId}</code>, которой нет в
            <code> docs/board/cards.json</code>.
          </p>
        )}
      </div>
    </details>
  );
}

function GroupHead({ group }: { group: Group }) {
  return (
    <header className="r-releases-group">
      <h3>{group.version ?? 'Не выпущено'}</h3>
      <p>
        {group.count} {group.count === 1 ? 'изменение' : 'изменений'}
        {group.migrations > 0 && `, миграций ${group.migrations}`} · {day(group.from)} —{' '}
        {day(group.to)}
      </p>
      {group.version === null && (
        <p className="r-releases-note">
          Эти изменения уехали на прод в сборках с прежним номером — номер версии под них не
          поднимали. «Не выпущено» здесь значит только это, а не «нет на сервере».
        </p>
      )}
    </header>
  );
}

export function AdminReleases() {
  const [filters, setFilters] = useState<Filters>(readFilters);
  const live = useLiveCommit();

  useEffect(() => {
    writeFilters(filters);
  }, [filters]);

  const themes = useMemo(() => {
    const found = new Set<string>();
    for (const group of changelog.groups) {
      for (const entry of group.entries) if (entry.theme) found.add(entry.theme);
    }
    return [...found].sort((a, b) => label(THEME_LABEL, a).localeCompare(label(THEME_LABEL, b)));
  }, []);

  // Шапка группы считается по отобранному, а не по исходному: «12 изменений» над тремя
  // строками — это не заголовок, а опечатка, которую никто не заметит.
  const groups = useMemo(() => {
    const needle = filters.query.trim().toLowerCase();
    return changelog.groups
      .map((group) => {
        const entries = group.entries.filter((entry) => {
          if (filters.theme && entry.theme !== filters.theme) return false;
          if (filters.kind && entry.kind !== filters.kind) return false;
          if (filters.migration && !entry.migration) return false;
          if (!needle) return true;
          return `${entry.subject}\n${entry.body}`.toLowerCase().includes(needle);
        });
        const dates = entries.map((entry) => entry.date).sort();
        return {
          ...group,
          entries,
          count: entries.length,
          migrations: entries.filter((entry) => entry.migration).length,
          from: dates[0] ?? null,
          to: dates[dates.length - 1] ?? null,
        };
      })
      .filter((group) => group.entries.length > 0);
  }, [filters]);

  const shown = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const filtered = Boolean(filters.theme || filters.kind || filters.migration || filters.query);
  const mismatch =
    live.commit && changelog.head && live.commit !== changelog.head ? live.commit : null;

  return (
    <section className="r-releases">
      <div className="r-releases-head">
        <p className="r-kicker">Служебное</p>
        <h2>Что сделано</h2>
        <p className="r-lead">
          Вся история репозитория, разобранная на сборке: заголовок, дата, коммит и всё, на что он
          ссылается. Источник один — git, поэтому список не может разойтись с кодом, из которого
          собран. Это единственный раздел админки, который не ходит в базу: данных о работах в базе
          нет. Решение и его границы — ADR-0018.
        </p>
      </div>

      {changelog.unavailable ? (
        <>
          <p className="r-muted">История не разобрана. Причина:</p>
          <p className="r-muted">
            <code>{changelog.unavailable}</code>
          </p>
          <p className="r-muted">
            Список не пуст — его нечем посчитать. Сборка шла там, где git недоступен;
            <code> node scripts/build-changelog.mjs</code> в клоне репозитория собирает файл заново.
          </p>
        </>
      ) : (
        <>
          <p className="r-releases-stamp">
            Сборка {changelog.version || buildInfo.version || '—'} ·{' '}
            <code>{changelog.head.slice(0, 7) || '—'}</code> · разобрано{' '}
            {day(changelog.generatedAt)} · изменений {changelog.total}
          </p>

          {mismatch && (
            <p className="r-releases-warn">
              Открыта не та сборка, что отдаёт сервер: <code>{changelog.head.slice(0, 7)}</code>{' '}
              против <code>{mismatch.slice(0, 7)}</code>. Обновите страницу.
            </p>
          )}
          {live.failed && (
            <p className="r-muted">
              Отпечаток сервера не прочитался: <code>/version.json</code> не ответил. Сверить, что
              открыто, не с чем.
            </p>
          )}

          <p className="r-releases-limit">
            Здесь видно ровно то, что на проде: раздел показывает историю собственной сборки.
            Коммиты, влитые в main после неё, сюда не попадают по построению — на вопрос «отстал ли
            прод от main» отвечает <code>node scripts/check-deploy-drift.mjs</code>.
          </p>

          <div className="r-releases-filters">
            <label>
              <span>Направление</span>
              <select
                value={filters.theme}
                onChange={(event) => setFilters({ ...filters, theme: event.target.value })}
              >
                <option value="">любое</option>
                {themes.map((theme) => (
                  <option key={theme} value={theme}>
                    {label(THEME_LABEL, theme)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Тип</span>
              <select
                value={filters.kind}
                onChange={(event) => setFilters({ ...filters, kind: event.target.value })}
              >
                <option value="">любой</option>
                {Object.entries(KIND_LABEL).map(([kind, text]) => (
                  <option key={kind} value={kind}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <label className="r-releases-check">
              <input
                type="checkbox"
                checked={filters.migration}
                onChange={(event) => setFilters({ ...filters, migration: event.target.checked })}
              />
              <span>только миграции</span>
            </label>
            <label className="r-releases-search">
              <span>Поиск</span>
              <input
                type="search"
                value={filters.query}
                placeholder="по заголовку и телу"
                onChange={(event) => setFilters({ ...filters, query: event.target.value })}
              />
            </label>
            {filtered && (
              <button type="button" onClick={() => setFilters(EMPTY)}>
                Снять отбор
              </button>
            )}
          </div>

          <p className="r-releases-count">
            {filtered ? `Отобрано ${shown} из ${changelog.total}` : `Всего ${changelog.total}`} ·
            направление и тип у изменения без карточки доски помечены знаком вопроса: это догадка по
            путям и заголовку, а не факт.
          </p>

          {shown === 0 ? (
            <p className="r-muted">Под этот отбор не попало ни одного изменения.</p>
          ) : (
            groups.map((group) => (
              <div key={group.version ?? 'unreleased'} className="r-releases-block">
                <GroupHead group={group} />
                {group.entries.map((entry) => (
                  <Row key={entry.sha} entry={entry} />
                ))}
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}
