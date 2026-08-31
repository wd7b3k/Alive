/**
 * Сборка базы знаний: что кладётся в `dist` и при каких условиях.
 *
 * Модуль этапа сборки. Он связывает три вещи, каждая из которых живёт отдельно:
 * статьи из репозитория (`knowledge-content.ts`), утверждения из каталога
 * (`scripts/knowledge-lock.mjs`) и разметку страниц (`knowledge-pages.ts`).
 *
 * ## Две ситуации, и разница между ними принципиальна
 *
 * **Каталог доступен** — сервер выкладки, локальная проверка с ключом. Тексты
 * утверждений подставляются, хэши сверяются с замком, страницы раскладываются. Любое
 * расхождение — отказ сборки: страница с пустым местом на месте медицинского
 * утверждения не должна существовать даже минуту.
 *
 * **Каталога нет** — CI, песочница. Проверяется всё, что можно проверить без базы:
 * структура статьи, редакционный протокол, источники, коды по замку. Страницы статей
 * **не раскладываются**, и сборка говорит об этом громко. Такая сборка на прод не
 * попадает по устройству: выкладка идёт на сервере, где `app/.env` есть всегда — без
 * него не работает и само приложение.
 *
 * Промежуточного состояния нет намеренно. «Подставить заглушку» означало бы выложить
 * страницу, которая утверждает о здоровье меньше, чем обещает; «собрать из замка»
 * означало бы держать в репозитории вторую копию текста. ADR-0017 отвергает оба.
 */
import { join } from 'node:path';

import {
  buildEnv,
  claimHash,
  fetchClaims,
  readLock,
  type CatalogClaim,
} from '../../../scripts/knowledge-lock.mjs';
import {
  articlePath,
  checkClaimsAgainstLock,
  citedClaims,
  readContent,
  type Article,
  type ClusterRegistry,
} from './knowledge-content';
import {
  renderArticle,
  renderCluster,
  renderMethod,
  renderUpdatesFeed,
  renderUpdatesLatest,
  type Assets,
  type Claim,
} from './knowledge-pages';

export type KnowledgeFile = { path: string; contents: string; sources: string[] };

export type KnowledgeBuild = {
  registry: ClusterRegistry;
  articles: Article[];
  /** Файлы для `dist`: путь относительно каталога вывода. */
  files: KnowledgeFile[];
  /** Адреса для карты сайта вместе с файлами, по которым считается `lastmod`. */
  routes: { path: string; sources: string[] }[];
  /** Пусто, когда каталог был доступен; иначе — причина, по которой статей нет. */
  skipped: string | null;
};

const SHARED = [
  'src/services/knowledge-content.ts',
  'src/services/knowledge-pages.ts',
  'src/services/knowledge-build.ts',
  '../content/knowledge/clusters.json',
];

/**
 * Дословная копия текста карточки внутри текста статьи.
 *
 * Это та же запрещённая копия, только записанная руками: статья, повторившая
 * утверждение своими буквами, перестанет обновляться вместе с базой. Порог — предложение
 * целиком, а не совпадение слов: разбирать утверждение своими словами статья обязана,
 * иначе ей нечего сказать.
 */
export function checkNoVerbatimCopy(article: Article, claims: Map<string, CatalogClaim>): void {
  const prose = article.body.replace(/\{\{claim:[a-z0-9_]+\}\}/g, ' ').replace(/\s+/g, ' ');
  for (const claim of claims.values()) {
    for (const [field, value] of Object.entries({
      claim: claim.claim,
      known: claim.known,
      changes: claim.changes,
      detail: claim.detail,
    })) {
      for (const sentence of String(value).split(/(?<=[.!?])\s+/)) {
        const normalized = sentence.trim().replace(/\s+/g, ' ');
        if (normalized.length < 40) continue;
        if (prose.includes(normalized)) {
          throw new Error(
            `База знаний, ${article.file}: дословно повторяет поле «${field}» карточки ` +
              `«${claim.code}» — «${normalized.slice(0, 60)}…». Это та же копия, которая ` +
              'разойдётся с базой на первой миграции. Цитируй по коду: ' +
              `{{claim:${claim.code}}}`,
          );
        }
      }
    }
  }
}

/**
 * Сверка процитированных утверждений с живым каталогом.
 *
 * Ловит обратный случай к «кода нет в замке»: код на месте, а карточку правили
 * миграцией, и статью вокруг неё никто не перечитывал. Границы поменялись, текст
 * остался — худшее из возможного для раздела, который существует ради границ.
 */
export function checkAgainstCatalog(
  article: Article,
  lock: { claims: Record<string, { hash: string }> },
  catalog: Map<string, CatalogClaim>,
): void {
  for (const code of citedClaims(article)) {
    const claim = catalog.get(code);
    if (!claim) {
      throw new Error(
        `База знаний, ${article.file}: утверждение «${code}» есть в замке, но каталог ` +
          'его не отдаёт. Карточка снята с публикации — статью надо перечитать.',
      );
    }
    if (lock.claims[code]?.hash !== claimHash(claim)) {
      throw new Error(
        `База знаний, ${article.file}: утверждение «${code}» изменилось с момента, ` +
          'когда статья писалась (хэш не совпал с замком). Перечитай статью вокруг ' +
          'него и пересобери замок: node scripts/knowledge-lock.mjs',
      );
    }
  }
}

