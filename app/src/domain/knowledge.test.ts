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
import type { Knowledge, KnowledgeCard, Replacement } from '../data';

function card(over: Partial<KnowledgeCard> & Pick<KnowledgeCard, 'code'>): KnowledgeCard {
  return {
    kind: 'fact',
    claim_ru: 'claim',
    known_ru: 'known',
    changes_ru: 'changes',
    evidence_level: 'C',
    scope_note_ru: 'scope',
    product_types: ['cigarette', 'hookah', 'vape'],
    surfaces: [],
    sort_order: 100,
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
    ...over,
  };
}

const knowledge: Knowledge = {
  levels: [
    {
      code: 'A',
      rank: 1,
      label_ru: 'Руководство',
      claim_ru: 'claim A',
      limit_ru: 'limit A',
      sort_order: 10,
    },
    {
      code: 'B',
      rank: 2,
      label_ru: 'Исследования',
      claim_ru: 'claim B',
      limit_ru: 'limit B',
      sort_order: 20,
    },
    {
      code: 'C',
      rank: 3,
      label_ru: 'Эвристика',
      claim_ru: 'claim C',
      limit_ru: 'limit C',
      sort_order: 30,
    },
  ],
  sources: [
    {
      id: 's1',
      code: 'who',
      title: 'WHO',
      url: 'https://who',
      publisher: 'WHO',
      kind: 'guideline',
      year: 2024,
      sort_order: 10,
    },
    {
      id: 's2',
      code: 'pa',
      title: 'Activity',
      url: 'https://pa',
      publisher: 'PubMed',
      kind: 'review',
      year: 2012,
      sort_order: 20,
    },
  ],
  replacementEvidence: [
    { replacement_code: 'walk', source_id: 's2', sort_order: 20 },
    { replacement_code: 'walk', source_id: 's1', sort_order: 10 },
  ],
  cards: [
    card({ code: 'wave', surfaces: ['flow', 'links', 'today'], sort_order: 10 }),
    card({
      code: 'hookah',
      kind: 'myth',
      product_types: ['hookah'],
      surfaces: ['links', 'public'],
      sort_order: 20,
    }),
    card({ code: 'willpower', kind: 'myth', surfaces: ['today', 'public'], sort_order: 30 }),
    card({ code: 'unsurfaced', sort_order: 40 }),
  ],
  cardTriggers: [
    { knowledge_code: 'willpower', trigger_code: 'tension', sort_order: 20 },
    { knowledge_code: 'wave', trigger_code: 'tension', sort_order: 10 },
    { knowledge_code: 'hookah', trigger_code: 'social', sort_order: 10 },
  ],
  cardEvidence: [
    { knowledge_code: 'wave', source_id: 's2', sort_order: 10 },
    { knowledge_code: 'hookah', source_id: 's1', sort_order: 10 },
  ],
};

describe('levelOf', () => {
  it('returns the definition behind a letter', () => {
    expect(levelOf(knowledge, 'B')?.label_ru).toBe('Исследования');
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

  // A level C heuristic with no study is a real, informative state — "ALIVE's own
  // reasoning, no research" is something the reader should see, not something to hide.
  it('returns the level even when there is no source at all', () => {
    const evidence = evidenceForReplacement(
      knowledge,
      replacement({ code: 'breath', evidence_level: 'C' }),
    );
    expect(evidence?.level.code).toBe('C');
    expect(evidence?.sources).toEqual([]);
  });

  it('returns sources in editorial order, not insertion order', () => {
    const evidence = evidenceForReplacement(
      knowledge,
      replacement({ code: 'walk', evidence_level: 'B', evidence_scope: 'только тяга в моменте' }),
    );
    expect(evidence?.sources.map((s) => s.id)).toEqual(['s1', 's2']);
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
