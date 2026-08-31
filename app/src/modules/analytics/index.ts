/**
 * Публичный интерфейс модуля «Аналитика». Всё остальное внутри модуля — его частное дело.
 */
export { AnalyticsModule } from './AnalyticsModule';

/**
 * Адрес модуля. Маршрут держит оболочка админки: пункт `analytics` в `ADMIN_SECTIONS`.
 * Константа остаётся для ссылок со стороны — единственное место, где адрес записан.
 */
export const ANALYTICS_ROUTE = '/admin/analytics';

/** Показывать ли ссылку. Доступ решает база, здесь — только видимость. */
export function canSeeAnalytics(role: string | undefined): boolean {
  return role === 'admin';
}

/**
 * Счётчики и кабинеты.
 *
 * Идентификаторы стоят здесь, а не в разметке: они встречаются в семи ссылках, и
 * рассыпанные по вёрстке они гарантируют, что при смене счётчика одну из них забудут.
 * Те же числа живут в `app/.env` для самих счётчиков; здесь — только для входа в кабинет,
 * и это разные вещи: сборка без переменных окружения ничего не считает, а ссылки
 * продолжают работать.
 */
export const METRIKA_ID = '111983810';
/** Идентификатор потока GA4 — то, что стоит в теге на странице. */
export const GA_STREAM_ID = 'G-YB35G45MFW';
/**
 * Номер ресурса GA4 — то, что нужно кабинету. Из идентификатора потока он не выводится,
 * и до 31.08.2026 ссылку на кабинет построить было нечем; владелец нашёл номер в
 * интерфейсе (аккаунт 406214508).
 */
export const GA_PROPERTY_ID = '551845451';

export type Cabinet = { title: string; hint: string; href: string };

/**
 * Куда идти за глубиной, которой у нас нет и не должно быть. У каждой ссылки сказано,
 * что именно там смотреть: список из семи адресов без пояснений — это закладки, а не
 * раздел.
 */
export const CABINETS: Cabinet[] = [
  {
    title: 'Метрика — сводка',
    hint: 'Аудитория, устройства, глубина просмотра. Первое место, куда смотреть, если своя база и счётчик разошлись.',
    href: `https://metrika.yandex.ru/dashboard?id=${METRIKA_ID}`,
  },
  {
    title: 'Метрика — источники',
    hint: 'Откуда пришли, с точностью, которой своя база не даёт: поисковые системы, соцсети, конкретные страницы-рефереры.',
    href: `https://metrika.yandex.ru/stat/traffic?id=${METRIKA_ID}`,
  },
  {
    title: 'Метрика — поисковые фразы',
    hint: 'По каким запросам приходят. Пока публичные страницы не отдаются готовыми, здесь будет пусто.',
    href: `https://metrika.yandex.ru/stat/search_phrases?id=${METRIKA_ID}`,
  },
  {
    title: 'Вебмастер',
    hint: 'Индексация, ошибки обхода, показы в выдаче Яндекса.',
    href: 'https://webmaster.yandex.ru/site/https:habitoff.ru:443/',
  },
  {
    title: 'Search Console',
    hint: 'То же со стороны Google. Ресурс заведён как адрес с префиксом, а не как домен.',
    href: 'https://search.google.com/search-console?resource_id=https%3A%2F%2Fhabitoff.ru%2F',
  },
  {
    title: 'Google Analytics',
    hint: 'Кампании и источники в разметке GA4. Первые данные там — краулеры из дата-центров, а не люди: читать с этой поправкой.',
    href: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/intelligenthome`,
  },
  {
    title: 'GA — источники трафика',
    hint: 'Разрез привлечения целиком, если нужно сравнить с разрезом Метрики.',
    href: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/explorer?params=_u..nav%3Dmaui&r=lifecycle-traffic-acquisition-v2`,
  },
];
