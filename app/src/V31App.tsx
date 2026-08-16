import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import logoUrl from './assets/brand-logo-full.png';
import RedesignApp from './RedesignApp';
import { publicEnv } from './env';
import { getSupabase } from './supabase';
import {
  loadBootstrap,
  productLabel,
  saveCheckin,
  saveGuidedEpisode,
  saveOnboarding,
  type Bootstrap,
  type GuidedEpisodeDraft,
  type OnboardingDraft,
  type ProductType,
  type Replacement,
  type Trigger,
} from './data';
import { saveQuickUse } from './actions';
import { statsForDays } from './metrics';
import { Icon, type IconName } from './ui-icons';
import {
  contextualMyth,
  factForMoment,
  loadKnowledge,
  loadTogether,
  markMythShown,
  pickDiverseReplacements,
  replacementMechanism,
  setMythRelevance,
  smokingExposure,
  type Fact,
  type Knowledge,
  type Myth,
  type MythState,
  type TogetherSummary,
} from './v31-data';

function go(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const listener = () => setPath(window.location.pathname);
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }, []);
  return path;
}

function fmt(value: number, digits = 0) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value);
}

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function productIcon(product: ProductType): IconName {
  return product === 'cigarette' ? 'smoke' : product === 'hookah' ? 'hookah' : 'vape';
}

function productCta(product: ProductType) {
  if (product === 'cigarette') return 'Хочу закурить';
  if (product === 'vape') return 'Хочу затянуться';
  return 'Хочу покурить кальян';
}

function triggerIcon(item: Pick<Trigger, 'code' | 'title'>): IconName {
  const s = `${item.code} ${item.title}`.toLowerCase();
  if (s.includes('коф')) return 'coffee';
  if (s.includes('ед')) return 'meal';
  if (s.includes('телефон') || s.includes('скрол')) return 'phone';
  if (s.includes('работ') || s.includes('дел')) return 'work';
  if (s.includes('трев') || s.includes('напряж') || s.includes('мысл') || s.includes('злост')) return 'stress';
  if (s.includes('сон') || s.includes('утр') || s.includes('вечер')) return 'sleep';
  if (s.includes('рул') || s.includes('маш') || s.includes('дорог')) return 'car';
  if (s.includes('общ') || s.includes('компан')) return 'people';
  if (s.includes('скук')) return 'pause';
  return 'spark';
}

function replacementIcon(item: Replacement): IconName {
  const mechanism = replacementMechanism(item);
  if (mechanism === 'breathing') return 'breath';
  if (mechanism === 'movement') return 'walk';
  if (mechanism === 'attention') return 'eye';
  if (mechanism === 'grounding') return 'calm';
  if (mechanism === 'food' || mechanism === 'oral') return 'leaf';
  if (mechanism === 'drink' || mechanism === 'ritual') return 'tea';
  if (mechanism === 'meaning') return 'meaning';
  if (mechanism === 'social') return 'people';
  if (mechanism === 'reflection') return 'journal';
  if (mechanism === 'evidence_treatment') return 'shield';
  if (mechanism === 'focus') return 'focus';
  if (mechanism === 'manual') return 'hands';
  if (mechanism === 'pause') return 'pause';
  if (mechanism === 'reward') return 'heart';
  return 'spark';
}

function mechanismLabel(item: Replacement) {
  const labels: Record<string, string> = {
    breathing: 'Дыхание', movement: 'Движение', attention: 'Внимание', grounding: 'Опора',
    food: 'Еда', oral: 'Оральная замена', drink: 'Напиток', ritual: 'Ритуал', meaning: 'Смысл',
    social: 'Контакт', reflection: 'Наблюдение', evidence_treatment: 'Доказательная поддержка',
    focus: 'Фокус', manual: 'Занять руки', pause: 'Пауза', reward: 'Награда', context_change: 'Смена контекста', sensory: 'Ощущения',
  };
  return labels[replacementMechanism(item)] ?? 'Другой ответ';
}

