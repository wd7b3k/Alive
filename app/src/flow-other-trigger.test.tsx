// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { Guided } from './RedesignApp';
import { EMPTY_KNOWLEDGE, OTHER_TRIGGER_CODE, saveGuidedEpisode, type Bootstrap } from './data';

/**
 * Контекст вне каталога (Р1).
 *
 * Проверяется то, чего не видно глазами на экране: куда уходит текст, который человек
 * написал про свой момент. Обещание жёсткое — текст живёт в эпизоде и **нигде больше**.
 * В журнал событий уходит только факт, что текст был, и код причины.
 *
 * Проверка идёт поиском самой введённой строки по всем строкам, которые ушли бы в
 * `analytics_events`, а не рассуждением о полях: рассуждение сломается молча, когда в
 * событие добавят новое поле, поиск — с именем теста.
 *
 * Второй инвариант — пустой ввод не блокирует переход. Человек в момент тяги, и цена
 * «сначала опиши» выше пользы от текста.
 */

type Insert = { table: string; row: Record<string, unknown> };
const inserts: Insert[] = [];

/**
 * Минимальный двойник клиента базы: запоминает, что и куда вставили.
 *
 * `then` обязан принимать `(undefined, onRejected)` — именно так `trackEvent` гасит
 * ошибку аналитики, и наивный двойник на этом падает.
 */
function client() {
  const chain = {
    select: () => chain,
    single: () => Promise.resolve({ data: { id: 'ep-1' }, error: null }),
    then: (
      onOk?: ((value: { data: null; error: null }) => unknown) | null,
      onErr?: ((reason: unknown) => unknown) | null,
    ) => Promise.resolve({ data: null, error: null }).then(onOk, onErr),
  };
  return {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return chain;
      },
    }),
  };
}

vi.mock('./supabase', () => ({ getSupabase: () => client() }));

const base: Bootstrap = {
  profile: {
    id: 'u1',
    display_name: 'T',
    avatar_url: null,
    role: 'participant',
    onboarding_completed_at: null,
  },
  settings: {
    user_id: 'u1',
    food_replacements_enabled: true,
    nrt_enabled: true,
    fruit_cutoff_time: '20:00',
    goal_text: null,
    evening_checkin_enabled: true,
  },
  products: [
    {
      user_id: 'u1',
      product_type: 'cigarette',
      role: 'target_dependency',
      enabled: true,
      baseline: {},
      defaults: {},
    },
  ],
  triggers: [
    {
      code: 'coffee',
      title: 'T-coffee',
      description: 'd',
      product_types: ['cigarette'],
      sort_order: 1,
    },
  ],
  needs: [{ code: 'pause', title: 'Пауза', description: 'd', sort_order: 1 }],
  replacements: [],
  triggerReplacementMap: [],
  meanings: [],
  goals: [],
  userMeanings: [],
  userLinks: [],
  identityScripts: [],
  supports: [],
  rewards: [],
  episodes: [],
  actions: [],
  tobaccoEvents: [],
  todayCheckin: null,
  knowledge: EMPTY_KNOWLEDGE,
  awareness: [],
};

const session = { user: { id: 'u1' } } as never;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  inserts.length = 0;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount() {
  act(() => {
    root.render(<Guided session={session} data={base} close={() => {}} saved={async () => {}} />);
  });
}

function byText(selector: string, text: string): HTMLElement {
  const found = [...container.querySelectorAll<HTMLElement>(selector)].find((node) =>
    node.textContent?.includes(text),
  );
  if (!found) throw new Error(`не найдено: ${selector} с текстом «${text}»`);
  return found;
}

function field(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('#r-other-trigger');
  if (!input) throw new Error('поля контекста вне каталога нет на экране');
  return input;
}

function click(node: HTMLElement) {
  act(() => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** React слушает нативный `input`, но читает значение через собственный сеттер. */
function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const events = () => inserts.filter((item) => item.table === 'analytics_events');
const otherUsed = () => events().filter((item) => item.row.event_type === 'trigger_other_used');

describe('Guided — контекст вне каталога', () => {
  it('раскрывает поле на месте карточки, не уводя с экрана', () => {
    mount();
    expect(container.textContent).toContain('В каком контексте включилась тяга?');
    expect(container.textContent).not.toContain('В двух словах');

    click(byText('.r-choice-none', 'Моей ситуации тут нет'));

    // Тот же шаг: заголовок экрана контекстов на месте, поле появилось рядом.
    expect(container.textContent).toContain('В каком контексте включилась тяга?');
    expect(field().maxLength).toBe(120);
  });

  it('ведёт на выбор потребности и без текста тоже', () => {
    mount();
    click(byText('.r-choice-none', 'Моей ситуации тут нет'));
    click(byText('.r-other-trigger button', 'Дальше'));
    expect(container.textContent).toContain('Что ты на самом деле сейчас ищешь?');
    expect(otherUsed()).toHaveLength(1);
    expect(otherUsed()[0].row.metadata).toEqual({ text_given: false });
  });

  it('не уносит написанный текст в журнал событий', () => {
    const written = 'разговор с отцом на кухне после ужина';
    mount();
    click(byText('.r-choice-none', 'Моей ситуации тут нет'));
    type(field(), written);
    click(byText('.r-other-trigger button', 'Дальше'));

    expect(otherUsed()).toHaveLength(1);
    const row = otherUsed()[0].row;
    expect(row.reason_code).toBe('no_trigger_match');
    expect(row.surface).toBe('guided_flow');
    expect(row.metadata).toEqual({ text_given: true });

    for (const event of events()) {
      expect(JSON.stringify(event.row)).not.toContain(written);
      expect(JSON.stringify(event.row)).not.toContain('разговор');
    }
  });

  it('пробелы вместо текста считаются пустым вводом', () => {
    mount();
    click(byText('.r-choice-none', 'Моей ситуации тут нет'));
    type(field(), '   ');
    click(byText('.r-other-trigger button', 'Дальше'));
    expect(otherUsed()[0].row.metadata).toEqual({ text_given: false });
  });
});

/**
 * Слой записи существовал и до Р1 — не было только карточки, — но исполнен не был ни
 * разу: пока код `other` не попадал в интерфейс, эта ветка оставалась мёртвой.
 */
describe('saveGuidedEpisode — контекст вне каталога', () => {
  const draft = {
    product: 'cigarette' as const,
    triggerCode: OTHER_TRIGGER_CODE,
    needCode: 'pause',
    cravingBefore: null,
    cravingAfter: null,
    helpfulness: null,
    replacementCode: null,
    outcome: 'successful_response' as const,
  };
  const episode = () => inserts.find((item) => item.table === 'episodes')?.row ?? {};

  it('пустой ввод сохраняется как «Другое» и оставляет код контекста пустым', async () => {
    await saveGuidedEpisode(session, draft);
    expect(episode().trigger_code).toBeNull();
    expect(episode().custom_trigger_text).toBe('Другое');
  });

  it('написанный текст сохраняется целиком', async () => {
    const written = 'п'.repeat(120);
    await saveGuidedEpisode(session, { ...draft, customTriggerText: written });
    expect(episode().trigger_code).toBeNull();
    expect(episode().custom_trigger_text).toBe(written);
    expect((episode().custom_trigger_text as string).length).toBe(120);
  });

  it('обычный контекст пишется кодом, а не текстом', async () => {
    await saveGuidedEpisode(session, { ...draft, triggerCode: 'coffee' });
    expect(episode().trigger_code).toBe('coffee');
    expect(episode().custom_trigger_text).toBeNull();
  });
});
