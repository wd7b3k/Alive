import { describe, expect, it } from 'vitest';

import type { Episode, Need, NicotineProduct, ProductType, Trigger } from '../data';
import {
  FLOW_RESULT_STEP,
  NEED_MIN_EPISODES,
  PRODUCT_STREAK,
  TRIGGER_SHORTLIST_MAX,
  flowOpening,
  frequentTriggers,
  needGuess,
  productDefault,
  stepAfterTrigger,
} from './flow-defaults';

let clock = 0;

function episode(
  product: ProductType,
  triggerCode: string | null,
  needCode: string | null,
  options: { deleted?: boolean; at?: string } = {},
): Episode {
  clock += 1;
  return {
    id: `e${clock}`,
    user_id: 'u1',
    target_product: product,
    trigger_code: triggerCode,
    custom_trigger_text: null,
    need_code: needCode,
    craving_before: 7,
    craving_after: 4,
    outcome: 'successful_response',
    helpfulness: 4,
    private_note: null,
    started_at: options.at ?? new Date(Date.UTC(2026, 7, 1, 0, clock)).toISOString(),
    completed_at: null,
    deleted_at: options.deleted ? '2026-08-20T00:00:00.000Z' : null,
  };
}

function trigger(code: string, products: ProductType[], sortOrder = 1): Trigger {
  return { code, title: code, description: code, product_types: products, sort_order: sortOrder };
}

function need(code: string): Need {
  return { code, title: code, description: code, sort_order: 1 };
}

function product(
  type: ProductType,
  role: NicotineProduct['role'] = 'target_dependency',
): NicotineProduct {
  return {
    user_id: 'u1',
    product_type: type,
    role,
    enabled: true,
    baseline: {},
    defaults: {},
  };
}

describe('productDefault', () => {
  it('без истории берёт целевую зависимость и не считает себя уверенным', () => {
    const result = productDefault({
      products: [product('vape', 'cessation_bridge'), product('cigarette')],
      episodes: [],
    });
    expect(result.product).toBe('cigarette');
    expect(result.confident).toBe(false);
  });

  it('пропускает экран продукта после серии одинаковых разборов', () => {
    const episodes = Array.from({ length: PRODUCT_STREAK }, () =>
      episode('vape', 'coffee', 'pause'),
    );
    const result = productDefault({
      products: [product('cigarette'), product('vape', 'cessation_bridge')],
      episodes,
    });
    expect(result.product).toBe('vape');
    expect(result.confident).toBe(true);
  });

  it('серии на один разбор короче нормы не хватает', () => {
    const episodes = Array.from({ length: PRODUCT_STREAK - 1 }, () =>
      episode('vape', 'coffee', 'pause'),
    );
    expect(
      productDefault({
        products: [product('cigarette'), product('vape', 'cessation_bridge')],
        episodes,
      }).confident,
    ).toBe(false);
  });

  it('разрыв серии свежим разбором возвращает вопрос на экран', () => {
    const episodes = [
      ...Array.from({ length: PRODUCT_STREAK }, () => episode('vape', 'coffee', 'pause')),
      episode('cigarette', 'coffee', 'pause'),
    ];
    expect(
      productDefault({
        products: [product('cigarette'), product('vape', 'cessation_bridge')],
        episodes,
      }).confident,
    ).toBe(false);
  });

  /** Иначе удаление ошибочной записи (P18) не влияло бы на то, что подставляет флоу. */
  it('не считает удалённые эпизоды', () => {
    const episodes = [
      ...Array.from({ length: PRODUCT_STREAK }, () => episode('vape', 'coffee', 'pause')),
      episode('cigarette', 'coffee', 'pause', { deleted: true }),
    ];
    expect(
      productDefault({
        products: [product('cigarette'), product('vape', 'cessation_bridge')],
        episodes,
      }).confident,
    ).toBe(true);
  });

  it('не подставляет продукт, которого нет в настройках человека', () => {
    const episodes = Array.from({ length: PRODUCT_STREAK }, () =>
      episode('hookah', 'social', 'connection'),
    );
    const result = productDefault({ products: [product('cigarette')], episodes });
    expect(result.confident).toBe(false);
    expect(result.product).toBe('cigarette');
  });
});

