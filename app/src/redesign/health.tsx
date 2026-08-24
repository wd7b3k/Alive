import { useEffect, useState } from 'react';
import type { ProductHealth } from '../data';
import { loadProductHealth } from '../data';
import { reportError } from '../services/error-monitoring';
import { Icon } from '../ui-icons';

/**
 * Закрытый раздел: живёт ли продукт.
 *
 * Отвечает на четыре вопроса, на которые сейчас ответить нечем: сколько людей приходит,
 * сколько остаётся, доходят ли они до момента, ради которого продукт существует, и
 * двигается ли у них что-то.
 *
 * Здесь нет ни одной строки о конкретном человеке. Технически администратор может
 * прочитать журнал событий напрямую — политика analytics_events_admin_read это позволяет,
 * и прежняя админка так и делала. Этот экран так не делает намеренно: сырые события несут
 * user_id, и «посмотреть здоровье продукта» превращается в «выгрузить, кто когда курил».
 * Ответ на вопрос «живёт ли ALIVE» этого не требует ни в одной своей части.
 *
 * Спрятанная кнопка ничего не защищает. Защищает admin_product_health, которая
 * отказывает не-администратору, — это проверено в supabase/tests/local.
 */

const PERIODS = [7, 30, 90] as const;

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="r-health-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

export function HealthPage() {
  const [days, setDays] = useState<number>(30);
  const [health, setHealth] = useState<ProductHealth | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    loadProductHealth(days)
      .then((next) => {
        if (cancelled) return;
        setHealth(next);
        setState(next ? 'ready' : 'denied');
      })
      .catch((reason) => {
        reportError(reason, { surface: 'health' });
        if (!cancelled) setState('denied');
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <main className="r-page">
      <section className="r-reading">
        <p className="r-kicker">Здоровье продукта</p>
        <h1>Живёт ли ALIVE</h1>
        <p className="r-lead">
          Только агрегаты. Ни одной записи о конкретном человеке здесь нет и не может быть — база
          отдаёт числа, а не строки.
        </p>

        <div className="r-health-periods">
          {PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              className={value === days ? 'active' : ''}
              onClick={() => setDays(value)}
            >
              {value} дней
            </button>
          ))}
        </div>

        {state === 'loading' && <p className="r-muted">Считаю…</p>}

        {state === 'denied' && (
          <div className="r-together-empty">
            <Icon name="shield" size={22} />
            <div>
              <strong>Раздел недоступен</strong>
              <p>
                Сводку отдаёт только администраторам. Добавить администратора можно единственным
                способом — строкой в таблице <code>app_admins</code> через SQL Editor; из приложения
                этот список не меняется ни в какой роли.
              </p>
            </div>
          </div>
        )}

        {state === 'ready' && health && (
          <>
            <h2>Люди</h2>
            <div className="r-health-grid">
              <Metric
                label="Всего"
                value={String(health.people_total)}
                hint="Профилей в базе за всё время"
              />
              <Metric
                label="Новых"
                value={String(health.people_new)}
                hint={`Появились за ${health.period_days} дней`}
              />
              <Metric
                label="Активных"
                value={String(health.people_active)}
                hint="Отметили эпизод или употребление"
              />
              <Metric
                label="Вернувшихся"
                value={String(health.people_returning)}
                hint="Были активны и в предыдущий такой же период — это и есть удержание"
              />
            </div>

            <h2>Доходят ли до сути</h2>
            <div className="r-health-grid">
              <Metric
                label="Дошли до первого разбора"
                value={String(health.people_first_episode)}
                hint="Момент, где продукт впервые делает то, ради чего он есть"
              />
              <Metric
                label="Эпизодов"
                value={String(health.episodes_total)}
                hint="Разобранных моментов тяги за период"
              />
              <Metric
                label="Без никотина"
                value={
                  health.resolved_share === null
                    ? '—'
                    : `${health.episodes_resolved} · ${health.resolved_share}%`
                }
                hint="Сколько эпизодов закончились другим ответом"
              />
              <Metric
                label="У кого тяга слабее"
                value={String(health.people_improving)}
                hint="Средняя тяга ниже, чем в предыдущий период. Прогресс относительно себя"
              />
            </div>

            <h2>Приложение</h2>
            <div className="r-health-grid">
              <Metric
                label="Ошибок"
                value={String(health.errors_total)}
                hint="Записей в системном журнале за период"
              />
              <Metric
                label="Где именно"
                value={health.error_surfaces === '—' ? '—' : ''}
                hint={health.error_surfaces}
              />
            </div>

            <p className="r-muted">
              Ноль ошибок при живых людях означает одно из двух: продукт держится или запись ошибок
              не доходит до базы. Различить это можно только тем, что журнал заполняется и в других
              разделах.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
