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

/**
 * Одно утверждение каталога вместе с источником.
 *
 * Приезжает из базы на этапе выкладки (`scripts/dump-knowledge-for-schema.mjs`), а не
 * лежит копией в репозитории. Причина простая: текст каталога правят миграции — их уже
 * одиннадцать только по мифам, — и любая копия в git разошлась бы с базой на следующей
 * же. `docs/SEO_AND_ANALYTICS.md` называет такую копию хуже отсутствия, и это про неё.
 */
export type KnowledgeEntry = {
  code: string;
  /** Убеждение, как его формулирует человек. В разметке — `Question.name`. */
  title: string;
  /** Что известно на самом деле. В разметке — `acceptedAnswer.text`. */
  answer: string;
  sourceLabel: string;
  sourceUrl: string;
  doi?: string | null;
};

/**
 * Ссылка на собственную методологию источником не является.
 *
 * Три мифа из девятнадцати ссылаются на `docs/METHODOLOGY.md` — это рабочие эвристики
 * проекта, и `AGENTS.md` требует называть их эвристиками, а не выдавать за доказанное.
 * В разметку, которая уезжает в сниппет и в пересказ модели, они не идут: сослаться на
 * себя — это не сослаться.
 */
export function hasExternalSource(entry: KnowledgeEntry): boolean {
  if (!entry.sourceUrl) return false;
  return !/github\.com\/wd7b3k|habitoff\.ru/i.test(entry.sourceUrl);
}

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

/**
 * Вопросы и ответы каталога — только те, у кого есть внешний источник.
 *
 * Каждый `Question` несёт `citation` на публикацию. Утверждение без источника в разметку
 * не попадает вовсе: в сниппете и в пересказе модели оно осталось бы утверждением о
 * здоровье без основания.
 */
export function knowledgeItemList(entries: KnowledgeEntry[]): Node | null {
  const cited = entries.filter(hasExternalSource);
  if (!cited.length) return null;
  return {
    '@type': 'ItemList',
    '@id': `${ORIGIN}/knowledge#claims`,
    name: 'Разобранные убеждения о курении',
    numberOfItems: cited.length,
    itemListElement: cited.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Question',
        '@id': `${ORIGIN}/knowledge#${entry.code}`,
        name: entry.title,
        acceptedAnswer: {
          '@type': 'Answer',
          text: entry.answer,
          citation: {
            '@type': 'CreativeWork',
            name: entry.sourceLabel,
            url: entry.sourceUrl,
            ...(entry.doi ? { identifier: `https://doi.org/${entry.doi}` } : {}),
          },
        },
      },
    })),
  };
}

/**
 * Граф для внутреннего адреса. `WebSite` присутствует ссылкой, а не копией: узел
 * описан на главной, здесь он только адресуется по `@id`.
 */
export function routeGraph(path: string, entries: KnowledgeEntry[] = []): Node[] {
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
    const list = knowledgeItemList(entries);
    if (list) {
      graph.push(list);
      page.mainEntity = { '@id': `${ORIGIN}/knowledge#claims` };
    }
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
