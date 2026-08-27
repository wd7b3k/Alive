import { useEffect, useState } from 'react';
import type { Bootstrap, TogetherSummary } from '../data';
import { loadTogetherSummary } from '../data';
import { statsForDays } from '../domain/metrics';
import { reportError } from '../services/error-monitoring';
import { Icon } from '../ui-icons';
import { plural } from './utils';

/**
 * «Вместе» — слой социальной нормализации.
 *
 * Человек в зависимости почти всегда держит два убеждения: что он один такой и что срыв
 * означает, что у него не выйдет. Оба ложные, и оба ломаются одним фактом — столько-то
 * людей на этой неделе прошли такой же момент.
 *
 * Данные приходят из get_together_summary (20260816211200): одна функция, только
 * агрегаты, ни одного идентификатора. Чего этот экран не делает, и это решение, а не
 * недоделка:
 *
 * — никаких рейтингов и «лучших результатов». Продукт, который человеку в срыве
 *   показывает чужой рекорд, делает ровно то, чего обещал не делать;
 * — никакого сравнения человека с группой. Сравнение, которое что-то значит, — с
 *   собственной прошлой неделей, и блок «у тебя» ниже говорит об этом прямо;
 * — разбивка по исходному уровню не показывается, пока людей меньше порога, который
 *   функция сообщает сама в `privacy_threshold`. Порог живёт в базе, а не здесь:
 *   обещание приватности не должно зависеть от того, что нарисует интерфейс.
 */

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
  const [summary, setSummary] = useState<TogetherSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const mine = statsForDays(data, 7);

  useEffect(() => {
    let cancelled = false;
    loadTogetherSummary(7)
      .then((next) => {
        if (!cancelled) {
          setSummary(next);
          setLoaded(true);
        }
      })
      .catch((reason: unknown) => {
        reportError(reason, { surface: 'together', userId: data.profile.id });
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [data.profile.id]);

  // Пока участников меньше порога, показывать общие числа нечестно: в маленькой группе
  // они складываются в портрет конкретного человека.
  const enough = Boolean(summary && summary.active_period >= summary.privacy_threshold);

  return (
    <main className="r-page">
      <section className="r-reading">
        <p className="r-kicker">Вместе</p>
        <h1>Ты не один в этом эксперименте</h1>
        <p className="r-lead">
          Здесь только общие числа по всем, кто сейчас в Habitoff. Ни имён, ни записей, ни рейтингов —
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

        {loaded && enough && summary && (
          <>
            <div className="r-together-grid">
              <Tile
                icon="people"
                value={String(summary.active_period)}
                label={
                  plural(summary.active_period, 'человек', 'человека', 'человек') + ' за неделю'
                }
                note={`Сегодня активны ${summary.active_today}`}
              />
              <Tile
                icon="check"
                value={String(summary.successful_responses)}
                label={
                  plural(summary.successful_responses, 'момент', 'момента', 'моментов') +
                  ' без никотина'
                }
                note={`Всего разобрано моментов: ${summary.episodes_period}`}
              />
              <Tile
                icon="heart"
                value={String(summary.replacement_attempts)}
                label="раз попробовали другой ответ"
                note="Замена вместо привычного действия"
              />
              <Tile
                icon="clock"
                value={String(summary.participants_total)}
                label="человек в эксперименте"
                note="Всего прошли настройку"
              />
            </div>

            {summary.baseline.suppressed ? (
              <p className="r-muted">
                Разбивку по исходному уровню пока не показываем: людей с посчитанным baseline меньше{' '}
                {summary.privacy_threshold}, и любая доля в такой группе указывает на конкретного
                человека.
              </p>
            ) : (
              <p className="r-muted">
                Из {summary.baseline.evaluable} человек с посчитанным исходным уровнем ниже своего
                baseline держатся {summary.baseline.below}, около него — {summary.baseline.near},
                выше — {summary.baseline.above}. Медианное отклонение{' '}
                {summary.baseline.median_delta_pct}%.
              </p>
            )}

            {summary.mechanisms.length > 0 && (
              <>
                <h2>Что у людей срабатывает</h2>
                <p>
                  Не рейтинг замен, а наблюдение: какие механизмы чаще выбирают и насколько
                  полезными их отмечают. Группы меньше трёх человек сюда не попадают.
                </p>
                <ul className="r-together-mine">
                  {summary.mechanisms.slice(0, 3).map((item) => (
                    <li key={item.mechanism}>
                      <strong>{item.uses}</strong>
                      <span>
                        {item.mechanism}
                        {item.avg_helpfulness !== null && ` · польза ${item.avg_helpfulness}/5`}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
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
