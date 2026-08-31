/**
 * Статьи базы знаний: чтение из репозитория, разбор и гарды.
 *
 * Модуль работает **только на этапе сборки** — его зовёт плагин в `vite.config.ts`. В
 * рантайм приложения он не попадает: ни один файл из `src/` его не импортирует, и это
 * проверяется тестом, как и у предрендера. Страницы статей — статика без React: грузить
 * человеку, пришедшему прочитать один ответ, 613 КБ приложения незачем.
 *
 * Главное правило раздела — ADR-0017: **статья не пересказывает утверждение каталога, а
 * цитирует его по коду**. В тексте стоит `{{claim:without_smoking_more_anxious}}`, на
 * сборке подставляется текст, уровень, границы и источник из базы. Второго текста
 * утверждения в репозитории не существует, поэтому расходиться нечему.
 *
 * Здесь живёт всё, что можно проверить без доступа к базе: структура статьи, редакционный
 * протокол (`docs/EDITORIAL_PROTOCOL_MED.md`), источники, запись об изменениях и наличие
 * процитированных кодов в замке. Подстановка текстов и сверка хэшей — в
 * `knowledge-pages.ts`, потому что для них нужен каталог.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type ArticleLevel = 'A' | 'B' | 'C';

export type ArticleSource = {
  title: string;
  publication: string;
  date: string;
  url: string;
  type: string;
};

export type ArticleChange = { date: string; what: string };

export type Article = {
  /** Путь файла относительно корня репозитория — для сообщений об ошибках и `lastmod`. */
  file: string;
  slug: string;
  cluster: string;
  title: string;
  h1: string;
  question: string;
  answer_short: string;
  level: ArticleLevel;
  claims: string[];
  sources: ArticleSource[];
  author: string | null;
  /** Рецензента у раздела нет. Поле заведено под будущее решение владельца. */
  reviewer: string | null;
  updated: string;
  changelog: ArticleChange[];
  related: string[];
  faq: { q: string; a: string }[];
  body: string;
};

export type Cluster = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string[];
  articles: string[];
};

export type ClusterRegistry = {
  clusters: Cluster[];
  /** Статьи, из которых собираются «Частые вопросы» на главной, — редакторский выбор. */
  home_faq: string[];
};

/**
 * Имена внутри `/knowledge`, которые кластером быть не могут.
 *
 * `/knowledge/method` — страница метода, `/knowledge/updates` — лента обновлений. Оба
 * адреса заняты сборкой, и кластер с таким именем молча перезаписал бы их файлы.
 */
export const RESERVED_SEGMENTS = ['method', 'updates'];

/**
 * Домены, ссылку на которые протокол считает первоисточником.
 *
 * Список, а не запрет пересказов: перечислить все агрегаторы невозможно, перечислить
 * издания, которые проект считает источником, — можно. Расширяется правкой этого
 * массива, то есть коммитом и ревью, а не молча. Обоснование —
 * `docs/EDITORIAL_PROTOCOL_MED.md` §3.
 */
export const PRIMARY_SOURCE_HOSTS = [
  'cochrane.org',
  'cochranelibrary.com',
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'nejm.org',
  'bmj.com',
  'thelancet.com',
  'jamanetwork.com',
  'annals.org',
  'who.int',
  'nice.org.uk',
  'cdc.gov',
  'archive.cdc.gov',
  'hhs.gov',
  'nih.gov',
  'ahajournals.org',
  'ersjournals.com',
  'academic.oup.com',
  'sciencedirect.com',
  'link.springer.com',
  'doi.org',
];

/**
 * Латиница, разрешённая в тексте статьи.
 *
 * Продолжает список из миграции `20260827220000_v3_latin_purge.sql`: имя продукта,
 * аббревиатуры организаций и изданий. Адреса и коды под правило не подпадают — оно про
 * текст, который читает человек, а не про слаг в ссылке.
 */
export const LATIN_ALLOWED = [
  'Habitoff',
  'ALIVE',
  'CDC',
  'JAMA',
  'NEJM',
  'BMJ',
  'WHO',
  'NICE',
  'NHS',
  'FEV',
  'light',
  'low-tar',
  'Freedom Fund',
];

