import { useEffect, useState } from 'react';
import { reportError } from '../../services/error-monitoring';
import { loadAnalytics, type AnalyticsSnapshot } from './port';

/**
 * Экран аналитики.
 *
 * Два правила показа, и оба выстраданы.
 *
 * **Число без объяснения хуже отсутствия числа.** У каждого раздела сказано, что он
 * означает и чему верить нельзя; там, где данных нет, стоит причина, а не ноль.
 *
 * **Форма читается быстрее строки.** Первая редакция показывала списки определений —
 * ту же разметку, что у «Гипотез». Там она уместна: у каждой метрики длинное пояснение,
 * и читают их по одной. Здесь другое: недели, шаги воронки и когорты сравниваются между
 * собой, а сравнение — это про длину и цвет, а не про чтение двадцати чисел подряд.
 */

const PERIODS = [
  { days: 7, weeks: 4, label: '7 дней' },
  { days: 30, weeks: 12, label: '30 дней' },
  { days: 90, weeks: 26, label: '90 дней' },
];

const TEAL = 'var(--r-teal)';
const SAND = 'var(--r-sand)';

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Полоса: подпись, длина, число. Длина считается от максимума в наборе, а не от ста. */
function BarRow({
  label,
  value,
  max,
  caption,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  caption?: string;
  tone?: 'teal' | 'sand';
}) {
  return (
    <div className="r-viz-row">
      <span>{label}</span>
      <span className={tone === 'sand' ? 'r-viz-bar sand' : 'r-viz-bar'}>
        <i style={{ width: `${max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0}%` }} />
      </span>
      <b>{caption ?? value}</b>
    </div>
  );
}

