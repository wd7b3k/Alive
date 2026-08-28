import { useMemo, useState } from 'react';
import boardData from '../../../docs/board/cards.json';
import overridesData from '../../../docs/board/overrides.json';
import { Icon } from '../ui-icons';

/**
 * Доска работ. Только чтение.
 *
 * Источник — `docs/board/cards.json` в репозитории; страница подставляет его на сборке.
 * Карточку двигает коммит с трейлером `Board:`, а не мышка: так у закрытой карточки
 * всегда есть чем подтвердить, что она закрыта, — ссылка на коммит, а не слово
 * «сделано». Порядок — `docs/board/README.md`, решение — ADR-0012.
 *
 * Здесь намеренно нет перетаскивания и нет состояния в браузере. Прежняя доска жила
 * артефактом и хранила ручные правки у себя; после переезда правки живут в
 * `docs/board/overrides.json`, то есть правка — это коммит. Дать редактировать на
 * странице значило бы завести второй источник истины, который через неделю разойдётся
 * с репозиторием. AGENTS.md на этот счёт однозначен.
 */

type Card = {
  id: string;
  title: string;
  type: string;
  epic: string;
  priority: number;
  status: string;
  body?: string;
  updated?: string;
  tags?: string[];
  deps?: string;
  docs?: { label: string; path: string }[];
  commits?: string[];
};

type Named = { id: string; name: string };
type Board = {
  repo: string;
  headline?: string;
  lede?: string;
  appliedCommit?: string;
  columns: (Named & { hint?: string })[];
  types: Named[];
  tags: Named[];
  epics: (Named & { about?: string; release?: string })[];
  cards: Card[];
};

type Override = { status?: string; priority?: number; at?: string };
type Overrides = { o?: Record<string, Override>; c?: Card[] };

const board = boardData as unknown as Board;
const overrides = overridesData as unknown as Overrides;

/**
 * Слияние правок с репозиторием.
 *
 * Правило одно и объяснимое: правка побеждает, пока репозиторий не сказал новее. Если
 * карточка в `cards.json` обновлена позже даты правки, берём репозиторий — иначе
 * закрытая коммитом карточка висела бы в «В работе» из-за забытого перетаскивания.
 */
function merged(): Card[] {
  const map = overrides.o ?? {};
  const base = board.cards.map((card) => {
    const patch = map[card.id];
    if (!patch) return card;
    const repoNewer = (card.updated ?? '') > (patch.at ?? '');
    if (repoNewer) return card;
    return {
      ...card,
      status: patch.status ?? card.status,
      priority: patch.priority ?? card.priority,
    };
  });
  return [...base, ...(overrides.c ?? [])];
}

const nameOf = (list: Named[], id: string) => list.find((x) => x.id === id)?.name ?? id;

function CardView({ card }: { card: Card }) {
  const [open, setOpen] = useState(false);
  const commits = card.commits ?? [];
  return (
    <article className={`r-board-card p${card.priority}`}>
      <header>
        <em>P{card.priority}</em>
        <span>{nameOf(board.types, card.type)}</span>
        {(card.tags ?? []).map((t) => (
          <b key={t}>{nameOf(board.tags, t)}</b>
        ))}
      </header>
      <h4>{card.title}</h4>
      <p className="r-board-epic">{nameOf(board.epics, card.epic)}</p>
      {card.body && (
        <p className={open ? 'r-board-body open' : 'r-board-body'} onClick={() => setOpen(!open)}>
          {card.body}
        </p>
      )}
      {card.deps && <p className="r-board-dep">Зависит: {card.deps}</p>}
      {(card.docs?.length || commits.length) > 0 && (
        <footer>
          {card.docs?.map((d) => (
            <a
              key={d.path}
              href={`${board.repo}/blob/main/${d.path}`}
              target="_blank"
              rel="noreferrer"
            >
              {d.label}
            </a>
          ))}
          {commits.map((sha) => (
            <a
              key={sha}
              className="sha"
              href={`${board.repo}/commit/${sha}`}
              target="_blank"
              rel="noreferrer"
            >
              {sha.slice(0, 7)}
            </a>
          ))}
        </footer>
      )}
    </article>
  );
}

export function AdminBoard() {
  const cards = useMemo(() => merged(), []);
  const [epic, setEpic] = useState('');
  const [query, setQuery] = useState('');

  const shown = cards.filter((c) => {
    if (epic && c.epic !== epic) return false;
    if (!query) return true;
    const hay = `${c.title} ${c.body ?? ''} ${c.id}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  const open = shown.filter((c) => c.status !== 'done').length;

  return (
    <section className="r-board">
      <div className="r-board-head">
        <p className="r-board-count">
          {shown.length} карточек, открытых {open}
        </p>
        <input
          type="search"
          value={query}
          placeholder="Поиск по карточкам"
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={epic} onChange={(e) => setEpic(e.target.value)}>
          <option value="">Все эпики</option>
          {board.epics.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      <p className="r-board-note">
        <Icon name="shield" size={16} />
        Только чтение. Карточку двигает коммит с трейлером <code>Board:</code> — порядок в{' '}
        <a href={`${board.repo}/blob/main/docs/board/README.md`} target="_blank" rel="noreferrer">
          docs/board/README.md
        </a>
        .
      </p>
      <div className="r-board-columns">
        {board.columns.map((col) => {
          const list = shown.filter((c) => c.status === col.id);
          return (
            <section key={col.id} className="r-board-column">
              <header>
                <h3>{col.name}</h3>
                <span>{list.length}</span>
              </header>
              {col.hint && <p className="r-board-hint">{col.hint}</p>}
              {list.map((c) => (
                <CardView key={c.id} card={c} />
              ))}
            </section>
          );
        })}
      </div>
    </section>
  );
}
