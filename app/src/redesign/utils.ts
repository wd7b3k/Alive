import {
  productLabel,
  type Bootstrap,
  type ProductType,
  type Replacement,
  type Trigger,
} from '../data';
import type { IconName } from '../ui-icons';

export function localDay() {
  const day = new Date();
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

export function fmt(value: number, digits = 0) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value);
}

export function money(value: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} ₽`;
}

export function when(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function productIcon(product: ProductType): IconName {
  if (product === 'cigarette') return 'smoke';
  if (product === 'hookah') return 'hookah';
  return 'vape';
}

/**
 * Every published trigger gets its OWN icon, by code.
 *
 * This used to be keyword matching over the title, and it collapsed whole groups onto
 * one glyph — five emotional triggers all rendered `stress`, four transition triggers
 * all rendered `work`. On the Связки screen, where 28 contexts sit in one grid, that
 * read as a repeating pattern rather than as distinct moments, which defeats the point
 * of the screen: these are supposed to be recognisably different places in a life.
 *
 * An explicit map is also checkable — `redesign/utils.test.ts` asserts no two codes
 * share an icon, so adding a trigger without giving it its own glyph fails the build
 * rather than quietly doubling one up.
 */
const TRIGGER_ICONS: Readonly<Record<string, IconName>> = {
  // Утро и ритуалы дня
  wake_up: 'sunrise',
  coffee: 'coffee',
  after_meal: 'meal',
  evening: 'tea',
  before_sleep: 'sleep',
  insomnia: 'clock',
  // Среда
  driving: 'car',
  phone: 'phone',
  work_computer: 'work',
  hookah_venue: 'hookah',
  social: 'people',
  // Работа мысли и переходы
  thinking: 'focus',
  thought_complete: 'finish',
  task_start: 'target',
  task_transition: 'pause',
  task_reward: 'check',
  after_task: 'chart',
  important_decision: 'path',
  significant_action: 'flag',
  after_sex: 'heart',
  // Состояния
  anger: 'flame',
  irritability: 'energy',
  anxiety: 'breath',
  tension: 'knot',
  uncertainty: 'question',
  boredom: 'eye',
  spontaneous: 'spark',
  // Катч-олл
  other: 'journal',
};

export function triggerIcon(item: Pick<Trigger, 'code' | 'title'>): IconName {
  const mapped = TRIGGER_ICONS[item.code];
  if (mapped) return mapped;
  // A trigger added to the catalog without an entry here still renders something
  // rather than nothing — but the test will have failed by then.
  return 'spark';
}

export function needIcon(code: string, title: string): IconName {
  const text = `${code} ${title}`.toLowerCase();
  if (text.includes('пау') || text.includes('перерыв')) return 'pause';
  if (text.includes('спокой') || text.includes('разряд') || text.includes('трев')) return 'calm';
  if (text.includes('энерг') || text.includes('бодр') || text.includes('стимул')) return 'energy';
  if (text.includes('фокус') || text.includes('вним') || text.includes('собра')) return 'focus';
  if (text.includes('заверш') || text.includes('точк') || text.includes('ритуал')) return 'finish';
  if (text.includes('контакт') || text.includes('общен') || text.includes('связ'))
    return 'connection';
  if (text.includes('рук') || text.includes('занят')) return 'hands';
  return 'heart';
}

export function replacementIcon(item: Replacement): IconName {
  const text = `${item.code} ${item.title} ${item.category}`.toLowerCase();
  if (text.includes('дых') || text.includes('breath')) return 'breath';
  if (text.includes('чай') || text.includes('вода') || text.includes('напит')) return 'tea';
  if (text.includes('ход') || text.includes('прогул') || text.includes('walk')) return 'walk';
  if (text.includes('музык') || text.includes('песн')) return 'music';
  if (text.includes('днев') || text.includes('запис') || text.includes('journal')) return 'journal';
  if (
    text.includes('вид') ||
    text.includes('смотр') ||
    text.includes('комнат') ||
    text.includes('зазем')
  )
    return 'eye';
  if (text.includes('смысл') || text.includes('установ')) return 'meaning';
  if (text.includes('нзт') || text.includes('nrt') || text.includes('никотин')) return 'shield';
  if (
    text.includes('еда') ||
    text.includes('фрукт') ||
    text.includes('кефир') ||
    text.includes('йогур')
  )
    return 'leaf';
  return 'spark';
}

export function replacementKind(item: Replacement) {
  if (item.category === 'nrt') return 'Никотин-заместительная терапия';
  if (item.category === 'food') return 'Еда и напиток';
  if (item.category === 'meaning') return 'Твоя цель';
  if (item.category === 'physical') return 'Тело';
  if (item.category === 'sensory') return 'Внимание и ощущения';
  return 'Другой ответ';
}

export function tobaccoSummary(event: Bootstrap['tobaccoEvents'][number] | undefined) {
  if (!event) return 'Никотин использован';
  if (event.cigarette_quantity) {
    return `${fmt(event.cigarette_quantity, 1)} ${Number(event.cigarette_quantity) === 1 ? 'сигарета' : 'сиг.'}`;
  }
  if (event.hookah_session_count) return `${fmt(event.hookah_session_count, 1)} кальянная сессия`;
  if (event.vape_puffs) return `${fmt(event.vape_puffs)} затяжек`;
  return productLabel(event.product_type);
}
