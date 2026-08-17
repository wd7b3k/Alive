import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { loadAdminDashboard, type AdminAnalyticsEvent, type AdminDashboardData } from './admin-data';
import './admin.css';

function num(value: number, digits = 0) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value);
}

function pct(value: number | null) {
  return value === null ? '—' : `${num(value * 100, 1)}%`;
}

function fmtDate(value: string | null) {
  if (!value) return 'не указано';
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function productName(value: string | null) {
  if (value === 'cigarette') return 'Сигареты';
  if (value === 'vape') return 'Электронка';
  if (value === 'hookah') return 'Кальян';
  return 'Не указан';
}

function users(events: AdminAnalyticsEvent[], type?: string) {
  return new Set(events.filter((event) => !type || event.event_type === type).map((event) => event.user_id).filter((id): id is string => Boolean(id)));
}

function p95(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function Card({ title, value, note, accent = false }: { title: string; value: string; note: string; accent?: boolean }) {
  return <article className={`a-stat ${accent ? 'accent' : ''}`}><span>{title}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Empty({ children }: { children: string }) {
  return <div className="a-empty">{children}</div>;
}

function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError('');
    const result = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/admin` } });
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
    }
  }
  return <main className="a-login"><section><div className="a-brand">ALIVE</div><p>Контроль продукта</p><h1>Вход в админский раздел</h1><p>Доступ разрешён только учётным записям с ролью администратора.</p><button onClick={login} disabled={busy}>{busy ? 'Открываю вход…' : 'Войти'}</button>{error && <small className="a-error">{error}</small>}</section></main>;
}

function Dashboard({ data, period, setPeriod, reload, loading }: { data: AdminDashboardData; period: number; setPeriod: (value: number) => void; reload: () => void; loading: boolean }) {
  const analysis = useMemo(() => {
    const events = data.events;
    const craving = events.filter((event) => event.event_type === 'craving_completed');
    const success = craving.filter((event) => event.outcome === 'successful_response');
    const nicotine = craving.filter((event) => event.outcome === 'nicotine_used');
    const resolved = success.length + nicotine.length;
    const byUser = new Map<string, number>();
    craving.forEach((event) => { if (event.user_id) byUser.set(event.user_id, (byUser.get(event.user_id) ?? 0) + 1); });

    const cohort = users(events, 'account_created');
    const stageCount = (type: string) => users(events.filter((event) => cohort.has(event.user_id ?? '')), type).size;
    const funnelBase = [
      ['Зарегистрировались', cohort.size],
      ['Завершили первое знакомство', stageCount('onboarding_completed')],
      ['Сформулировали своё «Зачем»', stageCount('goal_created')],
      ['Создали первую Связку', stageCount('link_created')],
      ['Завершили первый эпизод тяги', stageCount('craving_completed')],
      ['Использовали вмешательство', stageCount('intervention_used')],
      ['Вернулись к работе с тягой повторно', [...cohort].filter((id) => (byUser.get(id) ?? 0) >= 2).length],
    ] as const;
    const funnel = funnelBase.map(([label, count], index) => ({
      label,
      count,
      conversion: index === 0 ? 1 : funnelBase[index - 1][1] ? Math.min(1, count / funnelBase[index - 1][1]) : null,
    }));

    const products = (['cigarette', 'vape', 'hookah'] as const).map((product) => {
      const rows = craving.filter((event) => event.product_type === product);
      const decided = rows.filter((event) => event.outcome === 'successful_response' || event.outcome === 'nicotine_used');
      const ok = decided.filter((event) => event.outcome === 'successful_response');
      return { product, episodes: rows.length, users: users(rows).size, success: decided.length ? ok.length / decided.length : null };
    });

    const reasonNames = new Map(data.reasons.map((reason) => [reason.code, reason.title_ru]));
    const reasonCounts = new Map<string, number>();
    events.filter((event) => event.outcome === 'abandoned' || event.reason_code).forEach((event) => {
      const title = event.reason_code ? reasonNames.get(event.reason_code) ?? 'Причина пока не описана' : 'Причина пока неизвестна';
      reasonCounts.set(title, (reasonCounts.get(title) ?? 0) + 1);
    });

    const now = Date.now();
    const soon = now + 30 * 86_400_000;
    const overdue = data.claims.filter((claim) => claim.review_due_at && new Date(claim.review_due_at).getTime() < now);
    const dueSoon = data.claims.filter((claim) => claim.review_due_at && new Date(claim.review_due_at).getTime() >= now && new Date(claim.review_due_at).getTime() <= soon);

    const contentStats = new Map<string, { shown: number; rated: number; useful: number }>();
    data.impressions.forEach((item) => {
      const row = contentStats.get(item.content_code) ?? { shown: 0, rated: 0, useful: 0 };
      row.shown += 1;
      if (item.useful !== null) {
        row.rated += 1;
        if (item.useful) row.useful += 1;
      }
      contentStats.set(item.content_code, row);
    });
    const content = data.content.map((item) => ({ ...item, ...(contentStats.get(item.code) ?? { shown: 0, rated: 0, useful: 0 }) })).sort((a, b) => b.shown - a.shown);

    const dayAgo = now - 86_400_000;
    const weekAgo = now - 7 * 86_400_000;
    const timings = events.map((event) => event.duration_ms).filter((value): value is number => value !== null);

    return {
      active: users(events).size,
      cravingUsers: users(craving).size,
      cravingCount: craving.length,
      successShare: resolved ? success.length / resolved : null,
      repeatedUsers: [...byUser.values()].filter((count) => count >= 2).length,
      funnel,
      products,
      reasons: [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      overdue,
      dueSoon,
      content,
      errors24h: data.errors.filter((error) => new Date(error.occurred_at).getTime() >= dayAgo).length,
      errors7d: data.errors.filter((error) => new Date(error.occurred_at).getTime() >= weekAgo).length,
      openErrors: data.errors.filter((error) => !error.resolved_at).length,
      latency95: p95(timings),
    };
  }, [data]);

  async function logout() {
    await getSupabase()?.auth.signOut();
    window.location.reload();
  }

  return <main className="a-page">
    <header className="a-header">
      <div><div className="a-brand">ALIVE</div><span>Контроль продукта</span></div>
      <div className="a-header-actions">
        <label>Период<select value={period} onChange={(event) => setPeriod(Number(event.target.value))}><option value={7}>7 дней</option><option value={30}>30 дней</option><option value={90}>90 дней</option></select></label>
        <button onClick={reload} disabled={loading}>{loading ? 'Обновляю…' : 'Обновить'}</button>
        <button className="quiet" onClick={logout}>Выйти</button>
      </div>
    </header>

    <section className="a-intro"><p>Администратор · {data.administratorName}</p><h1>Работает ли ALIVE — и где мешает пользователю?</h1><span>Период анализа: последние {period} дней. Приватные заметки, личные тексты «Зачем» и содержимое Связок сюда не загружаются.</span></section>

    <section className="a-stats">
      <Card title="Активные пользователи" value={num(analysis.active)} note="совершили хотя бы одно наблюдаемое действие" />
      <Card title="Использовали работу с тягой" value={num(analysis.cravingUsers)} note={`${num(analysis.cravingCount)} завершённых эпизодов`} />
      <Card title="Эпизоды без никотина" value={pct(analysis.successShare)} note="среди эпизодов с однозначным исходом" accent />
      <Card title="Вернулись повторно" value={num(analysis.repeatedUsers)} note="минимум два завершённых эпизода тяги" />
    </section>

    <section className="a-panel">
      <div className="a-panel-head"><div><span>Воронка новых пользователей</span><h2>Где теряется путь к ценности</h2></div><small>Когорта зарегистрировавшихся за выбранный период</small></div>
      {analysis.funnel[0].count === 0 ? <Empty>За этот период новых регистраций нет. Старые активные пользователи не смешиваются с новой когортой.</Empty> : <div className="a-funnel">{analysis.funnel.map((stage, index) => <div className="a-funnel-row" key={stage.label}><div className="a-funnel-label"><b>{index + 1}</b><span>{stage.label}</span></div><div className="a-funnel-bar"><i style={{ width: `${Math.max(2, stage.count / analysis.funnel[0].count * 100)}%` }} /></div><strong>{stage.count}</strong><small>{index === 0 ? '100%' : pct(stage.conversion)}</small></div>)}</div>}
    </section>

    <div className="a-grid-two">
      <section className="a-panel"><div className="a-panel-head"><div><span>Целевые продукты</span><h2>Как проходят реальные эпизоды</h2></div></div><div className="a-table">{analysis.products.map((item) => <div className="a-table-row" key={item.product}><span><b>{productName(item.product)}</b><small>{item.users} польз. · {item.episodes} эпиз.</small></span><strong>{pct(item.success)}</strong><small>без никотина</small></div>)}</div></section>
      <section className="a-panel"><div className="a-panel-head"><div><span>Причины остановки</span><h2>Почему сценарии не доходят до результата</h2></div></div>{analysis.reasons.length ? <div className="a-table">{analysis.reasons.map(([reason, count]) => <div className="a-table-row" key={reason}><span><b>{reason}</b></span><strong>{count}</strong><small>случ.</small></div>)}</div> : <Empty>Явных причин выхода пока нет. R1 уже различает сохранённое закрытие без оценки; точный шаг раннего выхода будет добавлен экранной телеметрией без записи свободного текста.</Empty>}</section>
    </div>

    <section className="a-panel"><div className="a-panel-head"><div><span>Факты и Мифы</span><h2>Контент должен быть полезным, а не просто показанным</h2></div><small>{data.content.length} опубликованных материалов</small></div>{analysis.content.length ? <div className="a-content-table"><div className="a-content-row head"><span>Материал</span><span>Тип</span><span>Показы</span><span>Оценили</span><span>Полезно</span></div>{analysis.content.slice(0, 20).map((item) => <div className="a-content-row" key={item.code}><span>{item.title_ru}</span><span>{item.content_type === 'факт' ? 'Факт' : 'Миф'}</span><b>{item.shown}</b><b>{item.rated}</b><b>{item.rated ? pct(item.useful / item.rated) : '—'}</b></div>)}</div> : <Empty>Опубликованного контента пока нет.</Empty>}</section>

    <div className="a-grid-two">
      <section className="a-panel"><div className="a-panel-head"><div><span>Доказательная база</span><h2>Актуальность утверждений</h2></div></div><div className="a-evidence-summary"><Card title="Проверено" value={num(data.claims.length)} note="утверждений в реестре" /><Card title="Просрочена проверка" value={num(analysis.overdue.length)} note="требуют обновления источников" /><Card title="Проверить в течение 30 дней" value={num(analysis.dueSoon.length)} note="приближается дата ревизии" /></div>{analysis.overdue.length ? <div className="a-table compact">{analysis.overdue.slice(0, 8).map((claim) => <div className="a-table-row" key={claim.code}><span><b>{claim.topic}</b><small>{claim.evidence_level}</small></span><strong>{fmtDate(claim.review_due_at)}</strong></div>)}</div> : <p className="a-ok">Просроченных проверок нет.</p>}</section>
      <section className="a-panel"><div className="a-panel-head"><div><span>Техническое здоровье</span><h2>Можно ли доверять измерению продукта</h2></div></div><div className="a-health-grid"><div><span>Ошибки за 24 часа</span><strong>{analysis.errors24h}</strong></div><div><span>Ошибки за 7 дней</span><strong>{analysis.errors7d}</strong></div><div><span>Не закрытые ошибки</span><strong>{analysis.openErrors}</strong></div><div><span>95-й процентиль ответа</span><strong>{analysis.latency95 === null ? 'ещё не собирается' : `${num(analysis.latency95)} мс`}</strong></div></div>{analysis.openErrors ? <div className="a-alert">Есть незакрытые технические ошибки. Сначала проверь их, прежде чем объяснять падение продуктовых метрик поведением пользователей.</div> : <p className="a-ok">По зарегистрированным ошибкам критических открытых проблем нет.</p>}</section>
    </div>

    <section className="a-panel a-method-note"><h2>Как читать этот экран</h2><p>Падение конверсии само по себе не доказывает плохую механику. Сначала исключаем технический сбой, затем смотрим конкретный этап, продукт и причину выхода. Главный вопрос — помогает ли ALIVE проходить реальные импульсы без целевого употребления и возвращаться к процессу после сложных эпизодов.</p></section>
  </main>;
}

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Подключение к базе данных не настроено');
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    loadAdminDashboard(session, period)
      .then((next) => { if (!cancelled) setData(next); })
      .catch((reason) => { if (!cancelled) { setData(null); setError(reason instanceof Error ? reason.message : 'Не удалось загрузить админский раздел'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, period]);

  async function reload() {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      setData(await loadAdminDashboard(session, period));
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить админский раздел');
    } finally {
      setLoading(false);
    }
  }

  if (!session && !loading) return <AdminLogin />;
  if (loading && !data) return <main className="a-loading"><div className="a-brand">ALIVE</div><span>Собираю картину продукта…</span></main>;
  if (error) return <main className="a-login"><section><div className="a-brand">ALIVE</div><p>Контроль продукта</p><h1>Доступ не открыт</h1><p>{error}</p><button onClick={() => window.location.assign('/')}>Вернуться в ALIVE</button></section></main>;
  if (!data) return null;
  return <Dashboard data={data} period={period} setPeriod={setPeriod} reload={() => void reload()} loading={loading} />;
}
