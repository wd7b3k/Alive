import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { loadAdminDashboard, type AdminAnalyticsEvent, type AdminDashboardData } from './admin-data';
import './admin.css';

function number(value: number, digits = 0) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value);
}

function percent(value: number | null) {
  return value === null ? '—' : `${number(value * 100, 1)}%`;
}

function date(value: string | null) {
  if (!value) return 'не указано';
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function productName(value: string | null) {
  if (value === 'cigarette') return 'Сигареты';
  if (value === 'vape') return 'Электронка';
  if (value === 'hookah') return 'Кальян';
  return 'Не указан';
}

function uniqueUsers(events: AdminAnalyticsEvent[], eventType?: string) {
  return new Set(
    events
      .filter((event) => !eventType || event.event_type === eventType)
      .map((event) => event.user_id)
      .filter((id): id is string => Boolean(id)),
  );
}

function percentile95(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function StatCard({ title, value, note, accent = false }: { title: string; value: string; note: string; accent?: boolean }) {
  return <article className={`a-stat ${accent ? 'accent' : ''}`}><span>{title}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Empty({ children }: { children: string }) {
  return <div className="a-empty">{children}</div>;
}

function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError('');
    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin` },
    });
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
    const active = uniqueUsers(events);
    const cravingEvents = events.filter((e) => e.event_type === 'craving_completed');
    const successful = cravingEvents.filter((e) => e.outcome === 'successful_response');
    const used = cravingEvents.filter((e) => e.outcome === 'nicotine_used');
    const resolved = successful.length + used.length;
    const successShare = resolved ? successful.length / resolved : null;

    const cravingByUser = new Map<string, number>();
    cravingEvents.forEach((e) => {
      if (e.user_id) cravingByUser.set(e.user_id, (cravingByUser.get(e.user_id) ?? 0) + 1);
    });
    const repeatedUsers = [...cravingByUser.values()].filter((count) => count >= 2).length;

    const registrations = uniqueUsers(events, 'account_created');
    const cohort = registrations;
    const countStage = (eventType: string) => {
      if (!cohort.size) return 0;
      const users = uniqueUsers(events.filter((event) => cohort.has(event.user_id ?? '')), eventType);
      return users.size;
    };
    const repeatCohort = [...cohort].filter((id) => (cravingByUser.get(id) ?? 0) >= 2).length;

    const funnel = [
      { label: 'Зарегистрировались', count: cohort.size },
      { label: 'Завершили первое знакомство', count: countStage('onboarding_completed') },
      { label: 'Сформулировали своё «Зачем»', count: countStage('goal_created') },
      { label: 'Создали первую Связку', count: countStage('link_created') },
      { label: 'Завершили первый эпизод тяги', count: countStage('craving_completed') },
      { label: 'Использовали вмешательство', count: countStage('intervention_used') },
      { label: 'Вернулись к работе с тягой повторно', count: repeatCohort },
    ].map((stage, index, all) => ({
      ...stage,
      conversion: index === 0 ? 1 : all[index - 1].count ? Math.min(1, stage.count / all[index - 1].count) : null,
    }));

    const products = (['cigarette', 'vape', 'hookah'] as const).map((product) => {
      const productEvents = cravingEvents.filter((e) => e.product_type === product);
      const productResolved = productEvents.filter((e) => e.outcome === 'successful_response' || e.outcome === 'nicotine_used');
      const productSuccess = productResolved.filter((e) => e.outcome === 'successful_response');
      return {
        product,
        episodes: productEvents.length,
        users: uniqueUsers(productEvents).size,
        successShare: productResolved.length ? productSuccess.length / productResolved.length : null,
      };
    });

    const abandoned = events.filter((e) => e.outcome === 'abandoned' || e.reason_code);
    const reasons = new Map<string, number>();
    abandoned.forEach((event) => {
      const key = event.reason_code || 'причина пока не указана';
      reasons.set(key, (reasons.get(key) ?? 0) + 1);
    });
    const topReasons = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const now = Date.now();
    const inThirtyDays = now + 30 * 86_400_000;
    const overdueClaims = data.claims.filter((claim) => claim.review_due_at && new Date(claim.review_due_at).getTime() < now);
    const dueSoonClaims = data.claims.filter((claim) => {
      if (!claim.review_due_at) return false;
      const time = new Date(claim.review_due_at).getTime();
      return time >= now && time <= inThirtyDays;
    });

    const impressionsByContent = new Map<string, { shown: number; rated: number; useful: number }>();
    data.impressions.forEach((item) => {
      const current = impressionsByContent.get(item.content_code) ?? { shown: 0, rated: 0, useful: 0 };
      current.shown += 1;
      if (item.useful !== null) {
        current.rated += 1;
        if (item.useful) current.useful += 1;
      }
      impressionsByContent.set(item.content_code, current);
    });
    const content = data.content.map((item) => ({
      ...item,
      ...(impressionsByContent.get(item.code) ?? { shown: 0, rated: 0, useful: 0 }),
    })).sort((a, b) => b.shown - a.shown);

    const dayAgo = now - 86_400_000;
    const weekAgo = now - 7 * 86_400_000;
    const errors24h = data.errors.filter((e) => new Date(e.occurred_at).getTime() >= dayAgo);
    const errors7d = data.errors.filter((e) => new Date(e.occurred_at).getTime() >= weekAgo);
    const openErrors = data.errors.filter((e) => !e.resolved_at);
    const latency = events.map((e) => e.duration_ms).filter((value): value is number => value !== null);
    const p95 = percentile95(latency);

    return {
      active: active.size,
      cravingUsers: uniqueUsers(cravingEvents).size,
      cravingCount: cravingEvents.length,
      successShare,
      repeatedUsers,
      funnel,
      products,
      topReasons,
      overdueClaims,
      dueSoonClaims,
      content,
      errors24h: errors24h.length,
      errors7d: errors7d.length,
      openErrors: openErrors.length,
      p95,
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
        <label>Период<select value={period} onChange={(e) => setPeriod(Number(e.target.value))}><option value={7}>7 дней</option><option value={30}>30 дней</option><option value={90}>90 дней</option></select></label>
        <button onClick={reload} disabled={loading}>{loading ? 'Обновляю…' : 'Обновить'}</button>
        <button className="quiet" onClick={logout}>Выйти</button>
      </div>
    </header>

    <section className="a-intro"><p>Администратор · {data.administratorName}</p><h1>Работает ли ALIVE — и где мешает пользователю?</h1><span>Период анализа: последние {period} дней. Приватные заметки, личные тексты «Зачем» и содержимое Связок сюда не загружаются.</span></section>

    <section className="a-stats">
      <StatCard title="Активные пользователи" value={number(analysis.active)} note="совершили хотя бы одно наблюдаемое действие" />
      <StatCard title="Использовали работу с тягой" value={number(analysis.cravingUsers)} note={`${number(analysis.cravingCount)} завершённых эпизодов`} />
      <StatCard title="Эпизоды без никотина" value={percent(analysis.successShare)} note="среди эпизодов с однозначным исходом" accent />
      <StatCard title="Вернулись повторно" value={number(analysis.repeatedUsers)} note="минимум два завершённых эпизода тяги" />
    </section>

    <section className="a-panel">
      <div className="a-panel-head"><div><span>Воронка новых пользователей</span><h2>Где теряется путь к ценности</h2></div><small>Когорта зарегистрировавшихся за выбранный период</small></div>
      {analysis.funnel[0].count === 0 ? <Empty>За этот период новых регистраций нет. Воронка не смешивает старых активных пользователей с новой когортой.</Empty> : <div className="a-funnel">{analysis.funnel.map((stage, index) => <div className="a-funnel-row" key={stage.label}><div className="a-funnel-label"><b>{index + 1}</b><span>{stage.label}</span></div><div className="a-funnel-bar"><i style={{ width: `${analysis.funnel[0].count ? Math.max(2, stage.count / analysis.funnel[0].count * 100) : 0}%` }} /></div><strong>{stage.count}</strong><small>{index === 0 ? '100%' : percent(stage.conversion)}</small></div>)}</div>}
    </section>

    <div className="a-grid-two">
      <section className="a-panel">
        <div className="a-panel-head"><div><span>Целевые продукты</span><h2>Как проходят реальные эпизоды</h2></div></div>
        <div className="a-table">{analysis.products.map((item) => <div className="a-table-row" key={item.product}><span><b>{productName(item.product)}</b><small>{item.users} польз. · {item.episodes} эпиз.</small></span><strong>{percent(item.successShare)}</strong><small>без никотина</small></div>)}</div>
      </section>
      <section className="a-panel">
        <div className="a-panel-head"><div><span>Причины остановки</span><h2>Почему сценарии не доходят до результата</h2></div></div>
        {analysis.topReasons.length ? <div className="a-table">{analysis.topReasons.map(([reason, count]) => <div className="a-table-row" key={reason}><span><b>{reason}</b></span><strong>{count}</strong><small>случ.</small></div>)}</div> : <Empty>Структурированные причины выхода пока не собирались. R1 уже создал поле для них; следующий слой экранной телеметрии должен фиксировать шаг закрытия сценария без свободного текста.</Empty>}
      </section>
    </div>

    <section className="a-panel">
      <div className="a-panel-head"><div><span>Факты и Мифы</span><h2>Контент должен быть полезным, а не просто показанным</h2></div><small>{data.content.length} опубликованных материалов</small></div>
      {analysis.content.length ? <div className="a-content-table"><div className="a-content-row head"><span>Материал</span><span>Тип</span><span>Показы</span><span>Оценили</span><span>Полезно</span></div>{analysis.content.slice(0, 20).map((item) => <div className="a-content-row" key={item.code}><span>{item.title_ru}</span><span>{item.content_type === 'факт' ? 'Факт' : 'Миф'}</span><b>{item.shown}</b><b>{item.rated}</b><b>{item.rated ? percent(item.useful / item.rated) : '—'}</b></div>)}</div> : <Empty>Опубликованного контента пока нет.</Empty>}
    </section>

    <div className="a-grid-two">
      <section className="a-panel">
        <div className="a-panel-head"><div><span>Доказательная база</span><h2>Актуальность утверждений</h2></div></div>
        <div className="a-evidence-summary"><StatCard title="Проверено" value={number(data.claims.length)} note="утверждений в реестре"/><StatCard title="Просрочена проверка" value={number(analysis.overdueClaims.length)} note="требуют обновления источников"/><StatCard title="Проверить в течение 30 дней" value={number(analysis.dueSoonClaims.length)} note="приближается дата ревизии"/></div>
        {analysis.overdueClaims.length ? <div className="a-table compact">{analysis.overdueClaims.slice(0, 8).map((claim) => <div className="a-table-row" key={claim.code}><span><b>{claim.topic}</b><small>{claim.evidence_level}</small></span><strong>{date(claim.review_due_at)}</strong></div>)}</div> : <p className="a-ok">Просроченных проверок нет.</p>}
      </section>
      <section className="a-panel">
        <div className="a-panel-head"><div><span>Техническое здоровье</span><h2>Можно ли доверять измерению продукта</h2></div></div>
        <div className="a-health-grid"><div><span>Ошибки за 24 часа</span><strong>{analysis.errors24h}</strong></div><div><span>Ошибки за 7 дней</span><strong>{analysis.errors7d}</strong></div><div><span>Не закрытые ошибки</span><strong>{analysis.openErrors}</strong></div><div><span>95-й процентиль ответа</span><strong>{analysis.p95 === null ? 'ещё не собирается' : `${number(analysis.p95)} мс`}</strong></div></div>
        {analysis.openErrors > 0 ? <div className="a-alert">Есть незакрытые технические ошибки. Их нужно проверить до интерпретации падения продуктовых метрик.</div> : <p className="a-ok">По зарегистрированным ошибкам критических открытых проблем нет.</p>}
      </section>
    </div>

    <section className="a-panel a-method-note"><h2>Как читать этот экран</h2><p>Падение конверсии само по себе не доказывает плохую механику. Сначала исключаем технический сбой, затем смотрим конкретный шаг, продукт и причину выхода. Метрика ценности важнее количества экранов: главный вопрос — помогает ли ALIVE проходить реальные импульсы без целевого употребления и возвращаться к процессу после сложных эпизодов.</p></section>
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

  useEffect(() => {
    if (session) void reload();
    else setData(null);
    // reload intentionally follows session and selected period
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, period]);

  if (!session && !loading) return <Login />;
  if (loading && !data) return <main className="a-loading"><div className="a-brand">ALIVE</div><span>Собираю картину продукта…</span></main>;
  if (error) return <main className="a-login"><section><div className="a-brand">ALIVE</div><p>Контроль продукта</p><h1>Доступ не открыт</h1><p>{error}</p><button onClick={() => window.location.assign('/')}>Вернуться в ALIVE</button></section></main>;
  if (!data) return null;
  return <Dashboard data={data} period={period} setPeriod={setPeriod} reload={() => void reload()} loading={loading} />;
}
