import { plural } from '../../redesign/utils';
import type { ServiceStatus, Verdict } from './port';

/**
 * Слова и числа раздела. Отдельно от разметки — потому что именно здесь легко соврать
 * молча: «минуту назад» вместо «час назад» превращает молчащий мониторинг в работающий.
 * Всё, что тут есть, проверено в `format.test.ts`.
 */

/** Как называется статус по-русски. Ровно одно слово — оно стоит рядом с точкой цвета. */
export const STATUS_LABEL: Record<ServiceStatus, string> = {
  ok: 'в норме',
  warn: 'предупреждение',
  stale: 'молчит',
  silent: 'не отчиталась',
  fail: 'отказ',
  planned: 'ещё нет',
};

/**
 * Вердикт словами. «Неизвестно» — полноценный ответ, а не отсутствие ответа: проверки
 * молчат, и утверждать в этот момент что-либо о сервисе нельзя.
 */
export const VERDICT: Record<Verdict, { title: string; lead: string }> = {
  ok: {
    title: 'Сервис работает',
    lead: 'Все критичные части отвечают, и каждая проверка отчиталась вовремя.',
  },
  degraded: {
    title: 'Работает с оговорками',
    lead: 'Критичные части отвечают, но что-то требует внимания — смотрите ниже, что именно.',
  },
  unknown: {
    title: 'Неизвестно',
    lead: 'Критичная часть перестала отчитываться. Это не значит, что она сломалась: это значит, что о ней нечего сказать, — и разбирать надо сам мониторинг.',
  },
  down: {
    title: 'Авария',
    lead: 'Критичная часть сервиса не отвечает. Порядок разбора — docs/RUNBOOK_ALERTS.md.',
  },
};

/** Класс модификатора для точки и плашки. База и экран согласованы через это имя. */
export function statusTone(status: ServiceStatus | Verdict): string {
  switch (status) {
    case 'ok':
      return 'ok';
    case 'warn':
    case 'degraded':
      return 'warn';
    case 'fail':
    case 'down':
      return 'fail';
    case 'planned':
      return 'planned';
    default:
      // stale, silent, unknown — про них ничего не известно, и цвет у них тоже не тревожный.
      return 'unknown';
  }
}

/**
 * Сколько времени прошло. Без «только что»: у проверки, которая обязана отчитываться
 * раз в минуту, разница между пятью и пятьюдесятью секундами — это разница между
 * нормой и пропущенным запуском, и прятать её за словом нельзя.
 */
export function ago(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return 'никогда';
  const s = Math.max(0, Math.round(seconds));
  if (s < 90) return `${s} ${plural(s, 'секунду', 'секунды', 'секунд')} назад`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} ${plural(m, 'минуту', 'минуты', 'минут')} назад`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  const d = Math.round(h / 24);
  return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
}

/** Период отчёта проверки словами: «раз в минуту», «раз в пять минут», «раз в сутки». */
export function period(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return 'период не описан';
  if (seconds <= 60) return 'раз в минуту';
  if (seconds < 3600) return `раз в ${Math.round(seconds / 60)} мин`;
  if (seconds < 86400) return `раз в ${Math.round(seconds / 3600)} ч`;
  return 'раз в сутки';
}

/**
 * Измеренное число проверки. Задержка живёт в своей колонке и подписывается сама:
 * у проверок доступности `value` пустое, и показать там прочерк значило бы сказать,
 * что замера не было.
 */
export function measurement(input: {
  value: number | null;
  unit: string | null;
  latency_ms: number | null;
}): string | null {
  if (input.value !== null && Number.isFinite(Number(input.value))) {
    const value = Number(input.value);
    const shown = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
    return input.unit ? `${shown} ${input.unit}` : shown;
  }
  if (input.latency_ms !== null && Number.isFinite(Number(input.latency_ms))) {
    return `${Math.round(Number(input.latency_ms))} мс`;
  }
  return null;
}

/** Доля в процентах с двумя знаками, как её отдала база. Пусто — нечего было считать. */
export function percent(value: number | null): string | null {
  if (value === null || !Number.isFinite(Number(value))) return null;
  const number = Number(value);
  return `${Number.isInteger(number) ? number : number.toFixed(2)}%`;
}

/**
 * Доступность словами.
 *
 * Процент, посчитанный по горстке точек, — не измерение, а анекдот в форме измерения:
 * «69.81%» при четырёх проверках означает «одна из четырёх не прошла», и стоять рядом
 * со словом «доступность» такое число не должно. Порог ставит база
 * (`ops.min_observations`), сюда приходит уже пустое значение — экран только называет
 * причину, вместо того чтобы молча показать прочерк.
 */
export function uptime(pct: number | null, samples: number): string | null {
  const shown = percent(pct);
  if (shown) return shown;
  return samples > 0 ? 'мало наблюдений' : null;
}
