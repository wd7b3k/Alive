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
