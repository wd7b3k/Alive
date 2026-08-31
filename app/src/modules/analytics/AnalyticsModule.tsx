import { useEffect, useState } from 'react';
import { reportError } from '../../services/error-monitoring';
import { CABINETS } from './index';
import {
  loadAnalytics,
  type AnalyticsSnapshot,
  type CoreMetricRow,
  type HeadlineRow,
  type SourceFunnelRow,
} from './port';

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

/**
 * Плитка опорного числа.
 *
 * Дельта считается базой по сдвинутому окну, а не вычитанием двух периодов: у долей и
 * уникальных людей разность окон даёт неверный ответ тихо. Стрелка смотрит туда, куда
 * двинулось число, а цвет — на то, хорошо это или плохо: у затихших «вниз» это хорошо,
 * и знает об этом тоже база (`better_when`).
 */
function Tile({ row }: { row: HeadlineRow }) {
  const has = row.computable && row.value !== null;
  const delta = has && row.previous !== null ? Number(row.value) - Number(row.previous) : null;
  const improved = delta === null || delta === 0 ? null : delta > 0 === (row.better_when === 'up');
  const shown = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
  return (
    <article className="r-viz-tile">
      <span>{row.title}</span>
      <strong>
        {has ? `${shown(Number(row.value))}${row.unit === '%' ? '%' : ''}` : '—'}
        {row.unit !== '%' && has && <em> {row.unit}</em>}
      </strong>
      {delta !== null ? (
        <b className={improved === null ? '' : improved ? 'better' : 'worse'}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {shown(Math.abs(delta))}
          {row.unit === '%' ? '%' : ''} к прошлому периоду
        </b>
      ) : (
        <b className="pale">{has ? 'сравнить не с чем' : (row.note ?? 'нечем считать')}</b>
      )}
      <small>{row.hint}</small>
    </article>
  );
}

/**
 * Недели одной картинкой: столбики — люди, линия — расход к исходному уровню.
 *
 * Раньше расход шёл строкой текста под графиком, и связь двух метрик приходилось
 * восстанавливать в голове. Это ровно та пара, которую читают вместе: первая может расти,
 * пока вторая стоит, и тогда мы научились удерживать людей, а не помогать им.
 *
 * Оси две, и единицы у них разные, поэтому у линии нет числовой шкалы: она показывает
 * форму, а точное значение стоит в подсказке точки. Общая шкала для людей и процентов
 * означала бы, что одну из двух метрик мы нарисовали неверно.
 */
function WeeksChart({ rows }: { rows: CoreMetricRow[] }) {
  const step = 26;
  const padTop = 10;
  const padBottom = 20;
  const height = 150;
  const plot = height - padTop - padBottom;
  const width = Math.max(1, rows.length) * step;
  const maxPeople = Math.max(1, ...rows.map((row) => row.participants_with_result));
  const ratios = rows.map((row) =>
    row.computable && row.median_baseline_ratio !== null ? Number(row.median_baseline_ratio) : null,
  );
  const maxRatio = Math.max(1, ...ratios.map((value) => value ?? 0));
  const cx = (index: number) => index * step + step / 2;
  const barTop = (value: number) => padTop + plot - (value / maxPeople) * plot;
  const dotY = (value: number) => padTop + plot - (value / maxRatio) * plot;

  // Разрыв в линии — это неделя, за которую расход посчитать нечем. Соединять её концы
  // прямой значило бы дорисовать данные, которых нет.
  const segments: { index: number; value: number }[][] = [];
  ratios.forEach((value, index) => {
    if (value === null) {
      if (segments.length && segments[segments.length - 1].length) segments.push([]);
      return;
    }
    if (!segments.length) segments.push([]);
    segments[segments.length - 1].push({ index, value });
  });

  return (
    <svg className="r-viz-chart" viewBox={`0 0 ${width} ${height}`} role="img">
      <title>Недельные участники с результатом и расход к исходному уровню</title>
      {rows.map((row, index) => (
        <rect
          key={row.week}
          x={cx(index) - step * 0.3}
          y={barTop(row.participants_with_result)}
          width={step * 0.6}
          height={Math.max(2, padTop + plot - barTop(row.participants_with_result))}
          rx="2"
          fill={row.participants_with_result === 0 ? 'rgba(255,255,255,.07)' : 'var(--r-teal)'}
          opacity={row.participants_with_result === 0 ? 1 : 0.75}
        >
          <title>{`${row.week}: ${row.participants_with_result} чел.`}</title>
        </rect>
      ))}
      {segments
        .filter((segment) => segment.length > 1)
        .map((segment) => (
          <polyline
            key={`line-${segment[0].index}`}
            fill="none"
            stroke="var(--r-sand)"
            strokeWidth="1.5"
            points={segment.map((point) => `${cx(point.index)},${dotY(point.value)}`).join(' ')}
          />
        ))}
      {ratios.map((value, index) =>
        value === null ? null : (
          <circle key={`dot-${index}`} cx={cx(index)} cy={dotY(value)} r="2.5" fill="var(--r-sand)">
            <title>{`${rows[index].week}: расход ${Math.round(value * 100)}% от исходного`}</title>
          </circle>
        ),
      )}
      {rows.map((row, index) => (
        <text
          key={`label-${row.week}`}
          x={cx(index)}
          y={height - 6}
          textAnchor="middle"
          fontSize="9"
          fill="var(--r-dim)"
        >
          {row.week.slice(5)}
        </text>
      ))}
    </svg>
  );
}