describe('frequentTriggers', () => {
  const triggers = [
    trigger('coffee', ['cigarette', 'vape'], 1),
    trigger('boredom', ['cigarette', 'vape'], 2),
    trigger('tension', ['cigarette', 'vape'], 3),
    trigger('driving', ['cigarette', 'vape'], 4),
    trigger('hookah_venue', ['hookah'], 5),
  ];

  it('молчит, пока личных контекстов слишком мало', () => {
    const episodes = [
      episode('cigarette', 'coffee', 'pause'),
      episode('cigarette', 'coffee', null),
    ];
    expect(frequentTriggers({ triggers, episodes }, 'cigarette')).toEqual([]);
  });

  it('поднимает наверх частые контексты в порядке частоты', () => {
    const episodes = [
      episode('cigarette', 'driving', 'switch'),
      episode('cigarette', 'boredom', 'switch'),
      episode('cigarette', 'boredom', 'switch'),
      episode('cigarette', 'coffee', 'pause'),
      episode('cigarette', 'coffee', 'pause'),
      episode('cigarette', 'coffee', 'pause'),
    ];
    expect(frequentTriggers({ triggers, episodes }, 'cigarette').map((item) => item.code)).toEqual([
      'coffee',
      'boredom',
      'driving',
    ]);
  });

  it('при равной частоте наверху оказывается свежий контекст', () => {
    const episodes = [
      episode('cigarette', 'coffee', 'pause', { at: '2026-08-01T10:00:00.000Z' }),
      episode('cigarette', 'boredom', 'switch', { at: '2026-08-02T10:00:00.000Z' }),
      episode('cigarette', 'driving', 'switch', { at: '2026-08-03T10:00:00.000Z' }),
    ];
    expect(frequentTriggers({ triggers, episodes }, 'cigarette').map((item) => item.code)).toEqual([
      'driving',
      'boredom',
      'coffee',
    ]);
  });

  it('не показывает контексты чужого продукта', () => {
    const episodes = [
      episode('hookah', 'hookah_venue', 'connection'),
      episode('hookah', 'hookah_venue', 'connection'),
      episode('hookah', 'hookah_venue', 'connection'),
      episode('cigarette', 'coffee', 'pause'),
      episode('cigarette', 'boredom', 'switch'),
      episode('cigarette', 'driving', 'switch'),
    ];
    const result = frequentTriggers({ triggers, episodes }, 'cigarette').map((item) => item.code);
    expect(result).not.toContain('hookah_venue');
    expect(result).toHaveLength(3);
  });

  it('никогда не отдаёт больше отведённого места в сетке', () => {
    const wide = Array.from({ length: 9 }, (_, index) =>
      trigger(`t${index}`, ['cigarette'], index),
    );
    const episodes = wide.map((item) => episode('cigarette', item.code, 'pause'));
    expect(frequentTriggers({ triggers: wide, episodes }, 'cigarette')).toHaveLength(
      TRIGGER_SHORTLIST_MAX,
    );
  });
});

describe('needGuess', () => {
  const needs = [need('pause'), need('switch'), need('release_tension')];

  it('молчит, пока разборов этого контекста мало', () => {
    const episodes = Array.from({ length: NEED_MIN_EPISODES - 1 }, () =>
      episode('cigarette', 'coffee', 'pause'),
    );
    expect(needGuess({ needs, episodes }, 'cigarette', 'coffee')).toBeNull();
  });

  it('подставляет потребность, когда она устойчиво повторяется', () => {
    const episodes = [
      ...Array.from({ length: 4 }, () => episode('cigarette', 'coffee', 'pause')),
      episode('cigarette', 'coffee', 'switch'),
    ];
    const guess = needGuess({ needs, episodes }, 'cigarette', 'coffee');
    expect(guess).toEqual({ needCode: 'pause', episodes: 4, total: 5, share: 0.8 });
  });

  it('молчит при размазанной истории — там подсказывать нечего', () => {
    const episodes = [
      episode('cigarette', 'coffee', 'pause'),
      episode('cigarette', 'coffee', 'pause'),
      episode('cigarette', 'coffee', 'switch'),
      episode('cigarette', 'coffee', 'switch'),
      episode('cigarette', 'coffee', 'release_tension'),
    ];
    expect(needGuess({ needs, episodes }, 'cigarette', 'coffee')).toBeNull();
  });

  it('считает историю отдельно по продукту и отдельно по контексту', () => {
    const episodes = [
      ...Array.from({ length: 5 }, () => episode('vape', 'coffee', 'pause')),
      ...Array.from({ length: 5 }, () => episode('cigarette', 'boredom', 'switch')),
    ];
    expect(needGuess({ needs, episodes }, 'cigarette', 'coffee')).toBeNull();
    expect(needGuess({ needs, episodes }, 'vape', 'coffee')?.needCode).toBe('pause');
    expect(needGuess({ needs, episodes }, 'cigarette', 'boredom')?.needCode).toBe('switch');
  });

  it('не подставляет потребность, которой больше нет в каталоге', () => {
    const episodes = Array.from({ length: 5 }, () => episode('cigarette', 'coffee', 'retired'));
    expect(needGuess({ needs, episodes }, 'cigarette', 'coffee')).toBeNull();
  });
});

