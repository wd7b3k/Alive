import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalyticsView, buildFunnel } from './AnalyticsModule';
import type { AnalyticsSnapshot } from './port';
import { weekStart } from './weeks';

/**
 * Экран аналитики: что человек видит, а не что мы ему передали.
 *
 * У модуля не было ни одного теста, и три поломки прожили неделю, глядя прямо в глаза:
 * подпись недели читалась как день, число витрин в лиде отставало от кода вчетверо, а
 * половина чисел пряталась в атрибут `title` — то есть была видна мыши и не видна
 * человеку.
 *
 * Отсюда правило этого файла: **проверяется отрисованный текст, а не пропсы.** Перед
 * утверждениями из разметки вырезаются `title` — и то, что после этого исчезло, для
 * читающего экран и не существовало.
 */

const root = fileURLToPath(new URL('./', import.meta.url));

/** Неделя, которая идёт прямо сейчас. Фикстура не должна зависеть от дня прогона. */
const CURRENT_WEEK = weekStart(new Date());
const PREVIOUS_WEEK = (() => {
  const date = new Date(`${CURRENT_WEEK}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
})();

const snapshot: AnalyticsSnapshot = {
  headline: [
    {
      metric: 'weekly_with_result',
      title: 'Недельные с результатом',
      hint: 'Метрика жизни.',
      value: 4,
      unit: 'человек',
      previous: 2,
      better_when: 'up',
      computable: true,
      note: null,
    },
  ],
  core: [
    {
      week: PREVIOUS_WEEK,
      participants_with_result: 5,
      new_participants: 3,
      median_baseline_ratio: 0.8,
      ratio_observations: 4,
      computable: true,
      note: null,
    },
    {
      week: CURRENT_WEEK,
      participants_with_result: 2,
      new_participants: 1,
      median_baseline_ratio: 0.7,
      ratio_observations: 3,
      computable: true,
      note: null,
    },
  ],
  funnel: [
    {
      step_no: 1,
      step: 'Визит',
      people: 200,
      conversion_pct: null,
      median_hours: null,
      computable: true,
      note: null,
    },
    {
      step_no: 2,
      step: 'Регистрация',
      people: 50,
      conversion_pct: 25,
      median_hours: null,
      computable: true,
      note: null,
    },
    {
      step_no: 3,
      step: 'Настройка',
      people: 40,
      conversion_pct: 80,
      median_hours: null,
      computable: true,
      note: null,
    },
    {
      step_no: 4,
      step: 'Первый эпизод',
      people: 20,
      conversion_pct: 50,
      median_hours: null,
      computable: true,
      note: null,
    },
    {
      step_no: 5,
      step: 'С результатом',
      people: 20,
      conversion_pct: 100,
      median_hours: null,
      computable: true,
      note: null,
    },
    {
      step_no: 6,
      step: 'Три за неделю',
      people: 8,
      conversion_pct: 40,
      median_hours: null,
      computable: true,
      note: null,
    },
    {
      step_no: 7,
      step: 'Возврат',
      people: 6,
      conversion_pct: 75,
      median_hours: null,
      computable: true,
      note: null,
    },
  ],
  funnelStages: [
    {
      stage: 'landing',
      title: 'Открыл продукт',
      people: 180,
      rows_written: 190,
      first_at: null,
      last_at: null,
    },
    {
      stage: 'signed_in',
      title: 'Вошёл',
      people: 45,
      rows_written: 47,
      first_at: null,
      last_at: null,
    },
    {
      stage: 'onboarded',
      title: 'Прошёл настройку',
      people: 36,
      rows_written: 36,
      first_at: null,
      last_at: null,
    },
    {
      stage: 'first_episode',
      title: 'Записал первый эпизод',
      people: 18,
      rows_written: 18,
      first_at: null,
      last_at: null,
    },
    {
      stage: 'episode_with_result',
      title: 'Довёл до результата',
      people: 18,
      rows_written: 18,
      first_at: null,
      last_at: null,
    },
    {
      stage: 'repeat_episode',
      title: 'Вернулся',
      people: 5,
      rows_written: 5,
      first_at: null,
      last_at: null,
    },
  ],
  sourceFunnel: [
    {
      source_kind: 'search',
      detail: 'yandex',
      visitors: 120,
      signed_up: 30,
      onboarded: 24,
      first_episode: 12,
      with_result: 12,
      retained_week2: 4,
    },
    {
      source_kind: 'direct',
      detail: '—',
      visitors: 80,
      signed_up: 20,
      onboarded: 16,
      first_episode: 8,
      with_result: 8,
      retained_week2: 2,
    },
  ],
  trafficQuality: [
    {
      region: 'russia',
      region_title: 'Россия',
      segment: 'engaged',
      segment_title: 'За заходом кто-то есть',
      hint: 'Пришло второе событие.',
      visitors: 25,
      share_pct: 8.5,
      signed_up: 1,
      note: null,
    },
    {
      region: 'russia',
      region_title: 'Россия',
      segment: 'single_event',
      segment_title: 'Один заход и больше ничего',
      hint: 'Одно событие.',
      visitors: 37,
      share_pct: 12.5,
      signed_up: 0,
      note: null,
    },
    {
      region: 'other',
      region_title: 'Не Россия',
      segment: 'engaged',
      segment_title: 'За заходом кто-то есть',
      hint: 'Пришло второе событие.',
      visitors: 9,
      share_pct: 3.1,
      signed_up: 0,
      note: null,
    },
    {
      region: 'other',
      region_title: 'Не Россия',
      segment: 'single_event',
      segment_title: 'Один заход и больше ничего',
      hint: 'Одно событие.',
      visitors: 232,
      share_pct: 78.6,
      signed_up: 0,
      note: null,
    },
  ],
  sources: [
    {
      source_kind: 'search',
      detail: 'yandex',
      visitors: 120,
      signups: 30,
      reached_result: 12,
      note: null,
    },
  ],
  states: [{ state: 'активен', probable_direction: '—', participants: 6, note: null }],
  flow: [{ step_no: 1, views: 30, people: 20, median_seconds: 12, drop_off_pct: null }],
  retention: [
    { cohort_week: PREVIOUS_WEEK, cohort_size: 5, horizon_days: 1, retained: 4, retained_pct: 80 },
    { cohort_week: PREVIOUS_WEEK, cohort_size: 5, horizon_days: 7, retained: 3, retained_pct: 60 },
  ],
};

function render(): string {
  return renderToStaticMarkup(
    <AnalyticsView
      snapshot={snapshot}
      state="ready"
      reason=""
      periodIndex={1}
      onPeriod={() => {}}
    />,
  );
}

/** Разметка без того, что видно только курсору. */
function visible(html: string): string {
  return html.replace(/\stitle="[^"]*"/g, '').replace(/<title>[\s\S]*?<\/title>/g, '');
}

function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

const html = render();
const shown = visible(html);

describe('воронка', () => {
  it('показывает у каждой ступени три числа текстом, а не в подсказке', () => {
    const text = textOf(shown);
    // Люди по таблицам, доля от предыдущей ступени, доля от первой — все три словами.
    expect(text).toContain('50');
    expect(text).toContain('25% от предыдущей');
    expect(text).toContain('25% от первой');
    expect(text).toContain('по событиям 45');
  });

  it('первая ступень названа первой, а не сравнивается сама с собой', () => {
    expect(textOf(shown)).toContain('первая ступень');
  });

  it('сводит две воронки в одну: таблицы и события рядом', () => {
    const steps = buildFunnel(snapshot.funnelStages, snapshot.funnel);
    expect(steps).toHaveLength(6);
    expect(steps[1]).toMatchObject({ stage: 'signed_in', people: 50, byEvents: 45 });
    // Возврат берётся с седьмого шага воронки, а не с шестого: «три эпизода за неделю»
    // ступенью пути не является.
    expect(steps[5]).toMatchObject({ stage: 'repeat_episode', people: 6 });
  });
});

describe('подписи недель', () => {
  it('подписывает неделю диапазоном, а не одним днём', () => {
    // Смотрятся именно подписи графика: дата в пояснении под «как читать» — не подпись.
    const labels = [...shown.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((match) =>
      textOf(match[1]).trim(),
    );
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      // «08-31» читалось как 31 августа, хотя означало неделю по 6 сентября.
      expect(label, 'подпись недели одним днём').not.toMatch(/^\d{2}-\d{2}$/);
      expect(label, 'подпись недели без диапазона').toMatch(/\d{2}\.\d{2}–\d{2}\.\d{2}/);
    }
  });

  it('помечает идущую неделю', () => {
    expect(textOf(shown)).toContain('идёт');
  });
});

describe('матрицы', () => {
  it('в каждой ячейке есть число', () => {
    const cells = shown.match(/<td[\s\S]*?<\/td>/g) ?? [];
    expect(cells.length).toBeGreaterThan(0);
    const empty = cells.filter((cell) => !/\d/.test(textOf(cell)));
    expect(empty, 'ячейка без числа').toEqual([]);
  });

  it('показывает обе матрицы: источник × этап и место × поведение', () => {
    const text = textOf(shown);
    expect(text).toContain('Источник × этап');
    expect(text).toContain('Откуда люди');
    expect(text).toContain('Людей из России со вторым событием — 25');
  });
});

describe('подписи разделов', () => {
  it('лид каждого раздела не длиннее 140 знаков', () => {
    const leads = [...html.matchAll(/<p class="r-lead">([\s\S]*?)<\/p>/g)].map((match) =>
      textOf(match[1]).trim(),
    );
    expect(leads.length).toBeGreaterThan(4);
    const long = leads.filter((lead) => lead.length > 140);
    expect(long, 'лид длиннее 140 знаков — под «как читать»').toEqual([]);
  });

  it('длинные пояснения закрыты по умолчанию', () => {
    expect(html).toContain('<details class="r-viz-more">');
    expect(html).not.toContain('<details class="r-viz-more" open');
  });

  it('переключатель периода называет и дни, и недели', () => {
    // «7 дней» над графиком из четырёх недель — то самое расхождение, из-за которого
    // сентябрьскую неделю сочли пропавшей.
    expect(textOf(html)).toContain('30 дней · 12 недель');
  });
});

describe('число витрин', () => {
  const WORDS: Record<number, string> = {
    6: 'шесть',
    7: 'семь',
    8: 'восемь',
    9: 'девять',
    10: 'десять',
    11: 'одиннадцать',
    12: 'двенадцать',
  };
  const port = readFileSync(`${root}port.ts`, 'utf8');
  const calls = [...port.matchAll(/call<[^>]+>\('/g)].length;

  it('совпадает с числом вызовов в порте — и в лиде, и в README', () => {
    expect(calls).toBeGreaterThan(0);
    const word = WORDS[calls];
    expect(word, `нет слова для ${calls}`).toBeTruthy();
    expect(textOf(html), 'лид отстал от порта').toContain(`${word} функций`);
    const readme = readFileSync(`${root}README.md`, 'utf8');
    expect(readme, 'README отстал от порта').toContain(word);
  });
});