const FUNNEL_STAGES: { key: keyof SourceFunnelRow; label: string }[] = [
  { key: 'visitors', label: 'визит' },
  { key: 'signed_up', label: 'регистрация' },
  { key: 'onboarded', label: 'настройка' },
  { key: 'first_episode', label: 'первый эпизод' },
  { key: 'with_result', label: 'результат' },
];

/**
 * Воронка по источникам.
 *
 * Ширина сегмента считается от посетителей своего источника, а не от общего максимума, и
 * это главное решение блока. При общей шкале крупный плохой источник всегда выглядит
 * лучше мелкого хорошего — сравниваются объёмы, а искать надо конверсию: пять визитов и
 * пять результатов важнее ста визитов и нуля.
 */
function SourceFunnel({ rows }: { rows: SourceFunnelRow[] }) {
  return (
    <div className="r-viz-funnel">
      {rows.map((row) => {
        const conversion = row.visitors > 0 ? (row.with_result / row.visitors) * 100 : 0;
        return (
          <div key={`${row.source_kind}-${row.detail}`}>
            <p>
              <b>{row.source_kind}</b>
              <span>{row.detail}</span>
              <em>
                {row.visitors} → {row.with_result} ·{' '}
                {conversion >= 10 ? Math.round(conversion) : conversion.toFixed(1)}%
              </em>
            </p>
            <div className="r-viz-funnel-bars">
              {FUNNEL_STAGES.map((stage, index) => {
                const value = Number(row[stage.key]);
                const share = row.visitors > 0 ? (value / row.visitors) * 100 : 0;
                return (
                  <i key={stage.key} title={`${stage.label}: ${value}`}>
                    <span
                      style={{
                        width: `${Math.max(value > 0 ? 1.5 : 0, share)}%`,
                        opacity: 0.9 - index * 0.12,
                      }}
                    />
                  </i>
                );
              })}
            </div>
            <small>
              {FUNNEL_STAGES.map((stage) => `${stage.label} ${row[stage.key]}`).join(' · ')} ·
              вернулись на второй неделе {row.retained_week2}
            </small>
          </div>
        );
      })}
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
          <>
            <div className="r-viz-tiles">
              {snapshot.headline.map((row) => (
                <Tile key={row.metric} row={row} />
              ))}
            </div>

            <div className="r-hypotheses">
              <section>
                <p className="r-kicker">Две опорные метрики</p>
                <p className="r-lead">
                  Столбики — сколько человек за неделю довели разбор тяги до результата: метрика
                  жизни, двигается быстро. Числа под ними — во сколько раз недельный расход
                  отличается от исходного уровня: метрика смысла, двигается медленно. Первая может
                  расти, пока вторая стоит, и это будет означать, что мы научились удерживать людей,
                  а не помогать им.
                </p>
                {core.length === 0 ? (
                  <p className="r-muted">За выбранный период нет ни одной недели с данными.</p>
                ) : (
                  <>
                    <WeeksChart rows={core} />
                    <p className="r-viz-note">
                      Столбики — люди, песочная линия — расход к исходному уровню. Разрыв в линии
                      означает неделю, за которую расход посчитать нечем: соединять её концы прямой
                      значило бы дорисовать данные.
                      {core.every((row) => !row.computable) &&
                        ' Пока таких недель все: нет записей расхода и исходного уровня.'}
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
                  Считается по действию, а не по входу: открыть приложение и ничего не записать —
                  это не удержание. Строка — неделя регистрации, столбец — день жизни.
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
                      <Cohort
                        key={week}
                        week={week}
                        horizons={horizons}
                        rows={snapshot.retention}
                      />
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
                  норма. Направление ухода — предположение по признакам: успех выглядит как
                  затухание, отвал — как ступенька. Точный ответ даёт вопрос человеку, а не запрос.
                </p>
                {states.length === 0 ? (
                  <p className="r-muted">
                    В каждом разрезе меньше трёх участников — всё подавлено.
                  </p>
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

              <section>
                <p className="r-kicker">Источник × этап</p>
                <p className="r-lead">
                  Пересечение, которого не хватало: какой источник приводит людей, доходящих до
                  результата, а какой — только визиты. Ширина сегмента считается от посетителей
                  своего источника, а не от общего максимума: при общей шкале крупный плохой
                  источник всегда выглядит лучше мелкого хорошего, а искать надо именно мелкий
                  хороший.
                </p>
                {snapshot.sourceFunnel.length === 0 ? (
                  <p className="r-muted">
                    Ни в одном источнике нет трёх посетителей за период — все разрезы подавлены.
                  </p>
                ) : (
                  <SourceFunnel rows={snapshot.sourceFunnel} />
                )}
              </section>

              <section>
                <p className="r-kicker">Кабинеты</p>
                <p className="r-lead">
                  Там глубина, которой у нас нет и не должно быть: точная география, устройства,
                  поисковые запросы. Своя база остаётся источником истины по продуктовым числам —
                  счётчики отвечают за то, чего она не знает. Расхождение в 5–15% нормально:
                  блокировщики режут счётчики, в России заметно.
                </p>
                <div className="r-viz-cabinets">
                  {CABINETS.map((cabinet) => (
                    <a
                      key={cabinet.href}
                      href={cabinet.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <b>{cabinet.title}</b>
                      <small>{cabinet.hint}</small>
                    </a>
                  ))}
                </div>
              </section>
            </div>
          </>
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
