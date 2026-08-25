import { publicEnv } from '../env';

/**
 * Счётчики Яндекс Метрики и Google Analytics.
 *
 * Два ограничения приняты осознанно и стоят дороже, чем полнота статистики.
 *
 * **Только до входа.** Продукт обещает, что личные записи не видит никто, кроме автора.
 * Сторонний счётчик внутри личных экранов это обещание подтачивает: даже без текстов он
 * сообщает третьей стороне, какие разделы человек открывает, а по разделам продукта о
 * никотиновой зависимости выводится слишком многое. Поэтому счётчики живут на публичной
 * части, где нет ни одного личного экрана.
 *
 * **Без вебвизора.** Запись сессий на сервисе про зависимость — это запись того, как
 * человек читает про свою зависимость. Не включать.
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
    window.ym =
      window.ym ||
      function (...args: unknown[]) {
        (window.ym as unknown as { a: unknown[][] }).a =
          (window.ym as unknown as { a?: unknown[][] }).a || [];
        (window.ym as unknown as { a: unknown[][] }).a.push(args);
      };
    loadScript('https://mc.yandex.ru/metrika/tag.js');
    window.ym(Number(ym), 'init', {
      defer: true,
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      // webvisor намеренно не включён — см. комментарий к модулю.
      webvisor: false,
    });
  }

  const ga = publicEnv.googleAnalyticsId;
  if (ga) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`);
    window.gtag('js', new Date());
    window.gtag('config', ga, { anonymize_ip: true });
  }
}

/** Просмотр страницы при переходе внутри SPA — иначе счётчик увидит только первый экран. */
export function trackPageView(path: string): void {
  const ym = publicEnv.yandexMetrikaId;
  if (ym && window.ym) window.ym(Number(ym), 'hit', path);
  const ga = publicEnv.googleAnalyticsId;
  if (ga && window.gtag) window.gtag('event', 'page_view', { page_path: path });
}
