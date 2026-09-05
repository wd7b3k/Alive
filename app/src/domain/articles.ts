/**
 * Разборы базы знаний — то, что о них знает приложение.
 *
 * Статьи живут статическими страницами на `/knowledge/<кластер>/<слаг>`: React их не
 * рисует и рисовать не должен — читателю одного ответа приложение не нужно (ADR-0019).
 * Но **дойти** до них человек обязан из приложения, а не только из выдачи. 05.09.2026
 * девятнадцать страниц были выложены и проверены краулером; участник, открывший
 * `/knowledge` в браузере, не видел ни одной ссылки, потому что React заменяет
 * статический слепок собой при монтировании.
 *
 * Данные приезжают готовым индексом `app/knowledge-articles.json`: он собирается сборкой
 * из `content/knowledge` и коммитится — приложение не читает markdown и не знает про
 * каталог содержания. Это тот же порядок, что у выгрузки карточек (ADR-0017).
 *
 * Поверхностей в индексе нет: их берут у **живых** карточек, которые статья цитирует.
 * Раскладка по экранам правится миграциями, и копия в индексе разошлась бы с базой на
 * первой же.
 */
import index from '../../knowledge-articles.json';
import type { Knowledge, KnowledgeSurface, ProductType } from '../data';

export type ArticleCluster = { slug: string; title: string; description: string };

export type ArticleEntry = {
  slug: string;
  cluster: string;
  title: string;
  question: string;
  answer_short: string;
  level: string;
  /** Коды карточек, которые статья цитирует. Через них она и получает весь контекст. */
  claims: string[];
  triggers: string[];
  needs: string[];
  product_types: string[];
  tags: string[];
};

export const ARTICLE_CLUSTERS: ArticleCluster[] = index.clusters;
export const ARTICLES: ArticleEntry[] = index.articles;

/** Адрес статьи. Статический файл на диске, а не экран приложения. */
export function articleHref(article: Pick<ArticleEntry, 'cluster' | 'slug'>): string {
  return `/knowledge/${article.cluster}/${article.slug}`;
}

/**
 * Поверхность, где статью показывать нельзя, — момент тяги.
 *
 * Принцип P17: в этот момент человеку нужно меньше действий, а не лонгрид. Правило стоит
 * одно и здесь, а не проверяется на каждом экране: то, что надо помнить в шести местах,
 * забывается в седьмом.
 */
const FORBIDDEN_SURFACE: KnowledgeSurface = 'flow';

function appliesToProducts(article: ArticleEntry, products: ProductType[]): boolean {
  if (!products.length || !article.product_types.length) return true;
  return article.product_types.some((type) => products.includes(type as ProductType));
}

/**
 * Статьи, которые цитируют эту карточку.
 *
 * Обратный индекс «код карточки → разборы»: на странице карточки он даёт блок
 * «Подробнее». Порядок — по числу цитат: статья, у которой эта карточка одна из двух,
 * ближе к ней по смыслу, чем та, где она одна из пяти.
 */
export function articlesForCard(code: string, limit = 3): ArticleEntry[] {
  return ARTICLES.filter((article) => article.claims.includes(code))
    .sort((left, right) => left.claims.length - right.claims.length)
    .slice(0, limit);
}

/**
 * Разбор под конкретный момент: пусковой триггер, потребность, продукт и экран.
 *
 * Поверхность проверяется по живым карточкам, а не по индексу: статья доступна на экране,
 * если хотя бы одна процитированная ею карточка на этом экране стоит. И никогда — в
 * потоке тяги.
 */
export function articlesForContext(
  knowledge: Knowledge,
  options: {
    surface: KnowledgeSurface;
    triggerCode?: string | null;
    products?: ProductType[];
    limit?: number;
  },
): ArticleEntry[] {
  const { surface, triggerCode = null, products = [], limit = 1 } = options;
  if (surface === FORBIDDEN_SURFACE) return [];

  const onSurface = new Set(
    knowledge.cards.filter((card) => card.surfaces.includes(surface)).map((card) => card.code),
  );

  return (
    ARTICLES.filter((article) => article.claims.some((code) => onSurface.has(code)))
      .filter((article) => appliesToProducts(article, products))
      .filter((article) => !triggerCode || article.triggers.includes(triggerCode))
      // Привязанное к моменту — вперёд: разбор, названный этим триггером, отвечает на
      // вопрос «почему именно сейчас», а общий — на вопрос вообще.
      .sort((left, right) => {
        const byTrigger =
          Number(right.triggers.includes(triggerCode ?? '')) -
          Number(left.triggers.includes(triggerCode ?? ''));
        return byTrigger || left.slug.localeCompare(right.slug);
      })
      .slice(0, limit)
  );
}
