import { describe, expect, it } from 'vitest';

import type { AwarenessCard } from '../data';
import { awarenessForMoment } from './knowledge';

function card(
  code: string,
  productTypes: AwarenessCard['productTypes'],
  contexts: AwarenessCard['contexts'],
): AwarenessCard {
  return {
    code,
    kind: 'факт',
    title: code,
    hook: code,
    explanation: code,
    motivation: null,
    caveat: '',
    productTypes,
    contexts,
    confidence: null,
    limitations: null,
    sources: [],
  };
}

const path = (priority: number, triggerCode: string | null = null) => ({
  moment: 'путь' as const,
  triggerCode,
  productType: null,
  priority,
});

describe('awarenessForMoment', () => {
  it('returns nothing when no card is assigned to the moment', () => {
    const cards = [card('a', ['cigarette'], [path(10)])];
    expect(awarenessForMoment(cards, 'библиотека', ['cigarette'])).toEqual([]);
  });

  it('drops cards whose product the person does not use', () => {
    const cards = [card('cig', ['cigarette'], [path(10)]), card('vape', ['vape'], [path(20)])];
    expect(awarenessForMoment(cards, 'путь', ['vape']).map((c) => c.code)).toEqual(['vape']);
  });

  it('orders by the editorial priority on the context row, not by array order', () => {
    const cards = [
      card('late', ['cigarette'], [path(90)]),
      card('early', ['cigarette'], [path(10)]),
    ];
    expect(awarenessForMoment(cards, 'путь', ['cigarette']).map((c) => c.code)).toEqual([
      'early',
      'late',
    ]);
  });

  it('keeps a card whose context names no trigger, drops one that names another', () => {
    const cards = [
      card('any', ['cigarette'], [path(10)]),
      card('tension', ['cigarette'], [path(20, 'tension')]),
      card('meal', ['cigarette'], [path(30, 'after_meal')]),
    ];
    const shown = awarenessForMoment(cards, 'путь', ['cigarette'], 'tension');
    expect(shown.map((c) => c.code)).toEqual(['any', 'tension']);
  });

  it('respects a context row that pins a product the person does not use', () => {
    const cards = [
      card(
        'both',
        ['cigarette', 'vape'],
        [{ moment: 'путь', triggerCode: null, productType: 'vape', priority: 10 }],
      ),
    ];
    expect(awarenessForMoment(cards, 'путь', ['cigarette'])).toEqual([]);
    expect(awarenessForMoment(cards, 'путь', ['cigarette', 'vape']).map((c) => c.code)).toEqual([
      'both',
    ]);
  });

  it('takes the strongest priority when a card matches the moment more than once', () => {
    const cards = [
      card('multi', ['cigarette'], [path(80), path(5, 'tension')]),
      card('single', ['cigarette'], [path(40)]),
    ];
    expect(awarenessForMoment(cards, 'путь', ['cigarette'], 'tension').map((c) => c.code)).toEqual([
      'multi',
      'single',
    ]);
  });

  it('shows every card when the person has no products recorded yet', () => {
    const cards = [card('cig', ['cigarette'], [path(10)]), card('vape', ['vape'], [path(20)])];
    expect(awarenessForMoment(cards, 'путь', []).length).toBe(2);
  });
});
