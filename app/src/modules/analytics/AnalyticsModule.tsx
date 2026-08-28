import { useEffect, useState } from 'react';
import { reportError } from '../../services/error-monitoring';
import { loadAnalytics, type AnalyticsSnapshot } from './port';

/**
 * Экран аналитики.
 *
 * Правило показа одно и держит весь модуль: **число без объяснения хуже отсутствия
 * числа**. У каждого раздела сказано, что он означает и чему верить нельзя; там, где
 * данных нет, стоит причина, а не ноль. Непосчитанное показывается строкой, а не
 * прячется: список того, чего продукт про себя не знает, — сам по себе результат.
 *
 * Разметка намеренно та же, что у «Здоровья продукта»: `r-hypotheses` и списки
 * определений. Своих классов модуль не заводит — иначе через месяц у админки будет два
 * визуальных языка вместо одного.
 */

const PERIODS = [
  { days: 7, weeks: 4, label: '7 дней' },
  { days: 30, weeks: 12, label: '30 дней' },
  { days: 90, weeks: 26, label: '90 дней' },
];

type Row = {
  label: string;
  note?: string | null;
  value: string;
  hint?: string | null;
  muted?: boolean;
};

function Block({
  title,
  lead,
  rows,
  empty,
}: {
  title: string;
  lead: string;
  rows: Row[];
  empty: string;
}) {
  return (
    <section>
      <p className="r-kicker">{title}</p>
      <p className="r-lead">{lead}</p>
      {rows.length === 0 ? (
        <p className="r-muted">{empty}</p>
      ) : (
        <dl>
          {rows.map((row) => (
            <div key={row.label} className={row.muted ? 'unavailable' : ''}>
              <dt>
                {row.label}
                {row.note && <small>{row.note}</small>}
              </dt>
              <dd>
                <b>{row.value}</b>
                {row.hint && <small>{row.hint}</small>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function AnalyticsModule() {
  const [periodIndex, setPeriodIndex] = useState(1);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading');

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
      .catch((reason: unknown) => {
        reportError(reason, { surface: 'analytics' });
        // Отказ базы здесь почти всегда означает «роль не администратор». Сказать об
        // этом прямо честнее, чем показать пустой экран и оставить гадать.
        if (!cancelled) setState('denied');
      });
    return () => {
      cancelled = true;
    };
  }, [period.days, period.weeks]);

  const coreRows: Row[] = (snapshot?.core ?? []).map((row) => ({
    label: row.week,
    value: `${row.participants_with_result} с результатом`,
    hint:
      row.computable && row.median_baseline_ratio !== null
        ? `расход ${Math.round(row.median_baseline_ratio * 100)}% от исходного · новых ${row.new_participants} · n = ${row.ratio_observations}`
        : `${row.note ?? 'расход посчитать нечем'} · новых ${row.new_participants}`,
    muted: !row.computable,
  }));

  const funnelRows: Row[] = (snapshot?.funnel ?? []).map((row) => ({
    label: `${row.step_no}. ${row.step}`,
    note: row.note,
    value: `${row.people}`,
    hint: row.conversion_pct !== null ? `${row.conversion_pct}% от предыдущего шага` : null,
    muted: !row.computable,
  }));

  const flowRows: Row[] = (snapshot?.flow ?? []).map((row) => ({
    label: `Экран ${row.step_no}`,
    value: `${row.people} чел.`,
    hint: [
      row.median_seconds !== null ? `медиана ${row.median_seconds} сек` : null,
      row.drop_off_pct !== null ? `отвал ${row.drop_off_pct}%` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  const retentionRows: Row[] = (snapshot?.retention ?? []).map((row) => ({
    label: `${row.cohort_week} · день ${row.horizon_days}`,
    value: row.retained_pct !== null ? `${row.retained_pct}%` : 'подавлено',
    hint:
      row.retained_pct !== null
        ? `${row.retained} из ${row.cohort_size}`
        : 'в когорте меньше трёх человек',
    muted: row.retained_pct === null,
  }));

  const sourceRows: Row[] = (snapshot?.sources ?? []).map((row) => ({
    label: `${row.source_kind} · ${row.detail}`,
    value: `${row.reached_result} дошли до результата`,
    hint: `посетителей ${row.visitors} → регистраций ${row.signups}`,
  }));

  const stateRows: Row[] = (snapshot?.states ?? []).map((row) => ({
    label: `${row.state} · ${row.probable_direction}`,
    note: row.note,
    value: `${row.participants}`,
    muted: row.probable_direction === 'неизвестно',
  }));

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
        {state === 'denied' && (
          <p className="r-muted">
            База отказала в доступе. Аналитику видит только роль <code>admin</code>: строка в{' '}
            <code>private.alive_admin_allowlist</code> и{' '}
            <code>update public.profiles set role = &apos;admin&apos; where id = …</code>
          </p>
        )}

        {state === 'ready' && snapshot && (
          <div className="r-hypotheses">
            <Block
              title="Две опорные метрики"
              lead="Слева — сколько человек за неделю довели разбор тяги до результата: метрика жизни, двигается быстро. Справа — во сколько раз недельный расход отличается от исходного уровня: метрика смысла, двигается медленно. Первая может расти, пока вторая стоит, и это будет означать, что мы научились удерживать людей, а не помогать им."
              rows={coreRows}
              empty="За выбранный период нет ни одной недели с данными."
            />
            <Block
              title="Воронка вовлечения"
              lead="Семь шагов от визита до возврата на второй неделе. Шаг «визит» считается с 28.08.2026: до этого события до входа записать было нельзя."
              rows={funnelRows}
              empty="Данных за период нет."
            />
            <Block
              title="Сценарий тяги по экранам"
              lead="Аудит 26.08 предположил, что четыре экрана выбора противоречат принципу «минимум действий в момент тяги». Здесь видно, сколько человек доходит до каждого экрана и сколько времени на нём проводит. Порядок шагов не меняется — измерение нужно, чтобы спорить предметно."
              rows={flowRows}
              empty="Шаги сценария пишутся с 28.08.2026. За более ранний период их нет."
            />
            <Block
              title="Удержание по когортам"
              lead="Считается по действию, а не по входу: открыть приложение и ничего не записать — это не удержание. Когорта — неделя регистрации."
              rows={retentionRows}
              empty="Когорт за период нет."
            />
            <Block
              title="Источники"
              lead="Вопрос не «сколько визитов», а сколько из них дошло до записанного результата. Источник, приводящий сто человек и ноль разборов, хуже источника с пятью и пятью."
              rows={sourceRows}
              empty="Посетители пишутся с 28.08.2026, разрезы меньше трёх человек подавлены."
            />
            <Block
              title="Состояния и отток"
              lead="Окно ожидания считается по собственному ритму человека, а не общим порогом: для писавшего пять раз в день три дня тишины — сигнал, для писавшего раз в неделю — норма. Направление ухода — предположение по признакам: успех выглядит как затухание, отвал — как ступенька. Точный ответ даёт вопрос человеку, а не запрос."
              rows={stateRows}
              empty="В каждом разрезе меньше трёх участников — всё подавлено."
            />
          </div>
        )}
      </section>
    </main>
  );
}
