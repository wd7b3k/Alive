import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { publicEnv } from './env';
import { getSupabase } from './supabase';
import {
  addLink,
  addMeaning,
  deleteEpisode,
  deleteLink,
  deleteMeaning,
  loadBootstrap,
  pickReplacements,
  productLabel,
  saveCheckin,
  saveGuidedEpisode,
  saveOnboarding,
  submitLink,
  submitMeaning,
  updateMeaning,
  type Bootstrap,
  type GuidedEpisodeDraft,
  type NicotineProduct,
  type OnboardingDraft,
  type ProductType,
  type Trigger,
  type UserMeaning,
} from './data';
import { saveQuickUse } from './actions';
import { dailyUnits, replacementStats, statsForDays, triggerStats } from './metrics';

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  return pathname;
}

function localDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' ₽';
}

function shortDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function productIcon(product: ProductType) {
  if (product === 'cigarette') return '│';
  if (product === 'hookah') return '◉';
  return '≈';
}

function outcomeLabel(outcome: string | null) {
  if (outcome === 'successful_response') return 'Связка разорвана';
  if (outcome === 'nicotine_used') return 'Никотин использован';
  if (outcome === 'abandoned') return 'Эпизод закрыт';
  return 'В процессе';
}

function Explain({ title = 'Что это?', children }: { title?: string; children: ReactNode }) {
  return (
    <details className="explain">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

function Metric({ label, value, note, children }: { label: string; value: string; note?: string; children?: ReactNode }) {
  return (
    <article className="metric-card panel">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {note && <div className="metric-note">{note}</div>}
      {children}
    </article>
  );
}

function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal panel ${wide ? 'modal-wide' : ''}`}>
        {children}
      </section>
    </div>
  );
}

function Loading({ text = 'Загружаю ALIVE…' }: { text?: string }) {
  return <main className="center-page"><section className="panel setup-panel"><div className="spinner" /><p>{text}</p></section></main>;
}

function ConfigurationGate() {
  return (
    <main className="center-page">
      <section className="panel setup-panel">
        <p className="eyebrow">ALIVE v3.0</p>
        <h1>Не хватает конфигурации.</h1>
        <p>Frontend не получил Supabase URL или publishable key. Секретные ключи сюда передавать нельзя.</p>
      </section>
    </main>
  );
}

function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
    }
  }
  return (
    <main className="center-page login-page">
      <section className="hero panel login-hero">
        <p className="eyebrow">Некоммерческий эксперимент · ALIVE Method v1</p>
        <h1>Вернуть пространство между импульсом и действием.</h1>
        <p className="lead">Не счётчик запретов. ALIVE помогает увидеть конкретную Связку, понять функцию никотинового ритуала, попробовать другой ответ и учиться на собственном результате.</p>
        <div className="hero-actions">
          <button className="primary large" onClick={login} disabled={busy}>{busy ? 'Открываю Google…' : 'Войти через Google'}</button>
          <button className="secondary" onClick={() => navigate('/experiment')}>Как работает эксперимент</button>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="fineprint">Google используется только для входа и идентификации участника. Поведенческие данные ALIVE хранятся отдельно и изолируются на уровне PostgreSQL RLS.</p>
      </section>
    </main>
  );
}

const NAV = [
  ['/', 'Сегодня'],
  ['/links', 'Связки'],
  ['/path', 'Путь'],
  ['/meanings', 'Смыслы'],
  ['/experiment', 'Эксперимент'],
  ['/releases', 'Релизы'],
] as const;

function Topbar({ data, pathname }: { data: Bootstrap; pathname: string }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate('/')}><span className="brand-mark">∞</span><span>ALIVE</span></button>
      <nav className="main-nav">
        {NAV.map(([path, label]) => (
          <button key={path} className={`nav-link ${pathname === path ? 'active' : ''}`} onClick={() => navigate(path)}>{label}</button>
        ))}
      </nav>
      <button className="profile-button" onClick={() => navigate('/profile')} title="Профиль и baseline">
        {data.profile.avatar_url ? <img src={data.profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="avatar-fallback">{data.profile.display_name.slice(0, 1)}</span>}
        <span>{data.profile.display_name}</span>
      </button>
    </header>
  );
}

function ProductRoleToggle({ role, onChange }: { role: 'target_dependency' | 'cessation_bridge'; onChange: (role: 'target_dependency' | 'cessation_bridge') => void }) {
  return (
    <div className="segmented small">
      <button type="button" className={role === 'target_dependency' ? 'selected' : ''} onClick={() => onChange('target_dependency')}>Хочу отказаться</button>
      <button type="button" className={role === 'cessation_bridge' ? 'selected' : ''} onClick={() => onChange('cessation_bridge')}>Использую как переход</button>
    </div>
  );
}

function Onboarding({ session, data, onDone, onCancel }: { session: Session; data?: Bootstrap | null; onDone: () => Promise<void>; onCancel?: () => void }) {
  const existing = useMemo(() => new Map((data?.products ?? []).map((item) => [item.product_type, item])), [data]);
  const [selected, setSelected] = useState<Record<ProductType, boolean>>({
    cigarette: existing.has('cigarette'), hookah: existing.has('hookah'), vape: existing.has('vape'),
  });
  const [roles, setRoles] = useState<Record<ProductType, 'target_dependency' | 'cessation_bridge'>>({
    cigarette: existing.get('cigarette')?.role ?? 'target_dependency',
    hookah: existing.get('hookah')?.role ?? 'target_dependency',
    vape: existing.get('vape')?.role ?? 'target_dependency',
  });
  const cig = existing.get('cigarette');
  const hookah = existing.get('hookah');
  const vape = existing.get('vape');
  const [goal, setGoal] = useState(data?.settings.goal_text ?? '');
  const [cigPerDay, setCigPerDay] = useState(String(cig?.baseline?.cigarettes_per_day ?? ''));
  const [packPrice, setPackPrice] = useState(String(cig?.defaults?.pack_price_rub ?? cig?.baseline?.pack_price_rub ?? ''));
  const [hookahWeek, setHookahWeek] = useState(String(hookah?.baseline?.sessions_per_week ?? ''));
  const [hookahCost, setHookahCost] = useState(String(hookah?.defaults?.hookah_default_price_rub ?? hookah?.baseline?.typical_cost_rub ?? 2500));
  const [vapePuffs, setVapePuffs] = useState(String(vape?.baseline?.puffs_per_day ?? ''));
  const [vapeClaimed, setVapeClaimed] = useState(String(vape?.defaults?.claimed_puffs ?? 5000));
  const [vapeCost, setVapeCost] = useState(String(vape?.defaults?.consumable_price_rub ?? 1500));
  const [vapeDevice, setVapeDevice] = useState(String(vape?.defaults?.device_type ?? 'disposable'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!Object.values(selected).some(Boolean)) {
      setError('Выбери хотя бы один никотиновый продукт.');
      return;
    }
    const products: OnboardingDraft['products'] = [];
    if (selected.cigarette) products.push({ productType: 'cigarette', role: roles.cigarette, baseline: { cigarettes_per_day: Number(cigPerDay || 0) }, defaults: { pack_price_rub: Number(packPrice || 0), pack_size: 20 } });
    if (selected.hookah) products.push({ productType: 'hookah', role: roles.hookah, baseline: { sessions_per_week: Number(hookahWeek || 0) }, defaults: { hookah_default_price_rub: Number(hookahCost || 2500) } });
    if (selected.vape) products.push({ productType: 'vape', role: roles.vape, baseline: { puffs_per_day: Number(vapePuffs || 0) }, defaults: { device_type: vapeDevice, claimed_puffs: Number(vapeClaimed || 5000), consumable_price_rub: Number(vapeCost || 1500) } });
    setBusy(true);
    setError('');
    try {
      await saveOnboarding(session, { goalText: goal, products });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить настройки');
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <section className="onboarding panel">
      <div className="onboarding-head">
        <div><p className="eyebrow">Персональная настройка · 2–3 минуты</p><h1>{data ? 'Твой baseline' : 'С чего мы начинаем?'}</h1></div>
        {onCancel && <button className="icon-button" onClick={onCancel}>×</button>}
      </div>
      <p className="lead">ALIVE сравнивает тебя только с твоей собственной исходной точкой. Эти числа не являются оценкой личности и их всегда можно изменить.</p>

      <label className="field"><span>Ради чего ты хочешь изменить привычку?</span><textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Например: хочу вернуть дыхание, энергию и свободу не думать о следующей сигарете" /></label>

      <div className="product-setup-grid">
        <article className={`setup-product ${selected.cigarette ? 'selected-card' : ''}`}>
          <label className="check-title"><input type="checkbox" checked={selected.cigarette} onChange={(e) => setSelected({ ...selected, cigarette: e.target.checked })} /><span><b>Сигареты</b><small>raw: штуки</small></span></label>
          {selected.cigarette && <><ProductRoleToggle role={roles.cigarette} onChange={(role) => setRoles({ ...roles, cigarette: role })} /><div className="two-fields"><label className="field compact"><span>Сигарет в день</span><input type="number" min="0" value={cigPerDay} onChange={(e) => setCigPerDay(e.target.value)} placeholder="20" /></label><label className="field compact"><span>Пачка, ₽</span><input type="number" min="0" value={packPrice} onChange={(e) => setPackPrice(e.target.value)} placeholder="300" /></label></div></>}
        </article>

        <article className={`setup-product ${selected.hookah ? 'selected-card' : ''}`}>
          <label className="check-title"><input type="checkbox" checked={selected.hookah} onChange={(e) => setSelected({ ...selected, hookah: e.target.checked })} /><span><b>Кальян</b><small>raw: сессии</small></span></label>
          {selected.hookah && <><ProductRoleToggle role={roles.hookah} onChange={(role) => setRoles({ ...roles, hookah: role })} /><div className="two-fields"><label className="field compact"><span>Сессий в неделю</span><input type="number" min="0" step="0.5" value={hookahWeek} onChange={(e) => setHookahWeek(e.target.value)} placeholder="1" /></label><label className="field compact"><span>Обычно, ₽</span><input type="number" min="0" value={hookahCost} onChange={(e) => setHookahCost(e.target.value)} /></label></div><p className="microcopy">2500 ₽ — стартовый личный default, а не «средняя цена города». В каждом событии цену можно изменить.</p></>}
        </article>

        <article className={`setup-product ${selected.vape ? 'selected-card' : ''}`}>
          <label className="check-title"><input type="checkbox" checked={selected.vape} onChange={(e) => setSelected({ ...selected, vape: e.target.checked })} /><span><b>Электронка</b><small>raw: затяжки</small></span></label>
          {selected.vape && <><ProductRoleToggle role={roles.vape} onChange={(role) => setRoles({ ...roles, vape: role })} /><label className="field compact"><span>Тип устройства</span><select value={vapeDevice} onChange={(e) => setVapeDevice(e.target.value)}><option value="disposable">Одноразка</option><option value="pod">POD / картридж</option><option value="refillable">Заправляемая система</option></select></label><div className="three-fields"><label className="field compact"><span>Затяжек/день</span><input type="number" min="0" value={vapePuffs} onChange={(e) => setVapePuffs(e.target.value)} /></label><label className="field compact"><span>Заявлено</span><input type="number" min="0" value={vapeClaimed} onChange={(e) => setVapeClaimed(e.target.value)} /></label><label className="field compact"><span>Цена, ₽</span><input type="number" min="0" value={vapeCost} onChange={(e) => setVapeCost(e.target.value)} /></label></div><p className="microcopy">5000 затяжек / 1500 ₽ — только быстрый ориентир. Лучше указать реальное устройство.</p></>}
        </article>
      </div>

      <div className="units-callout"><b>ALIVE units не измеряют медицинский вред.</b><span>Это внутренняя behavioural-нормализация: сигарета = 1, кальянная сессия = 10, 10 затяжек электронки = 1. Raw события всегда сохраняются отдельно.</span></div>
      {error && <p className="error">{error}</p>}
      <div className="footer-actions"><button className="primary" onClick={submit} disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить и продолжить'}</button>{onCancel && <button className="secondary" onClick={onCancel}>Отмена</button>}</div>
    </section>
  );

  return onCancel ? <Modal wide onClose={onCancel}>{body}</Modal> : <main className="onboarding-page">{body}</main>;
}

function QuickLog({ session, data, onClose, onSaved }: { session: Session; data: Bootstrap; onClose: () => void; onSaved: () => Promise<void> }) {
  const initial = data.products[0]?.product_type ?? 'cigarette';
  const [product, setProduct] = useState<ProductType>(initial);
  const [trigger, setTrigger] = useState('');
  const [customTrigger, setCustomTrigger] = useState('');
  const [cigQty, setCigQty] = useState(1);
  const [hookahCount, setHookahCount] = useState(1);
  const [hookahDuration, setHookahDuration] = useState(60);
  const [vapePuffs, setVapePuffs] = useState(10);
  const [cost, setCost] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const triggers = data.triggers.filter((item) => item.product_types.includes(product));
  const cfg = data.products.find((item) => item.product_type === product);

  useEffect(() => {
    if (product === 'hookah') setCost(Number(cfg?.defaults?.hookah_default_price_rub ?? 2500));
    else if (product === 'vape') setCost('');
    else {
      const price = Number(cfg?.defaults?.pack_price_rub ?? 0);
      const size = Number(cfg?.defaults?.pack_size ?? 20) || 20;
      setCost(price ? Math.round((price / size) * cigQty * 100) / 100 : '');
    }
  }, [product, cfg, cigQty]);

  async function save() {
    setBusy(true); setError('');
    try {
      await saveQuickUse(session, {
        product,
        triggerCode: trigger || undefined,
        customTriggerText: customTrigger,
        note,
        cigaretteQuantity: cigQty,
        hookahSessionCount: hookahCount,
        hookahDurationMinutes: hookahDuration,
        vapePuffs,
        vapeDeviceType: String(cfg?.defaults?.device_type ?? 'disposable') as 'disposable' | 'pod' | 'refillable',
        costActualRub: cost === '' ? undefined : Number(cost),
      });
      await onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить'); }
    finally { setBusy(false); }
  }

  return <Modal onClose={onClose}>
    <div className="modal-head"><div><p className="eyebrow">Факт без оценки</p><h2>Отметить употребление</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
    <p className="modal-intro">Записываем факт как данные. Он не обнуляет предыдущие решения.</p>
    <div className="segmented">{data.products.map((item) => <button key={item.product_type} className={product === item.product_type ? 'selected' : ''} onClick={() => setProduct(item.product_type)}>{productIcon(item.product_type)} {productLabel(item.product_type)}</button>)}</div>
    <label className="field"><span>Контекст · необязательно</span><select value={trigger} onChange={(e) => setTrigger(e.target.value)}><option value="">Не указывать</option>{triggers.map((item) => <option key={item.code} value={item.code}>{item.title}</option>)}</select></label>
    {trigger === 'other' && <label className="field"><span>Что происходило?</span><input value={customTrigger} onChange={(e) => setCustomTrigger(e.target.value)} /></label>}
    {product === 'cigarette' && <label className="field"><span>Сигарет</span><input type="number" min="0.1" step="0.1" value={cigQty} onChange={(e) => setCigQty(Number(e.target.value))} /></label>}
    {product === 'hookah' && <div className="three-fields"><label className="field"><span>Сессий</span><input type="number" min="0.5" step="0.5" value={hookahCount} onChange={(e) => setHookahCount(Number(e.target.value))} /></label><label className="field"><span>Минут</span><input type="number" min="0" value={hookahDuration} onChange={(e) => setHookahDuration(Number(e.target.value))} /></label><label className="field"><span>Чек, ₽</span><input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))} /></label></div>}
    {product === 'vape' && <><div className="puff-counter"><button onClick={() => setVapePuffs(Math.max(0, vapePuffs - 5))}>−5</button><strong>{vapePuffs}<small> затяжек</small></strong><button onClick={() => setVapePuffs(vapePuffs + 5)}>+5</button><button onClick={() => setVapePuffs(vapePuffs + 10)}>+10</button><button onClick={() => setVapePuffs(vapePuffs + 20)}>+20</button></div><p className="microcopy">10 затяжек = 1 ALIVE unit только для внутренней динамики. Это не медицинский перевод в сигареты.</p></>}
    {product !== 'hookah' && <label className="field"><span>Фактическая стоимость, ₽ · необязательно</span><input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))} /></label>}
    <label className="field"><span>Личная заметка · необязательно</span><textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
    {error && <p className="error">{error}</p>}
    <div className="footer-actions"><button className="primary" disabled={busy} onClick={save}>{busy ? 'Сохраняю…' : 'Сохранить факт'}</button><button className="secondary" onClick={onClose}>Отмена</button></div>
  </Modal>;
}

function GuidedFlow({ session, data, onClose, onSaved, initialTrigger }: { session: Session; data: Bootstrap; onClose: () => void; onSaved: () => Promise<void>; initialTrigger?: string }) {
  const initialProduct = data.products.find((item) => item.role === 'target_dependency')?.product_type ?? data.products[0]?.product_type ?? 'cigarette';
  const [product, setProduct] = useState<ProductType>(initialProduct);
  const [step, setStep] = useState(data.products.length > 1 ? 0 : 1);
  const [triggerCode, setTriggerCode] = useState(initialTrigger ?? '');
  const [customTrigger, setCustomTrigger] = useState('');
  const [needCode, setNeedCode] = useState('');
  const [cravingBefore, setCravingBefore] = useState(6);
  const [replacementCode, setReplacementCode] = useState<string | null>(null);
  const [cravingAfter, setCravingAfter] = useState(4);
  const [helpfulness, setHelpfulness] = useState(0);
  const [outcome, setOutcome] = useState<'successful_response' | 'nicotine_used' | 'abandoned'>('successful_response');
  const [note, setNote] = useState('');
  const [cigQty, setCigQty] = useState(1);
  const [hookahCost, setHookahCost] = useState(Number(data.products.find((p) => p.product_type === 'hookah')?.defaults?.hookah_default_price_rub ?? 2500));
  const [hookahDuration, setHookahDuration] = useState(60);
  const [vapePuffs, setVapePuffs] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const availableTriggers = data.triggers.filter((item) => item.product_types.includes(product));
  const candidates = useMemo(() => needCode && triggerCode ? pickReplacements(data, product, triggerCode, needCode) : [], [data, product, triggerCode, needCode]);
  const selectedReplacement = data.replacements.find((item) => item.code === replacementCode);
  const progress = Math.max(1, step);

  function chooseProduct(value: ProductType) { setProduct(value); setTriggerCode(''); setNeedCode(''); setReplacementCode(null); setStep(1); }
  function chooseTrigger(value: string) { setTriggerCode(value); setStep(2); }
  function chooseNeed(value: string) { setNeedCode(value); setStep(3); }
  function chooseReplacement(value: string | null) { setReplacementCode(value); setStep(4); }

  async function save() {
    if (!triggerCode || !needCode) return;
    setBusy(true); setError('');
    const tobacco: GuidedEpisodeDraft['tobacco'] = outcome === 'nicotine_used' ? {
      cigaretteQuantity: product === 'cigarette' ? cigQty : undefined,
      hookahSessionCount: product === 'hookah' ? 1 : undefined,
      hookahDurationMinutes: product === 'hookah' ? hookahDuration : undefined,
      vapePuffs: product === 'vape' ? vapePuffs : undefined,
      vapeDeviceType: product === 'vape' ? String(data.products.find((p) => p.product_type === 'vape')?.defaults?.device_type ?? 'disposable') as 'disposable' | 'pod' | 'refillable' : undefined,
      costActualRub: product === 'hookah' ? hookahCost : undefined,
    } : undefined;
    try {
      await saveGuidedEpisode(session, { product, triggerCode, customTriggerText: customTrigger, needCode, cravingBefore, cravingAfter, helpfulness: helpfulness || null, replacementCode, outcome, note, tobacco });
      await onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить эпизод'); }
    finally { setBusy(false); }
  }

  return <Modal wide onClose={onClose}>
    <div className="modal-head"><div><p className="eyebrow">Один эпизод · не экзамен</p><h2>Что происходит сейчас?</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
    <div className="flow-progress"><span className={progress >= 1 ? 'done' : ''}>контекст</span><span className={progress >= 2 ? 'done' : ''}>потребность</span><span className={progress >= 3 ? 'done' : ''}>ответ</span><span className={progress >= 4 ? 'done' : ''}>результат</span></div>

    {step === 0 && <div className="flow-step"><h3>Чего сейчас хочется?</h3><p>Разные продукты могут иметь разные сценарии — ALIVE не смешивает raw факты.</p><div className="choice-grid three">{data.products.map((item) => <button className="choice-card" key={item.product_type} onClick={() => chooseProduct(item.product_type)}><b>{productIcon(item.product_type)} {productLabel(item.product_type)}</b><span>{item.role === 'cessation_bridge' ? 'переходный инструмент' : 'целевая зависимость'}</span></button>)}</div></div>}

    {step === 1 && <div className="flow-step"><div className="step-title"><h3>Триггер</h3><Explain title="Зачем это?">Триггер — не причина «плохого поведения», а повторяющийся контекст, в котором автоматический ответ становится вероятнее. Чем точнее карта контекстов, тем точнее Замены.</Explain></div><div className="choice-grid triggers">{availableTriggers.map((item) => <button className={`choice-card ${triggerCode === item.code ? 'selected-card' : ''}`} key={item.code} onClick={() => chooseTrigger(item.code)}><b>{item.title}</b><span>{item.description}</span></button>)}</div>{triggerCode === 'other' && <label className="field"><span>Что именно происходило?</span><input value={customTrigger} onChange={(e) => setCustomTrigger(e.target.value)} /></label>}</div>}

    {step === 2 && <div className="flow-step"><div className="step-title"><h3>Что мне сейчас нужно?</h3><Explain title="Почему не сразу Замена?">Одинаковая сигарета или затяжка может обещать разные вещи: паузу, разрядку, завершение, стимуляцию, контакт. ALIVE сначала ищет функцию, а не подсовывает универсальный совет.</Explain></div><div className="choice-grid needs">{data.needs.map((item) => <button className="choice-card" key={item.code} onClick={() => chooseNeed(item.code)}><b>{item.title}</b><span>{item.description}</span></button>)}</div><div className="slider-card"><label><span>Сила тяги сейчас</span><strong>{cravingBefore}/10</strong></label><input type="range" min="1" max="10" value={cravingBefore} onChange={(e) => setCravingBefore(Number(e.target.value))} /></div></div>}

    {step === 3 && <div className="flow-step"><div className="step-title"><h3>Три ответа вместо автоматизма</h3><p>Не «правильные упражнения», а наиболее подходящие варианты для выбранного контекста. Система будет перестраивать приоритет по твоим реальным результатам.</p></div><div className="replacement-grid">{candidates.map((item) => <button className="replacement-card" key={item.code} onClick={() => chooseReplacement(item.code)}><span className="replacement-icon">{item.icon || '○'}</span><div><b>{item.title}</b><small>{item.duration || item.category}</small><p>{item.summary || item.instruction}</p>{item.category === 'nrt' && <em>NRT не считается срывом</em>}</div></button>)}</div><button className="text-action" onClick={() => chooseReplacement(null)}>Сейчас не хочу делать замену →</button></div>}

    {step === 4 && <div className="flow-step"><div className="result-header">{selectedReplacement && <div className="selected-replacement"><span>{selectedReplacement.icon || '○'}</span><div><small>Выбранный ответ</small><b>{selectedReplacement.title}</b></div></div>}<button className="text-action" onClick={() => setStep(3)}>изменить</button></div>{selectedReplacement && <div className="instruction-card"><p>{selectedReplacement.instruction}</p>{selectedReplacement.safety && <small>{selectedReplacement.safety}</small>}</div>}
      <div className="two-sliders"><div className="slider-card"><label><span>Тяга после</span><strong>{cravingAfter}/10</strong></label><input type="range" min="0" max="10" value={cravingAfter} onChange={(e) => setCravingAfter(Number(e.target.value))} /></div><div className="slider-card"><label><span>Насколько помогло</span><strong>{helpfulness || '—'}/5</strong></label><input type="range" min="0" max="5" value={helpfulness} onChange={(e) => setHelpfulness(Number(e.target.value))} /></div></div>
      <div className="outcome-grid"><button className={outcome === 'successful_response' ? 'outcome selected success' : 'outcome success'} onClick={() => setOutcome('successful_response')}><b>Связка разорвана</b><span>Никотиновый ответ не последовал</span></button><button className={outcome === 'nicotine_used' ? 'outcome selected' : 'outcome'} onClick={() => setOutcome('nicotine_used')}><b>Использовал никотин — разобрать</b><span>Это данные, а не обнуление</span></button><button className={outcome === 'abandoned' ? 'outcome selected' : 'outcome'} onClick={() => setOutcome('abandoned')}><b>Закрыть эпизод</b><span>Без оценки результата</span></button></div>
      {outcome === 'nicotine_used' && <div className="tobacco-detail">{product === 'cigarette' && <label className="field compact"><span>Сигарет</span><input type="number" min="0.1" step="0.1" value={cigQty} onChange={(e) => setCigQty(Number(e.target.value))} /></label>}{product === 'hookah' && <div className="two-fields"><label className="field compact"><span>Минут</span><input type="number" min="0" value={hookahDuration} onChange={(e) => setHookahDuration(Number(e.target.value))} /></label><label className="field compact"><span>Чек, ₽</span><input type="number" min="0" value={hookahCost} onChange={(e) => setHookahCost(Number(e.target.value))} /></label></div>}{product === 'vape' && <><div className="puff-counter"><button onClick={() => setVapePuffs(Math.max(0, vapePuffs - 5))}>−5</button><strong>{vapePuffs}<small> затяжек</small></strong><button onClick={() => setVapePuffs(vapePuffs + 5)}>+5</button><button onClick={() => setVapePuffs(vapePuffs + 10)}>+10</button><button onClick={() => setVapePuffs(vapePuffs + 20)}>+20</button></div><p className="microcopy">Мы сохраняем реальные затяжки; ALIVE units считаются отдельно.</p></>}</div>}
      <label className="field"><span>Контекст / заметка · необязательно и приватно</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Что было важно в этом эпизоде?" /></label>
      {error && <p className="error">{error}</p>}
      <div className="footer-actions"><button className="primary" disabled={busy} onClick={save}>{busy ? 'Сохраняю…' : 'Сохранить эпизод'}</button><button className="secondary" onClick={onClose}>Закрыть</button></div>
    </div>}

    {step > 1 && step < 4 && <button className="back-action" onClick={() => setStep(step - 1)}>← назад</button>}
  </Modal>;
}

function CheckinModal({ session, data, onClose, onSaved }: { session: Session; data: Bootstrap; onClose: () => void; onSaved: () => Promise<void> }) {
  const old = data.todayCheckin;
  const [irritability, setIrritability] = useState(old?.irritability ?? 5);
  const [energy, setEnergy] = useState(old?.energy ?? 5);
  const [recovery, setRecovery] = useState(old?.recovery ?? 5);
  const [ownedMoment, setOwnedMoment] = useState(old?.owned_moment ?? '');
  const [strongest, setStrongest] = useState(old?.strongest_link ?? '');
  const [tomorrow, setTomorrow] = useState(old?.tomorrow_plan ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true); setError('');
    try {
      await saveCheckin(session, { checkin_date: localDateKey(), irritability, energy, recovery, owned_moment: ownedMoment || null, strongest_link: strongest || null, tomorrow_plan: tomorrow || null });
      await onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить check-in'); }
    finally { setBusy(false); }
  }
  return <Modal onClose={onClose}>
    <div className="modal-head"><div><p className="eyebrow">Вечерний check-in</p><h2>Не оценка дня. Карта обучения.</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
    {[['Раздражительность', irritability, setIrritability], ['Энергия', energy, setEnergy], ['Сон / восстановление', recovery, setRecovery]].map(([label, value, setter]) => <div className="slider-card" key={String(label)}><label><span>{String(label)}</span><strong>{Number(value)}/10</strong></label><input type="range" min="1" max="10" value={Number(value)} onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))} /></div>)}
    <label className="field"><span>Где сегодня решение особенно осталось моим?</span><textarea value={ownedMoment} onChange={(e) => setOwnedMoment(e.target.value)} /></label>
    <label className="field"><span>Какая Связка оказалась самой сильной?</span><textarea value={strongest} onChange={(e) => setStrongest(e.target.value)} /></label>
    <label className="field"><span>Завтра: если X, то Y</span><textarea value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} placeholder="Если после кофе потянет — сначала выйду к окну на 2 минуты" /></label>
    {error && <p className="error">{error}</p>}
    <div className="footer-actions"><button className="primary" disabled={busy} onClick={save}>{busy ? 'Сохраняю…' : 'Сохранить check-in'}</button><button className="secondary" onClick={onClose}>Отмена</button></div>
  </Modal>;
}

function TodayPage({ session, data, reload, openFlow, openQuick, openCheckin }: { session: Session; data: Bootstrap; reload: () => Promise<void>; openFlow: (trigger?: string) => void; openQuick: () => void; openCheckin: () => void }) {
  const today = statsForDays(data, 1);
  const seven = statsForDays(data, 7);
  const trigStats = triggerStats(data);
  const dailySupports = data.supports.filter((item) => item.support_type === 'daily');
  const support = dailySupports.length ? dailySupports[new Date().getDate() % dailySupports.length] : null;
  const triggerByCode = new Map(data.triggers.map((item) => [item.code, item]));
  const eventByEpisode = new Map(data.tobaccoEvents.filter((event) => event.episode_id).map((event) => [event.episode_id as string, event]));
  const actionsByEpisode = new Map(data.actions.filter((action) => action.replacement_code).map((action) => [action.episode_id, action]));
  const enabledProducts = new Set(data.products.map((item) => item.product_type));
  const attention = trigStats.filter((item) => item.episodes > 0).sort((a, b) => (a.successRate ?? 101) - (b.successRate ?? 101)).slice(0, 3);
  const starter = data.triggers.filter((item) => item.product_types.some((p) => enabledProducts.has(p))).slice(0, 3);
  const shownAttention = attention.length ? attention.map((item) => item.trigger) : starter;
  const successesToday = data.episodes.filter((episode) => episode.started_at.slice(0, 10) === localDateKey() && episode.outcome === 'successful_response');

  async function removeEpisode(id: string) {
    if (!window.confirm('Удалить эту запись как ошибочную/тестовую? Статистика пересчитается по оставшимся данным.')) return;
    await deleteEpisode(session, id); await reload();
  }

  return <main className="app-page page-stack">
    <section className="today-hero panel">
      <div className="today-copy"><p className="eyebrow">Сегодня · {data.profile.display_name}</p><h1>Не бороться с собой. Вернуть следующий выбор.</h1><p className="lead">{data.settings.goal_text || 'ALIVE будет учиться на реальных эпизодах и постепенно собирать твою персональную карту автоматизмов.'}</p></div>
      <div className="today-actions"><button className="primary huge" onClick={() => openFlow()}><span>Сейчас тянет</span><small>пройти эпизод</small></button><button className="secondary action-tile" onClick={openQuick}><span>Отметить факт</span><small>если уже использовал никотин</small></button><button className="secondary action-tile" onClick={openCheckin}><span>Вечерний check-in</span><small>{data.todayCheckin ? 'сегодня уже заполнен · можно изменить' : '3 минуты на карту дня'}</small></button></div>
      {support && <blockquote className="daily-support">“{support.body}”</blockquote>}
    </section>

    <section className="metrics-grid four">
      <Metric label="ALIVE units · сегодня" value={formatNumber(today.aliveUnits, 1)} note="внутренняя единица поведения"><Explain>Сигарета = 1 unit, кальянная сессия = 10, 10 затяжек электронки = 1. Это не медицинский эквивалент вреда или никотина.</Explain></Metric>
      <Metric label="Разорвано Связок" value={String(today.successfulResponses)} note="осознанных ответов сегодня"><Explain>Эпизод, в котором привычный контекст возник, но автоматический никотиновый ответ не последовал.</Explain></Metric>
      <Metric label="7 дней vs baseline" value={seven.baselineDeltaPct === null ? 'настрой baseline' : `${seven.baselineDeltaPct > 0 ? '+' : ''}${formatNumber(seven.baselineDeltaPct, 0)}%`} note="по ALIVE units"><Explain>Сравнение идёт только с твоей собственной исходной интенсивностью, а не с другими людьми.</Explain></Metric>
      <Metric label="Фонд свободы · 7 дней" value={seven.baselineCost > 0 ? formatMoney(seven.freedomFund) : '—'} note="расчёт по твоему baseline"><Explain>Оценка денег, которые baseline предполагал бы потратить за период, минус фактически записанные расходы. Чем честнее логирование, тем полезнее цифра.</Explain></Metric>
    </section>

    <section className="two-column-layout">
      <article className="panel section-card">
        <div className="section-head"><div><p className="eyebrow">Сегодня я уже сделал</p><h2>Конкретные моменты, где решение осталось твоим.</h2></div><span className="big-count">{successesToday.length}</span></div>
        {successesToday.length ? <div className="compact-list">{successesToday.slice(0, 5).map((episode) => <div key={episode.id} className="list-row"><span className="status-dot good" /><div><b>{triggerByCode.get(episode.trigger_code || '')?.title || episode.custom_trigger_text || 'Эпизод'}</b><small>{shortDate(episode.started_at)} · тяга {episode.craving_before ?? '—'} → {episode.craving_after ?? '—'}</small></div></div>)}</div> : <div className="empty-state"><b>Пока здесь пусто — это нормально.</b><p>Первый осознанный ответ появится после реального эпизода. Не нужно создавать «идеальный день» ради статистики.</p><button className="text-action" onClick={() => openFlow()}>Записать живой эпизод →</button></div>}
      </article>

      <article className="panel section-card">
        <div className="section-head"><div><p className="eyebrow">Связки внимания</p><h2>{attention.length ? 'Сначала слабые и новые — как карта работы.' : 'Пока система ещё не знает твои сильные контексты.'}</h2></div><button className="text-action" onClick={() => navigate('/links')}>все Связки →</button></div>
        <div className="link-preview-list">{shownAttention.map((trigger) => { const stat = trigStats.find((item) => item.trigger.code === trigger.code); return <button className="link-preview" key={trigger.code} onClick={() => openFlow(trigger.code)}><div><b>{trigger.title}</b><span>{trigger.description}</span></div><div className="link-score">{stat?.successRate === null || stat?.successRate === undefined ? 'изучить' : `${formatNumber(stat.successRate)}%`}</div></button>; })}</div>
      </article>
    </section>

    <section className="panel section-card">
      <div className="section-head"><div><p className="eyebrow">Последние эпизоды</p><h2>Факты, на которых ALIVE учится.</h2></div><Explain title="Почему можно удалить?">Тестовая или ошибочная запись не должна загрязнять личную модель. Удаление soft-delete исключает эпизод и связанный raw tobacco event из расчётов.</Explain></div>
      {data.episodes.length ? <div className="episode-table">{data.episodes.slice(0, 8).map((episode) => { const action = actionsByEpisode.get(episode.id); const replacement = data.replacements.find((item) => item.code === action?.replacement_code); const event = eventByEpisode.get(episode.id); return <div className="episode-row" key={episode.id}><div className={`episode-icon ${episode.outcome === 'successful_response' ? 'success' : ''}`}>{productIcon(episode.target_product)}</div><div className="episode-main"><b>{triggerByCode.get(episode.trigger_code || '')?.title || episode.custom_trigger_text || 'Без контекста'}</b><small>{shortDate(episode.started_at)} · {productLabel(episode.target_product)}{replacement ? ` · ${replacement.title}` : ''}</small></div><div className="episode-result"><span>{outcomeLabel(episode.outcome)}</span>{event?.vape_puffs ? <small>{event.vape_puffs} затяжек</small> : event?.cigarette_quantity ? <small>{event.cigarette_quantity} сиг.</small> : event?.hookah_session_count ? <small>{event.hookah_session_count} кальян</small> : <small>{episode.craving_before ?? '—'} → {episode.craving_after ?? '—'}</small>}</div><button className="delete-button" title="Удалить ошибочную запись" onClick={() => removeEpisode(episode.id)}>×</button></div>; })}</div> : <div className="empty-state"><p>После первых записей здесь появится история с контекстом, заменой и результатом.</p></div>}
    </section>
  </main>;
}

function LinksPage({ session, data, reload, openFlow }: { session: Session; data: Bootstrap; reload: () => Promise<void>; openFlow: (trigger?: string) => void }) {
  const stats = triggerStats(data);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [situation, setSituation] = useState('');
  const [needCode, setNeedCode] = useState('');
  const [impulse, setImpulse] = useState('');
  const [habit, setHabit] = useState('');
  const [replacement, setReplacement] = useState('');
  const [error, setError] = useState('');

  async function createLink() {
    if (!title.trim() || !situation.trim()) { setError('Нужны хотя бы название и ситуация.'); return; }
    try { await addLink(session, { title: title.trim(), situation: situation.trim(), need_code: needCode || null, impulse: impulse || null, habitual_response: habit || null, preferred_replacement_code: replacement || null }); setShowForm(false); setTitle(''); setSituation(''); setNeedCode(''); setImpulse(''); setHabit(''); setReplacement(''); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить Связку'); }
  }

  async function remove(id: string) { if (!window.confirm('Удалить эту личную Связку?')) return; await deleteLink(session, id); await reload(); }
  async function propose(link: Bootstrap['userLinks'][number]) { if (!window.confirm('Отправить обезличенный снимок этой Связки на рассмотрение в общую базу? Приватная оригинальная запись останется твоей.')) return; await submitLink(session, link); window.alert('Отправлено на review. Автоматической публикации нет.'); }

  return <main className="app-page page-stack">
    <section className="page-intro panel"><p className="eyebrow">Связки</p><h1>Возвращать состояния напрямую.</h1><p className="lead">Связка — повторяющийся сценарий: ситуация → потребность → импульс → привычный ответ. Низкий процент не «плохой результат», а следующая точка, где особенно полезен эксперимент.</p><button className="secondary" onClick={() => setShowForm(!showForm)}>+ Моя Связка</button></section>

    {showForm && <section className="panel form-panel"><div className="section-head"><div><h2>Добавить свою Связку</h2><p>Персональные Связки приватны по умолчанию.</p></div><button className="icon-button" onClick={() => setShowForm(false)}>×</button></div><div className="two-fields"><label className="field"><span>Короткое название</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: кофе после завтрака" /></label><label className="field"><span>Что происходит?</span><input value={situation} onChange={(e) => setSituation(e.target.value)} /></label></div><label className="field"><span>Что я в этот момент ищу?</span><select value={needCode} onChange={(e) => setNeedCode(e.target.value)}><option value="">Пока не знаю</option>{data.needs.map((need) => <option key={need.code} value={need.code}>{need.title}</option>)}</select></label><div className="two-fields"><label className="field"><span>Импульс</span><input value={impulse} onChange={(e) => setImpulse(e.target.value)} placeholder="Выйти и закурить" /></label><label className="field"><span>Привычный ответ</span><input value={habit} onChange={(e) => setHabit(e.target.value)} placeholder="Сигарета / 10 затяжек / кальян" /></label></div><label className="field"><span>Предпочтительная Замена</span><select value={replacement} onChange={(e) => setReplacement(e.target.value)}><option value="">Пусть ALIVE подбирает</option>{data.replacements.map((item) => <option key={item.code} value={item.code}>{item.title}</option>)}</select></label>{error && <p className="error">{error}</p>}<button className="primary" onClick={createLink}>Сохранить Связку</button></section>}

    {data.userLinks.length > 0 && <section className="panel section-card"><div className="section-head"><div><p className="eyebrow">Мои Связки</p><h2>То, что ты заметил сам.</h2></div><span className="status-pill">private by default</span></div><div className="custom-content-grid">{data.userLinks.map((link) => <article className="custom-card" key={link.id}><h3>{link.title}</h3><p>{link.situation}</p><dl><dt>Потребность</dt><dd>{data.needs.find((n) => n.code === link.need_code)?.title || 'не определена'}</dd><dt>Привычный ответ</dt><dd>{link.habitual_response || 'не указан'}</dd><dt>Новый вариант</dt><dd>{data.replacements.find((r) => r.code === link.preferred_replacement_code)?.title || 'подбирает ALIVE'}</dd></dl><div className="card-actions"><button className="text-action" onClick={() => propose(link)}>Предложить в общую базу</button><button className="danger-link" onClick={() => remove(link.id)}>удалить</button></div></article>)}</div></section>}

    <section className="panel section-card"><div className="section-head"><div><p className="eyebrow">Карта контекстов</p><h2>Рабочие триггеры общей базы + твои реальные outcomes.</h2></div><Explain>Карточки становятся персональными только после реальных эпизодов. До этого это каталог гипотез, а не диагноз.</Explain></div><div className="trigger-map">{stats.map((stat) => { const mapped = data.triggerReplacementMap.filter((m) => m.trigger_code === stat.trigger.code).sort((a,b) => a.priority-b.priority).slice(0,3).map((m) => data.replacements.find((r) => r.code === m.replacement_code)?.title).filter(Boolean); return <button className="trigger-card" key={stat.trigger.code} onClick={() => openFlow(stat.trigger.code)}><div className="trigger-top"><b>{stat.trigger.title}</b><span className={stat.successRate === null ? 'neutral-score' : stat.successRate >= 60 ? 'good-score' : 'work-score'}>{stat.successRate === null ? 'новая' : `${formatNumber(stat.successRate)}%`}</span></div><p>{stat.trigger.description}</p><small>{stat.episodes ? `${stat.episodes} эп. · разорвано ${stat.successes}` : 'ещё нет твоих данных'}</small>{mapped.length > 0 && <div className="mini-tags">{mapped.map((name) => <span key={String(name)}>{name}</span>)}</div>}</button>; })}</div></section>
  </main>;
}

function MeaningsPage({ session, data, reload }: { session: Session; data: Bootstrap; reload: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<UserMeaning | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [error, setError] = useState('');

  async function create() { if (!title.trim() || !body.trim()) { setError('Нужны название и собственная формулировка.'); return; } try { await addMeaning(session, title.trim(), body.trim()); setTitle(''); setBody(''); setShowForm(false); await reload(); } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить'); } }
  function startEdit(item: UserMeaning) { setEditing(item); setEditTitle(item.title); setEditBody(item.body); }
  async function saveEdit() { if (!editing) return; await updateMeaning(session, editing.id, { title: editTitle, body: editBody }); setEditing(null); await reload(); }
  async function toggle(item: UserMeaning) { await updateMeaning(session, item.id, { active: !item.active }); await reload(); }
  async function remove(item: UserMeaning) { if (!window.confirm('Удалить этот личный Смысл?')) return; await deleteMeaning(session, item.id); await reload(); }
  async function propose(item: UserMeaning) { if (!window.confirm('Предложить обезличенную формулировку в общую базу? Оригинал останется приватным, публикация возможна только после ручного review.')) return; await submitMeaning(session, item); window.alert('Отправлено на review.'); }

  return <main className="app-page page-stack">
    <section className="page-intro panel"><p className="eyebrow">Смыслы</p><h1>Не лозунги. Направление жизни.</h1><p className="lead">Смысл в ALIVE — не магическая аффирмация. Это причина, ради которой короткий автоматический импульс перестаёт быть единственным горизонтом.</p><button className="secondary" onClick={() => setShowForm(!showForm)}>+ Мой Смысл</button></section>

    {showForm && <section className="panel form-panel"><div className="section-head"><div><h2>Добавить свой Смысл</h2><p>Лучше собственная живая формулировка, чем «правильная» чужая.</p></div><button className="icon-button" onClick={() => setShowForm(false)}>×</button></div><label className="field"><span>Название</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Полная мощность" /></label><label className="field"><span>Что это значит именно для тебя?</span><textarea value={body} onChange={(e) => setBody(e.target.value)} /></label>{error && <p className="error">{error}</p>}<button className="primary" onClick={create}>Сохранить Смысл</button></section>}

    <section className="panel section-card"><div className="section-head"><div><p className="eyebrow">Мои Смыслы</p><h2>Личные опоры, которые знает только твой профиль.</h2></div><span className="status-pill">private</span></div>{data.userMeanings.length ? <div className="meaning-grid personal">{data.userMeanings.map((item) => <article className={`meaning-card ${item.active ? '' : 'inactive'}`} key={item.id}><small>личный</small><h3>{item.title}</h3><p>{item.body}</p><div className="card-actions"><button className="text-action" onClick={() => startEdit(item)}>редактировать</button><button className="text-action" onClick={() => toggle(item)}>{item.active ? 'отключить' : 'включить'}</button><button className="text-action" onClick={() => propose(item)}>в общую базу</button><button className="danger-link" onClick={() => remove(item)}>удалить</button></div></article>)}</div> : <div className="empty-state"><b>Здесь стоит начать с твоих слов.</b><p>Общая база может дать направление, но настоящая персонализация начинается, когда появляются собственные причины и формулировки.</p></div>}</section>

    <section className="panel section-card"><div className="section-head"><div><p className="eyebrow">Общая база</p><h2>Направления, которые можно примерить — не принять на веру.</h2></div></div><div className="meaning-grid">{data.meanings.map((item) => <article className="meaning-card global" key={item.id}><small>общая опора</small><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>

    <section className="panel section-card"><div className="section-head"><div><p className="eyebrow">Старый механизм → новый выбор</p><h2>Рабочие гипотезы об автоматизмах.</h2></div><Explain>Это не психодиагностика. Карточка полезна только если ты узнаёшь в ней свой механизм; иначе её можно просто проигнорировать.</Explain></div><div className="identity-list">{data.identityScripts.map((item) => <details className="identity-card" key={item.code}><summary>{item.title}</summary><div className="identity-columns"><div><small>Старый механизм</small><p>{item.old_pattern}</p></div><div><small>Новый выбор</small><p>{item.new_choice}</p></div></div></details>)}</div></section>

    {editing && <Modal onClose={() => setEditing(null)}><div className="modal-head"><div><p className="eyebrow">Мой Смысл</p><h2>Редактировать</h2></div><button className="icon-button" onClick={() => setEditing(null)}>×</button></div><label className="field"><span>Название</span><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></label><label className="field"><span>Формулировка</span><textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} /></label><div className="footer-actions"><button className="primary" onClick={saveEdit}>Сохранить</button><button className="secondary" onClick={() => setEditing(null)}>Отмена</button></div></Modal>}
  </main>;
}

function PathPage({ data }: { data: Bootstrap }) {
  const one = statsForDays(data, 1);
  const seven = statsForDays(data, 7);
  const replacements = replacementStats(data).slice(0, 8);
  const chart = dailyUnits(data, 7);
  const maxUnits = Math.max(1, ...chart.map((item) => item.units), seven.baselineUnits / 7);
  return <main className="app-page page-stack">
    <section className="page-intro panel"><p className="eyebrow">Путь</p><h1>Прогресс — не только число сигарет.</h1><p className="lead">Смотрим, сколько ситуаций перестают быть автоматическими, что реально помогает, как меняется интенсивность относительно твоего baseline и какой ресурс возвращается в жизнь.</p></section>
    <section className="metrics-grid four"><Metric label="Разорвано · 7 дней" value={String(seven.successfulResponses)} note="осознанных ответов" /><Metric label="ALIVE units · 7 дней" value={formatNumber(seven.aliveUnits, 1)} note={seven.baselineUnits ? `baseline ≈ ${formatNumber(seven.baselineUnits, 1)}` : 'baseline не задан'}><Explain>Это behavioural metric, а не шкала медицинского вреда.</Explain></Metric><Metric label="Активных дней" value={`${seven.activeDays}/7`} note="дни с реальными данными" /><Metric label="Фонд свободы" value={seven.baselineCost ? formatMoney(seven.freedomFund) : '—'} note="7 дней" /></section>

    <section className="panel section-card"><div className="section-head"><div><p className="eyebrow">Последние 7 дней</p><h2>Употребление и осознанные ответы рядом.</h2></div><span className="status-pill">baseline = твоя исходная точка</span></div><div className="bar-chart">{chart.map((day) => <div className="bar-day" key={day.date}><div className="bar-space"><div className="bar use" style={{ height: `${Math.max(3, (day.units / maxUnits) * 100)}%` }} title={`${formatNumber(day.units,1)} ALIVE units`} /><div className="success-stack" style={{ height: `${Math.min(100, day.successes * 14)}%` }} title={`${day.successes} разорвано`} /></div><b>{new Date(day.date + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short' })}</b><small>{formatNumber(day.units,1)} u · {day.successes} ↗</small></div>)}</div><div className="legend"><span><i className="legend-use" />ALIVE units</span><span><i className="legend-success" />разорванные Связки</span></div></section>

    <section className="two-column-layout">
      <article className="panel section-card"><div className="section-head"><div><p className="eyebrow">Raw факты</p><h2>Не прячем продукты внутри одной цифры.</h2></div></div><div className="raw-stats"><div><span>Сигареты · 7 дней</span><b>{formatNumber(seven.cigarettes,1)}</b></div><div><span>Кальянные сессии</span><b>{formatNumber(seven.hookahs,1)}</b></div><div><span>Затяжки электронки</span><b>{formatNumber(seven.vapePuffs)}</b></div><div><span>Сегодня ALIVE units</span><b>{formatNumber(one.aliveUnits,1)}</b></div></div></article>
      <article className="panel section-card"><div className="section-head"><div><p className="eyebrow">Что работает у меня</p><h2>Замены ранжируются по твоим outcomes.</h2></div></div>{replacements.length ? <div className="effectiveness-list">{replacements.map((item, index) => <div className="effectiveness-row" key={item.code}><span className="rank">{index+1}</span><div><b>{item.title}</b><small>{item.uses} исп. · полезность {item.avgHelpfulness === null ? '—' : formatNumber(item.avgHelpfulness,1)}/5 · тяга Δ {item.avgCravingDelta === null ? '—' : formatNumber(item.avgCravingDelta,1)}</small></div><strong>{item.successRate === null ? '—' : `${formatNumber(item.successRate)}%`}</strong></div>)}</div> : <div className="empty-state"><b>Пока рано делать выводы.</b><p>После нескольких эпизодов с оценкой «тяга после» и «насколько помогло» здесь появится персональная карта эффективности.</p></div>}</article>
    </section>

    <section className="panel section-card"><div className="section-head"><div><p className="eyebrow">Награды, которые возвращают жизнь</p><h2>Не компенсация за лишение — фиксация нового этапа.</h2></div></div><div className="reward-grid">{data.rewards.map((reward) => <article className="reward-card" key={reward.code}><small>{reward.title}</small><p>{reward.description}</p></article>)}</div></section>
  </main>;
}

function ProfilePage({ session, data, editProfile }: { session: Session; data: Bootstrap; editProfile: () => void }) {
  async function signOut() { await getSupabase()?.auth.signOut(); navigate('/'); }
  return <main className="app-page page-stack"><section className="page-intro panel"><p className="eyebrow">Профиль</p><h1>{data.profile.display_name}</h1><p className="lead">Baseline — это исходная точка для личной динамики, а не норматив и не соревнование.</p><div className="hero-actions"><button className="primary" onClick={editProfile}>Изменить baseline и цель</button><button className="secondary" onClick={signOut}>Выйти</button></div></section><section className="panel section-card"><div className="section-head"><div><p className="eyebrow">Текущая цель</p><h2>{data.settings.goal_text || 'Пока не сформулирована'}</h2></div></div><div className="product-summary-grid">{data.products.map((product) => <article className="product-summary" key={product.product_type}><span>{productIcon(product.product_type)}</span><div><b>{productLabel(product.product_type)}</b><small>{product.role === 'cessation_bridge' ? 'переходный инструмент' : 'целевая зависимость'}</small><p>{product.product_type === 'cigarette' ? `${Number(product.baseline.cigarettes_per_day ?? 0)} сиг./день` : product.product_type === 'hookah' ? `${Number(product.baseline.sessions_per_week ?? 0)} сесс./нед.` : `${Number(product.baseline.puffs_per_day ?? 0)} затяжек/день`}</p></div></article>)}</div></section><section className="panel section-card"><p className="eyebrow">Privacy</p><h2>Приватные данные не становятся общими по умолчанию.</h2><p>Личные эпизоды, заметки, Смыслы и Связки читаются только твоим authenticated user через RLS. В общую базу попадает только отдельный UGC snapshot после явного действия «Предложить».</p><Explain title="Что всё-таки видит инфраструктура?">Абсолютно неуязвимых систем нет. Google участвует во входе, Cloudflare отдаёт frontend, Supabase хранит Auth и БД. ALIVE минимизирует сбор и не строит рекламную модель на твоих данных.</Explain></section></main>;
}

function ReleasesPage() {
  const releases = [
    { version: 'v3.0', tag: 'в разработке', title: 'Новая платформа без функционального отката', text: 'React + PostgreSQL/RLS + Google identity, cigarette/hookah/vape, универсальный onboarding, персональные Смыслы/Связки, richer replacement engine, experiment/privacy layer. Hard gate: продукт не может быть беднее v2.7.' },
    { version: 'v2.7', tag: 'legacy baseline', title: 'Каноническая глубина продукта', text: 'Сегодня / Связки / Путь / Смысл / Релизы, episode flow, check-in, персональная эффективность, фонд свободы, rewards, rich contextual catalog.' },
    { version: 'v2.5', tag: 'контекстный loop', title: 'Триггер → функция → Замена → outcome', text: '35 контекстных замен, 76 связей trigger→replacement, craving after/helpfulness и персональная аналитика.' },
    { version: 'v2.4', tag: 'данные + смысл', title: 'Редактируемая история и identity layer', text: 'Удаление ошибочных эпизодов с пересчётом, усиленная работа со Смыслами и жизнью за пределами запрета.' },
  ];
  return <main className="app-page page-stack"><section className="page-intro panel"><p className="eyebrow">Релизы</p><h1>Что меняется и зачем.</h1><p className="lead">ALIVE ведёт релизы как продуктовые гипотезы с миграциями, тестами и возможностью отката.</p></section><section className="release-list">{releases.map((item) => <article className="panel release-card" key={item.version}><div className="release-version">{item.version}</div><div><span className="status-pill">{item.tag}</span><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</section></main>;
}

function ExperimentPage({ publicMode = false }: { publicMode?: boolean }) {
  return <main className="article-page">{publicMode && <button className="back" onClick={() => navigate('/')}>← В ALIVE</button>}<article className="panel article"><p className="eyebrow">ALIVE Method v1 · экспериментальная методология</p><h1>ALIVE — эксперимент над автоматизмом.</h1><p className="lead"><strong>Мы ничего тебе не обещаем.</strong> Мы проверяем рабочую гипотезу на реальных людях, начиная с собственной потребности автора справиться с никотиновой зависимостью.</p><p>Система авторская в смысле композиции, продуктовой логики и способа соединить наблюдение, behavioural loop, персональные Замены, Смыслы и данные. Она не претендует на изобретение всех используемых идей с нуля и прямо допускает заимствования из существующих подходов.</p><h2>Что мы называем «перепрошивкой»</h2><p>Это метафора, а не медицинский термин. Рабочая идея проста: если снова и снова замечать конкретный автоматический сценарий и проживать ту же функцию другим способом, старый сценарий может постепенно перестать быть единственным.</p><div className="method-grid"><div><b>1 · Связки</b><p>Не одна абстрактная тяга, а конкретные сценарии: кофе → пауза → сигарета; компьютер → фоновая затяжка; друзья → кальян как событие.</p></div><div><b>2 · Функция</b><p>Человек может искать не только никотин: паузу, разрядку, удовольствие, завершение, контакт, стимуляцию или ритуал.</p></div><div><b>3 · Замена</b><p>Пробуем получить нужную функцию иначе и измеряем не «правильность», а реальный результат именно у этого человека.</p></div><div><b>4 · Обучение</b><p>Craving before/after, helpfulness и outcome постепенно меняют приоритеты персональной системы.</p></div></div><h2>Что считается результатом</h2><p>Не только серия дней без никотина. ALIVE смотрит на raw употребление, ALIVE units относительно собственного baseline, разорванные Связки, интервалы, эффективность Замен и способность вернуться после паузы или срыва.</p><h2>Что ALIVE не обещает</h2><p>ALIVE не гарантирует, что ты бросишь. Это не медицинское лечение и не замена врачу. Если эксперимент окажется бесполезным, его можно прекратить. Он не требует отказываться от доказательных методов, включая NRT и профессиональную помощь.</p><h2>Потенциальный upside</h2><p>Если гипотеза сработает, человек может отказаться от курения или заметно сократить зависимость, снизить связанные с курением риски, вернуть деньги и время, меньше зависеть от автоматических ритуалов и высвободить больше внимания и энергии для своей жизни. Это возможность, а не обещание ALIVE.</p><h2>Что мы знаем, а что предполагаем</h2><div className="fact-grid"><div><strong>Достаточно хорошо известно</strong><p>Отказ от курения полезен для здоровья; зависимость и cue/context существуют; NRT относится к доказанным методам помощи.</p></div><div><strong>Есть основания, но ALIVE проверяет применение</strong><p>Персональные context-aware Замены, group support, работа со смыслом/идентичностью и обучение на собственных outcomes.</p></div><div><strong>Наши эвристики</strong><p>1 кальян = 10 ALIVE units; 10 vape puffs = 1 unit; ranking алгоритма. Эти коэффициенты не медицинские.</p></div></div><h2>Privacy: эти данные слишком личные, чтобы превращать их в рекламный профиль</h2><p className="quote">Мы не строим рекламную модель на твоей зависимости.</p><p>Личные эпизоды, заметки, Смыслы и Связки приватны по умолчанию. Private UGC не превращается в общий контент без отдельного явного действия пользователя. Если данные не нужны продукту — лучше их не собирать.</p><p>Абсолютно неуязвимых систем не существует. Google, Cloudflare и Supabase неизбежно обрабатывают часть технической информации по собственным правилам. Наша задача — минимизировать данные, изолировать пользователей технически и не использовать чувствительный текст для рекламного таргетинга.</p></article></main>;
}

export default function App() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [flow, setFlow] = useState<{ open: boolean; trigger?: string }>({ open: false });
  const [quick, setQuick] = useState(false);
  const [checkin, setCheckin] = useState(false);
  const [editProfile, setEditProfile] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data: authData }) => setSession(authData.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function reload() {
    if (!session) return;
    setLoadingData(true); setError('');
    try { setData(await loadBootstrap(session)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось загрузить данные'); }
    finally { setLoadingData(false); }
  }

  useEffect(() => { if (session) void reload(); else setData(null); }, [session]);

  if (!publicEnv.isConfigured) return <ConfigurationGate />;
  if (session === undefined) return <Loading text="Проверяю вход…" />;
  if (!session) return pathname === '/experiment' ? <ExperimentPage publicMode /> : <Login />;
  if (!data || loadingData) return error ? <main className="center-page"><section className="panel setup-panel"><h2>Не удалось загрузить ALIVE</h2><p className="error">{error}</p><button className="primary" onClick={reload}>Повторить</button></section></main> : <Loading />;
  if (!data.profile.onboarding_completed_at) return <Onboarding session={session} data={data} onDone={reload} />;

  let page: ReactNode;
  if (pathname === '/links') page = <LinksPage session={session} data={data} reload={reload} openFlow={(trigger) => setFlow({ open: true, trigger })} />;
  else if (pathname === '/path') page = <PathPage data={data} />;
  else if (pathname === '/meanings') page = <MeaningsPage session={session} data={data} reload={reload} />;
  else if (pathname === '/experiment') page = <ExperimentPage />;
  else if (pathname === '/releases') page = <ReleasesPage />;
  else if (pathname === '/profile') page = <ProfilePage session={session} data={data} editProfile={() => setEditProfile(true)} />;
  else page = <TodayPage session={session} data={data} reload={reload} openFlow={(trigger) => setFlow({ open: true, trigger })} openQuick={() => setQuick(true)} openCheckin={() => setCheckin(true)} />;

  return <>
    <Topbar data={data} pathname={pathname} />
    {page}
    {flow.open && <GuidedFlow session={session} data={data} initialTrigger={flow.trigger} onClose={() => setFlow({ open: false })} onSaved={reload} />}
    {quick && <QuickLog session={session} data={data} onClose={() => setQuick(false)} onSaved={reload} />}
    {checkin && <CheckinModal session={session} data={data} onClose={() => setCheckin(false)} onSaved={reload} />}
    {editProfile && <Onboarding session={session} data={data} onDone={async () => { await reload(); setEditProfile(false); }} onCancel={() => setEditProfile(false)} />}
  </>;
}
