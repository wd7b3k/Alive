/**
 * Публичный интерфейс модуля «Техническое состояние». Всё остальное внутри модуля —
 * его частное дело.
 */
export { MonitoringModule } from './MonitoringModule';

/**
 * Адрес модуля. Маршрут держит оболочка админки: пункт `monitoring` в `ADMIN_SECTIONS`.
 * Константа остаётся для ссылок со стороны — единственное место, где адрес записан.
 */
export const MONITORING_ROUTE = '/admin/monitoring';

/** Показывать ли ссылку. Доступ решает база, здесь — только видимость. */
export function canSeeMonitoring(role: string | undefined): boolean {
  return role === 'admin';
}