export function AnalyticsModule() {
  const [periodIndex, setPeriodIndex] = useState(1);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reason, setReason] = useState('');

  const period = PERIODS[periodIndex];

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    loadAnalytics(period.days, period.weeks)
      .then((result) => {
        if (cancelled) return;
        setSnapshot(result);
        setState('ready');
      })
      .catch((error: unknown) => {
        reportError(error, { surface: 'analytics' });
        // Показывать надо то, что ответила база, а не то, что мы про неё думаем.
        if (!cancelled) {
          setReason(error instanceof Error ? error.message : String(error));
          setState('failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period.days, period.weeks]);

  const core = snapshot?.core ?? [];
  const maxResult = Math.max(1, ...core.map((row) => row.participants_with_result));
  const funnel = snapshot?.funnel ?? [];
  const funnelTop = funnel[0]?.people ?? 0;
  const flow = snapshot?.flow ?? [];
  const flowTop = Math.max(1, ...flow.map((row) => row.people));
  const sources = snapshot?.sources ?? [];
  const sourcesTop = Math.max(1, ...sources.map((row) => row.visitors));
  const states = snapshot?.states ?? [];
  const statesTotal = states.reduce((sum, row) => sum + row.participants, 0);

  const cohorts = Array.from(new Set((snapshot?.retention ?? []).map((row) => row.cohort_week)));
  const horizons = Array.from(
    new Set((snapshot?.retention ?? []).map((row) => row.horizon_days)),
  ).sort((a, b) => a - b);

  return (
    <main className="r-page">
      <section className="r-reading">
        <p className="r-kicker">Служебное</p>
        <h1>Аналитика</h1>
        <p className="r-lead">
          Считает база: шесть функций, каждая отказывает не-администратору. Разрезы меньше трёх
          человек не показываются, идентификаторов участников нет ни в одном поле — «посмотреть, как
          идёт продукт» не должно превращаться в «выгрузить, кто когда курил».
        </p>

        <div className="r-health-periods">
          {PERIODS.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={index === periodIndex ? 'active' : ''}
              onClick={() => setPeriodIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {state === 'loading' && <p className="r-muted">Считаю…</p>}

        {state === 'failed' && (
          <>
            <p className="r-muted">Метрики не загрузились. База ответила так:</p>
            <p className="r-muted">
              <code>{reason || 'без сообщения'}</code>
            </p>
            {reason.includes('только администраторам') ? (
              <p className="r-muted">
                Это отказ по роли. Аналитику видит только <code>admin</code>.
              </p>
            ) : (
              <p className="r-muted">
                Это не отказ по роли. Если сообщение про отсутствующую функцию — PostgREST не
                перечитал схему после миграции: <code>notify pgrst, &apos;reload schema&apos;</code>
                .
              </p>
            )}
          </>
        )}

        {state === 'ready' && snapshot && (
          <div className="r-hypotheses">
            <section>
              <p className="r-kicker">Две опорные метрики</p>
              <p className="r-lead">
                Столбики — сколько человек за неделю довели разбор тяги до результата: метрика
                жизни, двигается быстро. Числа под ними — во сколько раз недельный расход отличается
                от исходного уровня: метрика смысла, двигается медленно. Первая может расти, пока
                вторая стоит, и это будет означать, что мы научились удерживать людей, а не помогать
                им.
              </p>
              {core.length === 0 ? (
                <p className="r-muted">За выбранный период нет ни одной недели с данными.</p>
              ) : (
                <>
                  <div className="r-viz-weeks">
                    {core.map((row) => (
                      <div key={row.week} title={`${row.week}: ${row.participants_with_result}`}>
                        <b
                          className={row.participants_with_result === 0 ? 'pale' : ''}
                          style={{
                            height: `${Math.max(4, Math.round((row.participants_with_result / maxResult) * 108))}px`,
                          }}
                        />
                        <small>{row.week.slice(5)}</small>
                      </div>
                    ))}
                  </div>
                  <p className="r-viz-note">
                    Расход к исходному уровню по неделям:{' '}
                    {core.some((row) => row.computable)
                      ? core
                          .filter((row) => row.computable && row.median_baseline_ratio !== null)
                          .map(
                            (row) =>
                              `${row.week.slice(5)} — ${Math.round((row.median_baseline_ratio ?? 0) * 100)}%`,
                          )
                          .join(' · ')
                      : 'нечем считать — нет записей расхода и исходного уровня'}
                  </p>
                </>
              )}
            </section>

            <section>
              <p className="r-kicker">Воронка вовлечения</p>
              <p className="r-lead">
                Длина полосы — доля от первого шага. Шаг «визит» считается с 28.08.2026: до этого
                события до входа записать было нельзя.
              </p>
              <div className="r-viz">
                {funnel.map((row) => (
                  <BarRow
                    key={row.step_no}
                    label={`${row.step_no}. ${row.step}`}
                    value={row.people}
                    max={funnelTop}
                    caption={
                      row.conversion_pct !== null
                        ? `${row.people} · ${row.conversion_pct}%`
                        : `${row.people}`
                    }
                  />
                ))}
              </div>
              {funnel.some((row) => row.note) && (
                <p className="r-viz-note">{funnel.find((row) => row.note)?.note}</p>
              )}
            </section>

            <section>
              <p className="r-kicker">Сценарий тяги по экранам</p>
              <p className="r-lead">
                Аудит 26.08 предположил, что четыре экрана выбора противоречат принципу «минимум
                действий в момент тяги». Полоса — сколько человек дошло до экрана, число рядом —
                медиана времени на нём. Порядок шагов не меняется: измерение нужно, чтобы спорить
                предметно.
              </p>
              {flow.length === 0 ? (
                <p className="r-muted">
                  Шаги сценария пишутся с 28.08.2026. За более ранний период их нет.
                </p>
              ) : (
                <div className="r-viz">
                  {flow.map((row) => (
                    <BarRow
                      key={row.step_no}
                      label={`Экран ${row.step_no}`}
                      value={row.people}
                      max={flowTop}
                      caption={`${row.people} чел.${row.median_seconds !== null ? ` · ${row.median_seconds} с` : ''}`}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <p className="r-kicker">Удержание по когортам</p>
              <p className="r-lead">
                Считается по действию, а не по входу: открыть приложение и ничего не записать — это
                не удержание. Строка — неделя регистрации, столбец — день жизни.
              </p>
              {cohorts.length === 0 ? (
                <p className="r-muted">Когорт за период нет.</p>
              ) : (
                <div className="r-viz-heat">
                  <span />
                  {horizons.map((day) => (
                    <span key={day}>{day} д.</span>
                  ))}
                  {cohorts.map((week) => (
                    <Cohort key={week} week={week} horizons={horizons} rows={snapshot.retention} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <p className="r-kicker">Источники</p>
              <p className="r-lead">
                Бирюзовая полоса — посетители, песочная — те, кто дошёл до записанного результата.
                Вопрос не «сколько визитов», а сколько из них дошло: источник со ста визитами и
                нулём разборов хуже источника с пятью и пятью.
              </p>
              {sources.length === 0 ? (
                <p className="r-muted">
                  Посетители пишутся с 28.08.2026, разрезы меньше трёх человек подавлены.
                </p>
              ) : (
                <>
                  <div className="r-viz">
                    {sources.map((row) => (
                      <div key={`${row.source_kind}-${row.detail}`}>
                        <BarRow
                          label={`${row.source_kind} · ${row.detail}`}
                          value={row.visitors}
                          max={sourcesTop}
                          caption={`${row.visitors}`}
                        />
                        <BarRow
                          label=""
                          value={row.reached_result}
                          max={sourcesTop}
                          caption={`${row.reached_result} с результатом`}
                          tone="sand"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="r-viz-legend">
                    <span>
                      <em style={{ background: TEAL }} />
                      посетители
                    </span>
                    <span>
                      <em style={{ background: SAND }} />
                      дошли до результата
                    </span>
                  </p>
                </>
              )}
            </section>

            <section>
              <p className="r-kicker">Состояния и отток</p>
              <p className="r-lead">
                Окно ожидания считается по собственному ритму человека, а не общим порогом: для
                писавшего пять раз в день три дня тишины — сигнал, для писавшего раз в неделю —
                норма. Направление ухода — предположение по признакам: успех выглядит как затухание,
                отвал — как ступенька. Точный ответ даёт вопрос человеку, а не запрос.
              </p>
              {states.length === 0 ? (
                <p className="r-muted">В каждом разрезе меньше трёх участников — всё подавлено.</p>
              ) : (
                <>
                  <div className="r-viz-stack">
                    {states.map((row, index) => (
                      <i
                        key={`${row.state}-${row.probable_direction}`}
                        title={`${row.state} · ${row.probable_direction}: ${row.participants}`}
                        style={{
                          width: `${pct(row.participants, statesTotal)}%`,
                          background: index % 2 === 0 ? TEAL : SAND,
                          opacity: 1 - Math.min(0.6, index * 0.15),
                        }}
                      />
                    ))}
                  </div>
                  <div className="r-viz">
                    {states.map((row) => (
                      <BarRow
                        key={`${row.state}-${row.probable_direction}`}
                        label={`${row.state} · ${row.probable_direction}`}
                        value={row.participants}
                        max={Math.max(1, statesTotal)}
                        caption={`${row.participants} · ${pct(row.participants, statesTotal)}%`}
                      />
                    ))}
                  </div>
                  {states.some((row) => row.note) && (
                    <p className="r-viz-note">{states.find((row) => row.note)?.note}</p>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

/** Строка тепловой сетки: одна когорта по всем горизонтам. */
function Cohort({
  week,
  horizons,
  rows,
}: {
  week: string;
  horizons: number[];
  rows: AnalyticsSnapshot['retention'];
}) {
  const size = rows.find((row) => row.cohort_week === week)?.cohort_size ?? 0;
  return (
    <>
      <span className="row">
        {week.slice(5)} · {size}
      </span>
      {horizons.map((day) => {
        const cell = rows.find((row) => row.cohort_week === week && row.horizon_days === day);
        const value = cell?.retained_pct ?? null;
        return (
          <i
            key={day}
            style={{
              background:
                value === null
                  ? 'rgba(255,255,255,.04)'
                  : `rgba(81,221,208,${0.08 + (Number(value) / 100) * 0.5})`,
            }}
          >
            {value === null ? '·' : `${value}%`}
          </i>
        );
      })}
    </>
  );
}
