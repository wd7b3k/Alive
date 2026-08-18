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

export function triggerIcon(item: Pick<Trigger, 'code' | 'title'>): IconName {
  const text = `${item.code} ${item.title}`.toLowerCase();
  if (text.includes('коф') || text.includes('coffee')) return 'coffee';
  if (
    text.includes('ед') ||
    text.includes('обед') ||
    text.includes('ужин') ||
    text.includes('food')
  )
    return 'meal';
  if (text.includes('телефон') || text.includes('скрол') || text.includes('scroll')) return 'phone';
  if (text.includes('работ') || text.includes('комп') || text.includes('дел')) return 'work';
  if (
    text.includes('стресс') ||
    text.includes('трев') ||
    text.includes('напряж') ||
    text.includes('мысл')
  )
    return 'stress';
  if (text.includes('сон') || text.includes('утр') || text.includes('вечер')) return 'sleep';
  if (text.includes('маш') || text.includes('дорог') || text.includes('drive')) return 'car';
  if (
    text.includes('люд') ||
    text.includes('друз') ||
    text.includes('разговор') ||
    text.includes('компан')
  )
    return 'people';
  if (text.includes('скук') || text.includes('пау')) return 'pause';
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
  if (item.category === 'meaning') return 'Смысл';
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
