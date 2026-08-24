import type {
  AwarenessCard,
  AwarenessMoment,
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
 * Селекторы над доказательным слоем и «Фактами и Мифами».
 *
 * Чистые функции над уже загруженными данными — ничего не ходит в сеть. Они живут в
 * `domain/` рядом с метриками, потому что кодируют продуктовые правила, а не детали
 * отрисовки, и потому что правила, решающие, какое утверждение о здоровье увидит
 * человек, должны проверяться тестами без браузера.
 */

/** Определение буквы. Null, если уровень неизвестен. */
export function levelOf(
  knowledge: Knowledge,
  code: string | null | undefined,
): EvidenceLevel | null {
  if (!code) return null;
  return knowledge.levels.find((level) => level.code === code) ?? null;
}

/**
 * На чём стоит одна замена: уровень, где доказательство заканчивается, и источник.
 *
 * Возвращает null, когда у замены нет уровня вообще, — тогда вызывающий рисует ничего,
 * а не пустой бейдж. Уровень без источника — это НЕ null: так честно выглядит
 * эвристика уровня C, и сказать «это приём ALIVE, исследования нет» лучше, чем
 * промолчать.
 */
export function evidenceForReplacement(
  knowledge: Knowledge,
  replacement: Pick<
    Replacement,
    'code' | 'evidence_level' | 'evidence_scope' | 'mechanism' | 'sources'
  >,
): {
  level: EvidenceLevel;
  scope: string | null;
  mechanism: string | null;
  sources: EvidenceSource[];
} | null {
  const level = levelOf(knowledge, replacement.evidence_level);
  if (!level) return null;
  return {
    level,
    scope: replacement.evidence_scope,
    mechanism: replacement.mechanism,
    sources: replacement.sources,
  };
}

/**
 * Источники карточки.
 *
 * После 20260825140000 источник приезжает вместе со строкой каталога из общей
 * библиографии, поэтому функция тривиальна. Она всё равно существует: место, где раздел
 * берёт источники, должно быть одно, и когда у карточки появится второй источник,
 * менять придётся только здесь.
 */
export function sourcesForCard(_knowledge: Knowledge, card: KnowledgeCard): EvidenceSource[] {
  return card.sources;
}

function appliesToProducts(card: KnowledgeCard, products: ProductType[]): boolean {
  if (!products.length) return true;
  return card.product_types.some((type) => products.includes(type));
}

/**
 * Карточки для одной поверхности, отфильтрованные по продуктам, которыми человек
 * действительно пользуется.
 *
 * Фильтр по продукту не косметика: карточка про кальян, показанная тому, кто только
 * парит, не просто нерелевантна — она тихо учит, что раздел общий и его можно
 * пролистывать.
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
 * Карточки, привязанные к одному триггеру, — тот самый факт про конкретный момент в
 * Связках и в потоке.
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
 * Одна карточка для поверхности, где место есть только для одной, с ротацией по дню.
 *
 * Ротация по дате, а не случайная: человек, открывший «Сегодня» трижды, не должен
 * увидеть три разных утверждения о своём здоровье и решить, что продукт говорит первое
 * попавшееся. `localDay` передаётся снаружи, чтобы функция осталась чистой.
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

/** Разложить карточки раздела так, как раздел их показывает. */
export function splitByKind(cards: KnowledgeCard[]): {
  facts: KnowledgeCard[];
  myths: KnowledgeCard[];
} {
  return {
    facts: cards.filter((card) => card.kind === 'fact'),
    myths: cards.filter((card) => card.kind === 'myth'),
  };
}

/** Короткая подпись уровня для бейджа. Откатывается к голой букве. */
export function levelBadge(level: EvidenceLevel | null, code?: EvidenceLevelCode | null): string {
  if (level) return `${level.code} · ${level.label_ru}`;
  return code ?? '';
}

/**
 * Отбирает карточки слоя микроосознанности для одного момента.
 *
 * Правило повторяет то, по которому `alive_record_awareness_exposure` соглашается
 * зафиксировать показ: тип продукта человека должен быть среди продуктов карточки, а
 * строка контекста должна либо не называть триггер и продукт вовсе, либо называть те,
 * что сейчас на экране. Расхождение между отбором и записью означало бы карточку,
 * которую видно, но нельзя посчитать.
 *
 * Порядок — по `priority` строки контекста: это редакторское решение, и оно лежит в
 * базе, а не в коде.
 */
export function awarenessForMoment(
  cards: AwarenessCard[],
  moment: AwarenessMoment,
  products: ProductType[],
  triggerCode: string | null = null,
): AwarenessCard[] {
  const scored: { card: AwarenessCard; priority: number }[] = [];
  for (const card of cards) {
    if (products.length && !card.productTypes.some((type) => products.includes(type))) continue;
    const matches = card.contexts.filter(
      (ctx) =>
        ctx.moment === moment &&
        (ctx.triggerCode === null || ctx.triggerCode === triggerCode) &&
        (ctx.productType === null || products.includes(ctx.productType)),
    );
    if (!matches.length) continue;
    scored.push({ card, priority: Math.min(...matches.map((ctx) => ctx.priority)) });
  }
  return scored.sort((a, b) => a.priority - b.priority).map((entry) => entry.card);
}
