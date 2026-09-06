import { useEffect, useState, type ReactNode } from 'react';
import { reportError } from '../../services/error-monitoring';
import { COUNTERS_LIVE_SINCE } from '../../services/counters';
import { CABINETS } from './index';
import { isCurrentWeek, weekRange } from './weeks';
import {
  loadAnalytics,
  type AnalyticsSnapshot,
  type CoreMetricRow,
  type FunnelStageRow,
  type HeadlineRow,
  type SourceFunnelRow,
  type TrafficQualityRow,
} from './port';

/**
 * Экран аналитики.
 *
 * Три правила показа, и все три выстраданы.
 *
 * **Число без объяснения хуже отсутствия числа.** Там, где данных нет, стоит причина, а не
 * ноль: ноль читается как «всё плохо», а не как «мы это не измеряем».
 *
 * **Одна картина вместо четырёх.** Первая редакция рисовала путь человека четырьмя
 * отдельными формами — воронка по таблицам, вехи по событиям, источники полосами,
 * источник × этап полосками, — и связать их приходилось в голове. Одна воронка и одна
 * матрица отвечают на тот же вопрос, не заставляя держать в уме четыре шкалы.
 *
 * **Подпись читается одним способом.** «08-31» означало неделю с 31 августа по 6 сентября,
 * а читалось как день. Диапазон прочитать двояко нельзя.
 *
 * Длинные пояснения убраны под «как читать» и закрыты по умолчанию: раздел открывают,
 * чтобы посмотреть числа. Объяснение нужно один раз, а числа — каждый раз.
 */

const PERIODS = [
  // Дни и недели названы оба: витрины с окном в днях получают `days`, а недельный график
  // строится по `weeks`, и подпись «7 дней» над графиком из четырёх недель — это ровно
  // то расхождение, из-за которого сентябрьскую неделю сочли пропавшей.
  { days: 7, weeks: 4, label: '7 дней · 4 недели' },
  { days: 30, weeks: 12, label: '30 дней · 12 недель' },
  { days: 90, weeks: 26, label: '90 дней · 26 недель' },
];

const TEAL = 'var(--r-teal)';
const SAND = 'var(--r-sand)';

/** Ступени пути и шаг воронки по таблицам, который им соответствует. */
const STAGE_TO_FUNNEL_STEP: Record<string, number> = {
  landing: 1,
  signed_in: 2,
  onboarded: 3,
  first_episode: 4,
  episode_with_result: 5,
  repeat_episode: 7,
};

