/**
 * Подписи недель.
 *
 * База отдаёт неделю понедельником: `date_trunc('week', …)`. Экран печатал из этой даты
 * месяц и день — «08-31», — и это читалось как «31 августа», хотя означало «неделя с 31
 * августа по 6 сентября». Дальше следовал вывод, что за первую неделю сентября данных нет,
 * при том что они внутри той самой строки.
 *
 * Ошибка была в подписи, а не в данных, и стоила разбора: подпись, которую можно прочитать
 * двумя способами, рано или поздно прочитают неверно. Диапазон прочитать двумя способами
 * нельзя.
 */

/** Понедельник недели, в которую попадает дата. Считается в UTC — как и в базе. */
export function weekStart(at: Date): string {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  // getUTCDay(): 0 — воскресенье. Неделя начинается с понедельника, поэтому воскресенье
  // отступает на шесть дней назад, а не на минус один вперёд.
  const shift = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - shift);
  return date.toISOString().slice(0, 10);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * «31.08–06.09» — понедельник и воскресенье одной недели.
 *
 * Год не показывается: на графике недели идут подряд, и год у соседних одинаков. Если
 * неделя перескакивает через декабрь, соседство само это покажет сменой месяца.
 */
export function weekRange(isoMonday: string): string {
  const monday = new Date(`${isoMonday}T00:00:00Z`);
  if (Number.isNaN(monday.getTime())) return isoMonday;
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return (
    `${pad(monday.getUTCDate())}.${pad(monday.getUTCMonth() + 1)}` +
    `–${pad(sunday.getUTCDate())}.${pad(sunday.getUTCMonth() + 1)}`
  );
}

/**
 * Идёт ли эта неделя прямо сейчас.
 *
 * Нужна, чтобы последний столбик не сравнивали с полными: неделя, прожитая на два дня,
 * всегда ниже — и это не падение, а незаконченный замер.
 */
export function isCurrentWeek(isoMonday: string, now: Date = new Date()): boolean {
  return weekStart(now) === isoMonday;
}
