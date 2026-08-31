import { useEffect, useState } from 'react';
import { reportError } from '../../services/error-monitoring';
import {
  STATUS_LABEL,
  VERDICT,
  ago,
  measurement,
  percent,
  period,
  statusTone,
  uptime,
} from './format';
import { incidentDays, loadServiceHealth } from './port';
import type { Check, Component, Incident, Layer, ServiceSnapshot, Surface } from './port';

/**
 * Раздел «Техническое состояние».
 *
 * Отвечает на три вопроса подряд, и порядок здесь — это и есть содержание: что с
 * сервисом целиком, что с каждой его частью, что с каждой отдельной проверкой. Кто
 * открывает этот экран, обычно уже знает, что где-то не работает, и ищет, где именно.
 *
 * Три правила, которые держат раздел.
 *
 * 1. **Считает база.** Ни одного порога и ни одной оценки здесь нет: экран берёт готовый
 *    статус и раскрашивает его. Иначе «сервис работает» будет означать одно в вебе и
 *    другое в боте, когда бот появится.
 *
 * 2. **Молчание видно.** Проверка, переставшая отчитываться, показывается словом
 *    «молчит», а не последним известным «в норме». Это главный способ мониторинга
 *    соврать, и на этом экране он закрыт.
 *
 * 3. **Ничего без объяснения.** У каждой части и каждой проверки рядом стоит строка о
 *    том, что она означает. Текст лежит в базе, в `ops.components` и `ops.check_catalog`,
 *    а не в разметке: проверку заводит тот, кто пишет скрипт, и объяснять её — его работа.
 *
 * Корень раздела — `section`, а не `main`: оболочка админки уже открыла `main`, и второй
 * внутри первого — невалидная разметка.
 */

const PERIODS = [
  { hours: 1, label: 'час' },
  { hours: 24, label: 'сутки' },
  { hours: 168, label: '7 дней' },
];

const LAYERS: { id: Layer; title: string; lead: string }[] = [
  {
    id: 'frontend',
    title: 'Фронт',
    lead: 'То, через что человек попадает в продукт. Сейчас фронт один; строки для бота и мобильного приложения стоят заранее, чтобы их появление не потребовало править этот экран.',
  },
  {
    id: 'backend',
    title: 'Бэкенд',
    lead: 'Службы, без которых фронт — пустая страница: шлюз, чтение данных, вход, база.',
  },
  {
    id: 'platform',
    title: 'Платформа',
    lead: 'Под чем всё это стоит. Здесь почти не бывает аварий — здесь бывают сроки, которые кончаются молча.',
  },
];

