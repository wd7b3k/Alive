import type { Bootstrap, Episode, ProductType, Trigger } from '../data';

/**
 * Смарт-дефолты сценария тяги.
 *
 * Зачем это есть: P17 требует, чтобы craving flow был максимально коротким, а по факту
 * до записи результата человек проходит четыре экрана выбора и просматривает больше
 * сорока карточек — 26 контекстов, 11 потребностей, 3 замены. Методология при этом
 * верная, и порядок «ситуация → потребность → ответ → результат» здесь не трогается.
 * Сокращается только то, что система уже знает по личной истории и всё равно
 * переспрашивает.
 *
 * Всё в этом файле — чистые функции над уже загруженным `Bootstrap`. Ничего не ходит в
 * сеть и ничего не пишет: правило, решающее, какой экран человек НЕ увидит в момент
 * тяги, должно проверяться тестами без браузера.
 *
 * Три ограничения, которые дефолт не имеет права нарушать:
 *
 * 1. Дефолт всегда обратим. Каждое подставленное значение остаётся видимым на экране и
 *    имеет рядом «изменить» (P2, P7). Мы экономим действие, а не отбираем выбор.
 * 2. Дефолт не молчит. Подпись говорит, откуда он взялся: «так было в 4 из 5 последних
 *    разборов этого контекста», а не «система решила» (P7, P13).
 * 3. Дефолт не трогает состав записи. Продукт, контекст, потребность, ответ и результат
 *    пишутся в эпизод одинаково независимо от того, сколько экранов было пропущено, —
 *    иначе метрики H-ALIVE-001 начали бы зависеть от длины сценария.
 */

/** Сколько последних эпизодов подряд должны совпасть по продукту, чтобы не спрашивать. */
export const PRODUCT_STREAK = 3;

/** Сколько личных контекстов поднимается наверх сетки. */
export const TRIGGER_SHORTLIST_MAX = 5;

/**
 * Ниже этого числа отдельная группа «твои частые» не появляется: один-два контекста
 * наверху — это ещё не персонализация, а случайность первых разборов.
 */
export const TRIGGER_SHORTLIST_MIN = 3;

/** Минимум разборов этого контекста, ниже которого потребность не подставляется. */
export const NEED_MIN_EPISODES = 4;

/** Какую долю этих разборов должна занимать одна потребность. */
export const NEED_MIN_SHARE = 0.6;

