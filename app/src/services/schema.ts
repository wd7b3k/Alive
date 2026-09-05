/**
 * Структурированные данные по месту.
 *
 * До 31.08.2026 на всех шести адресах стояла одна и та же разметка:
 * `WebSite + WebApplication + Offer + FAQPage` с пятью вопросами. `FAQPage` описывает
 * главную, а стоял везде — для поисковика это шесть страниц с одинаковым набором
 * вопросов. Пререндер к тому дню уже подставлял своё тело, а разметку копировал целиком.
 *
 * Отсюда правило этого модуля: **`FAQPage` живёт ровно на одном адресе.** Остальные
 * получают разметку по смыслу раздела и `BreadcrumbList`, а не чужую копию.
 *
 * `Organization` и `sameAs` здесь сознательно нет: адресов сообществ у продукта пока не
 * существует, а `sameAs` без адресов — это заявка на профили, которых нет.
 *
 * Модуль работает на этапе сборки: его зовёт пререндер, в рантайм приложения он не
 * попадает.
 */
import { ORIGIN, metaFor } from './seo';
import { GROUPS, cards, levelOf, pathFor, type CatalogCard } from './knowledge-catalog';

type Node = Record<string, unknown>;

const WEBSITE_ID = `${ORIGIN}/#website`;

function breadcrumb(path: string, name: string): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${ORIGIN}${path}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name, item: `${ORIGIN}${path}` },
    ],
  };
}

/** Короткое имя раздела для хлебных крошек — не `title`, который писан под выдачу. */
const CRUMB: Record<string, string> = {
  '/knowledge': 'Факты и мифы',
  '/links': 'Связки',
  '/meanings': 'Смыслы',
  '/experiment': 'О методе',
  '/releases': 'Что нового',
};

/** Тип страницы по смыслу раздела: подборка сущностей или обычная страница. */
const PAGE_TYPE: Record<string, string> = {
  '/knowledge': 'CollectionPage',
  '/links': 'CollectionPage',
  '/meanings': 'CollectionPage',
  '/experiment': 'AboutPage',
  '/releases': 'CollectionPage',
};

/** О чём раздел. `about` — единственное поле, которое поисковик читает как тему. */
const ABOUT: Record<string, string> = {
  '/knowledge': 'Доказательная база о курении, вейпе и кальяне',
  '/links': 'Связка «момент — состояние — сигарета» и потребности за ней',
  '/meanings': 'Цели и ценности, ради которых человек меняет привычку',
  '/experiment': 'Метод разбора никотиновых автоматизмов',
  '/releases': 'История версий Habitoff',
};

function citationOf(card: CatalogCard): Node {
  return {
    '@type': 'CreativeWork',
    name: card.source_publication
      ? `${card.source_title} · ${card.source_publication}`
      : card.source_title,
    url: card.source_url,
    ...(card.source_doi ? { identifier: `https://doi.org/${card.source_doi}` } : {}),
  };
}

/**
 * Оглавление каталога: элементы ссылаются на реальные адреса.
 *
 * До 05.09.2026 `ItemList` на `/knowledge` перечислял шестнадцать вопросов, у которых
 * не было ни адреса, ни присутствия в видимом тексте страницы. Теперь у каждого своя
 * страница, и элемент списка — ссылка на неё, а не вопрос, живущий только в разметке.
 */
export function knowledgeHubList(): Node {
  const all = cards();
  return {
    '@type': 'ItemList',
    '@id': `${ORIGIN}/knowledge#claims`,
    name: 'Факты и разобранные убеждения о курении',
    numberOfItems: all.length,
    itemListElement: all.map((card, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: card.claim,
      url: `${ORIGIN}${pathFor(card)}`,
    })),
  };
}

/**
 * Разметка страницы карточки.
 *
 * `Question` с `acceptedAnswer` и `citation` — и ничего сверх того, что есть в видимом
 * тексте страницы. Не `ClaimReview`: он предназначен организациям-фактчекерам и имеет
 * отдельные требования допуска. Не `QAPage`: он про форумы с пользовательскими
 * ответами, а здесь редакционная карточка с источником.
 */
export function cardGraph(card: CatalogCard): Node[] {
  const level = levelOf(card);
  const group = GROUPS.find((entry) => entry.kind === card.kind);
  const url = `${ORIGIN}${pathFor(card)}`;
  const answer = [card.known, card.changes, card.detail].filter(Boolean).join(' ');
  return [
    {
      '@type': 'WebPage',
      '@id': `${url}#page`,
      url,
      name: card.claim,
      description: card.known,
      inLanguage: 'ru-RU',
      isPartOf: { '@id': WEBSITE_ID },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      mainEntity: { '@id': `${url}#claim` },
      ...(card.verified ? { dateModified: card.updated } : {}),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Факты и мифы', item: `${ORIGIN}/knowledge` },
        { '@type': 'ListItem', position: 3, name: card.claim, item: url },
      ],
    },
    {
      '@type': 'Question',
      '@id': `${url}#claim`,
      name: card.claim,
      ...(group ? { about: group.title } : {}),
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
        // Уровень доказательности и его границы — часть ответа, а не украшение:
        // утверждение без границ здесь не показывается нигде, включая разметку.
        ...(level ? { abstract: `${level.label_ru}. ${level.limit_ru}` } : {}),
        citation: citationOf(card),
      },
    },
  ];
}

/**
 * Граф для внутреннего адреса. `WebSite` присутствует ссылкой, а не копией: узел
 * описан на главной, здесь он только адресуется по `@id`.
 */
export function routeGraph(path: string): Node[] {
  const meta = metaFor(path);
  const crumbName = CRUMB[path] ?? meta.title;
  const page: Node = {
    '@type': PAGE_TYPE[path] ?? 'WebPage',
    '@id': `${ORIGIN}${path}#page`,
    url: `${ORIGIN}${path}`,
    name: meta.title,
    description: meta.description,
    inLanguage: 'ru-RU',
    isPartOf: { '@id': WEBSITE_ID },
    breadcrumb: { '@id': `${ORIGIN}${path}#breadcrumb` },
    ...(ABOUT[path] ? { about: ABOUT[path] } : {}),
  };
  const graph: Node[] = [page, breadcrumb(path, crumbName)];
  if (path === '/knowledge') {
    graph.push(knowledgeHubList());
    page.mainEntity = { '@id': `${ORIGIN}/knowledge#claims` };
  }
  return graph;
}

/**
 * Граф для несуществующего адреса. Ни `FAQPage`, ни подборок: страница ошибки не
 * описывает ничего, кроме себя, и в индекс не идёт.
 */
export function notFoundGraph(): Node[] {
  return [
    {
      '@type': 'WebPage',
      '@id': `${ORIGIN}/404#page`,
      name: 'Страница не найдена',
      inLanguage: 'ru-RU',
      isPartOf: { '@id': WEBSITE_ID },
    },
  ];
}

/** Готовый тег со скриптом — то, что подставляется в документ. */
export function scriptTag(graph: Node[]): string {
  const payload = { '@context': 'https://schema.org', '@graph': graph };
  // Экранируется только `<`: закрывающий тег внутри JSON оборвал бы скрипт, а по
  // содержимому каталога такое вполне возможно.
  const json = JSON.stringify(payload, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n    </script>`;
}