function Button({ children, onClick, className = '', disabled = false }: { children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return <button type="button" className={`r-button ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return <div className="r-modal-backdrop" onMouseDown={(e) => e.currentTarget === e.target && onClose()}><section className={`r-modal ${wide ? 'r-modal-wide' : ''}`}>{children}</section></div>;
}

const NAV = [
  ['/', 'Сегодня', 'spark'],
  ['/links', 'Связки', 'chain'],
  ['/path', 'Путь', 'path'],
  ['/meanings', 'Смыслы', 'meaning'],
  ['/together', 'Вместе', 'people'],
  ['/facts', 'Факты', 'shield'],
] as const;

function Header({ data, path }: { data: Bootstrap; path: string }) {
  return <>
    <header className="r-header v31-header">
      <button className="r-brand v31-brand" onClick={() => go('/')} aria-label="ALIVE — на главную"><img src={logoUrl} alt="ALIVE" /></button>
      <nav className="r-desktop-nav v31-desktop-nav">{NAV.map(([href, label, icon]) => <button key={href} className={path === href ? 'active' : ''} onClick={() => go(href)}><Icon name={icon} size={18}/><span>{label}</span></button>)}</nav>
      <div className="r-header-tools"><button className="r-method-link" onClick={() => go('/experiment')}>О методе</button><button className="r-avatar" onClick={() => go('/profile')} title="Профиль">{data.profile.avatar_url ? <img src={data.profile.avatar_url} alt="" referrerPolicy="no-referrer"/> : <Icon name="user" size={20}/>}</button></div>
    </header>
    <nav className="r-mobile-nav v31-mobile-nav">{NAV.map(([href, label, icon]) => <button key={href} className={path === href ? 'active' : ''} onClick={() => go(href)}><Icon name={icon} size={20}/><span>{label}</span></button>)}</nav>
  </>;
}

function LegacyAugment({ primaryProduct }: { primaryProduct: ProductType }) {
  useEffect(() => {
    const stripPeriods = () => {
      document.querySelectorAll('h1,h2,h3').forEach((node) => {
        const text = node.textContent?.trim();
        if (text?.endsWith('.')) node.textContent = text.slice(0, -1);
      });
      document.querySelectorAll('strong').forEach((node) => {
        if (node.textContent?.trim() === 'Меня тянет') node.textContent = productCta(primaryProduct);
      });
    };
    const addExtraNav = (selector: string, mobile: boolean) => {
      const nav = document.querySelector(selector);
      if (!nav) return;
      const extras: Array<[string, string]> = [['/together', 'Вместе'], ['/facts', 'Факты']];
      for (const [href, label] of extras) {
        if (nav.querySelector(`[data-v31-href="${href}"]`)) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.v31Href = href;
        button.className = window.location.pathname === href ? 'active v31-injected-nav' : 'v31-injected-nav';
        button.innerHTML = mobile ? `<span class="v31-nav-dot">${label === 'Вместе' ? '●' : '◆'}</span><span>${label}</span>` : `<span>${label}</span>`;
        button.onclick = () => go(href);
        nav.appendChild(button);
      }
    };
    const sync = () => { stripPeriods(); addExtraNav('.r-desktop-nav', false); addExtraNav('.r-mobile-nav', true); };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [primaryProduct]);
  return null;
}

function Setup({ session, data, done, cancel }: { session: Session; data: Bootstrap; done: () => Promise<void>; cancel?: () => void }) {
  const existing = useMemo(() => new Map(data.products.map((p) => [p.product_type, p])), [data]);
  const [chosen, setChosen] = useState<Record<ProductType, boolean>>({ cigarette: existing.has('cigarette') || !data.products.length, hookah: existing.has('hookah'), vape: existing.has('vape') });
  const [goal, setGoal] = useState(data.settings.goal_text ?? '');
  const [cigs, setCigs] = useState(String(existing.get('cigarette')?.baseline?.cigarettes_per_day ?? ''));
  const [startYear, setStartYear] = useState(String(existing.get('cigarette')?.baseline?.start_year ?? ''));
  const [pack, setPack] = useState(String(existing.get('cigarette')?.defaults?.pack_price_rub ?? ''));
  const [hookahs, setHookahs] = useState(String(existing.get('hookah')?.baseline?.sessions_per_week ?? ''));
  const [hookahPrice, setHookahPrice] = useState(String(existing.get('hookah')?.defaults?.hookah_default_price_rub ?? 2500));
  const [puffs, setPuffs] = useState(String(existing.get('vape')?.baseline?.puffs_per_day ?? ''));
  const [vapePrice, setVapePrice] = useState(String(existing.get('vape')?.defaults?.consumable_price_rub ?? 1500));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    const products: OnboardingDraft['products'] = [];
    const year = Number(startYear || 0);
    const validYear = year >= 1900 && year <= new Date().getFullYear() ? year : undefined;
    if (chosen.cigarette) products.push({ productType: 'cigarette', role: 'target_dependency', baseline: { cigarettes_per_day: Number(cigs || 0), ...(validYear ? { start_year: validYear } : {}) }, defaults: { pack_price_rub: Number(pack || 0), pack_size: 20 } });
    if (chosen.hookah) products.push({ productType: 'hookah', role: 'target_dependency', baseline: { sessions_per_week: Number(hookahs || 0) }, defaults: { hookah_default_price_rub: Number(hookahPrice || 2500) } });
    if (chosen.vape) products.push({ productType: 'vape', role: 'target_dependency', baseline: { puffs_per_day: Number(puffs || 0) }, defaults: { claimed_puffs: 5000, consumable_price_rub: Number(vapePrice || 1500), device_type: 'disposable' } });
    if (!products.length) { setError('Выбери хотя бы один никотиновый продукт'); return; }
    setBusy(true); setError('');
    try { await saveOnboarding(session, { goalText: goal, products }); await done(); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить настройки'); } finally { setBusy(false); }
  }
  return <main className="r-setup-page"><section className="r-setup v31-setup"><div className="r-setup-head"><div><p className="r-kicker">Настройка личной карты</p><h1>С чего ты начинаешь</h1><p>Исходный уровень нужен только для сравнения тебя с самим собой</p></div>{cancel && <button className="r-icon-button" onClick={cancel}><Icon name="close"/></button>}</div><label className="r-field"><span>Что ты хочешь вернуть себе</span><textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Например: больше энергии, свободное утро, спокойствие без сигареты"/></label><div className="r-product-grid">{(['cigarette','hookah','vape'] as ProductType[]).map((p) => <button key={p} className={`r-product-choice ${chosen[p] ? 'selected' : ''}`} onClick={() => setChosen((v) => ({ ...v, [p]: !v[p] }))}><span className="r-product-icon"><Icon name={productIcon(p)} size={25}/></span><strong>{productLabel(p)}</strong><small>{chosen[p] ? 'учитываем' : 'не учитывать'}</small></button>)}</div>{chosen.cigarette && <><div className="r-inline-fields"><label className="r-field"><span>Сигарет в день сейчас</span><input type="number" min="0" value={cigs} onChange={(e) => setCigs(e.target.value)}/></label><label className="r-field"><span>Цена пачки, ₽</span><input type="number" min="0" value={pack} onChange={(e) => setPack(e.target.value)}/></label></div><label className="r-field"><span>Когда начал регулярно курить · необязательно</span><input type="number" min="1900" max={new Date().getFullYear()} value={startYear} onChange={(e) => setStartYear(e.target.value)} placeholder="Например, 2001"/><small>Нужен только приблизительный год. Он помогает выбирать более релевантные исследования, но не используется для личного диагноза</small></label></>}{chosen.hookah && <div className="r-inline-fields"><label className="r-field"><span>Кальянов в неделю</span><input type="number" min="0" value={hookahs} onChange={(e) => setHookahs(e.target.value)}/></label><label className="r-field"><span>Обычная стоимость, ₽</span><input type="number" min="0" value={hookahPrice} onChange={(e) => setHookahPrice(e.target.value)}/></label></div>}{chosen.vape && <div className="r-inline-fields"><label className="r-field"><span>Затяжек в день примерно</span><input type="number" min="0" value={puffs} onChange={(e) => setPuffs(e.target.value)}/></label><label className="r-field"><span>Стоимость устройства / расходника, ₽</span><input type="number" min="0" value={vapePrice} onChange={(e) => setVapePrice(e.target.value)}/></label></div>}<div className="r-note"><Icon name="shield"/><p>Стаж и исходный уровень — ориентиры для статистики и подбора фактов. ALIVE не рассчитывает персональный медицинский риск</p></div>{error && <p className="r-error">{error}</p>}<div className="r-actions"><Button className="primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить и начать'} <Icon name="arrow" size={18}/></Button>{cancel && <Button className="ghost" onClick={cancel}>Отмена</Button>}</div></section></main>;
}

const STEP_LABELS = ['Продукт', 'Ситуация', 'Сила тяги', 'Что нужно', 'Замена', 'Результат'] as const;

function Guided({ session, data, knowledge, initialTrigger, close, saved }: { session: Session; data: Bootstrap; knowledge: Knowledge; initialTrigger?: string; close: () => void; saved: () => Promise<void> }) {
  const initialProduct = data.products.find((p) => p.role === 'target_dependency')?.product_type ?? data.products[0]?.product_type ?? 'cigarette';
  const [product, setProduct] = useState<ProductType>(initialProduct);
  const [step, setStep] = useState(initialTrigger ? 2 : 1);
  const [maxReached, setMaxReached] = useState(initialTrigger ? 2 : 1);
  const [triggerCode, setTriggerCode] = useState(initialTrigger ?? '');
  const [before, setBefore] = useState(7);
  const [needCode, setNeedCode] = useState('');
  const [replacementCode, setReplacementCode] = useState<string | null>(null);
  const [after, setAfter] = useState(4);
  const [help, setHelp] = useState(3);
  const [outcome, setOutcome] = useState<'successful_response' | 'nicotine_used' | 'abandoned'>('successful_response');
  const [qty, setQty] = useState(1);
  const [puffs, setPuffs] = useState(10);
  const [busy, setBusy] = useState(false);
  const shownMythRef = useRef<string | null>(null);
  const triggers = data.triggers.filter((t) => t.product_types.includes(product));
  const candidates = useMemo(() => triggerCode && needCode ? pickDiverseReplacements(data, product, triggerCode, needCode, before) : [], [data, product, triggerCode, needCode, before]);
  const selected = data.replacements.find((r) => r.code === replacementCode) ?? null;
  const myth = useMemo(() => triggerCode && needCode ? contextualMyth(knowledge, product, triggerCode, needCode) : null, [knowledge, product, triggerCode, needCode]);
  const progress = Math.round(((step + 1) / STEP_LABELS.length) * 100);

  useEffect(() => {
    if (step !== 4 || !myth || shownMythRef.current === myth.code) return;
    shownMythRef.current = myth.code;
    const state = knowledge.mythState.find((s) => s.myth_code === myth.code);
    markMythShown(session, state, myth.code).catch(() => {});
  }, [step, myth, knowledge.mythState, session]);

  function advance(next: number) { setStep(next); setMaxReached((m) => Math.max(m, next)); }
  function chooseProduct(value: ProductType) {
    if (value !== product) { setProduct(value); setTriggerCode(''); setNeedCode(''); setReplacementCode(null); setMaxReached(1); advance(1); }
    else advance(1);
  }
  function chooseTrigger(value: string) {
    if (value !== triggerCode) { setTriggerCode(value); setNeedCode(''); setReplacementCode(null); }
    advance(2);
  }
  function chooseStrength(value: number) {
    if (value !== before) setReplacementCode(null);
    setBefore(value); advance(3);
  }
  function chooseNeed(value: string) {
    if (value !== needCode) setReplacementCode(null);
    setNeedCode(value); advance(4);
  }
  function chooseReplacement(value: string | null) { setReplacementCode(value); advance(5); }

  async function save() {
    if (!triggerCode || !needCode) return;
    setBusy(true);
    const tobacco: GuidedEpisodeDraft['tobacco'] = outcome === 'nicotine_used' ? { cigaretteQuantity: product === 'cigarette' ? qty : undefined, hookahSessionCount: product === 'hookah' ? 1 : undefined, vapePuffs: product === 'vape' ? puffs : undefined } : undefined;
    try { await saveGuidedEpisode(session, { product, triggerCode, needCode, cravingBefore: before, cravingAfter: after, helpfulness: help, replacementCode, outcome, tobacco }); await saved(); close(); } finally { setBusy(false); }
  }

  const lapseAdvice = triggerCode === 'driving'
    ? 'Если всё-таки решил курить — сначала безопасно остановись, выйди из автомобиля и только потом принимай решение. Не кури за рулём и не закрепляй салон как часть ритуала'
    : 'Если всё-таки решил курить — по возможности смени привычное место, убери телефон и просто заметь запах, вкус и реальный эффект. Не нужно глубже затягиваться, курить дольше или докуривать специально';

  return <Modal wide onClose={close}><div className="r-modal-head"><div><p className="r-kicker">Один живой момент</p><h2>{step < 4 ? 'Разберём, что происходит' : step === 4 ? 'Выбери другой ответ' : 'Что получилось'}</h2></div><button className="r-icon-button" onClick={close}><Icon name="close"/></button></div><div className="v31-progress-wrap"><div className="v31-progress-copy"><strong>Шаг {step + 1} из {STEP_LABELS.length}</strong><span>{STEP_LABELS.length - step - 1 > 0 ? `Осталось ${STEP_LABELS.length - step - 1} ${STEP_LABELS.length - step - 1 === 1 ? 'шаг' : 'шага'}` : 'Последний шаг'}</span></div><div className="v31-progress-track"><i style={{ width: `${progress}%` }}/></div><div className="v31-stepper">{STEP_LABELS.map((label, index) => <button key={label} disabled={index > maxReached} className={index === step ? 'active' : index < step || index <= maxReached ? 'available' : ''} onClick={() => index <= maxReached && setStep(index)}><span>{index + 1}</span><small>{label}</small></button>)}</div></div>
    {step === 0 && <div className="r-choice-grid">{data.products.map((p) => <button key={p.product_type} className={product === p.product_type ? 'selected' : ''} onClick={() => chooseProduct(p.product_type)}><span className="r-choice-icon"><Icon name={productIcon(p.product_type)} size={25}/></span><strong>{productLabel(p.product_type)}</strong><p>{productCta(p.product_type)}</p></button>)}</div>}
    {step === 1 && <div className="r-choice-grid">{triggers.map((t) => <button key={t.code} className={triggerCode === t.code ? 'selected' : ''} onClick={() => chooseTrigger(t.code)}><span className="r-choice-icon"><Icon name={triggerIcon(t)} size={24}/></span><strong>{t.title}</strong><p>{t.description}</p></button>)}</div>}
    {step === 2 && <div className="v31-strength"><p>Насколько сильна тяга прямо сейчас</p><div className="v31-scale">{[1,2,3,4,5,6,7,8,9,10].map((n) => <button key={n} className={before === n ? 'selected' : ''} onClick={() => chooseStrength(n)}>{n}</button>)}</div><small>1 — почти фоном · 10 — очень трудно переключиться</small></div>}
    {step === 3 && <div className="r-choice-grid">{data.needs.map((n) => <button key={n.code} className={needCode === n.code ? 'selected' : ''} onClick={() => chooseNeed(n.code)}><span className="r-choice-icon"><Icon name={n.code === 'connection' ? 'people' : n.code === 'stimulation' ? 'energy' : n.code === 'oral_sensory' ? 'hands' : n.code === 'meaning' ? 'meaning' : n.code === 'closure' ? 'finish' : n.code === 'pause' ? 'pause' : 'heart'} size={24}/></span><strong>{n.title}</strong><p>{n.description}</p></button>)}</div>}
    {step === 4 && <>{myth && <aside className="v31-context-myth"><span>Мягкое напоминание</span><strong>{myth.title}</strong><p>{myth.short_reframe}</p><button onClick={() => go('/facts?tab=myths')}>Почему так <Icon name="arrow" size={14}/></button></aside>}<p className="v31-three-note">Три варианта специально различаются по механизму — выбери тот, который сейчас реально выполним</p><div className="r-replacement-grid">{candidates.map((r) => <button key={r.code} className={replacementCode === r.code ? 'selected' : ''} onClick={() => chooseReplacement(r.code)}><span className="r-replacement-icon"><Icon name={replacementIcon(r)} size={24}/></span><div><small>{mechanismLabel(r)} · {r.duration || 'коротко'}</small><strong>{r.title}</strong><p>{r.instruction}</p>{r.safety && <em>{r.safety}</em>}</div></button>)}</div><button className="v31-skip-replacement" onClick={() => chooseReplacement(null)}>Сейчас не хочу выбирать Замeну</button></>}
    {step === 5 && <div className="v31-outcome"><div className="r-outcome-grid"><button className={outcome === 'successful_response' ? 'selected success' : ''} onClick={() => setOutcome('successful_response')}><Icon name="check"/><strong>Удалось ответить иначе</strong><span>Никотин не понадобился</span></button><button className={outcome === 'nicotine_used' ? 'selected used' : ''} onClick={() => setOutcome('nicotine_used')}><Icon name={productIcon(product)}/><strong>Никотин всё-таки был</strong><span>Это данные, не обнуление</span></button><button className={outcome === 'abandoned' ? 'selected' : ''} onClick={() => setOutcome('abandoned')}><Icon name="pause"/><strong>Остановился на полпути</strong><span>Можно просто закрыть эпизод</span></button></div>{selected && <div className="v31-selected-recap"><Icon name={replacementIcon(selected)}/><span><small>Попробовал</small><strong>{selected.title}</strong></span></div>}<label className="r-field"><span>Тяга сейчас · {after}/10</span><input type="range" min="1" max="10" value={after} onChange={(e) => setAfter(Number(e.target.value))}/></label><label className="r-field"><span>Насколько выбранный ответ помог · {help}/5</span><input type="range" min="1" max="5" value={help} onChange={(e) => setHelp(Number(e.target.value))}/></label>{outcome === 'nicotine_used' && <><div className="v31-lapse-note"><Icon name={triggerCode === 'driving' ? 'car' : 'eye'}/><p>{lapseAdvice}</p></div>{product === 'cigarette' && <label className="r-field"><span>Сколько сигарет</span><input type="number" min="0.1" step="0.1" value={qty} onChange={(e) => setQty(Number(e.target.value))}/></label>}{product === 'vape' && <label className="r-field"><span>Примерно затяжек</span><input type="number" min="1" value={puffs} onChange={(e) => setPuffs(Number(e.target.value))}/></label>}</>}<div className="r-actions"><Button className="primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить эпизод'}</Button></div></div>}
  </Modal>;
}

function QuickUse({ session, data, close, saved }: { session: Session; data: Bootstrap; close: () => void; saved: () => Promise<void> }) {
  const [product, setProduct] = useState<ProductType>(data.products[0]?.product_type ?? 'cigarette');
  const [trigger, setTrigger] = useState(''); const [qty, setQty] = useState(1); const [puffs, setPuffs] = useState(10); const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); try { await saveQuickUse(session, { product, triggerCode: trigger || undefined, cigaretteQuantity: product === 'cigarette' ? qty : undefined, hookahSessionCount: product === 'hookah' ? 1 : undefined, vapePuffs: product === 'vape' ? puffs : undefined }); await saved(); close(); } finally { setBusy(false); } }
  return <Modal onClose={close}><div className="r-modal-head"><div><p className="r-kicker">Просто факт</p><h2>Никотин уже был</h2><p>Без оценки и без «дня ноль»</p></div><button className="r-icon-button" onClick={close}><Icon name="close"/></button></div><div className="r-product-switch">{data.products.map((p) => <button key={p.product_type} className={product === p.product_type ? 'selected' : ''} onClick={() => setProduct(p.product_type)}><Icon name={productIcon(p.product_type)} size={20}/>{productLabel(p.product_type)}</button>)}</div><label className="r-field"><span>Что было перед этим · необязательно</span><select value={trigger} onChange={(e) => setTrigger(e.target.value)}><option value="">Не указывать</option>{data.triggers.filter((t) => t.product_types.includes(product)).map((t) => <option key={t.code} value={t.code}>{t.title}</option>)}</select></label>{product === 'cigarette' && <label className="r-field"><span>Количество сигарет</span><input type="number" min="0.1" step="0.1" value={qty} onChange={(e) => setQty(Number(e.target.value))}/></label>}{product === 'vape' && <label className="r-field"><span>Примерно затяжек</span><input type="number" min="1" value={puffs} onChange={(e) => setPuffs(Number(e.target.value))}/></label>}<div className="v31-lapse-note"><Icon name={trigger === 'driving' ? 'car' : 'chain'}/><p>{trigger === 'driving' ? 'Если это происходит в машине — сначала безопасно остановись и выйди. Не кури за рулём' : 'Если эпизод уже случился, попробуй хотя бы не повторять привычную обстановку автоматически: смени место и убери телефон'}</p></div><div className="r-actions"><Button className="primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Записать факт'}</Button><Button className="ghost" onClick={close}>Отмена</Button></div></Modal>;
}

function Evening({ session, data, close, saved }: { session: Session; data: Bootstrap; close: () => void; saved: () => Promise<void> }) {
  const current = data.todayCheckin; const [irritability, setIrritability] = useState(current?.irritability ?? 3); const [energy, setEnergy] = useState(current?.energy ?? 3); const [recovery, setRecovery] = useState(current?.recovery ?? 3); const [owned, setOwned] = useState(current?.owned_moment ?? ''); const [plan, setPlan] = useState(current?.tomorrow_plan ?? ''); const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); try { await saveCheckin(session, { checkin_date: localDay(), irritability, energy, recovery, owned_moment: owned || null, strongest_link: current?.strongest_link ?? null, tomorrow_plan: plan || null }); await saved(); close(); } finally { setBusy(false); } }
  return <Modal onClose={close}><div className="r-modal-head"><div><p className="r-kicker">Итоги дня</p><h2>Три минуты без оценки</h2></div><button className="r-icon-button" onClick={close}><Icon name="close"/></button></div>{[['Раздражение', irritability, setIrritability], ['Энергия', energy, setEnergy], ['Восстановление', recovery, setRecovery]].map(([label, value, setter]) => <label className="r-field" key={String(label)}><span>{String(label)} · {Number(value)}/5</span><input type="range" min="1" max="5" value={Number(value)} onChange={(e) => (setter as (v:number)=>void)(Number(e.target.value))}/></label>)}<label className="r-field"><span>Где сегодня выбор остался твоим</span><textarea value={owned} onChange={(e) => setOwned(e.target.value)}/></label><label className="r-field"><span>Что попробовать завтра</span><textarea value={plan} onChange={(e) => setPlan(e.target.value)}/></label><div className="r-actions"><Button className="primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить'}</Button></div></Modal>;
}

function Today({ session, data, knowledge, reload }: { session: Session; data: Bootstrap; knowledge: Knowledge; reload: () => Promise<void> }) {
  const [flow, setFlow] = useState<{ open: boolean; trigger?: string }>({ open: false }); const [quick, setQuick] = useState(false); const [evening, setEvening] = useState(false);
  const primary = data.products.find((p) => p.role === 'target_dependency')?.product_type ?? data.products[0]?.product_type ?? 'cigarette';
  const week = statsForDays(data, 7); const fact = factForMoment(knowledge, primary); const todayEpisodes = data.episodes.filter((e) => e.started_at.slice(0, 10) === localDay()); const successes = todayEpisodes.filter((e) => e.outcome === 'successful_response').length;
  const attention = data.triggers.slice(0, 4);
  return <><main className="r-page"><section className="r-now v31-now"><div className="r-now-copy"><p className="r-kicker">Сегодня · {data.profile.display_name}</p><h1>{successes > 0 ? 'Сегодня выбор уже оставался твоим' : 'Нужен только следующий реальный момент'}</h1><p>{data.settings.goal_text || 'Не нужно победить день целиком. Достаточно заметить следующий автоматизм чуть раньше'}</p></div><div className="r-now-actions"><button className="r-craving v31-craving" onClick={() => setFlow({ open: true })}><span className="r-craving-icon"><Icon name="spark" size={30}/></span><span><small>Когда тяга уже здесь</small><strong>{productCta(primary)}</strong><em>Разобрать ситуацию и выбрать другой ответ</em></span><Icon name="arrow" size={24}/></button><div className="r-secondary-actions"><button onClick={() => setQuick(true)}><Icon name="smoke"/><span><strong>Никотин уже был</strong><small>Записать без оценки</small></span></button><button onClick={() => setEvening(true)}><Icon name="journal"/><span><strong>Итоги дня</strong><small>{data.todayCheckin ? 'Можно дополнить' : 'Короткий чек-ин'}</small></span></button></div></div></section><section className="r-pulse"><div className="r-pulse-main"><span className="r-pulse-icon"><Icon name="check" size={26}/></span><div><small>Осознанных ответов сегодня</small><strong>{successes}</strong><p>{successes ? 'Это не серия запретов — это повторения нового сценария' : 'Первая запись появится после настоящего эпизода'}</p></div></div><div className="r-pulse-stat"><small>7 дней к исходному уровню</small><strong>{week.baselineDeltaPct === null ? '—' : `${week.baselineDeltaPct > 0 ? '+' : ''}${fmt(week.baselineDeltaPct)}%`}</strong><span>Сравнение только с самим собой</span></div><div className="r-pulse-stat"><small>Замены в каталоге</small><strong>{data.replacements.length}</strong><span>ALIVE будет учиться, какие работают именно у тебя</span></div></section>{fact && <section className="v31-soft-fact"><span>{fact.benefit ? 'Что меняется после отказа' : 'Факт без запугивания'}</span><div><h2>{fact.title}</h2><p>{fact.short_text}</p></div><button onClick={() => go('/facts')}>Ещё факты <Icon name="arrow" size={16}/></button></section>}<section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Быстрый вход</p><h2>Где это происходит</h2><p>Нажми на ситуацию — первые шаги уже будут заполнены</p></div></div><div className="r-attention-grid">{attention.map((t) => <button key={t.code} onClick={() => setFlow({ open: true, trigger: t.code })}><span className="r-choice-icon"><Icon name={triggerIcon(t)} size={24}/></span><div><strong>{t.title}</strong><p>{t.description}</p></div><Icon name="arrow" size={18}/></button>)}</div></section></main>{flow.open && <Guided session={session} data={data} knowledge={knowledge} initialTrigger={flow.trigger} close={() => setFlow({ open: false })} saved={reload}/>} {quick && <QuickUse session={session} data={data} close={() => setQuick(false)} saved={reload}/>} {evening && <Evening session={session} data={data} close={() => setEvening(false)} saved={reload}/>}</>;
}

const FACT_CATEGORIES: Record<string, string> = { heart: 'Сердце и сосуды', mortality: 'Долгая жизнь', mental_health: 'Психика и настроение', treatment: 'Поддержка', product: 'Продукты', others: 'Окружающие', oral_health: 'Зубы и полость рта', behavior: 'Как работает зависимость', weight: 'Вес' };

function EvidenceBadge({ level }: { level: 'A'|'B'|'C' }) { return <span className={`v31-evidence ${level.toLowerCase()}`}>{level === 'A' ? 'Хорошо изучено' : level === 'B' ? 'Есть данные' : 'Гипотеза ALIVE'}</span>; }

function FactsPage({ session, knowledge, reloadKnowledge }: { session: Session; knowledge: Knowledge; reloadKnowledge: () => Promise<void> }) {
  const queryTab = new URLSearchParams(window.location.search).get('tab'); const [tab, setTab] = useState<'facts'|'myths'>(queryTab === 'myths' ? 'myths' : 'facts'); const [category, setCategory] = useState('all');
  const categories = Array.from(new Set(knowledge.facts.map((f) => f.category)));
  async function mark(myth: Myth, relevance: MythState['relevance']) { await setMythRelevance(session, myth.code, relevance); await reloadKnowledge(); }
  return <main className="r-page"><section className="r-title"><p className="r-kicker">Факты и Мифы</p><h1>Память о том, почему это вообще стоит менять</h1><p>Без страшилок и без личных диагнозов. Факты напоминают о рисках и пользе отказа, Мифы разбирают обещания, которые делают сигарету привлекательной</p><div className="v31-knowledge-tabs"><button className={tab === 'facts' ? 'active' : ''} onClick={() => setTab('facts')}>Факты</button><button className={tab === 'myths' ? 'active' : ''} onClick={() => setTab('myths')}>Мифы</button></div></section>{tab === 'facts' ? <><div className="v31-filter-row"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Все</button>{categories.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{FACT_CATEGORIES[c] ?? c}</button>)}</div><section className="v31-fact-grid">{knowledge.facts.filter((f) => category === 'all' || f.category === category).map((fact) => <FactCard key={fact.code} fact={fact}/>)}</section></> : <section className="v31-myth-grid">{knowledge.myths.map((myth) => { const state = knowledge.mythState.find((s) => s.myth_code === myth.code); return <article key={myth.code} className="v31-myth-card"><div className="v31-card-meta"><EvidenceBadge level={myth.evidence_level}/><span>Миф</span></div><h2>{myth.title}</h2><p className="v31-reframe">{myth.short_reframe}</p><details><summary>Почему так кажется</summary><p>{myth.explanation}</p><a href={myth.source_url} target="_blank" rel="noreferrer">Источник · {myth.source_title}</a></details><div className="v31-belief-actions"><span>Это про тебя?</span><button className={state?.relevance === 'relevant' ? 'selected' : ''} onClick={() => mark(myth, 'relevant')}>Похоже на меня</button><button className={state?.relevance === 'not_relevant' ? 'selected' : ''} onClick={() => mark(myth, 'not_relevant')}>Не про меня</button></div></article>; })}</section>}</main>;
}

function FactCard({ fact }: { fact: Fact }) {
  return <article className={`v31-fact-card ${fact.benefit ? 'benefit' : ''}`}><div className="v31-card-meta"><EvidenceBadge level={fact.evidence_level}/><span>{FACT_CATEGORIES[fact.category] ?? fact.category}</span></div><h2>{fact.title}</h2><p>{fact.short_text}</p><details><summary>Подробнее</summary><p>{fact.full_text}</p>{fact.sample_size && <small>Участников в исследовании: {new Intl.NumberFormat('ru-RU').format(fact.sample_size)}</small>}<a href={fact.source_url} target="_blank" rel="noreferrer">Источник · {fact.source_title}</a></details></article>;
}

const MECHANISM_LABELS: Record<string,string> = { food:'Еда',attention:'Внимание',movement:'Движение',reflection:'Запись и наблюдение',ritual:'Ритуал',social:'Контакт',drink:'Напиток',grounding:'Опора',meaning:'Смыслы',pause:'Пауза',reward:'Награда',sensory:'Ощущения',breathing:'Дыхание',context_change:'Смена контекста',evidence_treatment:'Доказательная поддержка',oral:'Оральная замена',focus:'Фокус',manual:'Занять руки' };

function TogetherPage({ data }: { data: Bootstrap }) {
  const [summary, setSummary] = useState<TogetherSummary | null>(null); const [error, setError] = useState(''); const own = statsForDays(data, 7);
  useEffect(() => { loadTogether(7).then(setSummary).catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить общие результаты')); }, []);
  return <main className="r-page"><section className="r-title together"><p className="r-kicker">Вместе</p><h1>Один эксперимент — разные личные пути</h1><p>Здесь нет рейтинга людей. Ты сравниваешь себя с собственным исходным уровнем, а общие цифры показывают, что другие тоже замечают автоматизмы, пробуют и продолжают после эпизодов курения</p></section><section className="v31-together-you"><div><span>Ты · последние 7 дней</span><strong>{own.baselineDeltaPct === null ? 'Пока мало данных' : `${own.baselineDeltaPct > 0 ? '+' : ''}${fmt(own.baselineDeltaPct)}% к исходному уровню`}</strong><p>{own.successfulResponses} осознанных ответов · {own.activeDays} активных дней</p></div><Icon name="user" size={30}/></section>{error && <p className="r-error">{error}</p>}{!summary ? <section className="r-section"><div className="r-empty compact"><Icon name="people"/><p>Собираю обезличенный общий пульс эксперимента</p></div></section> : <><section className="v31-group-pulse"><article><small>Участников</small><strong>{summary.participants_total}</strong><span>с завершённой настройкой</span></article><article><small>Активны сегодня</small><strong>{summary.active_today}</strong><span>без имён и деталей</span></article><article><small>Эпизодов за 7 дней</small><strong>{summary.episodes_period}</strong><span>замеченных моментов</span></article><article><small>Выбрано Замeн</small><strong>{summary.replacement_attempts}</strong><span>попыток ответить иначе</span></article></section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Относительно себя</p><h2>Как меняется употребление у группы</h2><p>Мы сравниваем каждого только с его собственным обычным уровнем</p></div></div>{summary.baseline.suppressed ? <div className="v31-privacy-empty"><Icon name="shield"/><div><strong>Пока недостаточно данных для группового сравнения</strong><p>Детальные агрегаты появляются только когда в выборке есть минимум {summary.privacy_threshold} участника. Это снижает риск узнавания конкретного человека</p></div></div> : <div className="v31-baseline-group"><div><strong>{summary.baseline.below}</strong><span>ниже своего уровня</span></div><div><strong>{summary.baseline.near}</strong><span>примерно на своём уровне</span></div><div><strong>{summary.baseline.above}</strong><span>выше своего уровня</span></div><div><strong>{summary.baseline.median_delta_pct === null ? '—' : `${summary.baseline.median_delta_pct > 0 ? '+' : ''}${fmt(summary.baseline.median_delta_pct)}%`}</strong><span>медианное изменение</span></div></div>}</section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Что пробуют</p><h2>Механизмы, которые встречаются в группе</h2><p>Показываем только категории и только когда ими пользовались минимум три участника</p></div></div>{summary.mechanisms.length ? <div className="v31-mechanism-list">{summary.mechanisms.map((m) => <div key={m.mechanism}><span><strong>{MECHANISM_LABELS[m.mechanism] ?? m.mechanism}</strong><small>{m.users} участников · {m.uses} использований</small></span><b>{m.avg_helpfulness === null ? '—' : `${fmt(m.avg_helpfulness,1)}/5`}</b></div>)}</div> : <div className="v31-privacy-empty"><Icon name="people"/><div><strong>Групповых закономерностей пока мало</strong><p>ALIVE не показывает статистику одного-двух людей под видом «общего результата»</p></div></div>}</section><section className="v31-together-principle"><Icon name="shield"/><div><strong>Что никогда не попадает сюда</strong><p>Личные Смыслы, тексты Связок, заметки, имена, конкретные лекарства, триггеры отдельного человека и время его эпизодов</p></div></section></>}</main>;
}

function ProfilePage({ session, data, editSetup }: { session: Session; data: Bootstrap; editSetup: () => void }) {
  const exposure = smokingExposure(data);
  async function logout() { await getSupabase()?.auth.signOut(); go('/'); }
  return <main className="r-page"><section className="r-title"><p className="r-kicker">Профиль</p><h1>{data.profile.display_name}</h1><p>Настройки личного эксперимента остаются приватными</p></section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Исходный уровень</p><h2>С чем сравнивается динамика</h2></div><Button className="ghost small" onClick={editSetup}>Изменить</Button></div><div className="r-raw">{data.products.map((p) => <div key={p.product_type}><Icon name={productIcon(p.product_type)}/><small>{productLabel(p.product_type)}</small><strong>{p.product_type === 'cigarette' ? `${Number(p.baseline.cigarettes_per_day ?? 0)} / день` : p.product_type === 'hookah' ? `${Number(p.baseline.sessions_per_week ?? 0)} / нед.` : `${Number(p.baseline.puffs_per_day ?? 0)} затяжек / день`}</strong></div>)}</div>{exposure.startYear && <div className="v31-exposure"><span><small>Регулярно куришь примерно с</small><strong>{exposure.startYear}</strong></span><span><small>Ориентировочный стаж</small><strong>{exposure.years} лет</strong></span><span><small>Pack-years · только справочно</small><strong>{exposure.packYears === null ? '—' : fmt(exposure.packYears,1)}</strong></span><p>Pack-years используется только для сопоставления с условиями исследований и не является прогнозом твоего здоровья</p></div>}</section><section className="r-section"><div className="r-profile-links"><button onClick={() => go('/experiment')}><Icon name="shield"/><span><strong>Как работает эксперимент</strong><small>Методология и ограничения</small></span><Icon name="arrow"/></button><button onClick={() => go('/releases')}><Icon name="path"/><span><strong>История версий</strong><small>Что меняется в ALIVE</small></span><Icon name="arrow"/></button></div><Button className="danger" onClick={logout}>Выйти из аккаунта</Button></section></main>;
}

export default function V31App() {
  const path = usePath(); const [session, setSession] = useState<Session | null>(null); const [data, setData] = useState<Bootstrap | null>(null); const [knowledge, setKnowledge] = useState<Knowledge>({ facts: [], myths: [], mythState: [] }); const [loading, setLoading] = useState(true); const [setup, setSetup] = useState(false);
  const configured = Boolean(publicEnv.supabaseUrl && publicEnv.supabasePublishableKey);
  async function reload(s: Session = session as Session) { const next = await loadBootstrap(s); setData(next); return next; }
  async function reloadKnowledge(s: Session = session as Session) { const next = await loadKnowledge(s); setKnowledge(next); }
  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    const supabase = getSupabase(); if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session: current } }) => { setSession(current); if (current) { await Promise.all([reload(current), reloadKnowledge(current)]); } setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => { setSession(current); if (!current) { setData(null); setKnowledge({ facts: [], myths: [], mythState: [] }); } });
    return () => listener.subscription.unsubscribe();
  }, [configured]);

  if (!configured || (!session && !loading)) return <><LegacyAugment primaryProduct="cigarette"/><RedesignApp/></>;
  if (loading || !data || !session) return <main className="r-loading"><span/><p>Загружаю ALIVE…</p></main>;
  if (!data.profile.onboarding_completed_at || !data.products.length) return <Setup session={session} data={data} done={async () => { await Promise.all([reload(session), reloadKnowledge(session)]); }}/>
  if (setup) return <Setup session={session} data={data} done={async () => { await reload(session); setSetup(false); }} cancel={() => setSetup(false)}/>;

  const primary = data.products.find((p) => p.role === 'target_dependency')?.product_type ?? data.products[0]?.product_type ?? 'cigarette';
  if (path === '/' || path === '/facts' || path === '/together' || path === '/profile') {
    let page: ReactNode;
    if (path === '/facts') page = <FactsPage session={session} knowledge={knowledge} reloadKnowledge={() => reloadKnowledge(session)}/>;
    else if (path === '/together') page = <TogetherPage data={data}/>;
    else if (path === '/profile') page = <ProfilePage session={session} data={data} editSetup={() => setSetup(true)}/>;
    else page = <Today session={session} data={data} knowledge={knowledge} reload={async () => { await Promise.all([reload(session), reloadKnowledge(session)]); }}/>;
    return <><Header data={data} path={path}/>{page}</>;
  }

  return <><LegacyAugment primaryProduct={primary}/><RedesignApp/></>;
}