/** Запрещённые протоколом конструкции. Форма, а не тема: писать о препаратах можно. */
const FORBIDDEN: { rule: string; pattern: RegExp; why: string }[] = [
  {
    rule: 'дозировка',
    pattern: /\b\d+(?:[.,]\d+)?\s*(?:мг|мкг|г)\b|\bпо\s+\d+\s+таблет|\d+\s*раз[а]?\s+в\s+(?:день|сутки)|\bдозировк|\bдоз[ауы]\s+препарат|\bпринимать\s+по\b/i,
    why: 'дозировку не назначает ни продукт, ни LLM — AGENTS.md',
  },
  {
    rule: 'сравнение препаратов',
    pattern:
      /(?:препарат|варениклин|бупропион|цитизин|НЗТ|терапи[яю])[^.]{0,60}\b(?:лучше|эффективнее|действеннее)\b|\b(?:самый|наиболее)\s+(?:эффективн|действенн)\w*\s+(?:препарат|способ|метод)/i,
    why: 'ранжировать лечение без данных о человеке — работа врача',
  },
  {
    rule: 'рекомендация',
    pattern:
      /\b(?:принимайте|пропейте|начните\s+принимать|советуем\s+препарат|рекомендуем\s+препарат|вам\s+нужно\s+прин)/i,
    why: 'Habitoff описывает, что известно, и не назначает',
  },
  {
    rule: 'обещание',
    pattern:
      /\b(?:вылечит|вылечива|гарантированно|гарантиру|обязательно\s+поможет|навсегда\s+избав|заменяет\s+врача|продлит\s+жизнь\s+на)/i,
    why: 'прямой запрет AGENTS.md «никаких медицинских обещаний»',
  },
  {
    rule: 'срок тяги без источника',
    pattern: /тяг[аиу][^.]{0,40}\d+\s*[–—-]\s*\d+\s*минут|\d+\s*[–—-]\s*\d+\s*минут[^.]{0,30}тяг/i,
    why: 'точный срок одной волны тяги — утверждение без источника, llms.txt',
  },
  {
    rule: 'проценты безопасности вейпа',
    pattern: /вейп[^.]{0,60}\d+\s*%|\d+\s*%[^.]{0,40}безопасн/i,
    why: '«на 95 % безопаснее» — утверждение без источника, llms.txt',
  },
  {
    rule: 'соотношение кальяна и сигарет',
    pattern: /кальян[^.]{0,40}=\s*\d+|один\s+кальян[^.]{0,40}\d+\s*сигарет/i,
    why: 'любое соотношение «один кальян = N сигарет» — утверждение без источника',
  },
  {
    rule: 'изображение',
    pattern: /!\[[^\]]*\]\(|<img\b/i,
    why: 'изображений в статьях нет вовсе — EDITORIAL_PROTOCOL_MED §1, 15-ФЗ',
  },
];

/** Слова, при которых статья обязана сказать, что решение о препарате принимает врач. */
const MEDICATION_WORDS =
  /\b(?:НЗТ|никотинзаместительн|варениклин|бупропион|цитизин|препарат)/i;

function fail(file: string, message: string): never {
  throw new Error(`База знаний, ${file}: ${message}`);
}

/**
 * Разбор фронтматтера.
 *
 * Не YAML целиком, а его узкое и описанное подмножество: скаляр, список скаляров и
 * список объектов из скаляров. Всё, что в эту грамматику не попало, — отказ с номером
 * строки. Полноценный парсер здесь был бы зависимостью ради семи форм записи, а молчаливо
 * проглоченная строка в медицинском тексте дороже любого удобства.
 */