describe('flowOpening', () => {
  const needs = [need('pause'), need('switch')];
  const settled = Array.from({ length: 6 }, () => episode('cigarette', 'coffee', 'pause'));

  it('с одним продуктом и пустой историей начинает с контекста', () => {
    expect(flowOpening({ products: [product('cigarette')], episodes: [], needs }).first).toBe(1);
  });

  it('с несколькими продуктами и без серии начинает с продукта', () => {
    const opening = flowOpening({
      products: [product('cigarette'), product('vape', 'cessation_bridge')],
      episodes: [],
      needs,
    });
    expect(opening.first).toBe(0);
    expect(opening.productConfident).toBe(false);
  });

  it('контекст с Главной больше не переспрашивается', () => {
    const opening = flowOpening(
      { products: [product('cigarette')], episodes: [], needs },
      'coffee',
    );
    expect(opening.first).toBe(2);
    expect(opening.trigger).toBe('coffee');
  });

  it('контекст с Главной плюс уверенная потребность ведут сразу к ответам', () => {
    const opening = flowOpening(
      { products: [product('cigarette')], episodes: settled, needs },
      'coffee',
    );
    expect(opening.first).toBe(3);
    expect(opening.need?.needCode).toBe('pause');
  });

  /**
   * Пока продукт под вопросом, история чужого продукта не имеет права подставлять
   * потребность: лишний экран дешевле неверного дефолта в момент тяги.
   */
  it('не подставляет потребность, пока не выбран продукт', () => {
    const mixed = [...settled, episode('vape', 'coffee', 'switch')];
    const opening = flowOpening(
      {
        products: [product('cigarette'), product('vape', 'cessation_bridge')],
        episodes: mixed,
        needs,
      },
      'coffee',
    );
    expect(opening.first).toBe(0);
    expect(opening.need).toBeNull();
  });

  /**
   * Главное ограничение всей этой работы. Шаг результата — источник данных для
   * H-ALIVE-001; сокращать сценарий можно только до него.
   */
  it('ни один дефолт не открывает сценарий на шаге результата или дальше', () => {
    const histories = [
      [],
      settled,
      [episode('cigarette', 'coffee', 'pause')],
      [...settled, episode('vape', 'coffee', 'switch')],
      Array.from({ length: 9 }, () => episode('vape', 'boredom', 'switch')),
    ];
    const products = [
      [product('cigarette')],
      [product('cigarette'), product('vape', 'cessation_bridge')],
    ];
    for (const episodes of histories) {
      for (const list of products) {
        for (const trigger of [undefined, 'coffee', 'boredom']) {
          const opening = flowOpening({ products: list, episodes, needs }, trigger);
          expect(opening.first).toBeLessThan(FLOW_RESULT_STEP);
          expect(opening.first).toBeGreaterThanOrEqual(0);
        }
      }
    }
    expect(stepAfterTrigger(null)).toBeLessThan(FLOW_RESULT_STEP);
    expect(stepAfterTrigger({ needCode: 'pause', episodes: 4, total: 5, share: 0.8 })).toBeLessThan(
      FLOW_RESULT_STEP,
    );
  });
});
