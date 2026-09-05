/**
 * «Рядом об этом же»: связи между карточками каталога.
 *
 * До 05.09.2026 (вечер) со страницы карточки вели только `/knowledge`, `/` и `/links` —
 * ноль ссылок на соседние карточки. Получилась звезда: хаб и 38 листьев, между листьями
 * пусто. Вес расходится только сверху вниз, а связь между разобранными вопросами роботу
 * не видна вовсе.
 *
 * Связи не выдумываются: они уже есть в базе — общие теги контекста, пусковые моменты,
 * потребности, замены, продукты и категория факта. Здесь они только взвешиваются.
 *
 * Два правила, которые держат результат от превращения в ссылочную кашу:
 *
 * 1. **Связь не бывает односторонней.** Если A ссылается на B, то B ссылается на A.
 *    Односторонние ссылки — это и есть каша: робот видит путь туда, но не обратно, а
 *    человек попадает в тупик.
 * 2. **Степень ограничена: от 3 до 5.** Меньше трёх — связь не работает; больше пяти —
 *    подвал перестаёт быть подсказкой и становится списком всего.
 *
 * Плюс требование связности: из любой карточки достижима любая. Без него граф
 * распадается на кучки по темам, и обход снова упирается в хаб.
 *
 * Результат детерминирован: те же входные данные дают тот же граф. Иначе каждая сборка
 * переписывала бы 38 страниц и выглядела бы изменением там, где ничего не менялось.
 */
import type { CatalogCard } from './knowledge-catalog';

/** Сколько ссылок ставим по умолчанию и сколько допустимо в пределе. */
const TARGET = 4;
const MAX = 5;
const MIN = 3;

function shared(left: readonly string[], right: readonly string[]): number {
  const set = new Set(left);
  return right.filter((value) => set.has(value)).length;
}

/**
 * Насколько две карточки про одно и то же.
 *
 * Веса расставлены по силе сигнала, а не по вкусу: общий тег контекста — это прямое
 * «про то же самое», общий продукт — почти ничего, потому что сигарету упоминают все.
 * Поэтому продукты дают максимум единицу целиком, а не по единице за штуку.
 */
export function affinity(a: CatalogCard, b: CatalogCard): number {
  if (a.code === b.code) return 0;
  let score = 0;
  score += shared(a.tags, b.tags) * 4;
  score += shared(a.triggers, b.triggers) * 3;
  score += shared(a.needs, b.needs) * 3;
  score += shared(a.replacements, b.replacements) * 2;
  if (a.category && a.category === b.category) score += 2;
  if (shared(a.products, b.products) > 0) score += 1;
  // Пара «миф ↔ факт» ценнее пары однотипных: разобранное убеждение и проверенное
  // утверждение об одном и том же — это две половины одного ответа.
  if (score > 0 && a.kind !== b.kind) score += 1;
  return score;
}

type Pair = { a: string; b: string; score: number };

function allPairs(cards: CatalogCard[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      pairs.push({ a: cards[i].code, b: cards[j].code, score: affinity(cards[i], cards[j]) });
    }
  }
  // Порядок задан полностью: сначала сила связи, потом коды. Без второго ключа
  // сортировка была бы неустойчивой, и граф менялся бы от запуска к запуску.
  return pairs.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.a !== right.a) return left.a < right.a ? -1 : 1;
    return left.b < right.b ? -1 : 1;
  });
}

function componentsOf(codes: string[], edges: Map<string, Set<string>>): string[][] {
  const seen = new Set<string>();
  const result: string[][] = [];
  for (const code of codes) {
    if (seen.has(code)) continue;
    const stack = [code];
    const group: string[] = [];
    seen.add(code);
    while (stack.length) {
      const current = stack.pop()!;
      group.push(current);
      for (const next of edges.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    result.push(group.sort());
  }
  return result;
}

/**
 * Граф связей: код карточки → коды соседей.
 *
 * Строится в четыре прохода, и каждый следующий чинит то, что предыдущий не мог:
 * сначала сильные пары, потом добор до минимума, потом связность, и только в конце —
 * порядок вывода.
 */
export function relatedCards(cards: CatalogCard[]): Map<string, string[]> {
  const codes = cards.map((card) => card.code);
  const edges = new Map<string, Set<string>>(codes.map((code) => [code, new Set<string>()]));
  const degree = (code: string) => edges.get(code)!.size;
  const link = (a: string, b: string) => {
    edges.get(a)!.add(b);
    edges.get(b)!.add(a);
  };
  const pairs = allPairs(cards);

  // 1. Сильные пары до целевой степени.
  for (const pair of pairs) {
    if (pair.score <= 0) break;
    if (degree(pair.a) >= TARGET || degree(pair.b) >= TARGET) continue;
    link(pair.a, pair.b);
  }

  // 2. Добор до минимума. Здесь допускается и нулевой вес: карточка без единой общей
  //    метки всё равно обязана быть достижимой, иначе она выпадает из обхода.
  for (const code of [...codes].sort()) {
    if (degree(code) >= MIN) continue;
    for (const pair of pairs) {
      const other = pair.a === code ? pair.b : pair.b === code ? pair.a : null;
      if (!other || edges.get(code)!.has(other)) continue;
      if (degree(other) >= MAX) continue;
      link(code, other);
      if (degree(code) >= MIN) break;
    }
  }

  // 3. Связность. Компоненты сшиваются лучшей доступной парой между ними.
  let groups = componentsOf(codes, edges);
  while (groups.length > 1) {
    const [first, ...rest] = groups;
    const outside = new Set(rest.flat());
    const bridge = pairs.find(
      (pair) =>
        ((first.includes(pair.a) && outside.has(pair.b)) ||
          (first.includes(pair.b) && outside.has(pair.a))) &&
        degree(pair.a) < MAX &&
        degree(pair.b) < MAX,
    );
    if (!bridge) {
      // Свободных концов не осталось — дальше сшивать нечем, и молчать об этом нельзя:
      // несвязный граф означает карточки, до которых робот не дойдёт.
      throw new Error(
        `Связи карточек: граф распался на ${groups.length} частей, и все концы заняты. ` +
          'Подними MAX или ослабь TARGET.',
      );
    }
    link(bridge.a, bridge.b);
    groups = componentsOf(codes, edges);
  }

  // 4. Порядок вывода — по силе связи, потом по коду: подсказка начинается с самого
  //    близкого, а не со случайного.
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const result = new Map<string, string[]>();
  for (const code of codes) {
    const self = byCode.get(code)!;
    const neighbours = [...edges.get(code)!].sort((left, right) => {
      const diff = affinity(self, byCode.get(right)!) - affinity(self, byCode.get(left)!);
      return diff !== 0 ? diff : left < right ? -1 : 1;
    });
    result.set(code, neighbours);
  }
  return result;
}