export function parseFrontmatter(raw: string, file: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = raw.split('\n');
  let key: string | null = null;
  let list: unknown[] | null = null;
  let item: Record<string, string | null> | null = null;

  const flush = () => {
    if (key && list) {
      if (item) list.push(item);
      // Пустой список и осознанно пустое поле — разные вещи: `author:` без значения
      // должен остаться пустым, а не превратиться в пустой массив.
      if (list.length) out[key] = list;
    }
    list = null;
    item = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const at = `строка ${index + 1} фронтматтера`;
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const scalar = /^([a-z][a-z0-9_]*):\s*(.*)$/.exec(line);
    if (scalar) {
      flush();
      key = scalar[1];
      const value = scalar[2].trim();
      if (value === '') {
        // Пустое значение — начало списка либо осознанно пустое поле. Что именно,
        // станет ясно на следующей строке; до тех пор запоминаем ключ.
        list = [];
        out[key] = null;
      } else {
        out[key] = unquote(value);
        key = null;
      }
      continue;
    }

    const listItem = /^\s{2}-\s+(.*)$/.exec(line);
    if (listItem) {
      if (!key || !list) fail(file, `${at}: элемент списка без ключа`);
      if (item) list.push(item);
      item = null;
      const nested = /^([a-z][a-z0-9_]*):\s*(.*)$/.exec(listItem[1]);
      if (nested) {
        item = { [nested[1]]: unquote(nested[2].trim()) };
      } else {
        list.push(unquote(listItem[1].trim()));
      }
      continue;
    }

    const nested = /^\s{4}([a-z][a-z0-9_]*):\s*(.*)$/.exec(line);
    if (nested) {
      if (!item) fail(file, `${at}: поле объекта вне элемента списка`);
      item[nested[1]] = unquote(nested[2].trim());
      continue;
    }

    fail(file, `${at}: не разобрана — «${line.trim()}»`);
  }
  flush();
  return out;
}

function unquote(value: string): string {
  const quoted = /^(['"])([\s\S]*)\1$/.exec(value);
  return quoted ? quoted[2] : value;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * У источника допустимы год, год с месяцем и полная дата.
 *
 * Издания датируются по-разному: у кокрейновского обзора есть месяц, у руководства —
 * только год. Требовать день от того, у кого его нет, значит заставить редактора
 * выдумать дату — а библиография нужна ровно затем, чтобы ничего не выдумывать.
 */
const SOURCE_DATE = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;

function text(source: Record<string, unknown>, field: string, file: string): string {
  const value = source[field];
  if (typeof value !== 'string' || !value.trim()) {
    fail(file, `нет обязательного поля «${field}»`);
  }
  return value.trim();
}

function list(source: Record<string, unknown>, field: string): unknown[] {
  const value = source[field];
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) return [];
  return value;
}

/** Одна статья: фронтматтер, текст и все проверки, для которых не нужен каталог. */
export function parseArticle(raw: string, file: string): Article {
  const split = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!split) fail(file, 'нет фронтматтера между двумя строками «---»');
  const head = parseFrontmatter(split[1], file);
  const body = split[2].trim();
  if (!body) fail(file, 'пустой текст статьи');

  const level = text(head, 'level', file);
  if (level !== 'A' && level !== 'B' && level !== 'C') {
    fail(file, `уровень «${level}» не из словаря A/B/C — четвёртого словаря не заводится`);
  }

  const updated = text(head, 'updated', file);
  if (!DATE.test(updated)) fail(file, `дата «updated» не в виде ГГГГ-ММ-ДД: «${updated}»`);

  const sources = list(head, 'sources').map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      fail(file, `источник №${index + 1} записан не объектом`);
    }
    const row = entry as Record<string, string | null>;
    for (const field of ['title', 'publication', 'date', 'url', 'type']) {
      if (!row[field]) fail(file, `у источника №${index + 1} нет поля «${field}»`);
    }
    if (!SOURCE_DATE.test(String(row.date))) {
      fail(file, `у источника №${index + 1} дата «${row.date}» не в виде ГГГГ, ГГГГ-ММ или ГГГГ-ММ-ДД`);
    }
    return row as unknown as ArticleSource;
  });

  const changelog = list(head, 'changelog').map((entry, index) => {
    const row = entry as Record<string, string>;
    if (!row?.date || !row?.what) fail(file, `запись об изменении №${index + 1} неполна`);
    if (!DATE.test(row.date)) fail(file, `дата записи №${index + 1} не в виде ГГГГ-ММ-ДД`);
    return { date: row.date, what: row.what };
  });
  if (!changelog.length) fail(file, 'нет ни одной записи в «changelog»');
  const newest = changelog.map((entry) => entry.date).sort().at(-1);
  if (newest !== updated) {
    fail(
      file,
      `«updated» = ${updated}, а самая свежая запись в changelog — ${newest}. ` +
        'Правка опубликованной статьи обязана называть себя.',
    );
  }

  const faq = list(head, 'faq').map((entry, index) => {
    const row = entry as Record<string, string>;
    if (!row?.q || !row?.a) fail(file, `вопрос FAQ №${index + 1} неполон`);
    return { q: row.q, a: row.a };
  });

  const article: Article = {
    file,
    slug: text(head, 'slug', file),
    cluster: text(head, 'cluster', file),
    title: text(head, 'title', file),
    h1: text(head, 'h1', file),
    question: text(head, 'question', file),
    answer_short: text(head, 'answer_short', file),
    level,
    claims: list(head, 'claims').map(String),
    sources,
    author: (head.author as string) ?? null,
    reviewer: (head.reviewer as string) ?? null,
    updated,
    changelog,
    related: list(head, 'related').map(String),
    faq,
    body,
  };

  if (!/^[a-z0-9-]+$/.test(article.slug)) {
    fail(file, `слаг «${article.slug}» не из строчной латиницы и дефисов`);
  }
  if (!sources.length) fail(file, 'ни одного источника: раздел существует ради источников');
  const answerWords = article.answer_short.split(/\s+/).length;
  if (answerWords < 15 || answerWords > 90) {
    fail(
      file,
      `«answer_short» в ${answerWords} слов. Это первый абзац и то, что заберёт ` +
        'ИИ-ответ: он обязан быть самодостаточным и коротким — 15–90 слов.',
    );
  }
  return article;
}

