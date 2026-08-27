import { describe, expect, it } from 'vitest';
import {
  cardOfTheDay,
  cardsForSurface,
  cardsForTrigger,
  evidenceForReplacement,
  levelOf,
  sourcesForCard,
  splitByKind,
} from './knowledge';
import { EVIDENCE_LEVELS, type Knowledge, type KnowledgeCard, type Replacement } from '../data';

function card(over: Partial<KnowledgeCard> & Pick<KnowledgeCard, 'code'>): KnowledgeCard {
  return {
    kind: 'fact',
    claim_ru: 'claim',
    known_ru: 'known',
    changes_ru: 'changes',
    evidence_level: 'C',
    detail_ru: 'detail',
    product_types: ['cigarette', 'hookah', 'vape'],
    surfaces: [],
    sort_order: 100,
    sources: [],
    ...over,
  };
}

function replacement(over: Partial<Replacement> & Pick<Replacement, 'code'>): Replacement {
  return {
    title: 't',
    instruction: 'i',
    category: 'physical',
    need_codes: [],
    product_types: ['cigarette'],
    eligibility: {},
    sort_order: 1,
    icon: null,
    duration: null,
    summary: null,
    safety: null,
    mechanism: null,
    evidence_level: null,
    evidence_scope: null,
    sources: [],
    ...over,
  };
}

const knowledge: Knowledge = {
  levels: EVIDENCE_LEVELS,
  cards: [
    card({
      code: 'wave',
      surfaces: ['flow', 'links', 'today'],
      sort_order: 10,
      sources: [
        {
          title: 'Activity',
          original: 'Physical activity and craving',
          url: 'https://example.test/activity',
          publication: 'Addiction',
          year: 2024,
        },
      ],
    }),
    card({
      code: 'hookah',
      kind: 'myth',
      product_types: ['hookah'],
      surfaces: ['links', 'public'],
      sort_order: 20,
      sources: [{ title: 'WHO', original: null, url: null, publication: null, year: null }],
    }),
    card({ code: 'willpower', kind: 'myth', surfaces: ['today', 'public'], sort_order: 30 }),
    card({ code: 'unsurfaced', sort_order: 40 }),
  ],
  cardTriggers: [
    { knowledge_code: 'willpower', trigger_code: 'tension', sort_order: 20 },
    { knowledge_code: 'wave', trigger_code: 'tension', sort_order: 10 },
    { knowledge_code: 'hookah', trigger_code: 'social', sort_order: 10 },
  ],
};

describe('levelOf', () => {
  it('returns the definition behind a letter', () => {
    expect(levelOf(knowledge, 'B')?.label_ru).toBe('Отдельные исследования');
  });

  it('returns null rather than a bare letter when the level is unknown or absent', () => {
    expect(levelOf(knowledge, null)).toBeNull();
    expect(levelOf(knowledge, 'Z')).toBeNull();
  });
});

describe('evidenceForReplacement', () => {
  it('returns null when the replacement carries no level, so nothing renders an empty badge', () => {
    expect(evidenceForReplacement(knowledge, replacement({ code: 'walk' }))).toBeNull();
  });

  // A level C heuristic with no study is a real, informative state — "Habitoff's own
  // reasoning, no research" is something the reader should see, not something to hide.
  it('returns the level even when there is no source at all', () => {
    const evidence = evidenceForReplacement(
      knowledge,
      replacement({ code: 'breath', evidence_level: 'C' }),
    );
    expect(evidence?.level.code).toBe('C');
    expect(evidence?.sources).toEqual([]);
  });

  it('carries the citation the replacement points at in the shared bibliography', () => {
    const evidence = evidenceForReplacement(
      knowledge,
      replacement({
        code: 'walk',
        evidence_level: 'B',
        evidence_scope: 'только тяга в моменте',
        sources: [
          {
            title: 'Физическая активность и тяга',
            original: 'Physical activity and craving',
            url: 'https://example.test/walk',
            publication: 'Addiction',
            year: 2024,
          },
        ],
      }),
    );
    expect(evidence?.sources.map((item) => item.title)).toEqual(['Физическая активность и тяга']);
    expect(evidence?.scope).toBe('только тяга в моменте');
  });
});

describe('cardsForSurface', () => {
  it('returns only cards that opted into the surface', () => {
    expect(cardsForSurface(knowledge, 'flow').map((c) => c.code)).toEqual(['wave']);
    expect(cardsForSurface(knowledge, 'public').map((c) => c.code)).toEqual([
      'hookah',
      'willpower',
    ]);
  });

  // Showing a waterpipe card to somebody who only vapes is not merely irrelevant — it
  // teaches them the section is generic and can be skipped.
  it('filters by the products the person actually uses', () => {
    expect(cardsForSurface(knowledge, 'public', ['vape']).map((c) => c.code)).toEqual([
      'willpower',
    ]);
    expect(cardsForSurface(knowledge, 'public', ['hookah']).map((c) => c.code)).toEqual([
      'hookah',
      'willpower',
    ]);
  });

  it('treats an empty product list as no filter, which is the pre-login case', () => {
    expect(cardsForSurface(knowledge, 'public', []).length).toBe(2);
  });
});

describe('cardsForTrigger', () => {
  it('orders by the link table, not by the card order', () => {
    expect(cardsForTrigger(knowledge, 'tension').map((c) => c.code)).toEqual(['wave', 'willpower']);
  });

  it('can be narrowed to one surface', () => {
    expect(cardsForTrigger(knowledge, 'tension', [], 'flow').map((c) => c.code)).toEqual(['wave']);
  });

  it('returns nothing for a missing trigger instead of falling back to everything', () => {
    expect(cardsForTrigger(knowledge, null)).toEqual([]);
    expect(cardsForTrigger(knowledge, 'no_such_trigger')).toEqual([]);
  });
});

describe('cardOfTheDay', () => {
  // Opening Сегодня three times must not produce three different claims about your
  // health — that reads as the product reaching for whatever is at hand.
  it('is stable within a day and moves between days', () => {
    const first = cardOfTheDay(knowledge, 'today', '2026-08-23');
    expect(cardOfTheDay(knowledge, 'today', '2026-08-23')?.code).toBe(first?.code);
    const codes = new Set(
      ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26'].map(
        (day) => cardOfTheDay(knowledge, 'today', day)?.code,
      ),
    );
    expect(codes.size).toBeGreaterThan(1);
  });

  it('returns null when the surface has no cards, rather than throwing', () => {
    expect(cardOfTheDay({ ...knowledge, cards: [] }, 'today', '2026-08-23')).toBeNull();
  });
});

describe('sourcesForCard and splitByKind', () => {
  it('resolves a card to its documents', () => {
    expect(sourcesForCard(knowledge, knowledge.cards[0]!).map((s) => s.title)).toEqual([
      'Activity',
    ]);
  });

  it('separates facts from myths', () => {
    const { facts, myths } = splitByKind(knowledge.cards);
    expect(facts.map((c) => c.code)).toEqual(['wave', 'unsurfaced']);
    expect(myths.map((c) => c.code)).toEqual(['hookah', 'willpower']);
  });
});
