/**
 * Публичный интерфейс модуля «Аналитика». Всё остальное внутри модуля — его частное дело.
 */
export { AnalyticsModule } from './AnalyticsModule';

/**
 * Адрес модуля. Единственное место, где он записан: владелец уточнит его позже, и смена
 * будет правкой этой строки, а не поиском по коду.
 */
export const ANALYTICS_ROUTE = '/analytics';

/** Показывать ли ссылку. Доступ решает база, здесь — только видимость. */
export function canSeeAnalytics(role: string | undefined): boolean {
  return role === 'admin';
}
