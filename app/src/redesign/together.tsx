import { useEffect, useState } from 'react';
import type { Bootstrap, TogetherPulse } from '../data';
import { loadTogetherPulse } from '../data';
import { statsForDays } from '../domain/metrics';
import { reportError } from '../services/error-monitoring';
import { Icon } from '../ui-icons';

/**
 * «Вместе» — слой социальной нормализации.
 *
 * Человек в зависимости почти всегда держит два убеждения: что он один такой и что срыв
 * означает, что у него не выйдет. Оба ложные, и оба ломаются одним фактом — сегодня
 * столько-то людей прошли такой же момент, и столько-то вернулись после срыва.
 *
 * Чего этот раздел не делает, и это решение, а не недоделка:
 *
 * — никаких рейтингов и «лучших результатов». Продукт, который человеку в срыве
 *   показывает чужой рекорд, делает ровно то, чего обещал не делать;
 * — никаких чужих записей. Наружу выходят только числа по группе, и это ограничение
 *   стоит в базе, а не здесь: прав читать чужие эпизоды у клиента нет вовсе;
 * — никакого сравнения человека с группой. Сравнение, которое что-то значит, — с
 *   собственной прошлой неделей, и блок «у тебя» ниже говорит об этом прямо.
 */

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function hoursLabel(minutes: number) {
  if (minutes < 90)
    return `${Math.round(minutes)} ${plural(Math.round(minutes), 'минута', 'минуты', 'минут')}`;
  const hours = Math.round(minutes / 60);
  return `${hours} ${plural(hours, 'час', 'часа', 'часов')}`;
}

function Tile({
  icon,
  value,
  label,
  note,
}: {
  icon: 'people' | 'check' | 'heart' | 'clock';
  value: string;
  label: string;
  note: string;
}) {
  return (
    <article className="r-together-tile">
      <span className="r-together-icon">
        <Icon name={icon} size={20} />
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{note}</small>
    </article>
  );
}

export function TogetherPage({ data }: { data: Bootstrap }) {
  const [pulse, setPulse] = useState<TogetherPulse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const mine = statsForDays(data, 7);

  useEffect(() => {
    let cancelled = false;
    loadTogetherPulse(7)
      .then((next) => {
        if (!cancelled) {
          setPulse(next);
          setLoaded(true);
        }
      })
      .catch((reason) => {
        reportError(reason, { surface: 'together' });
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enough = Boolean(pulse?.enough_people);

  return (
    <main className="r-page">
      <section className="r-reading">
        <p className="r-kicker">Вместе</p>
        <h1>Ты не один в этом эксперименте</h1>
        <p className="r-lead">
          Здесь только общие числа по всем, кто сейчас в ALIVE. Ни имён, ни записей, ни рейтингов —
          и это не настройка приватности, а устройство: прав читать чужие эпизоды у приложения нет.
        </p>

        {!loaded && <p className="r-muted">Считаю…</p>}

        {loaded && !enough && (
          <div className="r-together-empty">
            <Icon name="people" size={22} />
            <div>
              <strong>Пока участников слишком мало, чтобы показывать общую картину</strong>
              <p>
                В маленькой группе «один человек вернулся после срыва» — это не статистика, а
                указание пальцем. Раздел включится сам, когда людей станет достаточно, чтобы числа
                никого не выдавали.
              </p>
            </div>
          </div>
        )}

        {loaded && enough && pulse && (
          <>
            <div className="r-together-grid">
              <Tile
                icon="people"
                value={String(pulse.people_active)}
                label={plural(pulse.people_active, 'человек', 'человека', 'человек') + ' за неделю'}
                note="Кто-то отметил момент тяги или записал употребление"
              />
              <Tile
                icon="check"
                value={String(pulse.episodes_resolved)}
                label={
                  plural(pulse.episodes_resolved, 'момент', 'момента', 'моментов') + ' без никотина'
                }
                note="Тяга была разобрана и закончилась другим ответом"
              />
              <Tile
                icon="heart"
                value={String(pulse.people_returned_after_lapse)}
                label="вернулись после срыва"
                note="Закурили — и после этого снова прошли момент иначе"
              />
              <Tile
                icon="clock"
                value={hoursLabel(pulse.pause_minutes)}
                label="в паузе вместо ритуала"
                note="Суммарное время разобранных моментов"
              />
            </div>
            <p className="r-muted">
              Числа за последние 7 дней. Максимумов и рекордов здесь нет и не будет.
            </p>
          </>
        )}

        <h2>У тебя за те же 7 дней</h2>
        <p>
          Сравнивать себя с группой бессмысленно: у всех разный стаж, разный продукт и разная
          неделя. Сравнение, которое что-то значит, — с твоей собственной прошлой неделей, и оно
          живёт в разделе «Путь».
        </p>
        <ul className="r-together-mine">
          <li>
            <strong>{mine.successfulResponses}</strong>
            <span>
              {plural(mine.successfulResponses, 'момент', 'момента', 'моментов')} прошли без
              никотина
            </span>
          </li>
          <li>
            <strong>{mine.activeDays}</strong>
            <span>{plural(mine.activeDays, 'день', 'дня', 'дней')} с отметками</span>
          </li>
          <li>
            <strong>{Math.round(mine.freedomFund)} ₽</strong>
            <span>разница с твоим исходным уровнем</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