/** Редакционный протокол: то, что можно поймать по тексту. */
export function checkEditorial(article: Article): void {
  const prose = `${article.h1}\n${article.question}\n${article.answer_short}\n${article.body}`;

  for (const { rule, pattern, why } of FORBIDDEN) {
    const hit = pattern.exec(prose);
    if (hit) {
      fail(
        article.file,
        `протокол «${rule}» нарушен — «${hit[0].trim()}». ${why}. ` +
          'docs/EDITORIAL_PROTOCOL_MED.md §1',
      );
    }
  }

  if (MEDICATION_WORDS.test(prose) && !/врач/i.test(prose)) {
    fail(
      article.file,
      'статья называет препараты и ни разу не говорит, что решение о препарате ' +
        'принимает врач. docs/EDITORIAL_PROTOCOL_MED.md §2',
    );
  }

  for (const source of article.sources) {
    let host: string;
    try {
      host = new URL(source.url).hostname.replace(/^www\./, '');
    } catch {
      fail(article.file, `адрес источника «${source.url}» не разбирается`);
    }
    const primary = PRIMARY_SOURCE_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
    if (!primary) {
      fail(
        article.file,
        `источник на «${host}» не в списке первоисточников. Пересказ пересказа ` +
          'источником не считается — docs/EDITORIAL_PROTOCOL_MED.md §3',
      );
    }
  }

  // Латиница в тексте, который читает человек. Сноски, коды утверждений и адреса из
  // проверки убираются: правило про язык продукта, а не про разметку.
  const readable = prose
    .replace(/\{\{claim:[a-z0-9_]+\}\}/g, ' ')
    .replace(/\[\^\d+\]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(new RegExp(LATIN_ALLOWED.join('|'), 'g'), ' ');
  const latin = /[A-Za-z]{2,}/.exec(readable);
  if (latin) {
    fail(
      article.file,
      `латиница «${latin[0]}» вне списка разрешённых. Продукт говорит по-русски — ` +
        'миграция 20260827220000_v3_latin_purge.sql, тот же список',
    );
  }

  // Сноска обязана указывать на существующий источник, иначе читатель дойдёт до
  // библиографии и не найдёт того, ради чего шёл.
  for (const match of article.body.matchAll(/\[\^(\d+)\]/g)) {
    const number = Number(match[1]);
    if (!Number.isInteger(number) || number < 1 || number > article.sources.length) {
      fail(article.file, `сноска [^${match[1]}] указывает на источник, которого нет`);
    }
  }
}

/** Коды утверждений, процитированные статьёй в тексте. */
export function citedClaims(article: Article): string[] {
  const inBody = [...article.body.matchAll(/\{\{claim:([a-z0-9_]+)\}\}/g)].map((m) => m[1]);
  return [...new Set([...article.claims, ...inBody])];
}

/**
 * Все коды, которые статья цитирует, обязаны быть в замке.
 *
 * Проверка работает без доступа к базе — ради этого замок и существует. Хэши сверяет
 * `knowledge-pages.ts` там, где каталог доступен.
 */
export function checkClaimsAgainstLock(
  article: Article,
  lock: { claims: Record<string, { kind: string; level: string; hash: string }> },
): void {
  for (const code of citedClaims(article)) {
    if (!lock.claims[code]) {
      fail(
        article.file,
        `цитируется утверждение «${code}», которого нет среди опубликованных. ` +
          'Либо код с опечаткой, либо карточка снята с публикации. ' +
          'Пересобрать замок: node scripts/knowledge-lock.mjs',
      );
    }
  }
  // Обещанное во фронтматтере и процитированное в тексте — один список. Иначе
  // «claims» превращается в декорацию, по которой ничего нельзя найти.
  const inBody = new Set([...article.body.matchAll(/\{\{claim:([a-z0-9_]+)\}\}/g)].map((m) => m[1]));
  for (const code of article.claims) {
    if (!inBody.has(code)) {
      fail(article.file, `«${code}» обещан во фронтматтере, но в тексте не процитирован`);
    }
  }
}

/** Читает реестр кластеров и все статьи, сверяя одно с другим. */
export function readContent(contentDir: string): { registry: ClusterRegistry; articles: Article[] } {
  const registryFile = join(contentDir, 'clusters.json');
  const registry = JSON.parse(readFileSync(registryFile, 'utf8')) as ClusterRegistry;
  const articles: Article[] = [];

  for (const cluster of registry.clusters) {
    if (RESERVED_SEGMENTS.includes(cluster.slug)) {
      fail('content/knowledge/clusters.json', `имя «${cluster.slug}» занято сборкой`);
    }
    const dir = join(contentDir, cluster.slug);
    const files = readdirSync(dir).filter((name) => name.endsWith('.md'));
    const known = new Set(cluster.articles);
    for (const name of files) {
      const slug = name.replace(/\.md$/, '');
      if (!known.has(slug)) {
        fail(
          `content/knowledge/${cluster.slug}/${name}`,
          'файл есть, а в clusters.json его нет. Порядок статей — редакторское решение, ' +
            'и появляться в разделе статья должна намеренно',
        );
      }
    }
    for (const slug of cluster.articles) {
      const file = `content/knowledge/${cluster.slug}/${slug}.md`;
      const full = join(dir, `${slug}.md`);
      if (!statSync(full, { throwIfNoEntry: false })?.isFile()) {
        fail('content/knowledge/clusters.json', `в кластере «${cluster.slug}» назван ${slug}.md, которого нет`);
      }
      const article = parseArticle(readFileSync(full, 'utf8'), file);
      if (article.slug !== slug) fail(file, `слаг «${article.slug}» не совпадает с именем файла`);
      if (article.cluster !== cluster.slug) {
        fail(file, `кластер «${article.cluster}» не совпадает с каталогом «${cluster.slug}»`);
      }
      checkEditorial(article);
      articles.push(article);
    }
  }

  const slugs = new Set<string>();
  for (const article of articles) {
    const path = `${article.cluster}/${article.slug}`;
    if (slugs.has(path)) fail(article.file, 'такой адрес уже занят другой статьёй');
    slugs.add(path);
  }
  for (const article of articles) {
    for (const related of article.related) {
      if (!slugs.has(related)) {
        fail(article.file, `«related: ${related}» ведёт в никуда — такой статьи нет`);
      }
    }
  }
  return { registry, articles };
}

export function articlePath(article: Pick<Article, 'cluster' | 'slug'>): string {
  return `/knowledge/${article.cluster}/${article.slug}`;
}