function toClaim(claim: CatalogClaim): Claim {
  return {
    code: claim.code,
    kind: claim.kind,
    claim: claim.claim,
    known: claim.known,
    changes: claim.changes,
    detail: claim.detail,
    level: claim.level,
    source: claim.source,
  };
}

/**
 * Собирает раздел целиком.
 *
 * `root` — корень приложения (`app/`), `contentDir` — `content/knowledge` в корне
 * репозитория. Разделение существует потому, что содержание раздела — не часть
 * фронтенда: его правит редактор, а не разработчик.
 */
export async function buildKnowledge(root: string, assets: Assets): Promise<KnowledgeBuild> {
  const contentDir = join(root, '..', 'content', 'knowledge');
  const { registry, articles } = readContent(contentDir);
  const lock = readLock(join(contentDir, 'claims.lock.json'));

  for (const article of articles) checkClaimsAgainstLock(article, lock);

  const env = buildEnv(root);
  if (!env.url || !env.key) {
    return {
      registry,
      articles,
      files: [],
      routes: [],
      skipped:
        'каталог недоступен: нет VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY. ' +
        'Статьи проверены, но не разложены — такая сборка не полна и на прод не идёт.',
    };
  }

  const catalog = await fetchClaims(env);

  for (const article of articles) {
    checkAgainstCatalog(article, lock, catalog);
    checkNoVerbatimCopy(article, catalog);
  }

  const claims = new Map<string, Claim>(
    [...catalog.entries()].map(([code, claim]) => [code, toClaim(claim)]),
  );

  const files: KnowledgeFile[] = [];
  const routes: { path: string; sources: string[] }[] = [];

  for (const cluster of registry.clusters) {
    const inCluster = articles.filter((article) => article.cluster === cluster.slug);
    files.push({
      path: join('knowledge', cluster.slug, 'index.html'),
      contents: renderCluster(cluster, inCluster, assets),
      sources: SHARED,
    });
    routes.push({
      path: `/knowledge/${cluster.slug}`,
      sources: [...SHARED, ...inCluster.map((article) => `../${article.file}`)],
    });
    for (const article of inCluster) {
      files.push({
        path: join('knowledge', cluster.slug, article.slug, 'index.html'),
        contents: renderArticle(article, cluster, claims, assets, articles),
        sources: [...SHARED, `../${article.file}`],
      });
      routes.push({ path: articlePath(article), sources: [...SHARED, `../${article.file}`] });
    }
  }

  files.push({
    path: join('knowledge', 'method', 'index.html'),
    contents: renderMethod(registry, articles, assets),
    sources: SHARED,
  });
  routes.push({ path: '/knowledge/method', sources: SHARED });

  files.push({
    path: join('knowledge', 'updates', 'latest.json'),
    contents: renderUpdatesLatest(articles),
    sources: SHARED,
  });
  files.push({
    path: join('knowledge', 'updates', 'feed.xml'),
    contents: renderUpdatesFeed(articles),
    sources: SHARED,
  });

  return { registry, articles, files, routes, skipped: null };
}

/**
 * Числа и перечни для `llms.txt` — из базы, а не из руками написанной копии.
 *
 * Карточка доски `chisla-v-llms-txt`: файл называл «19 фактов, 19 мифов и 28 моментов»
 * статической строкой, то есть тем самым способом, который для `index.html` был
 * отвергнут. Копия уже разошлась — моментов на проде 25, а не 28.
 *
 * Числа берутся из замка: он машинный и пересобирается из базы при любой правке
 * каталога, поэтому доступ к сети для сборки `llms.txt` не нужен. Метка, которую никто
 * не подставил, роняет сборку: файл с `{{FACTS}}` в выдаче хуже, чем неверное число.
 */
export function renderLlmsTxt(
  template: string,
  counts: { facts: number; myths: number; triggers: number; replacements: number },
  registry: ClusterRegistry,
  articles: Article[],
): string {
  const list = registry.clusters
    .map((cluster) => {
      const lines = cluster.articles
        .map((slug) => articles.find((article) => article.slug === slug))
        .filter((article): article is Article => Boolean(article))
        .map((article) => `- ${articlePath(article)} — ${article.question}`);
      return [`### ${cluster.title}`, '', ...lines].join('\n');
    })
    .join('\n\n');

  const replacements: Record<string, string> = {
    FACTS: String(counts.facts),
    MYTHS: String(counts.myths),
    TRIGGERS: String(counts.triggers),
    REPLACEMENTS: String(counts.replacements),
    ARTICLES: String(articles.length),
    ARTICLE_LIST: list,
  };
  const rendered = template.replace(
    /\{\{(FACTS|MYTHS|TRIGGERS|REPLACEMENTS|ARTICLES|ARTICLE_LIST)\}\}/g,
    (_, key: string) => replacements[key],
  );
  if (/\{\{/.test(rendered)) {
    throw new Error('llms.txt: осталась неподставленная метка — сверь список ключей');
  }
  return rendered;
}

/** Те же числа для статического слепка главной. */
export function fillCounts(
  html: string,
  counts: { facts: number; myths: number; triggers: number; replacements: number },
): string {
  const rendered = html.replace(/\{\{(FACTS|MYTHS|TRIGGERS|REPLACEMENTS)\}\}/g, (_, key: string) =>
    String(counts[key.toLowerCase() as keyof typeof counts]),
  );
  if (/\{\{[A-Z_]+\}\}/.test(rendered)) {
    throw new Error('index.html: осталась неподставленная метка — сверь список ключей');
  }
  return rendered;
}