/** Живые эпизоды, новые сверху. Удалённые не участвуют ни в одном дефолте (P18). */
function history(episodes: Episode[]): Episode[] {
  return episodes
    .filter((episode) => !episode.deleted_at)
    .slice()
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

export type ProductDefault = {
  product: ProductType;
  /** Можно ли не показывать экран выбора продукта. */
  confident: boolean;
  /** Длина совпадающей серии — для подписи и для события. */
  streak: number;
};

/**
 * Какой продукт подставить и можно ли не спрашивать.
 *
 * Уверенность — это серия: последние `PRODUCT_STREAK` разборов подряд про один и тот же
 * продукт. Доля не годится: человек с историей 20 сигарет и 5 вейпов, который перешёл на
 * вейп неделю назад, по доле остаётся «сигаретным» ещё долго, и мы будем упорно
 * подставлять ему не то.
 *
 * Fallback без истории — тот же, что был в интерфейсе до этого: продукт с ролью
 * `target_dependency`, иначе первый настроенный.
 */
export function productDefault(data: Pick<Bootstrap, 'products' | 'episodes'>): ProductDefault {
  const configured = data.products.map((item) => item.product_type);
  const fallback =
    data.products.find((item) => item.role === 'target_dependency')?.product_type ??
    configured[0] ??
    'cigarette';
  const recent = history(data.episodes).slice(0, PRODUCT_STREAK);
  const first = recent[0]?.target_product;
  const solid =
    recent.length === PRODUCT_STREAK &&
    recent.every((episode) => episode.target_product === first) &&
    Boolean(first) &&
    configured.includes(first as ProductType);
  if (!solid) return { product: fallback, confident: false, streak: 0 };
  return { product: first as ProductType, confident: true, streak: PRODUCT_STREAK };
}

/**
 * Личные частые контексты для этого продукта — наверх сетки.
 *
 * Порядок: сначала частота, при равной частоте — свежесть, при равной свежести —
 * порядок каталога. Свежесть как второй ключ важнее, чем кажется: два контекста с двумя
 * разборами каждый — это чаще всего «старая жизнь» и «текущая», и наверху должна быть
 * текущая.
 *
 * Возвращает пустой массив, если личных контекстов меньше `TRIGGER_SHORTLIST_MIN`:
 * группа из одной карточки не экономит просмотр, а только добавляет уровень.
 */
export function frequentTriggers(
  data: Pick<Bootstrap, 'triggers' | 'episodes'>,
  product: ProductType,
  limit: number = TRIGGER_SHORTLIST_MAX,
): Trigger[] {
  const eligible = new Map(
    data.triggers
      .filter((trigger) => trigger.product_types.includes(product))
      .map((trigger) => [trigger.code, trigger]),
  );
  const count = new Map<string, number>();
  const last = new Map<string, number>();
  for (const episode of history(data.episodes)) {
    if (episode.target_product !== product) continue;
    const code = episode.trigger_code;
    if (!code || !eligible.has(code)) continue;
    count.set(code, (count.get(code) ?? 0) + 1);
    if (!last.has(code)) last.set(code, new Date(episode.started_at).getTime());
  }
  if (count.size < TRIGGER_SHORTLIST_MIN) return [];
  return [...count.keys()]
    .sort((a, b) => {
      const byCount = (count.get(b) ?? 0) - (count.get(a) ?? 0);
      if (byCount !== 0) return byCount;
      const byRecency = (last.get(b) ?? 0) - (last.get(a) ?? 0);
      if (byRecency !== 0) return byRecency;
      return (eligible.get(a)?.sort_order ?? 0) - (eligible.get(b)?.sort_order ?? 0);
    })
    .slice(0, limit)
    .map((code) => eligible.get(code) as Trigger);
}

export type NeedGuess = {
  needCode: string;
  /** Сколько разборов этого контекста пришлось на эту потребность. */
  episodes: number;
  /** Сколько разборов этого контекста вообще имеют потребность. */
  total: number;
  share: number;
};

/**
 * Потребность, в которой система уверена по истории именно этой пары продукт + контекст.
 *
 * Уверенность — это два условия сразу: набралось хотя бы `NEED_MIN_EPISODES` разборов
 * этого контекста и хотя бы `NEED_MIN_SHARE` из них про одну потребность. Порог по
 * количеству нужен потому, что доля 1/1 формально равна 100%, а по сути не значит
 * ничего.
 *
 * Возвращает null, когда уверенности нет: тогда интерфейс показывает полный экран
 * выбора потребности, как и раньше. Шаг не исчезает из методологии — он исчезает с
 * экрана и превращается в подпись, которую можно переоткрыть.
 */
export function needGuess(
  data: Pick<Bootstrap, 'needs' | 'episodes'>,
  product: ProductType,
  triggerCode: string,
): NeedGuess | null {
  if (!triggerCode) return null;
  const known = new Set(data.needs.map((need) => need.code));
  const count = new Map<string, number>();
  let total = 0;
  for (const episode of history(data.episodes)) {
    if (episode.target_product !== product) continue;
    if (episode.trigger_code !== triggerCode) continue;
    const code = episode.need_code;
    if (!code || !known.has(code)) continue;
    count.set(code, (count.get(code) ?? 0) + 1);
    total += 1;
  }
  if (total < NEED_MIN_EPISODES) return null;
  let best = '';
  let bestCount = 0;
  for (const [code, value] of count) {
    if (value > bestCount) {
      best = code;
      bestCount = value;
    }
  }
  const share = bestCount / total;
  if (!best || share < NEED_MIN_SHARE) return null;
  return { needCode: best, episodes: bestCount, total, share };
}
/**
 * Шаг записи результата. Не константа ради константы: это единственный шаг, который
 * питает H-ALIVE-001 (successful response rate, target usage vs baseline, craving
 * delta), и ни один смарт-дефолт не имеет права привести сценарий за него. Тест
 * flow-defaults.test.ts проверяет это утверждение, а не доверяет ему.
 */
export const FLOW_RESULT_STEP = 4;

export type FlowOpening = {
  product: ProductType;
  productConfident: boolean;
  trigger: string;
  need: NeedGuess | null;
  /** С какого шага открывается сценарий. */
  first: number;
};

/**
 * С чего начинается сценарий тяги при этом открытии.
 *
 * Собрано в одну чистую функцию, а не разложено по обработчикам кнопок, потому что
 * «какой экран человек НЕ увидит» — это продуктовое правило, и проверять его надо без
 * браузера.
 *
 * Порядок условий важен. Если продукт спросить нужно, стартуем с него, даже когда
 * контекст уже назван карточкой на Главной: подставлять потребность по истории чужого
 * продукта было бы хуже, чем показать лишний экран.
 */
export function flowOpening(
  data: Pick<Bootstrap, 'products' | 'episodes' | 'needs'>,
  initialTrigger?: string,
): FlowOpening {
  const guess = productDefault(data);
  const askProduct = data.products.length > 1 && !guess.confident;
  const trigger = initialTrigger ?? '';
  const need = trigger && !askProduct ? needGuess(data, guess.product, trigger) : null;
  const first = askProduct ? 0 : trigger ? stepAfterTrigger(need) : 1;
  return { product: guess.product, productConfident: guess.confident, trigger, need, first };
}

/** Куда ведёт выбор контекста: на полный экран потребности или сразу на ответы. */
export function stepAfterTrigger(guess: NeedGuess | null): number {
  return guess ? 3 : 2;
}