/** Столбцы матрицы «источник × этап». Ключ — поле витрины, подпись — то, что видит человек. */
const SOURCE_STAGES: { key: keyof SourceFunnelRow; label: string }[] = [
  { key: 'visitors', label: 'визит' },
  { key: 'signed_up', label: 'регистрация' },
  { key: 'onboarded', label: 'настройка' },
  { key: 'first_episode', label: 'эпизод' },
  { key: 'with_result', label: 'результат' },
];

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function share(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

/**
 * Раздел экрана: короткая подпись сверху, длинное объяснение — под спойлером.
 *
 * Предел в 140 знаков на лид не косметика. Раздел открывают, чтобы посмотреть числа;
 * абзац на триста знаков перед каждым числом читают один раз, а потом перестают читать
 * вообще — вместе с той строкой, которая объясняла, чему верить нельзя.
 */
function Block({
  kicker,
  lead,
  more,
  children,
}: {
  kicker: string;
  lead: string;
  more?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="r-kicker">{kicker}</p>
      <p className="r-lead">{lead}</p>
      {more && (
        <details className="r-viz-more">
          <summary>как читать</summary>
          <div>{more}</div>
        </details>
      )}
      {children}
    </section>
  );
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

export type FunnelStep = {
  stage: string;
  title: string;
  /** По таблицам базы: факты, а не то, что успел записать браузер. */
  people: number;
  /** По событиям браузера. Разница с `people` — мера того, сколько событий не доехало. */
  byEvents: number;
  fromPrevious: number | null;
  fromFirst: number | null;
};

/** Свести две воронки в одну картину: шаги по таблицам и вехи по событиям. */
export function buildFunnel(
  stages: FunnelStageRow[],
  steps: { step_no: number; people: number }[],
): FunnelStep[] {
  const byTables = (stage: string): number => {
    const stepNo = STAGE_TO_FUNNEL_STEP[stage];
    return steps.find((row) => row.step_no === stepNo)?.people ?? 0;
  };
  const first = stages.length ? byTables(stages[0].stage) : 0;
  return stages.map((stage, index) => {
    const people = byTables(stage.stage);
    const previous = index === 0 ? null : byTables(stages[index - 1].stage);
    return {
      stage: stage.stage,
      title: stage.title,
      people,
      byEvents: stage.people,
      fromPrevious: previous === null ? null : share(people, previous),
      fromFirst: index === 0 ? null : share(people, first),
    };
  });
}

/**
 * Одна воронка вместо двух.
 *
 * Толстая полоса — по таблицам: факт есть факт. Тонкая под ней — по событиям браузера, и
 * её отставание это не вторая правда, а мера потерь: блокировщики, закрытая вкладка,
 * потерянная сеть. Отдельной секцией это было бы сравнением двух картин; одной картиной
 * это разница, которую видно не считая.
 */
function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(1, ...steps.map((step) => Math.max(step.people, step.byEvents)));
  return (
    <div className="r-funnel">
      {steps.map((step) => (
        <div className="r-funnel-step" key={step.stage}>
          <span className="r-funnel-name">{step.title}</span>
          <span className="r-funnel-bar">
            <i style={{ width: `${Math.max(step.people > 0 ? 2 : 0, pct(step.people, top))}%` }} />
            <i
              className="events"
              style={{ width: `${Math.max(step.byEvents > 0 ? 2 : 0, pct(step.byEvents, top))}%` }}
            />
          </span>
          <span className="r-funnel-numbers">
            <b>{step.people}</b>
            <em>
              {step.fromPrevious === null
                ? 'первая ступень'
                : `${step.fromPrevious}% от предыдущей`}
            </em>
            <em>{step.fromFirst === null ? '100% от первой' : `${step.fromFirst}% от первой`}</em>
            <em>по событиям {step.byEvents}</em>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Цвет ячейки по доле. Один тон, разная плотность: сравнивают глубину, а не радугу. */
function cellTone(value: number | null): string {
  if (value === null) return 'transparent';
  return `rgba(81,221,208,${0.06 + Math.min(1, value / 100) * 0.42})`;
}

/**
 * Источник × этап матрицей.
 *
 * Полоски показывали то же самое, но сравнить два источника между собой по ним было
 * нельзя: у каждого своя шкала и своя строка. В матрице столбец — это одна ступень у
 * всех источников сразу, и слабое место видно взглядом, а не пересчётом.
 */
function SourceMatrix({ rows }: { rows: SourceFunnelRow[] }) {
  return (
    <div className="r-matrix-scroll">
      <table className="r-matrix">
        <thead>
          <tr>
            <th>Источник</th>
            {SOURCE_STAGES.map((stage) => (
              <th key={String(stage.key)}>{stage.label}</th>
            ))}
            <th>вернулись</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.source_kind}-${row.detail}`}>
              <th scope="row">
                <b>{row.source_kind}</b>
                <small>{row.detail}</small>
              </th>
              {SOURCE_STAGES.map((stage) => {
                const value = Number(row[stage.key]);
                const part = share(value, row.visitors);
                return (
                  <td key={String(stage.key)} style={{ background: cellTone(part) }}>
                    <b>{value}</b>
                    <small>{part === null ? '—' : `${part}%`}</small>
                  </td>
                );
              })}
              <td>
                <b>{row.retained_week2}</b>
                <small>на 2-й неделе</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PLACE_SEGMENTS = ['engaged', 'single_event'];

/**
 * Откуда люди: место × поведение.
 *
 * Поведения одного мало. Обходчик и владелец через VPN ведут себя по-разному, но для
 * вопроса «пришли ли люди» одинаково бесполезны. Место добавляет второй признак, и
 * вместе они дают ответ, ради которого экран и открывают.
 */
function PlaceMatrix({ rows }: { rows: TrafficQualityRow[] }) {
  const regions = Array.from(new Set(rows.map((row) => row.region)));
  const titles = new Map(rows.map((row) => [row.region, row.region_title]));
  const segments = PLACE_SEGMENTS.filter((segment) =>
    rows.some((row) => row.segment === segment),
  ).map((segment) => ({
    segment,
    title: rows.find((row) => row.segment === segment)?.segment_title ?? segment,
  }));
  const cell = (region: string, segment: string) =>
    rows.find((row) => row.region === region && row.segment === segment);

  return (
    <div className="r-matrix-scroll">
      <table className="r-matrix">
        <thead>
          <tr>
            <th>Место</th>
            {segments.map((item) => (
              <th key={item.segment}>{item.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regions.map((region) => (
            <tr key={region}>
              <th scope="row">
                <b>{titles.get(region)}</b>
              </th>
              {segments.map((item) => {
                const found = cell(region, item.segment);
                return (
                  <td key={item.segment} style={{ background: cellTone(found?.share_pct ?? null) }}>
                    <b>{found?.visitors ?? '—'}</b>
                    <small>
                      {found?.visitors === null || found?.visitors === undefined
                        ? (found?.note ?? 'нет данных')
                        : `${found.share_pct}% от всех`}
                    </small>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Недели одной картинкой: столбики — люди, линия — расход к исходному уровню.
 *
 * Подпись — диапазон недели, а не её первый день: «08-31» читалось как 31 августа и
 * породило вывод, что сентябрьской недели нет. Текущая неделя помечена и нарисована
 * бледной: она прожита не до конца, и сравнивать её высоту с полными нельзя.
 */
function WeeksChart({ rows }: { rows: CoreMetricRow[] }) {
  const step = 44;
  const padTop = 10;
  const padBottom = 22;
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
      {rows.map((row, index) => {
        const running = isCurrentWeek(row.week);
        return (
          <rect
            key={row.week}
            x={cx(index) - step * 0.28}
            y={barTop(row.participants_with_result)}
            width={step * 0.56}
            height={Math.max(2, padTop + plot - barTop(row.participants_with_result))}
            rx="2"
            fill={running ? 'rgba(81,221,208,.28)' : 'var(--r-teal)'}
            opacity={row.participants_with_result === 0 ? 0.35 : 0.8}
          >
            <title>{`${weekRange(row.week)}: ${row.participants_with_result} чел.`}</title>
          </rect>
        );
      })}
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
            <title>{`${weekRange(rows[index].week)}: расход ${Math.round(value * 100)}% от исходного`}</title>
          </circle>
        ),
      )}
      {rows.map((row, index) => (
        <text
          key={`label-${row.week}`}
          x={cx(index)}
          y={height - 8}
          textAnchor="middle"
          fontSize="9"
          fill="var(--r-dim)"
        >
          {weekRange(row.week)}
          {isCurrentWeek(row.week) ? ' · идёт' : ''}
        </text>
      ))}
    </svg>
  );
}

/**
 * Данные отдельно от вида.
 *
 * Разделение не про чистоту, а про проверяемость: у модуля не было ни одного теста,
 * потому что проверить его можно было только подняв загрузку из базы. Вид принимает
 * готовый снимок и рисуется синхронно — его можно отрендерить в строку и прочитать
 * глазами теста.
 */
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

  return (
    <AnalyticsView
      snapshot={snapshot}
      state={state}
      reason={reason}
      periodIndex={periodIndex}
      onPeriod={setPeriodIndex}
    />
  );
}

export function AnalyticsView({
  snapshot,
  state,
  reason,
  periodIndex,
  onPeriod,
}: {
  snapshot: AnalyticsSnapshot | null;
  state: 'loading' | 'ready' | 'failed';
  reason: string;
  periodIndex: number;
  onPeriod: (index: number) => void;
}) {
  const core = snapshot?.core ?? [];
  const flow = snapshot?.flow ?? [];
  const flowTop = Math.max(1, ...flow.map((row) => row.people));
  const states = snapshot?.states ?? [];
  const statesTotal = states.reduce((sum, row) => sum + row.participants, 0);
  const funnelSteps = snapshot ? buildFunnel(snapshot.funnelStages, snapshot.funnel) : [];
  const russians =
    snapshot?.trafficQuality.find((row) => row.region === 'russia' && row.segment === 'engaged') ??
    null;

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
          Считает база: десять функций, каждая отказывает не-администратору. Идентификаторов
          участников нет ни в одном поле.
        </p>

        <div className="r-health-periods">
          {PERIODS.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={index === periodIndex ? 'active' : ''}
              onClick={() => onPeriod(index)}
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
              <Block
                kicker="Воронка"
                lead="Толстая полоса — по таблицам базы, тонкая под ней — по событиям браузера."
                more={
                  <>
                    <p>
                      Отставание тонкой полосы — не вторая правда, а мера потерь: блокировщики,
                      закрытая вкладка, потерянная сеть. Таблицы знают факт, браузер — только то,
                      что успел отправить.
                    </p>
                    <p>
                      Ступень «эпизод доведён до результата» всегда равна предыдущей, и читать её
                      как конверсию нельзя: сценарий тяги не умеет закончиться исходом «открыт». Она
                      станет содержательной, когда появится способ завести эпизод, который можно
                      бросить на середине.
                    </p>
                  </>
                }
              >
                <Funnel steps={funnelSteps} />
              </Block>

              <Block
                kicker="Источник × этап"
                lead="Доля в ячейке считается от визитов своего источника, а не от общего максимума."
                more={
                  <p>
                    При общей шкале крупный плохой источник всегда выглядит лучше мелкого хорошего:
                    сто визитов и ноль результатов рисуются длиннее, чем пять и пять. Искать надо
                    мелкий хороший — его можно повторить.
                  </p>
                }
              >
                {snapshot.sourceFunnel.length === 0 ? (
                  <p className="r-muted">
                    Строка появляется у источника с тремя посетителями за период. Ни один пока не
                    набрал троих — это подавление, а не отсутствие данных.
                  </p>
                ) : (
                  <SourceMatrix rows={snapshot.sourceFunnel} />
                )}
              </Block>

              <Block
                kicker="Откуда люди"
                lead="Место — по часовому поясу; язык учитывается, только когда пояса нет вовсе."
                more={
                  <>
                    <p>
                      Поведения одного мало. 06.09 из 293 посетителей 133 пришли с поясом UTC и
                      языком en-US — 120 за два часа равномерно по всем статьям, без единого второго
                      события; ещё 98 с America/Los_Angeles — это рендерер Google, он же
                      «пользователи» в GA и «США, отказ 97%» в Метрике.
                    </p>
                    <p>
                      Пояс — сигнал сильнее языка: VPN меняет адрес, но не системное время. Обратная
                      сторона в том, что русскоязычный человек в нероссийском поясе попадёт в «не
                      Россию»: мы отвечаем на вопрос «откуда заходят», а не «кто по паспорту». Ни
                      адрес, ни user-agent для этого не хранятся.
                    </p>
                  </>
                }
              >
                <PlaceMatrix rows={snapshot.trafficQuality} />
                <p className="r-viz-note">
                  Людей из России со вторым событием —{' '}
                  {russians?.visitors ?? russians?.note ?? 'нет данных'}.
                </p>
              </Block>

              <Block
                kicker="Две опорные метрики"
                lead="Столбики — люди с результатом за неделю, песочная линия — расход к исходному уровню."
                more={
                  <p>
                    Первая может расти, пока вторая стоит, и это будет означать, что мы научились
                    удерживать людей, а не помогать им. Разрыв в линии — неделя, за которую расход
                    посчитать нечем: соединять её концы значило бы дорисовать данные.
                  </p>
                }
              >
                {core.length === 0 ? (
                  <p className="r-muted">За выбранный период нет ни одной недели с данными.</p>
                ) : (
                  <WeeksChart rows={core} />
                )}
              </Block>

              <Block
                kicker="Удержание по когортам"
                lead="Считается по действию: открыть приложение и ничего не записать — не удержание."
              >
                {cohorts.length === 0 ? (
                  <p className="r-muted">Когорт за период нет.</p>
                ) : (
                  <div
                    className="r-viz-heat"
                    style={{ ['--r-heat-columns' as string]: String(horizons.length) }}
                  >
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
              </Block>

              <Block
                kicker="Состояния и отток"
                lead="Окно ожидания считается по ритму самого человека, а не общим порогом."
                more={
                  <p>
                    Для писавшего пять раз в день три дня тишины — сигнал, для писавшего раз в
                    неделю — норма. Направление ухода это предположение по признакам: успех выглядит
                    как затухание, отвал — как ступенька. Точный ответ даёт вопрос человеку, а не
                    запрос.
                  </p>
                }
              >
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
              </Block>

              <Block
                kicker="Сценарий тяги по экранам"
                lead="Сколько человек дошло до экрана и медиана времени на нём."
                more={
                  <p>
                    Аудит 26.08 предположил, что четыре экрана выбора противоречат принципу «минимум
                    действий в момент тяги». Порядок шагов не меняется: измерение нужно, чтобы
                    спорить предметно.
                  </p>
                }
              >
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
              </Block>

              <Block
                kicker="Кабинеты"
                lead="Глубина, которой у нас нет: география, устройства, запросы. Своя база — источник истины."
                more={
                  <p>
                    Расхождение в 5–15% нормально: блокировщики режут счётчики, в России заметно.
                    Данные счётчиков есть только с {COUNTERS_LIVE_SINCE} — раньше идентификаторы в
                    сборке были пустыми, и кабинет за более ранний период показывает не «ноль
                    посетителей», а «счётчика не было».
                  </p>
                }
              >
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
              </Block>
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
        {weekRange(week)} · {size}
      </span>
      {horizons.map((day) => {
        const cell = rows.find((row) => row.cohort_week === week && row.horizon_days === day);
        const value = cell?.retained_pct ?? null;
        return (
          <i key={day} style={{ background: cellTone(value === null ? null : Number(value)) }}>
            {value === null ? '·' : `${value}%`}
          </i>
        );
      })}
    </>
  );
}
