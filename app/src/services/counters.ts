import { publicEnv } from '../env';

/**
 * Счётчики Яндекс Метрики и Google Analytics.
 *
 * **Счётчики стоят на всех страницах, включая личные.** До 28.08.2026 здесь было
 * обратное правило, и оно было верным при прежнем инварианте «никаких внешних сервисов
 * в рантайме». Владелец снял инвариант осознанно — ADR-0015, там же перечислено, что
 * именно уходит наружу и что переписано в согласии и политике.
 *
 * Что уходит и чего не уходит — граница проходит здесь, а не в договорённости:
 *
 * - **Вебвизор выключен явно.** Запись сессий на сервисе про зависимость — это запись
 *   того, как человек читает про свою зависимость. Тумблер в кабинете можно случайно
 *   вернуть; строку в коде так не переключишь.
 * - **Ни текстов, ни идентификаторов.** В счётчик уходят маршруты вида `/episode/:id`,
 *   а не адреса с идентификаторами записей; почта и внешний id входа — никогда.
 *   Для склейки воронки служит анонимный идентификатор посетителя из `visitor.ts`.
 * - **Свой слой событий остаётся источником истины.** Блокировщики режут счётчики у
 *   заметной доли посетителей в России, и это как раз осторожная часть аудитории.
 *
 * Идентификаторы приходят из окружения. Нет идентификатора — нет запроса: сервис должен
 * работать и в песочнице, и локально, ничего никуда не отправляя.
 */
declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadScript(src: string, attrs: Record<string, string> = {}): void {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value);
  document.head.appendChild(script);
}

let started = false;

export function initCounters(): void {
  if (started || typeof document === 'undefined') return;
  started = true;

  const ym = publicEnv.yandexMetrikaId;
  if (ym) {
    const stub = function (...args: unknown[]) {
      const holder = stub as unknown as { a: unknown[][] };
      holder.a = holder.a || [];
      holder.a.push(args);
    };
    // `l` — метка времени начала загрузки. Без неё Метрика не может измерить, сколько
    // грузилась страница: сравнивать не с чем. В сниппете из кабинета она есть, при
    // ручном переписывании теряется первой.
    (stub as unknown as { l: number }).l = Date.now();
    window.ym = window.ym || (stub as unknown as (...args: unknown[]) => void);
    loadScript(`https://mc.yandex.ru/metrika/tag.js?id=${encodeURIComponent(ym)}`);
    window.ym(Number(ym), 'init', {
      // Отправку первого просмотра берёт на себя trackPageView: в одностраничном
      // приложении автоматическая отправка видит только первый экран за сессию.
      defer: true,
      ssr: true,
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      trackHash: false,
      // Вебвизор намеренно выключен — см. комментарий к модулю.
      webvisor: false,
    });
  }

  const ga = publicEnv.googleAnalyticsId;
  if (ga) {
    window.dataLayer = window.dataLayer || [];
    // Именно `arguments`, а не массив из rest-параметров. Внешне это одно и то же, но
    // GA4 разбирает только объект arguments: с обычным массивом счётчик молчит, а код
    // выглядит рабочим. Отсюда `eslint-disable` — правило запрещает `arguments`, а здесь
    // без него нельзя.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`);
    window.gtag('js', new Date());
    // `anonymize_ip` — параметр Universal Analytics; GA4 обезличивает адрес сам и этот
    // ключ игнорирует. Оставлять его значит делать вид, что настройка есть.
    window.gtag('config', ga, { send_page_view: false });
  }
}

/**
 * Просмотр страницы при переходе внутри SPA — иначе счётчик увидит только первый экран.
 *
 * Обе системы настроены не отправлять просмотр автоматически (`defer` у Метрики,
 * `send_page_view: false` у GA), поэтому первый просмотр тоже приходит отсюда.
 */
export function trackPageView(path: string): void {
  const ym = publicEnv.yandexMetrikaId;
  if (ym && window.ym) {
    window.ym(Number(ym), 'hit', path, { referer: document.referrer });
  }
  const ga = publicEnv.googleAnalyticsId;
  if (ga && window.gtag) {
    // GA4 ждёт `page_location`; `page_path` остался от Universal Analytics и сам по себе
    // отчёт по страницам не наполняет.
    window.gtag('event', 'page_view', {
      page_location: `${window.location.origin}${path}`,
      page_path: path,
      page_title: document.title,
    });
  }
}

/**
 * Цель воронки.
 *
 * Одни и те же имена в обеих системах — иначе сверка невозможна: расхождение между
 * Метрикой и GA нормально в пределах десятка процентов, но только если считается одно
 * и то же событие.
 */
export function trackGoal(goal: FunnelGoal): void {
  const ym = publicEnv.yandexMetrikaId;
  if (ym && window.ym) window.ym(Number(ym), 'reachGoal', goal);
  const ga = publicEnv.googleAnalyticsId;
  if (ga && window.gtag) window.gtag('event', goal);
}

/** Закрытый список: цель, которой нет здесь, не заведена и в кабинетах. */
export type FunnelGoal =
  'auth_started' | 'signed_up' | 'onboarded' | 'first_episode' | 'episode_with_result';
