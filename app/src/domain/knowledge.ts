import type {
  EvidenceLevel,
  EvidenceLevelCode,
  EvidenceSource,
  Knowledge,
  KnowledgeCard,
  KnowledgeSurface,
  ProductType,
  Replacement,
} from '../data';

/**
 * Selectors over the evidence layer and «Факты и Мифы».
 *
 * Pure functions on data already in memory — nothing here fetches. They live in
 * `domain/` beside metrics because the rules they encode are product rules, not
 * rendering details, and because rules that decide what health claim a person is shown
 * deserve to be unit-testable without a browser.
 */

/** The definition behind a letter. Null when the level is unknown or not loaded. */
export function levelOf(
  knowledge: Knowledge,
  code: string | null | undefined,
): EvidenceLevel | null {
  if (!code) return null;
  return knowledge.levels.find((level) => level.code === code) ?? null;
}

function sourcesByIds(knowledge: Knowledge, ids: string[]): EvidenceSource[] {
  const byId = new Map(knowledge.sources.map((source) => [source.id, source]));
  return ids
    .map((id) => byId.get(id))
    .filter((source): source is EvidenceSource => Boolean(source));
}

/**
 * What backs one replacement: its level, where that evidence stops, and the documents.
 *
 * Returns null when the replacement carries no level at all, so a caller can render
 * nothing rather than an empty badge. A level with no sources is NOT null — that is the
 * honest state of a level C heuristic, and saying "ALIVE's own heuristic, no study" is
 * information the reader wants.
 */
export function evidenceForReplacement(
  knowledge: Knowledge,
  replacement: Pick<Replacement, 'code' | 'evidence_level' | 'evidence_scope' | 'mechanism'>,
): {
  level: EvidenceLevel;
  scope: string | null;
  mechanism: string | null;
  sources: EvidenceSource[];
} | null {
  const level = levelOf(knowledge, replacement.evidence_level);
  if (!level) return null;
  const ids = knowledge.replacementEvidence
    .filter((link) => link.replacement_code === replacement.code)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((link) => link.source_id);
  return {
    level,
    scope: replacement.evidence_scope,
    mechanism: replacement.mechanism,
    sources: sourcesByIds(knowledge, ids),
  };
}

/** The documents behind one knowledge card, in editorial order. */
export function sourcesForCard(knowledge: Knowledge, card: KnowledgeCard): EvidenceSource[] {
  const ids = knowledge.cardEvidence
    .filter((link) => link.knowledge_code === card.code)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((link) => link.source_id);
  return sourcesByIds(knowledge, ids);
}

function appliesToProducts(card: KnowledgeCard, products: ProductType[]): boolean {
  if (!products.length) return true;
  return card.product_types.some((type) => products.includes(type));
}

/**
 * Cards for one surface, filtered to the products this person actually uses.
 *
 * The product filter is not cosmetic: a waterpipe card shown to someone who only vapes
 * is not merely irrelevant, it quietly teaches them that the section is generic and can
 * be skipped.
 */
export function cardsForSurface(
  knowledge: Knowledge,
  surface: KnowledgeSurface,
  products: ProductType[] = [],
): KnowledgeCard[] {
  return knowledge.cards
    .filter((card) => card.surfaces.includes(surface) && appliesToProducts(card, products))
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Cards attached to one trigger — the per-trigger fact in Связки and in the flow.
 */
export function cardsForTrigger(
  knowledge: Knowledge,
  triggerCode: string | null | undefined,
  products: ProductType[] = [],
  surface?: KnowledgeSurface,
): KnowledgeCard[] {
  if (!triggerCode) return [];
  const order = new Map(
    knowledge.cardTriggers
      .filter((link) => link.trigger_code === triggerCode)
      .map((link) => [link.knowledge_code, link.sort_order]),
  );
  return knowledge.cards
    .filter((card) => order.has(card.code))
    .filter((card) => appliesToProducts(card, products))
    .filter((card) => !surface || card.surfaces.includes(surface))
    .sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0));
}

/**
 * One card for a surface that only has room for one, rotated by day.
 *
 * Rotation is by date rather than at random so the card is stable for the whole day: a
 * person who opens Сегодня three times should not be shown three different claims about
 * their health and conclude the product is reaching for whatever is at hand. `localDay`
 * is passed in rather than read here to keep the function pure and testable.
 */
export function cardOfTheDay(
  knowledge: Knowledge,
  surface: KnowledgeSurface,
  localDay: string,
  products: ProductType[] = [],
): KnowledgeCard | null {
  const cards = cardsForSurface(knowledge, surface, products);
  if (!cards.length) return null;
  const digits = localDay.replace(/\D/g, '');
  const seed = Number(digits.slice(-6)) || 0;
  return cards[seed % cards.length] ?? null;
}

/** Group the section's cards the way the section renders them. */
export function splitByKind(cards: KnowledgeCard[]): {
  facts: KnowledgeCard[];
  myths: KnowledgeCard[];
} {
  return {
    facts: cards.filter((card) => card.kind === 'fact'),
    myths: cards.filter((card) => card.kind === 'myth'),
  };
}

/** Short human label for a level, for a badge. Falls back to the bare letter. */
export function levelBadge(level: EvidenceLevel | null, code?: EvidenceLevelCode | null): string {
  if (level) return `${level.code} · ${level.label_ru}`;
  return code ?? '';
}