function stamp(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Dot({ tone }: { tone: string }) {
  return <span className={`r-monitoring-dot ${tone}`} aria-hidden="true" />;
}

function ComponentCard({ item }: { item: Component }) {
  const tone = statusTone(item.status);
  const availability = uptime(item.uptime_pct, item.uptime_samples);
  return (
    <article className={`r-monitoring-card ${tone}`}>
      <header>
        <Dot tone={tone} />
        <strong>{item.title}</strong>
        <em>{STATUS_LABEL[item.status]}</em>
      </header>
      <p>{item.hint}</p>
      <ul className="r-monitoring-facts">
        {item.lifecycle === 'live' ? (
          <li>
            {item.checks_total} {item.checks_total === 1 ? 'проверка' : 'проверок'}
            {item.checks_failing > 0 && `, отказов ${item.checks_failing}`}
            {item.checks_warning > 0 && `, предупреждений ${item.checks_warning}`}
            {item.checks_silent > 0 && `, молчит ${item.checks_silent}`}
          </li>
        ) : (
          <li>Часть заведена заранее и пока не отчитывается</li>
        )}
        {availability && <li>Доступность за период — {availability}</li>}
        {item.latency_p95_ms !== null && (
          <li>Отклик, 95-й перцентиль — {item.latency_p95_ms} мс</li>
        )}
        {item.status !== 'ok' && item.worst_check && <li>Хуже всего: {item.worst_check}</li>}
        {item.lifecycle === 'live' && <li>Последний отчёт — {stamp(item.last_seen)}</li>}
        {item.critical && <li>Отказ этой части означает, что продукт не работает</li>}
      </ul>
    </article>
  );
}

function SurfaceCard({ item }: { item: Surface }) {
  const tone = statusTone(item.status);
  const share = percent(item.errors_per_100);
  return (
    <article className={`r-monitoring-card ${tone}`}>
      <header>
        <Dot tone={tone} />
        <strong>{item.title}</strong>
        <em>{STATUS_LABEL[item.status]}</em>
      </header>
      <p>{item.hint}</p>
      <ul className="r-monitoring-facts">
        {item.note ? (
          <li>{item.note}</li>
        ) : (
          <>
            <li>Событий за период — {item.signals}</li>
            <li>
              Ошибок — {item.errors}
              {share && `, это ${share} от числа событий`}
            </li>
            <li>Последний сигнал — {stamp(item.last_signal_at)}</li>
            {item.latest_version && (
              <li>
                Отвечает сборка {item.latest_version}
                {item.versions > 1 && `, всего за период их ${item.versions}`}
              </li>
            )}
          </>
        )}
      </ul>
    </article>
  );
}

function CheckRow({ item }: { item: Check }) {
  const tone = statusTone(item.status);
  const shown = measurement(item);
  const availability = uptime(item.uptime_pct, item.samples);
  return (
    <div className={`r-monitoring-check ${tone}`}>
      <div>
        <strong>
          <Dot tone={tone} />
          {item.title}
        </strong>
        {item.target && <code>{item.target}</code>}
        <small>{item.hint}</small>
        {item.note && <small className="r-monitoring-note">{item.note}</small>}
      </div>
      <div className="r-monitoring-meta">
        <b>{shown ?? STATUS_LABEL[item.status]}</b>
        <small>{shown ? STATUS_LABEL[item.status] : period(item.period_seconds)}</small>
        <small>{ago(item.age_seconds)}</small>
        {availability && <small>доступность {availability}</small>}
      </div>
    </div>
  );
}

function Incidents({ items, days }: { items: Incident[]; days: number }) {
  return (
    <section>
      <p className="r-kicker">Случаи</p>
      <p className="r-lead">
        Подряд идущие неудачи одной проверки — это один случай, а не двадцать строк. За{' '}
        {days === 1 ? 'сутки' : `${days} дн.`} их{' '}
        {items.length === 0 ? 'не было ни одного' : items.length}.
      </p>
      {items.length > 0 && (
        <div className="r-monitoring-incidents">
          {items.map((item) => (
            <div
              key={`${item.check_name}-${item.target ?? ''}-${item.started_at}`}
              className={statusTone(item.status)}
            >
              <strong>
                <Dot tone={statusTone(item.status)} />
                {item.title}
              </strong>
              <small>
                {item.component_title ?? 'вне каталога'} · {stamp(item.started_at)} —{' '}
                {stamp(item.ended_at)} · замеров {item.samples}
              </small>
              {item.note && <small className="r-monitoring-note">{item.note}</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function MonitoringModule() {
  const [periodIndex, setPeriodIndex] = useState(1);
  const [snapshot, setSnapshot] = useState<ServiceSnapshot | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reason, setReason] = useState('');

  const hours = PERIODS[periodIndex].hours;

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    loadServiceHealth(hours)
      .then((result) => {
        if (cancelled) return;
        setSnapshot(result);
        setState('ready');
      })
      .catch((error: unknown) => {
        reportError(error, { surface: 'monitoring' });
        // Показывается то, что ответила база, а не то, что мы про неё думаем. Экран,
        // который говорит «не знаю», лучше экрана, который уверенно называет
        // неправильную причину, — тот же вывод, что у соседнего раздела аналитики.
        if (!cancelled) {
          setReason(error instanceof Error ? error.message : String(error));
          setState('failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hours]);

  const summary = snapshot?.summary ?? null;
  const verdict = summary ? VERDICT[summary.status] : null;
  // Запланированные части не занимают сетку. Треть первого экрана, сообщающая, что двух
  // третей системы не существует, — это не наблюдаемость, а напоминание о планах: их
  // просто нет, и ломаться в них нечему. Одна строка внизу говорит ровно столько же.
  const planned = (snapshot?.components ?? []).filter((row) => row.lifecycle === 'planned');
  const liveSurfaces = (snapshot?.surfaces ?? []).filter((row) => row.lifecycle === 'live');
  const checksByComponent = (snapshot?.checks ?? []).reduce<Map<string, Check[]>>((acc, row) => {
    const key = row.component_title ?? 'Не описанные проверки';
    const list = acc.get(key);
    if (list) list.push(row);
    else acc.set(key, [row]);
    return acc;
  }, new Map());

  return (
    <section className="r-monitoring">
      <div className="r-monitoring-head">
        <p className="r-kicker">Служебное</p>
        <h2>Техническое состояние</h2>
        <p className="r-lead">
          Что сейчас с сервисом: сначала целиком, потом по частям, потом по каждой проверке. Считает
          база — пять функций, каждая отказывает не-администратору. Здесь нет ни одного числа о
          людях: этот экран о машинах.
        </p>
      </div>

      {summary && (
        <p className="r-monitoring-since">
          Наблюдения ведутся с {stamp(summary.observations_since)}. Всё, что снято раньше, осталось
          в базе, но в счёт не идёт: до этого момента две проверки давали ложный отказ, и считать их
          наравне со свежими значит показывать аварию, которой нет.
        </p>
      )}

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

      {state === 'loading' && <p className="r-muted">Спрашиваю…</p>}

      {state === 'failed' && (
        <>
          <p className="r-muted">Состояние не загрузилось. База ответила так:</p>
          <p className="r-muted">
            <code>{reason || 'без сообщения'}</code>
          </p>
          {reason.includes('только администраторам') ? (
            <p className="r-muted">
              Это отказ по роли. Раздел видит только <code>admin</code>.
            </p>
          ) : (
            <p className="r-muted">
              Это не отказ по роли. Если сообщение про отсутствующую функцию — PostgREST не
              перечитал схему после миграции: <code>notify pgrst, &apos;reload schema&apos;</code>.
              Остальное — в <code>docs/RUNBOOK_ALERTS.md</code>.
            </p>
          )}
        </>
      )}

      {state === 'ready' && summary && verdict && (
        <>
          <div className={`r-monitoring-verdict ${statusTone(summary.status)}`}>
            <Dot tone={statusTone(summary.status)} />
            <div>
              <strong>{verdict.title}</strong>
              <p>{verdict.lead}</p>
              <small>
                Критичных частей живо {summary.components_live}
                {summary.components_failing > 0 && `, в отказе ${summary.components_failing}`}
                {summary.components_silent > 0 && `, молчит ${summary.components_silent}`}
                {summary.worst_component && ` · хуже всего: ${summary.worst_component}`}
                {uptime(summary.uptime_pct, summary.uptime_samples) &&
                  ` · доступность критичных частей за период ${uptime(
                    summary.uptime_pct,
                    summary.uptime_samples,
                  )}`}
                {' · '}
                снято {stamp(summary.generated_at)}
              </small>
              {summary.checks_unregistered > 0 && (
                <small className="r-monitoring-note">
                  Проверок, пишущих в базу мимо каталога: {summary.checks_unregistered}. Что они
                  означают — неизвестно; строка в <code>ops.check_catalog</code> закрывает это.
                </small>
              )}
            </div>
          </div>

          {LAYERS.map((layer) => {
            const items = (snapshot?.components ?? []).filter(
              (row) => row.layer === layer.id && row.lifecycle === 'live',
            );
            if (items.length === 0) return null;
            return (
              <section key={layer.id}>
                <p className="r-kicker">{layer.title}</p>
                <p className="r-lead">{layer.lead}</p>
                <div className="r-monitoring-grid">
                  {items.map((item) => (
                    <ComponentCard key={item.component_id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}

          {planned.length > 0 && (
            <p className="r-monitoring-planned">
              В плане: {planned.map((row) => row.title.toLowerCase()).join(', ')}. Этих частей ещё
              нет — места на экране они не занимают.
            </p>
          )}

          {liveSurfaces.length > 0 && (
            <section>
              <p className="r-kicker">Что говорят сами фронты</p>
              <p className="r-lead">
                Проверки с сервера видят фронт снаружи; здесь он рассказывает о себе сам — событиями
                и ошибками из браузера. Доля ошибок считается к числу событий: это не доля сломанных
                сеансов, а отношение двух разных счётчиков, и годится оно для сравнения периодов
                между собой, а не для абсолютного вывода.
              </p>
              <div className="r-monitoring-grid">
                {liveSurfaces.map((item) => (
                  <SurfaceCard key={item.component_id} item={item} />
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="r-kicker">Проверки</p>
            <p className="r-lead">
              Все {summary.checks_total} по отдельности: последнее значение, когда оно снято и как
              часто проверка обязана отчитываться. Возраст важнее значения — старое «в норме» это не
              «в норме».
            </p>
            <div className="r-monitoring-checks">
              {[...checksByComponent.entries()].map(([title, rows]) => (
                <div key={title}>
                  <p className="r-monitoring-group">{title}</p>
                  {rows.map((row) => (
                    <CheckRow key={`${row.check_name}-${row.target ?? ''}`} item={row} />
                  ))}
                </div>
              ))}
            </div>
          </section>

          <Incidents items={snapshot?.incidents ?? []} days={incidentDays(hours)} />
        </>
      )}
    </section>
  );
}
