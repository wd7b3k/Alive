/**
 * Опубликованный каталог, каким его видит сборка.
 *
 * Выгрузка `app/knowledge-catalog.json` снимается с базы скриптом
 * `scripts/dump-knowledge-catalog.mjs` и коммитится. Почему копия теперь допустима, а
 * раньше была запрещена — ADR-0018: запрет был не на копию, а на копию, набранную
 * руками. Выгрузка обновляется одной командой, видна в диффе и проходит ревью.
 *
 * Модуль работает на этапе сборки. В рантайм приложения он не попадает: приложение
 * читает те же карточки из базы через `loadKnowledge`, и именно поэтому статическая
 * страница и живой экран показывают одно и то же.
 */
import catalog from '../../knowledge-catalog.json';
import { EVIDENCE_LEVELS, type EvidenceLevelCode } from '../domain/evidence-levels';
import { pathForCode } from '../domain/knowledge-address';

export type CatalogCard = {
  code: string;
  kind: 'fact' | 'myth';
  /** Заголовок: у факта — утверждение, у мифа — само убеждение. */
  claim: string;
  /** Что известно. */
  known: string;
  /** Что это меняет для тебя. */
  changes: string;
  /** Механизм и детали. */
  detail: string;
  level: string;
  /** Границы применимости: у мифа `evidence_scope`, у факта `evidence_kind`. */
  scope: string | null;
  triggers: string[];
  /** Потребность за пусковым моментом; у фактов пусто. */
  needs: string[];
  /** Замены, которые предлагаются в этом контексте; у фактов пусто. */
  replacements: string[];
  /** Метки контекста — самый прямой сигнал «про то же самое». */
  tags: string[];
  /** Категория факта; у мифов `null`. */
  category: string | null;
  products: string[];
  /** Дата последней сверки карточки с источником. */
  verified: string;
  /** Дата последней правки — из неё берётся `lastmod` в карте сайта. */
  updated: string;
  sort_order: number;
  source_title: string;
  source_url: string;
  source_doi: string | null;
  source_publication: string | null;
};

const CARDS = catalog as CatalogCard[];

/**
 * Пустой каталог до сборки не доходит.
 *
 * Пустой раздел — это 38 адресов, исчезнувших из индекса разом, и `ItemList`, который
 * описывает пустоту. Лучше не собраться совсем: отказ виден сразу, а тихо выложенный
 * пустой раздел обнаруживается через неделю в Вебмастере.
 */
if (!Array.isArray(CARDS) || CARDS.length === 0) {
  throw new Error(
    'Каталог пуст: app/knowledge-catalog.json не содержит карточек. ' +
      'Обнови выгрузку — node scripts/dump-knowledge-catalog.mjs — и не выкладывай пустой раздел.',
  );
}

/** Карточки в порядке показа: сначала факты, потом мифы, внутри — по `sort_order`. */
export function cards(): CatalogCard[] {
  return [...CARDS].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'fact' ? -1 : 1;
    return left.sort_order - right.sort_order;
  });
}

export function cardByCode(code: string): CatalogCard | undefined {
  return CARDS.find((card) => card.code === code);
}

export function pathFor(card: CatalogCard): string {
  return pathForCode(card.code);
}

export function levelOf(card: CatalogCard) {
  return EVIDENCE_LEVELS.find((level) => level.code === (card.level as EvidenceLevelCode));
}

/** Заголовок раздела для группировки на хабе. Их ровно два — как в приложении. */
export const GROUPS: ReadonlyArray<{ kind: CatalogCard['kind']; title: string; lead: string }> = [
  {
    kind: 'fact',
    title: 'Факты',
    lead: 'Проверяемые утверждения о курении, вейпе и кальяне — с уровнем доказательности, границами и источником.',
  },
  {
    kind: 'myth',
    title: 'Разобранные убеждения',
    lead: 'Что люди говорят себе про сигареты — и что известно на самом деле. Убеждение не объявляется глупостью: показано, откуда оно и где перестаёт работать.',
  },
];
