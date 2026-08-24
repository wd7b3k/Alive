import type { AwarenessCard, EvidenceSource, Knowledge, KnowledgeCard, Replacement } from '../data';
import { evidenceForReplacement, levelOf, sourcesForCard } from '../domain/knowledge';
import { Icon } from '../ui-icons';

/**
 * Rendering for the evidence layer and «Факты и Мифы».
 *
 * Two rules run through every component here.
 *
 * P3, progressive disclosure: at the moment of a craving nobody wants a lecture. The
 * compact forms show one line — a letter and a short label — and everything else lives
 * behind a `<details>` the person opens if they want it. Nothing expands on its own.
 *
 * And the rule this section exists for: a claim never appears without its limit. The
 * level and the scope note are rendered by the same component, so there is no code path
 * that shows "level A" and quietly drops "and here is where that evidence stops".
 */

function SourceList({ sources }: { sources: EvidenceSource[] }) {
  if (!sources.length) return null;
  return (
    <ul className="r-source-list">
      {sources.map((source) => (
        <li key={source.title}>
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer noopener">
              {source.title}
            </a>
          ) : (
            <span>{source.title}</span>
          )}
          {/* Издание и год под ссылкой. Ссылка когда-нибудь умрёт — по названию и году
              документ всё ещё можно найти, и ровно за этим библиография и нужна. */}
          {(source.publication || source.year) && (
            <small>{[source.publication, source.year].filter(Boolean).join(' · ')}</small>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The one-line form, safe to place inside a button.
 *
 * Deliberately not interactive: the replacement cards in the craving flow are buttons,
 * and a `<details>` inside a button is invalid markup that browsers resolve in their
 * own ways. The detail for the chosen replacement appears on the next step instead,
 * where there is room for it and the person has already made their choice.
 */
export function EvidenceBadge({
  knowledge,
  replacement,
}: {
  knowledge: Knowledge;
  replacement: Replacement;
}) {
  const evidence = evidenceForReplacement(knowledge, replacement);
  if (!evidence) return null;
  return (
    <span className={`r-evidence-badge level-${evidence.level.code.toLowerCase()}`}>
      <b>{evidence.level.code}</b>
      {evidence.level.label_ru}
    </span>
  );
}

/**
 * The full form for one replacement: why it works, how well that is established, where
 * the evidence stops, and what to read.
 */
export function EvidenceDetail({
  knowledge,
  replacement,
}: {
  knowledge: Knowledge;
  replacement: Replacement;
}) {
  const evidence = evidenceForReplacement(knowledge, replacement);
  if (!evidence) return null;
  return (
    <details className="r-evidence-detail">
      <summary>
        <span className={`r-evidence-badge level-${evidence.level.code.toLowerCase()}`}>
          <b>{evidence.level.code}</b>
          {evidence.level.label_ru}
        </span>
        <span className="r-evidence-more">На чём это основано</span>
        <Icon name="arrow" size={16} />
      </summary>
      <div>
        <p>{evidence.level.claim_ru}</p>
        <p className="r-evidence-limit">{evidence.level.limit_ru}</p>
        {evidence.scope && (
          <p className="r-evidence-limit">
            <b>Границы:</b> {evidence.scope}
          </p>
        )}
        {evidence.sources.length ? (
          <SourceList sources={evidence.sources} />
        ) : (
          <p className="r-evidence-limit">
            Исследования по этому приёму здесь не приводится — это собственная эвристика ALIVE, и
            честнее сказать это прямо.
          </p>
        )}
      </div>
    </details>
  );
}

/**
 * One card of «Факты и Мифы», in the owner's three-part form.
 *
 * A myth's claim is rendered inside «Миф:» and struck through in the section so it can
 * never be skim-read as something ALIVE is asserting. That framing is load-bearing, not
 * decoration: a person scrolling fast must not come away having learned the myth.
 */
export function KnowledgeCardView({
  knowledge,
  card,
  compact = false,
}: {
  knowledge: Knowledge;
  card: KnowledgeCard;
  compact?: boolean;
}) {
  const level = levelOf(knowledge, card.evidence_level);
  const sources = sourcesForCard(knowledge, card);
  const isMyth = card.kind === 'myth';
  return (
    <article className={`r-knowledge-card ${isMyth ? 'myth' : 'fact'} ${compact ? 'compact' : ''}`}>
      <header>
        <span className="r-knowledge-kind">
          <Icon name={isMyth ? 'shield' : 'spark'} size={16} />
          {isMyth ? 'Миф' : 'Факт'}
        </span>
        {level && (
          <span className={`r-evidence-badge level-${level.code.toLowerCase()}`}>
            <b>{level.code}</b>
            {level.label_ru}
          </span>
        )}
      </header>
      <h3 className={isMyth ? 'r-knowledge-myth-claim' : ''}>{card.claim_ru}</h3>
      <div className="r-knowledge-body">
        <p>
          <b>Что известно.</b> {card.known_ru}
        </p>
        <p>
          <b>Что это меняет для тебя.</b> {card.changes_ru}
        </p>
      </div>
      <details className="r-evidence-detail">
        <summary>
          <span className="r-evidence-more">Границы и источники</span>
          <Icon name="arrow" size={16} />
        </summary>
        <div>
          <p className="r-evidence-limit">{card.detail_ru}</p>
          {level && <p className="r-evidence-limit">{level.limit_ru}</p>}
          <SourceList sources={sources} />
        </div>
      </details>
    </article>
  );
}

/**
 * The collapsed form for contextual placements — Связки, and the craving flow.
 *
 * Closed by default and summarised by the claim alone. Someone who came to log a
 * craving gets one extra line, not a paragraph, and opens it only if the line is worth
 * their attention right then.
 */
export function KnowledgeCollapsed({
  knowledge,
  card,
}: {
  knowledge: Knowledge;
  card: KnowledgeCard;
}) {
  const isMyth = card.kind === 'myth';
  return (
    <details className="r-knowledge-inline">
      <summary>
        <span className="r-knowledge-kind">
          <Icon name={isMyth ? 'shield' : 'spark'} size={15} />
          {isMyth ? 'Миф' : 'Факт'}
        </span>
        <span className={isMyth ? 'r-knowledge-myth-claim' : ''}>{card.claim_ru}</span>
      </summary>
      <div>
        <KnowledgeCardView knowledge={knowledge} card={card} compact />
      </div>
    </details>
  );
}

/**
 * Карточка слоя микроосознанности.
 *
 * От карточки «Фактов» отличается тем, ради чего этот слой вообще существует: у неё
 * есть обращение к человеку, а не только изложение. Оно и стоит на самом видном месте —
 * ниже разбора, но крупнее его, потому что в момент, когда карточка появляется, важнее
 * не то, что показало исследование, а то, что это значит для читающего.
 *
 * Границы утверждения никуда не деваются и не прячутся глубже одного клика: правило
 * «ни одного утверждения без границ» не знает исключений по слоям.
 */
export function AwarenessCardView({ card }: { card: AwarenessCard }) {
  const isMyth = card.kind === 'миф';
  return (
    <article className={`r-awareness-card ${isMyth ? 'myth' : 'fact'}`}>
      <header>
        <span className="r-knowledge-kind">
          <Icon name={isMyth ? 'shield' : 'spark'} size={16} />
          {card.kind}
        </span>
        {card.confidence && <span className="r-awareness-confidence">{card.confidence}</span>}
      </header>
      <h3>{card.title}</h3>
      <p className="r-awareness-hook">{card.hook}</p>
      {card.motivation && <p className="r-awareness-motivation">{card.motivation}</p>}
      <details className="r-evidence-detail">
        <summary>
          <span className="r-evidence-more">Разбор, границы и источники</span>
          <Icon name="arrow" size={16} />
        </summary>
        <div>
          <p className="r-evidence-limit">{card.explanation}</p>
          {card.caveat && <p className="r-evidence-limit">{card.caveat}</p>}
          {card.limitations && <p className="r-evidence-limit">{card.limitations}</p>}
          <SourceList sources={card.sources} />
        </div>
      </details>
    </article>
  );
}
