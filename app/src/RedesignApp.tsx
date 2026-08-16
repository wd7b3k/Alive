import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import logoUrl from './assets/brand-logo-full.png';
import { publicEnv } from './env';
import { getSupabase } from './supabase';
import {
  addLink,
  addMeaning,
  deleteEpisode,
  deleteLink,
  deleteMeaning,
  loadBootstrap,
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
  type Replacement,
  type Trigger,
  type UserMeaning,
} from './data';
import { saveQuickUse } from './actions';
import { dailyUnits, replacementStats, statsForDays, triggerStats } from './metrics';
import {
  contextualMyth,
  loadKnowledge,
  markMythShown,
  pickDiverseReplacements,
  replacementMechanism,
  setMythRelevance,
  type Fact,
  type Knowledge,
  type Myth,
  type MythState,
} from './v31-data';
import { Icon, type IconName } from './ui-icons';

const EMPTY_KNOWLEDGE: Knowledge = { facts: [], myths: [], mythState: [] };

const FACT_CATEGORIES: Record<string, string> = {
  heart: 'Сердце и сосуды',
  mortality: 'Долгая жизнь',
  mental_health: 'Психика и настроение',
  treatment: 'Поддержка',
  product: 'Никотиновые продукты',
  others: 'Окружающие',
  oral_health: 'Зубы и полость рта',
  behavior: 'Как работает зависимость',
  weight: 'Вес',
};

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

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmt(value: number, digits = 0) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value);
}

function money(value: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} ₽`;
}

function when(value: string) {
  return new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function productIcon(product: ProductType): IconName {
  if (product === 'cigarette') return 'smoke';
  if (product === 'hookah') return 'hookah';
  return 'vape';
}

function productCta(product: ProductType) {
  if (product === 'cigarette') return 'Хочу закурить';
  if (product === 'vape') return 'Хочу затянуться';
  return 'Хочу покурить кальян';
}

function triggerIcon(item: Pick<Trigger, 'code' | 'title'>): IconName {
  const s = `${item.code} ${item.title}`.toLowerCase();
  if (s.includes('коф') || s.includes('coffee')) return 'coffee';
  if (s.includes('ед') || s.includes('обед') || s.includes('ужин') || s.includes('food')) return 'meal';
  if (s.includes('телефон') || s.includes('скрол') || s.includes('scroll')) return 'phone';
  if (s.includes('работ') || s.includes('комп') || s.includes('дел')) return 'work';
  if (s.includes('стресс') || s.includes('трев') || s.includes('напряж') || s.includes('мысл')) return 'stress';
  if (s.includes('сон') || s.includes('утр') || s.includes('вечер')) return 'sleep';
  if (s.includes('маш') || s.includes('дорог') || s.includes('drive')) return 'car';
  if (s.includes('люд') || s.includes('друз') || s.includes('разговор') || s.includes('компан')) return 'people';
  if (s.includes('скук') || s.includes('пау')) return 'pause';
  return 'spark';
}

function needIcon(code: string, title: string): IconName {
  const s = `${code} ${title}`.toLowerCase();
  if (s.includes('пау') || s.includes('перерыв')) return 'pause';
  if (s.includes('спокой') || s.includes('разряд') || s.includes('трев')) return 'calm';
  if (s.includes('энерг') || s.includes('бодр') || s.includes('стимул')) return 'energy';
  if (s.includes('фокус') || s.includes('вним') || s.includes('собра')) return 'focus';
  if (s.includes('заверш') || s.includes('точк') || s.includes('ритуал')) return 'finish';
  if (s.includes('контакт') || s.includes('общен') || s.includes('связ')) return 'connection';
  if (s.includes('рук') || s.includes('занят')) return 'hands';
  return 'heart';
}

function replacementIcon(item: Replacement): IconName {
  const s = `${item.code} ${item.title} ${item.category}`.toLowerCase();
  if (s.includes('дых') || s.includes('breath')) return 'breath';
  if (s.includes('чай') || s.includes('вода') || s.includes('напит')) return 'tea';
  if (s.includes('ход') || s.includes('прогул') || s.includes('walk')) return 'walk';
  if (s.includes('музык') || s.includes('песн')) return 'music';
  if (s.includes('днев') || s.includes('запис') || s.includes('journal')) return 'journal';
  if (s.includes('вид') || s.includes('смотр') || s.includes('комнат') || s.includes('зазем')) return 'eye';
  if (s.includes('смысл') || s.includes('установ')) return 'meaning';
  if (s.includes('нзт') || s.includes('nrt') || s.includes('никотин')) return 'shield';
  if (s.includes('еда') || s.includes('фрукт') || s.includes('кефир') || s.includes('йогур')) return 'leaf';
  return 'spark';
}

function replacementKind(item: Replacement) {
  const labels: Record<string, string> = {
    breathing: 'Дыхание',
    movement: 'Движение',
    attention: 'Внимание',
    grounding: 'Опора',
    food: 'Еда',
    oral: 'Оральная замена',
    drink: 'Напиток',
    ritual: 'Ритуал',
    meaning: 'Смысл',
    social: 'Контакт',
    reflection: 'Наблюдение',
    evidence_treatment: 'Доказательная поддержка',
    focus: 'Фокус',
    manual: 'Занять руки',
    pause: 'Пауза',
    reward: 'Награда',
    context_change: 'Смена контекста',
    sensory: 'Ощущения',
  };
  return labels[replacementMechanism(item)] ?? 'Другой ответ';
}

function tobaccoSummary(event: Bootstrap['tobaccoEvents'][number] | undefined) {
  if (!event) return 'Никотин использован';
  if (event.cigarette_quantity) return `${fmt(event.cigarette_quantity, 1)} ${Number(event.cigarette_quantity) === 1 ? 'сигарета' : 'сиг.'}`;
  if (event.hookah_session_count) return `${fmt(event.hookah_session_count, 1)} кальянная сессия`;
  if (event.vape_puffs) return `${fmt(event.vape_puffs)} затяжек`;
  return productLabel(event.product_type);
}

function ShellButton({ children, onClick, className = '', disabled = false }: { children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return <button type="button" className={`r-button ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="r-modal-backdrop" onMouseDown={(e) => e.currentTarget === e.target && onClose()}><section className={`r-modal ${wide ? 'r-modal-wide' : ''}`}>{children}</section></div>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <button className={`r-brand ${compact ? 'compact' : ''}`} onClick={() => go('/')} aria-label="ALIVE — на главную"><img src={logoUrl} alt="ALIVE" /></button>;
}

const MAIN_NAV = [
  ['/', 'Сегодня', 'spark'],
  ['/links', 'Связки', 'chain'],
  ['/path', 'Путь', 'path'],
  ['/meanings', 'Смыслы', 'meaning'],
] as const;

function Header({ data, path }: { data: Bootstrap; path: string }) {
  return <>
    <header className="r-header">
      <Brand />
      <nav className="r-desktop-nav">{MAIN_NAV.map(([href, label, icon]) => <button key={href} className={path === href ? 'active' : ''} onClick={() => go(href)}><Icon name={icon} size={18}/><span>{label}</span></button>)}</nav>
      <div className="r-header-tools"><button className="r-method-link" onClick={() => go('/experiment')}>О методе</button><button className="r-avatar" onClick={() => go('/profile')} title="Профиль">{data.profile.avatar_url ? <img src={data.profile.avatar_url} alt="" referrerPolicy="no-referrer"/> : <Icon name="user" size={20}/>}</button></div>
    </header>
    <nav className="r-mobile-nav">{MAIN_NAV.map(([href, label, icon]) => <button key={href} className={path === href ? 'active' : ''} onClick={() => go(href)}><Icon name={icon} size={21}/><span>{label}</span></button>)}</nav>
  </>;
}

function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true); setError('');
    const result = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } });
    if (result.error) { setError(result.error.message); setBusy(false); }
  }
  return <main className="r-login"><section className="r-login-card"><img src={logoUrl} className="r-login-logo" alt="ALIVE"/><p className="r-kicker">Некоммерческий эксперимент · метод ALIVE v1</p><h1>Не запрещать себе. Вернуть себе выбор.</h1><p className="r-lead">ALIVE помогает заметить, что именно запускает автоматический ритуал, понять, какое состояние ты на самом деле ищешь, и подобрать другой ответ — под конкретный момент.</p><div className="r-login-actions"><ShellButton className="primary" onClick={start} disabled={busy}>{busy ? 'Открываю Google…' : 'Войти через Google'} <Icon name="arrow" size={18}/></ShellButton><ShellButton className="ghost" onClick={() => go('/experiment')}>Как устроен эксперимент</ShellButton></div>{error && <p className="r-error">{error}</p>}<p className="r-privacy">Google нужен только для входа. Поведенческие данные хранятся отдельно и защищаются правилами доступа PostgreSQL.</p></section></main>;
}

function Setup({ session, data, done, cancel }: { session: Session; data: Bootstrap | null; done: () => Promise<void>; cancel?: () => void }) {
  const existing = useMemo(() => new Map((data?.products ?? []).map((p) => [p.product_type, p])), [data]);
  const [chosen, setChosen] = useState<Record<ProductType, boolean>>({ cigarette: existing.has('cigarette') || !data, hookah: existing.has('hookah'), vape: existing.has('vape') });
  const [goal, setGoal] = useState(data?.settings.goal_text ?? '');
  const [cigs, setCigs] = useState(String(existing.get('cigarette')?.baseline?.cigarettes_per_day ?? ''));
  const [pack, setPack] = useState(String(existing.get('cigarette')?.defaults?.pack_price_rub ?? ''));
  const [hookahs, setHookahs] = useState(String(existing.get('hookah')?.baseline?.sessions_per_week ?? ''));
  const [hookahPrice, setHookahPrice] = useState(String(existing.get('hookah')?.defaults?.hookah_default_price_rub ?? 2500));
  const [puffs, setPuffs] = useState(String(existing.get('vape')?.baseline?.puffs_per_day ?? ''));
  const [vapePrice, setVapePrice] = useState(String(existing.get('vape')?.defaults?.consumable_price_rub ?? 1500));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    const products: OnboardingDraft['products'] = [];
    if (chosen.cigarette) products.push({ productType: 'cigarette', role: 'target_dependency', baseline: { cigarettes_per_day: Number(cigs || 0) }, defaults: { pack_price_rub: Number(pack || 0), pack_size: 20 } });
    if (chosen.hookah) products.push({ productType: 'hookah', role: 'target_dependency', baseline: { sessions_per_week: Number(hookahs || 0) }, defaults: { hookah_default_price_rub: Number(hookahPrice || 2500) } });
    if (chosen.vape) products.push({ productType: 'vape', role: 'target_dependency', baseline: { puffs_per_day: Number(puffs || 0) }, defaults: { claimed_puffs: 5000, consumable_price_rub: Number(vapePrice || 1500), device_type: 'disposable' } });
    if (!products.length) { setError('Выбери хотя бы один никотиновый продукт.'); return; }
    setBusy(true); setError('');
    try { await saveOnboarding(session, { goalText: goal, products }); await done(); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить настройки'); } finally { setBusy(false); }
  }
  return <main className="r-setup-page"><section className="r-setup"><div className="r-setup-head"><div><p className="r-kicker">Настройка личной карты</p><h1>С чего ты начинаешь</h1><p>Это не норматив и не оценка. Исходный уровень нужен только для сравнения тебя с самим собой.</p></div>{cancel && <button className="r-icon-button" onClick={cancel}><Icon name="close"/></button>}</div><label className="r-field"><span>Что ты хочешь вернуть себе?</span><textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Например: больше энергии, свободное утро, спокойствие без сигареты, ощущение собственной силы"/></label><div className="r-product-grid">{(['cigarette','hookah','vape'] as ProductType[]).map((p) => <button key={p} className={`r-product-choice ${chosen[p] ? 'selected' : ''}`} onClick={() => setChosen((v) => ({ ...v, [p]: !v[p] }))}><span className="r-product-icon"><Icon name={productIcon(p)} size={25}/></span><strong>{productLabel(p)}</strong><small>{chosen[p] ? 'учитываем' : 'не учитывать'}</small></button>)}</div>{chosen.cigarette && <div className="r-inline-fields"><label className="r-field"><span>Сигарет в день сейчас</span><input type="number" min="0" value={cigs} onChange={(e) => setCigs(e.target.value)}/></label><label className="r-field"><span>Цена пачки, ₽</span><input type="number" min="0" value={pack} onChange={(e) => setPack(e.target.value)}/></label></div>}{chosen.hookah && <div className="r-inline-fields"><label className="r-field"><span>Кальянов в неделю</span><input type="number" min="0" value={hookahs} onChange={(e) => setHookahs(e.target.value)}/></label><label className="r-field"><span>Обычная стоимость, ₽</span><input type="number" min="0" value={hookahPrice} onChange={(e) => setHookahPrice(e.target.value)}/></label></div>}{chosen.vape && <div className="r-inline-fields"><label className="r-field"><span>Затяжек в день примерно</span><input type="number" min="0" value={puffs} onChange={(e) => setPuffs(e.target.value)}/></label><label className="r-field"><span>Стоимость устройства / расходника, ₽</span><input type="number" min="0" value={vapePrice} onChange={(e) => setVapePrice(e.target.value)}/></label></div>}<div className="r-note"><Icon name="shield"/><p>Единицы ALIVE — только внутренняя шкала поведения: сигарета = 1, кальянная сессия = 10, 10 затяжек электронной сигареты = 1. Это не медицинское сравнение вреда.</p></div>{error && <p className="r-error">{error}</p>}<div className="r-actions"><ShellButton className="primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить и начать'} <Icon name="arrow" size={18}/></ShellButton>{cancel && <ShellButton className="ghost" onClick={cancel}>Отмена</ShellButton>}</div></section></main>;
}

function EpisodeCard({ data, episode, remove }: { data: Bootstrap; episode: Bootstrap['episodes'][number]; remove: (id: string) => void }) {
  const trigger = data.triggers.find((x) => x.code === episode.trigger_code);
  const need = data.needs.find((x) => x.code === episode.need_code);
  const action = data.actions.find((x) => x.episode_id === episode.id && x.replacement_code);
  const replacement = data.replacements.find((x) => x.code === action?.replacement_code);
  const event = data.tobaccoEvents.find((x) => x.episode_id === episode.id);
  const success = episode.outcome === 'successful_response';
  const used = episode.outcome === 'nicotine_used';
  const delta = episode.craving_before !== null && episode.craving_after !== null ? episode.craving_before - episode.craving_after : null;
  const status = success ? 'Выбор остался твоим' : used ? 'Никотин использован' : 'Эпизод закрыт';
  const motivational = success
    ? delta && delta > 0 ? `Тяга снизилась на ${delta}. Новый ответ уже сработал как реальная альтернатива.` : 'Автоматический никотиновый ответ не последовал. Это один повтор нового сценария.'
    : used
      ? replacement ? `Ты попробовал «${replacement.title}», а затем использовал никотин. Это не обнуление — теперь видно, где ответ нужно усилить или заменить.` : `${tobaccoSummary(event)} — это итог эпизода, а не «замена». Здесь уже есть полезные данные о контексте.`
      : 'Даже незавершённый эпизод помогает замечать момент, в котором включается автоматизм.';
  return <article className={`r-episode-card ${success ? 'success' : used ? 'used' : 'neutral'}`}>
    <div className="r-episode-top"><span className="r-episode-product"><Icon name={productIcon(episode.target_product)} size={18}/>{productLabel(episode.target_product)}</span><span className="r-episode-time"><Icon name="clock" size={14}/>{when(episode.started_at)}</span><button className="r-delete" title="Удалить ошибочную запись" onClick={() => remove(episode.id)}><Icon name="trash" size={17}/></button></div>
    <div className="r-episode-status"><span className="r-status-icon"><Icon name={success ? 'check' : used ? productIcon(episode.target_product) : 'pause'} size={22}/></span><div><small>{status}</small><h3>{trigger?.title || episode.custom_trigger_text || 'Контекст не указан'}</h3></div></div>
    <div className="r-chain-line"><span><b>Ситуация</b>{trigger?.title || episode.custom_trigger_text || 'не указана'}</span><Icon name="arrow" size={17}/><span><b>Нужно было</b>{need?.title || 'не определено'}</span></div>
    {replacement ? <div className="r-replacement-used"><span className="r-replacement-icon"><Icon name={replacementIcon(replacement)} size={22}/></span><div><small>Что ты попробовал вместо автоматизма</small><strong>{replacement.title}</strong><span>{replacement.duration || replacementKind(replacement)}</span></div></div> : <div className="r-no-replacement"><Icon name="pause" size={19}/><span><b>Замены не было.</b> Никотиновый продукт не считается заменой.</span></div>}
    <div className="r-episode-result"><div>{episode.craving_before !== null ? <span><small>Тяга</small><b>{episode.craving_before} → {episode.craving_after ?? '—'}</b></span> : null}{episode.helpfulness !== null ? <span><small>Помогло</small><b>{episode.helpfulness}/5</b></span> : null}{used ? <span><small>Итог</small><b>{tobaccoSummary(event)}</b></span> : null}</div><p>{motivational}</p></div>
  </article>;
}

function QuickUse({ session, data, close, saved }: { session: Session; data: Bootstrap; close: () => void; saved: () => Promise<void> }) {
  const [product, setProduct] = useState<ProductType>(data.products[0]?.product_type ?? 'cigarette');
  const [trigger, setTrigger] = useState('');
  const [qty, setQty] = useState(1);
  const [puffs, setPuffs] = useState(10);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await saveQuickUse(session, { product, triggerCode: trigger || undefined, cigaretteQuantity: product === 'cigarette' ? qty : undefined, hookahSessionCount: product === 'hookah' ? 1 : undefined, vapePuffs: product === 'vape' ? puffs : undefined }); await saved(); close(); } finally { setBusy(false); }
  }
  return <Modal onClose={close}><div className="r-modal-head"><div><p className="r-kicker">Просто факт · без оценки</p><h2>Никотин уже был</h2><p>Здесь нет «замены». Мы отдельно записываем употребление, чтобы история оставалась честной.</p></div><button className="r-icon-button" onClick={close}><Icon name="close"/></button></div><div className="r-product-switch">{data.products.map((p) => <button key={p.product_type} className={product === p.product_type ? 'selected' : ''} onClick={() => setProduct(p.product_type)}><Icon name={productIcon(p.product_type)} size={20}/>{productLabel(p.product_type)}</button>)}</div><label className="r-field"><span>Что происходило перед этим? · необязательно</span><select value={trigger} onChange={(e) => setTrigger(e.target.value)}><option value="">Не указывать</option>{data.triggers.filter((t) => t.product_types.includes(product)).map((t) => <option key={t.code} value={t.code}>{t.title}</option>)}</select></label>{product === 'cigarette' && <label className="r-field"><span>Количество сигарет</span><input type="number" min="0.1" step="0.1" value={qty} onChange={(e) => setQty(Number(e.target.value))}/></label>}{product === 'vape' && <div className="r-puff"><button onClick={() => setPuffs(Math.max(0,puffs-5))}>−5</button><strong>{puffs}<small> затяжек</small></strong><button onClick={() => setPuffs(puffs+5)}>+5</button><button onClick={() => setPuffs(puffs+10)}>+10</button></div>}<div className="r-actions"><ShellButton className="primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Записать факт'}</ShellButton><ShellButton className="ghost" onClick={close}>Отмена</ShellButton></div></Modal>;
}

function Guided({ session, data, knowledge, close, saved, initialTrigger }: { session: Session; data: Bootstrap; knowledge: Knowledge; close: () => void; saved: () => Promise<void>; initialTrigger?: string }) {
  const preferredProduct = data.products.find((p) => p.role === 'target_dependency')?.product_type ?? data.products[0]?.product_type ?? 'cigarette';
  const initialTriggerItem = data.triggers.find((trigger) => trigger.code === initialTrigger);
  const initialProduct = initialTriggerItem
    ? data.products.find((item) => initialTriggerItem.product_types.includes(item.product_type))?.product_type ?? preferredProduct
    : preferredProduct;
  const hasProductStep = data.products.length > 1;
  const flowSteps: Array<{ id: number; label: string }> = [
    ...(hasProductStep ? [{ id: 0, label: 'Продукт' }] : []),
    { id: 1, label: 'Ситуация' },
    { id: 2, label: 'Сила тяги' },
    { id: 3, label: 'Потребность' },
    { id: 4, label: 'Замена' },
    { id: 5, label: 'Результат' },
  ];
  const initialStep = initialTrigger ? 2 : hasProductStep ? 0 : 1;
  const [product, setProduct] = useState<ProductType>(initialProduct);
  const [step, setStep] = useState(initialStep);
  const [maxReached, setMaxReached] = useState(initialStep);
  const [triggerCode, setTrigger] = useState(initialTrigger ?? '');
  const [needCode, setNeed] = useState('');
  const [before, setBefore] = useState(7);
  const [replacementCode, setReplacement] = useState<string | null>(null);
  const [after, setAfter] = useState(4);
  const [help, setHelp] = useState(3);
  const [outcome, setOutcome] = useState<'successful_response' | 'nicotine_used' | 'abandoned'>('successful_response');
  const [qty, setQty] = useState(1);
  const [puffs, setPuffs] = useState(10);
  const [busy, setBusy] = useState(false);
  const [shownMyth, setShownMyth] = useState<Myth | null>(null);
  const [shownMythContext, setShownMythContext] = useState('');
  const [mythFeedback, setMythFeedback] = useState<'relevant' | 'not_relevant' | null>(null);
  const shownMythOnce = useRef(false);
  const candidates = useMemo(() => triggerCode && needCode ? pickDiverseReplacements(data, product, triggerCode, needCode, before) : [], [data, product, triggerCode, needCode, before]);
  const candidateMyth = useMemo(() => triggerCode && needCode ? contextualMyth(knowledge, product, triggerCode, needCode) : null, [knowledge, product, triggerCode, needCode]);
  const selected = data.replacements.find((r) => r.code === replacementCode);
  const triggers = data.triggers.filter((t) => t.product_types.includes(product));
  const currentMythContext = product + ':' + triggerCode + ':' + needCode;
  const contextualReminder = shownMythContext === currentMythContext ? shownMyth : null;
  const currentStepIndex = Math.max(0, flowSteps.findIndex((item) => item.id === step));
  const remainingSteps = flowSteps.length - currentStepIndex - 1;
  const progress = Math.round(((currentStepIndex + 1) / flowSteps.length) * 100);
  const remainingLabel = remainingSteps === 0
    ? 'Последний шаг'
    : 'Осталось ' + remainingSteps + ' ' + (remainingSteps === 1 ? 'шаг' : remainingSteps < 5 ? 'шага' : 'шагов');

  useEffect(() => {
    if (step !== 4 || !candidateMyth || shownMythOnce.current) return;
    shownMythOnce.current = true;
    setShownMyth(candidateMyth);
    setShownMythContext(currentMythContext);
    const currentState = knowledge.mythState.find((state) => state.myth_code === candidateMyth.code);
    setMythFeedback(currentState?.relevance === 'relevant' || currentState?.relevance === 'not_relevant' ? currentState.relevance : null);
    markMythShown(session, currentState, candidateMyth.code).catch(() => {});
  }, [step, candidateMyth, currentMythContext, knowledge.mythState, session]);

  async function chooseMythRelevance(value: 'relevant' | 'not_relevant') {
    if (!contextualReminder) return;
    const previous = mythFeedback;
    setMythFeedback(value);
    try {
      await setMythRelevance(session, contextualReminder.code, value);
    } catch {
      setMythFeedback(previous);
    }
  }

  function resetResult() {
    setAfter(4);
    setHelp(3);
    setOutcome('successful_response');
    setQty(1);
    setPuffs(10);
  }

  function advance(next: number) {
    setStep(next);
    setMaxReached((current) => Math.max(current, next));
  }

  function goToStep(next: number) {
    if (next <= maxReached) setStep(next);
  }

  function chooseProduct(value: ProductType) {
    if (value !== product) {
      setProduct(value);
      setTrigger('');
      setBefore(7);
      setNeed('');
      setReplacement(null);
      resetResult();
      setMaxReached(1);
    }
    advance(1);
  }

  function chooseTrigger(value: string) {
    if (value !== triggerCode) {
      setTrigger(value);
      setBefore(7);
      setNeed('');
      setReplacement(null);
      resetResult();
      setMaxReached(2);
    }
    advance(2);
  }

  function changeStrength(value: number) {
    if (value !== before) {
      setBefore(value);
      setNeed('');
      setReplacement(null);
      resetResult();
      setMaxReached(2);
    }
  }

  function chooseNeed(value: string) {
    if (value !== needCode) {
      setNeed(value);
      setReplacement(null);
      resetResult();
      setMaxReached(4);
    }
    advance(4);
  }

  function chooseReplacement(value: string | null) {
    if (value !== replacementCode) resetResult();
    setReplacement(value);
    advance(5);
  }

  async function save() {
    if (step !== 5 || !triggerCode || !needCode) return;
    setBusy(true);
    const tobacco: GuidedEpisodeDraft['tobacco'] = outcome === 'nicotine_used' ? { cigaretteQuantity: product === 'cigarette' ? qty : undefined, hookahSessionCount: product === 'hookah' ? 1 : undefined, vapePuffs: product === 'vape' ? puffs : undefined } : undefined;
    try { await saveGuidedEpisode(session, { product, triggerCode, needCode, cravingBefore: before, cravingAfter: after, helpfulness: help, replacementCode, outcome, tobacco }); await saved(); close(); } finally { setBusy(false); }
  }

  return <Modal wide onClose={close}><div className="r-modal-head"><div><p className="r-kicker">Не экзамен. Один живой момент.</p><h2>{step < 4 ? 'Что происходит прямо сейчас?' : step === 4 ? 'Выбери другой ответ' : 'Что получилось?'}</h2></div><button className="r-icon-button" onClick={close}><Icon name="close"/></button></div><div className="r-progress-wrap" aria-label="Ход разбора тяги"><div className="r-progress-copy"><strong>Шаг {currentStepIndex + 1} из {flowSteps.length}</strong><span>{remainingLabel}</span></div><div className="r-progress-track" aria-hidden="true"><i style={{ width: progress + '%' }}/></div><div className="r-progress">{flowSteps.map((item) => { const available = item.id <= maxReached; const current = item.id === step; return <button key={item.id} type="button" disabled={!available} className={current ? 'current' : available ? 'complete' : ''} aria-current={current ? 'step' : undefined} onClick={() => goToStep(item.id)}><span>{item.id === 0 ? 1 : hasProductStep ? item.id + 1 : item.id}</span><small>{item.label}</small></button>; })}</div></div>{step === 0 && <section className="r-flow"><h3>К чему сейчас тянет?</h3><div className="r-choice-grid products">{data.products.map((p) => <button key={p.product_type} className={product === p.product_type ? 'selected' : ''} onClick={() => chooseProduct(p.product_type)}><Icon name={productIcon(p.product_type)} size={28}/><strong>{productLabel(p.product_type)}</strong></button>)}</div></section>}{step === 1 && <section className="r-flow"><div className="r-flow-title"><span className="r-step-icon"><Icon name="eye"/></span><div><h3>В каком контексте включилась тяга?</h3><p>Не ищем виноватого. Ищем повторяющийся пусковой момент.</p></div></div><div className="r-choice-grid">{triggers.map((t) => <button key={t.code} className={triggerCode === t.code ? 'selected' : ''} onClick={() => chooseTrigger(t.code)}><span className="r-choice-icon"><Icon name={triggerIcon(t)} size={23}/></span><strong>{t.title}</strong><small>{t.description}</small></button>)}</div></section>}{step === 2 && <section className="r-flow"><div className="r-flow-title"><span className="r-step-icon"><Icon name="energy"/></span><div><h3>Насколько сильна тяга прямо сейчас?</h3><p>Отдельная оценка помогает подобрать ответ под этот момент, а не под тягу «вообще».</p></div></div><div className="r-strength"><div className="r-strength-value"><small>Сейчас</small><strong>{before}<span>/10</span></strong></div><input aria-label="Сила тяги" type="range" min="1" max="10" value={before} onChange={(e) => changeStrength(Number(e.target.value))}/><div className="r-strength-labels"><span>1 · почти фоном</span><span>10 · трудно переключиться</span></div></div><div className="r-actions"><ShellButton className="primary" onClick={() => advance(3)}>Продолжить <Icon name="arrow" size={18}/></ShellButton></div></section>}{step === 3 && <section className="r-flow"><div className="r-flow-title"><span className="r-step-icon"><Icon name="heart"/></span><div><h3>Что ты на самом деле сейчас ищешь?</h3><p>Сигарета может обещать паузу, разрядку, завершение, стимуляцию или контакт. Нам нужна функция, а не форма ритуала.</p></div></div><div className="r-choice-grid needs">{data.needs.map((n) => <button key={n.code} className={needCode === n.code ? 'selected' : ''} onClick={() => chooseNeed(n.code)}><span className="r-choice-icon"><Icon name={needIcon(n.code,n.title)} size={24}/></span><strong>{n.title}</strong><small>{n.description}</small></button>)}</div></section>}{step === 4 && <section className="r-flow"><div className="r-flow-title"><span className="r-step-icon accent"><Icon name="spark"/></span><div><h3>Три варианта под этот момент</h3><p>Не список «полезных привычек». Эти ответы подобраны под ситуацию и потребность; со временем порядок будет меняться по твоим результатам.</p></div></div>{contextualReminder && <aside className="r-context-myth"><span>Мягкое напоминание</span><h3>{contextualReminder.title}</h3><p>{contextualReminder.short_reframe}</p><details><summary>Почему так</summary><p>{contextualReminder.explanation}</p><a href={contextualReminder.source_url} target="_blank" rel="noreferrer">Источник: {contextualReminder.source_title} <Icon name="arrow" size={14}/></a></details><div className="r-context-myth-actions"><button className={mythFeedback === 'relevant' ? 'selected' : ''} onClick={() => chooseMythRelevance('relevant')}>Похоже на меня</button><button className={mythFeedback === 'not_relevant' ? 'selected' : ''} onClick={() => chooseMythRelevance('not_relevant')}>Не про меня</button></div></aside>}<div className="r-replacement-grid">{candidates.map((r) => <button key={r.code} className={replacementCode === r.code ? 'selected' : ''} onClick={() => chooseReplacement(r.code)}><span className="r-big-icon"><Icon name={replacementIcon(r)} size={30}/></span><div><span className="r-kind">{replacementKind(r)}{r.duration ? ' · ' + r.duration : ''}</span><h3>{r.title}</h3><p>{r.summary || r.instruction}</p></div><Icon name="arrow" className="r-card-arrow" size={20}/></button>)}</div><button className="r-skip" onClick={() => chooseReplacement(null)}>Сейчас не хочу пробовать замену</button></section>}{step === 5 && <section className="r-flow"><div className="r-result-choice">{selected ? <><span className="r-big-icon"><Icon name={replacementIcon(selected)} size={30}/></span><div><small>Ты выбрал</small><h3>{selected.title}</h3><p>{selected.instruction}</p></div></> : <><span className="r-big-icon"><Icon name="pause" size={30}/></span><div><small>Без замены</small><h3>Просто наблюдаем результат</h3></div></>}</div><div className="r-two-sliders"><div className="r-slider"><label><span>Тяга после</span><b>{after}/10</b></label><input type="range" min="0" max="10" value={after} onChange={(e) => setAfter(Number(e.target.value))}/></div><div className="r-slider"><label><span>Насколько помогло</span><b>{help}/5</b></label><input type="range" min="0" max="5" value={help} onChange={(e) => setHelp(Number(e.target.value))}/></div></div><div className="r-outcomes"><button className={outcome==='successful_response'?'selected success':''} onClick={() => setOutcome('successful_response')}><Icon name="check" size={22}/><div><strong>Автоматизм прерван</strong><small>Никотиновый ответ не последовал</small></div></button><button className={outcome==='nicotine_used'?'selected used':''} onClick={() => setOutcome('nicotine_used')}><Icon name={productIcon(product)} size={22}/><div><strong>Никотин всё же был</strong><small>Это итог, а не «провал» и не замена</small></div></button><button className={outcome==='abandoned'?'selected':''} onClick={() => setOutcome('abandoned')}><Icon name="pause" size={22}/><div><strong>Просто закрыть</strong><small>Без оценки результата</small></div></button></div>{outcome === 'nicotine_used' && <div className="r-nicotine-detail"><p><b>Отдельно фиксируем сам продукт.</b> Он не попадёт в поле «Замена».</p>{product === 'cigarette' && <label className="r-field"><span>Количество сигарет</span><input type="number" min="0.1" step="0.1" value={qty} onChange={(e) => setQty(Number(e.target.value))}/></label>}{product === 'vape' && <div className="r-puff"><button onClick={() => setPuffs(Math.max(0,puffs-5))}>−5</button><strong>{puffs}<small> затяжек</small></strong><button onClick={() => setPuffs(puffs+5)}>+5</button></div>}</div>}<div className="r-actions"><ShellButton className="primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить эпизод'} <Icon name="arrow" size={18}/></ShellButton><ShellButton className="ghost" onClick={() => goToStep(4)}>Выбрать другой ответ</ShellButton></div></section>}</Modal>;
}

function Evening({ session, data, close, saved }: { session: Session; data: Bootstrap; close: () => void; saved: () => Promise<void> }) {
  const old = data.todayCheckin;
  const [irritability,setIrritability]=useState(old?.irritability ?? 5); const [energy,setEnergy]=useState(old?.energy ?? 5); const [recovery,setRecovery]=useState(old?.recovery ?? 5);
  const [owned,setOwned]=useState(old?.owned_moment ?? ''); const [strongest,setStrongest]=useState(old?.strongest_link ?? ''); const [tomorrow,setTomorrow]=useState(old?.tomorrow_plan ?? '');
  const [busy,setBusy]=useState(false);
  async function save(){setBusy(true);try{await saveCheckin(session,{checkin_date:localDay(),irritability,energy,recovery,owned_moment:owned||null,strongest_link:strongest||null,tomorrow_plan:tomorrow||null});await saved();close();}finally{setBusy(false)}}
  return <Modal onClose={close}><div className="r-modal-head"><div><p className="r-kicker">Итоги дня · 3 минуты</p><h2>Не оценка дня. Карта обучения.</h2></div><button className="r-icon-button" onClick={close}><Icon name="close"/></button></div>{[['Раздражительность',irritability,setIrritability],['Энергия',energy,setEnergy],['Восстановление',recovery,setRecovery]].map(([label,value,setter])=><div className="r-slider" key={String(label)}><label><span>{String(label)}</span><b>{Number(value)}/10</b></label><input type="range" min="1" max="10" value={Number(value)} onChange={(e)=>(setter as (n:number)=>void)(Number(e.target.value))}/></div>)}<label className="r-field"><span>Где сегодня решение особенно осталось твоим?</span><textarea value={owned} onChange={(e)=>setOwned(e.target.value)}/></label><label className="r-field"><span>Какая Связка была самой сильной?</span><textarea value={strongest} onChange={(e)=>setStrongest(e.target.value)}/></label><label className="r-field"><span>Завтра: если X, то Y</span><textarea value={tomorrow} onChange={(e)=>setTomorrow(e.target.value)} placeholder="Если после кофе потянет — сначала две минуты у окна"/></label><div className="r-actions"><ShellButton className="primary" onClick={save} disabled={busy}>{busy?'Сохраняю…':'Сохранить итоги'}</ShellButton></div></Modal>;
}

function Today({ session, data, reload, openFlow, openQuick, openEvening }: { session: Session; data: Bootstrap; reload: () => Promise<void>; openFlow: (trigger?: string) => void; openQuick: () => void; openEvening: () => void }) {
  const today = statsForDays(data,1); const week=statsForDays(data,7); const tstats=triggerStats(data);
  const support=data.supports.filter((s)=>s.support_type==='daily'); const phrase=support.length?support[new Date().getDate()%support.length]?.body:null;
  const weak=tstats.filter((x)=>x.episodes>0).sort((a,b)=>(a.successRate??101)-(b.successRate??101)).slice(0,3);
  const fallback=data.triggers.filter((t)=>data.products.some((p)=>t.product_types.includes(p.product_type))).slice(0,3);
  const attention=weak.length?weak.map((x)=>x.trigger):fallback;
  async function remove(id:string){if(!window.confirm('Удалить ошибочную или тестовую запись? Все показатели пересчитаются автоматически.'))return;await deleteEpisode(session,id);await reload();}
  const delta=week.baselineDeltaPct;
  const targetProduct=data.products.find((p)=>p.role==='target_dependency')?.product_type??data.products[0]?.product_type??'cigarette';
  return <main className="r-page"><section className="r-now"><div className="r-now-copy"><p className="r-kicker">Сегодня · {data.profile.display_name}</p><h1>{today.successfulResponses>0?`Сегодня выбор уже ${today.successfulResponses===1?'один раз':'несколько раз'} остался твоим.`:'Тебе не нужно победить день целиком.'}</h1><p>{data.settings.goal_text || 'Нужен только следующий момент, в котором ты заметишь автоматизм чуть раньше обычного.'}</p>{phrase&&<blockquote>{phrase}</blockquote>}</div><div className="r-now-actions"><button className="r-craving" onClick={()=>openFlow()}><span className="r-craving-icon"><Icon name="spark" size={30}/></span><span><small>Когда важно действовать прямо сейчас</small><strong>{productCta(targetProduct)}</strong><em>Разобрать момент и выбрать другой ответ</em></span><Icon name="arrow" size={24}/></button><div className="r-secondary-actions"><button onClick={openQuick}><Icon name="smoke"/><span><strong>Никотин уже был</strong><small>Просто записать факт</small></span></button><button onClick={openEvening}><Icon name="journal"/><span><strong>Итоги дня</strong><small>{data.todayCheckin?'Можно дополнить':'3 минуты вечером'}</small></span></button></div></div></section><section className="r-pulse"><div className="r-pulse-main"><span className="r-pulse-icon"><Icon name="check" size={26}/></span><div><small>Осознанных ответов сегодня</small><strong>{today.successfulResponses}</strong><p>{today.successfulResponses ? 'Это не серия запретов. Это моменты, где старый сценарий не решил за тебя.' : 'Первая запись появится после реального эпизода — ничего специально создавать не нужно.'}</p></div></div><div className="r-pulse-stat"><small>7 дней к исходному уровню</small><strong>{delta===null?'—':`${delta>0?'+':''}${fmt(delta)}%`}</strong><span>{delta!==null&&delta<0?'Никотиновая интенсивность ниже исходной':delta!==null&&delta>0?'Пока выше исходной — наблюдаем, без оценки':'Нужно больше данных'}</span></div><div className="r-pulse-stat"><small>Фонд свободы · 7 дней</small><strong>{week.baselineCost>0?money(week.freedomFund):'—'}</strong><span>Оценка по твоим расходам и исходному уровню</span></div></section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Карта внимания</p><h2>Где автоматизм сейчас сильнее всего</h2><p>Это не рейтинг «слабостей». Это места, где следующий эксперимент даст больше всего информации.</p></div><button onClick={()=>go('/links')}>Все Связки <Icon name="arrow" size={16}/></button></div><div className="r-attention-grid">{attention.map((t)=>{const st=tstats.find((x)=>x.trigger.code===t.code);return <button key={t.code} onClick={()=>openFlow(t.code)}><span className="r-choice-icon"><Icon name={triggerIcon(t)} size={24}/></span><div><strong>{t.title}</strong><p>{t.description}</p><small>{st?.episodes?`${st.episodes} эпиз. · ${st.successRate===null?'мало данных':`${fmt(st.successRate)}% прервано`}`:'Ещё не изучено'}</small></div><Icon name="arrow" size={18}/></button>})}</div></section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">История обучения</p><h2>Последние эпизоды</h2><p>Теперь карточка разделяет контекст, реальную замену и итог. Сигарета, кальян или электронка никогда не называются заменой.</p></div></div>{data.episodes.length?<div className="r-episode-list">{data.episodes.slice(0,8).map((e)=><EpisodeCard key={e.id} data={data} episode={e} remove={remove}/>)}</div>:<div className="r-empty"><Icon name="chain" size={30}/><h3>Пока нет живых эпизодов</h3><p>Ничего не нужно заполнять «для статистики». Используй ALIVE в следующий настоящий момент тяги.</p><ShellButton className="primary small" onClick={()=>openFlow()}>Разобрать первый момент</ShellButton></div>}</section></main>;
}

function Links({ session, data, reload, openFlow }: { session: Session; data: Bootstrap; reload: () => Promise<void>; openFlow: (trigger?: string) => void }) {
  const stats=triggerStats(data); const [show,setShow]=useState(false); const [title,setTitle]=useState(''); const [situation,setSituation]=useState(''); const [need,setNeed]=useState(''); const [replacement,setReplacement]=useState('');
  async function add(){if(!title.trim()||!situation.trim())return;await addLink(session,{title:title.trim(),situation:situation.trim(),need_code:need||null,impulse:null,habitual_response:null,preferred_replacement_code:replacement||null});setShow(false);setTitle('');setSituation('');await reload();}
  async function remove(id:string){if(window.confirm('Удалить эту личную Связку?')){await deleteLink(session,id);await reload();}}
  return <main className="r-page"><section className="r-title"><p className="r-kicker">Связки</p><h1>Ситуация → потребность → привычный ответ.</h1><p>Ценность не в том, чтобы помнить все триггеры. Ценность — увидеть несколько повторяющихся сценариев и научиться возвращать нужное состояние напрямую.</p><ShellButton className="ghost" onClick={()=>setShow(!show)}><Icon name="plus" size={18}/> Моя Связка</ShellButton></section>{show&&<section className="r-section r-form"><h2>Добавить личную Связку</h2><div className="r-inline-fields"><label className="r-field"><span>Короткое название</span><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Кофе после завтрака"/></label><label className="r-field"><span>Что происходит?</span><input value={situation} onChange={(e)=>setSituation(e.target.value)}/></label></div><label className="r-field"><span>Что я в этот момент ищу?</span><select value={need} onChange={(e)=>setNeed(e.target.value)}><option value="">Пока не знаю</option>{data.needs.map((n)=><option key={n.code} value={n.code}>{n.title}</option>)}</select></label><label className="r-field"><span>Какой ответ хочу попробовать первым?</span><select value={replacement} onChange={(e)=>setReplacement(e.target.value)}><option value="">Пусть ALIVE подбирает по ситуации</option>{data.replacements.map((r)=><option key={r.code} value={r.code}>{r.title}</option>)}</select></label><div className="r-actions"><ShellButton className="primary" onClick={add}>Сохранить Связку</ShellButton><ShellButton className="ghost" onClick={()=>setShow(false)}>Отмена</ShellButton></div></section>}{data.userLinks.length>0&&<section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Личные</p><h2>Твои собственные сценарии</h2></div></div><div className="r-personal-links">{data.userLinks.map((l)=>{const needObj=data.needs.find((n)=>n.code===l.need_code);const repl=data.replacements.find((r)=>r.code===l.preferred_replacement_code);return <article key={l.id}><span className="r-choice-icon"><Icon name="chain"/></span><div><h3>{l.title}</h3><p>{l.situation}</p><small>{needObj?`Ищу: ${needObj.title}`:'Потребность ещё не определена'}{repl?` · первый ответ: ${repl.title}`:''}</small></div><div className="r-card-tools"><button onClick={()=>openFlow()} title="Проверить сейчас"><Icon name="spark"/></button><button onClick={()=>submitLink(session,l)} title="Предложить обезличенную версию в общую базу"><Icon name="plus"/></button><button onClick={()=>remove(l.id)} title="Удалить"><Icon name="trash"/></button></div></article>})}</div></section>}<section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Карта контекстов</p><h2>Что система уже видит</h2></div></div><div className="r-trigger-grid">{data.triggers.map((t)=>{const st=stats.find((x)=>x.trigger.code===t.code);return <button key={t.code} onClick={()=>openFlow(t.code)}><span className="r-choice-icon"><Icon name={triggerIcon(t)} size={23}/></span><div><strong>{t.title}</strong><p>{t.description}</p></div><span className="r-rate">{st?.episodes?`${fmt(st.successRate??0)}%`:'новое'}</span></button>})}</div></section></main>;
}

function PathPage({ data }: { data: Bootstrap }) {
  const week=statsForDays(data,7); const month=statsForDays(data,30); const days=dailyUnits(data,7); const rstats=replacementStats(data).slice(0,6); const max=Math.max(1,...days.map((d)=>d.units));
  return <main className="r-page"><section className="r-title"><p className="r-kicker">Путь</p><h1>Не «сколько дней я идеален», а как меняется система.</h1><p>Главные сигналы: интенсивность относительно твоего исходного уровня, прерванные Связки и ответы, которые реально помогают.</p></section><section className="r-path-summary"><div><small>7 дней · к исходному уровню</small><strong>{week.baselineDeltaPct===null?'—':`${week.baselineDeltaPct>0?'+':''}${fmt(week.baselineDeltaPct)}%`}</strong><p>{week.successfulResponses} осознанных ответов</p></div><div><small>30 дней · к исходному уровню</small><strong>{month.baselineDeltaPct===null?'—':`${month.baselineDeltaPct>0?'+':''}${fmt(month.baselineDeltaPct)}%`}</strong><p>{month.activeDays} активных дней</p></div><div><small>Фонд свободы · 30 дней</small><strong>{month.baselineCost?money(month.freedomFund):'—'}</strong><p>без обещаний и «штрафов»</p></div></section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Последние 7 дней</p><h2>Никотиновая интенсивность и новые ответы</h2></div></div><div className="r-chart">{days.map((d)=><div className="r-chart-day" key={d.date}><div className="r-bars"><i style={{height:`${Math.max(5,(d.units/max)*100)}%`}}/><b style={{height:`${Math.max(0,Math.min(100,d.successes*22))}%`}}/></div><small>{new Date(d.date).toLocaleDateString('ru-RU',{weekday:'short'})}</small><span>{fmt(d.units,1)}</span></div>)}</div><div className="r-legend"><span><i className="use"/>единицы ALIVE</span><span><i className="success"/>прерванные Связки</span></div></section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Что работает для тебя</p><h2>Эффективность реальных замен</h2></div></div>{rstats.length?<div className="r-effect-list">{rstats.map((r,i)=><div key={r.code}><span>{i+1}</span><div><strong>{r.title}</strong><small>{r.uses} использ. · тяга в среднем {r.avgCravingDelta===null?'—':`−${fmt(r.avgCravingDelta,1)}`}</small></div><b>{r.avgHelpfulness===null?'—':`${fmt(r.avgHelpfulness,1)}/5`}</b></div>)}</div>:<div className="r-empty compact"><Icon name="spark"/><p>После нескольких эпизодов здесь появятся именно твои рабочие ответы.</p></div>}</section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Исходные факты · 30 дней</p><h2>Без смешивания продуктов</h2></div></div><div className="r-raw"><div><Icon name="smoke"/><small>Сигареты</small><strong>{fmt(month.cigarettes,1)}</strong></div><div><Icon name="hookah"/><small>Кальянные сессии</small><strong>{fmt(month.hookahs,1)}</strong></div><div><Icon name="vape"/><small>Затяжки электронной сигареты</small><strong>{fmt(month.vapePuffs)}</strong></div></div><p className="r-footnote">Единицы ALIVE нужны только для внутренней динамики. Они не означают равный медицинский вред.</p></section></main>;
}

function Meanings({ session, data, reload }: { session: Session; data: Bootstrap; reload: () => Promise<void> }) {
  const [adding,setAdding]=useState(false);const [title,setTitle]=useState('');const [body,setBody]=useState('');
  async function add(){if(!title.trim()||!body.trim())return;await addMeaning(session,title.trim(),body.trim());setAdding(false);setTitle('');setBody('');await reload();}
  async function remove(id:string){if(window.confirm('Удалить этот личный Смысл?')){await deleteMeaning(session,id);await reload();}}
  async function toggle(m:UserMeaning){await updateMeaning(session,m.id,{active:!m.active});await reload();}
  return <main className="r-page"><section className="r-title meaning"><p className="r-kicker">Смыслы</p><h1>Не «почему нельзя». Ради чего становится интереснее жить иначе.</h1><p>Смысл — короткая личная опора, которую стоит увидеть в момент, когда мозг предлагает старый автоматический сценарий.</p><ShellButton className="ghost" onClick={()=>setAdding(!adding)}><Icon name="plus" size={18}/> Мой Смысл</ShellButton></section>{adding&&<section className="r-section r-form"><label className="r-field"><span>Заголовок</span><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Я хочу увидеть себя без автоматизма"/></label><label className="r-field"><span>Что это значит для меня</span><textarea value={body} onChange={(e)=>setBody(e.target.value)}/></label><div className="r-actions"><ShellButton className="primary" onClick={add}>Сохранить</ShellButton><ShellButton className="ghost" onClick={()=>setAdding(false)}>Отмена</ShellButton></div></section>}{data.userMeanings.length>0&&<section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Мои</p><h2>Личные опоры</h2></div></div><div className="r-meaning-grid personal">{data.userMeanings.map((m)=><article key={m.id} className={!m.active?'inactive':''}><span className="r-meaning-symbol"><Icon name="meaning" size={25}/></span><h3>{m.title}</h3><p>{m.body}</p><div className="r-meaning-actions"><button onClick={()=>toggle(m)}>{m.active?'Скрыть':'Вернуть'}</button><button onClick={()=>submitMeaning(session,m)}>Предложить в общую базу</button><button onClick={()=>remove(m.id)}>Удалить</button></div></article>)}</div></section>}<section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Библиотека ALIVE</p><h2>Опоры, которые можно примерить на себя</h2></div></div><div className="r-meaning-grid">{data.meanings.map((m)=><article key={m.id}><span className="r-meaning-symbol"><Icon name="meaning" size={25}/></span><h3>{m.title}</h3><p>{m.body}</p></article>)}</div></section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Перепись сценария</p><h2>От старого паттерна к новому выбору</h2></div></div><div className="r-scripts">{data.identityScripts.map((s)=><details key={s.code}><summary>{s.title}</summary><div><span><small>Старый сценарий</small>{s.old_pattern}</span><Icon name="arrow"/><span><small>Новый выбор</small>{s.new_choice}</span></div></details>)}</div></section></main>;
}

function EvidenceBadge({ level }: { level: 'A' | 'B' | 'C' }) {
  return <span className={'r-evidence-level ' + level.toLowerCase()}>{level === 'A' ? 'Хорошо изучено' : level === 'B' ? 'Есть данные' : 'Гипотеза ALIVE'}</span>;
}

function FactCard({ fact }: { fact: Fact }) {
  return <article className={'r-fact-card ' + (fact.benefit ? 'benefit' : 'risk')}><div className="r-card-meta"><EvidenceBadge level={fact.evidence_level}/><span>{FACT_CATEGORIES[fact.category] ?? fact.category}</span></div><h2>{fact.title}</h2><p>{fact.short_text}</p><details><summary>Подробнее</summary><p>{fact.full_text}</p>{fact.sample_size && <small>Участников в исследовании: {new Intl.NumberFormat('ru-RU').format(fact.sample_size)}</small>}<a href={fact.source_url} target="_blank" rel="noreferrer">Источник: {fact.source_title} <Icon name="arrow" size={14}/></a></details></article>;
}

function FactsPage({ session, knowledge, error, reloadKnowledge }: { session: Session; knowledge: Knowledge; error: string; reloadKnowledge: () => Promise<void> }) {
  const queryTab = new URLSearchParams(window.location.search).get('tab');
  const [tab, setTab] = useState<'facts' | 'myths'>(queryTab === 'myths' ? 'myths' : 'facts');
  const [category, setCategory] = useState('all');
  const categories = Array.from(new Set(knowledge.facts.map((fact) => fact.category)));
  const balancedFacts = useMemo(() => {
    const filtered = knowledge.facts.filter((fact) => category === 'all' || fact.category === category);
    const risks = filtered.filter((fact) => !fact.benefit);
    const benefits = filtered.filter((fact) => fact.benefit);
    const result: Fact[] = [];
    for (let index = 0; index < Math.max(risks.length, benefits.length); index += 1) {
      if (risks[index]) result.push(risks[index]);
      if (benefits[index]) result.push(benefits[index]);
    }
    return result;
  }, [knowledge.facts, category]);

  async function mark(myth: Myth, relevance: MythState['relevance']) {
    await setMythRelevance(session, myth.code, relevance);
    await reloadKnowledge();
  }

  return <main className="r-page"><section className="r-title"><p className="r-kicker">Факты и мифы</p><h1>Знать достаточно, чтобы видеть выбор яснее</h1><p>Без страшилок, личных диагнозов и ложной точности. Факты показывают, что известно о рисках и пользе отказа; мифы разбирают обещания, которые поддерживают старый ритуал.</p><div className="r-knowledge-tabs"><button className={tab === 'facts' ? 'active' : ''} onClick={() => setTab('facts')}>Факты</button><button className={tab === 'myths' ? 'active' : ''} onClick={() => setTab('myths')}>Мифы</button></div></section>{error && <section className="r-section"><p className="r-error">{error}</p><ShellButton className="ghost small" onClick={reloadKnowledge}>Попробовать ещё раз</ShellButton></section>}{!error && tab === 'facts' && <><div className="r-filter-row"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Все</button>{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{FACT_CATEGORIES[item] ?? item}</button>)}</div>{balancedFacts.length ? <section className="r-fact-grid">{balancedFacts.map((fact) => <FactCard key={fact.code} fact={fact}/>)}</section> : <section className="r-section"><div className="r-empty compact"><Icon name="eye"/><p>Факты пока не загрузились. Личные данные для этой библиотеки не требуются.</p></div></section>}</>}{!error && tab === 'myths' && (knowledge.myths.length ? <section className="r-myth-grid">{knowledge.myths.map((myth) => { const state = knowledge.mythState.find((item) => item.myth_code === myth.code); return <article key={myth.code} className="r-myth-card"><div className="r-card-meta"><EvidenceBadge level={myth.evidence_level}/><span>Ожидаемый эффект</span></div><h2>{myth.title}</h2><p className="r-reframe">{myth.short_reframe}</p><details><summary>Почему так кажется</summary><p>{myth.explanation}</p><a href={myth.source_url} target="_blank" rel="noreferrer">Источник: {myth.source_title} <Icon name="arrow" size={14}/></a></details><div className="r-belief-actions"><span>Это про тебя?</span><button className={state?.relevance === 'relevant' ? 'selected' : ''} onClick={() => mark(myth, 'relevant')}>Похоже на меня</button><button className={state?.relevance === 'not_relevant' ? 'selected' : ''} onClick={() => mark(myth, 'not_relevant')}>Не про меня</button></div></article>; })}</section> : <section className="r-section"><div className="r-empty compact"><Icon name="eye"/><p>Библиотека мифов пока не загрузилась.</p></div></section>)}</main>;
}

function Experiment() { return <main className="r-reading"><Brand compact/><article><p className="r-kicker">Эксперимент над автоматизмом</p><h1>ALIVE ничего тебе не обещает.</h1><p className="r-lead">Мы проверяем простую гипотезу: если достаточно раз заметить повторяющуюся Связку, понять её функцию и удовлетворить ту же потребность другим ответом, автоматический сценарий может стать слабее.</p><h2>Что здесь считается успехом</h2><p>Не только «день без сигарет». Важны снижение интенсивности относительно своего исходного уровня, замеченные моменты тяги, прерванные Связки, рабочие Замены, увеличение промежутков без продукта и возвращение в систему после употребления.</p><h2>Что известно, а что является гипотезой ALIVE</h2><div className="r-evidence"><div><b>Хорошо подтверждено</b><p>Никотиновая зависимость формирует устойчивые контекстные и поведенческие ассоциации; отказ от курения снижает риски для здоровья.</p></div><div><b>Правдоподобно</b><p>Работа с триггерами, альтернативным поведением и осознаванием функции ритуала может помогать менять привычные ответы.</p></div><div><b>Эксперимент ALIVE</b><p>Наша конкретная система Связок, Смыслов, персонального ранжирования Замен и единиц ALIVE — собственная продуктовая гипотеза, которую нужно проверять на данных.</p></div></div><h2>Безопасность и медицина</h2><p>ALIVE не является лечением и не заменяет врача, психотерапию или доказательные методы отказа от табака. Никотин-заместительная терапия учитывается как поддержка, а не как срыв; дозировки сервис не назначает.</p><h2>Приватность</h2><blockquote>Эти данные слишком личные, чтобы превращать их в рекламный профиль.</blockquote><p>Личные заметки, Связки и Смыслы приватны по умолчанию. В общую базу что-либо попадает только после явного действия пользователя. Абсолютной безопасности не существует: технические поставщики инфраструктуры обрабатывают необходимые технические данные по своим правилам.</p><div className="r-actions"><ShellButton className="primary" onClick={()=>go('/')}>Вернуться в ALIVE</ShellButton></div></article></main>; }

function Profile({ session, data, editSetup }: { session: Session; data: Bootstrap; editSetup: () => void }) {
  async function logout(){await getSupabase()?.auth.signOut();go('/');}
  return <main className="r-page"><section className="r-title"><p className="r-kicker">Профиль</p><h1>{data.profile.display_name}</h1><p>Здесь только настройки твоего эксперимента. Приватные Смыслы, Связки и заметки не превращаются в публичный профиль.</p></section><section className="r-section"><div className="r-section-head"><div><p className="r-kicker">Исходный уровень</p><h2>С чем сравнивается динамика</h2></div><ShellButton className="ghost small" onClick={editSetup}>Изменить</ShellButton></div><div className="r-raw">{data.products.map((p: NicotineProduct)=><div key={p.product_type}><Icon name={productIcon(p.product_type)}/><small>{productLabel(p.product_type)}</small><strong>{p.product_type==='cigarette'?`${Number(p.baseline.cigarettes_per_day??0)} / день`:p.product_type==='hookah'?`${Number(p.baseline.sessions_per_week??0)} / нед.`:`${Number(p.baseline.puffs_per_day??0)} затяжек / день`}</strong></div>)}</div></section><section className="r-section"><div className="r-profile-links"><button onClick={()=>go('/facts')}><Icon name="eye"/><span><strong>Факты и мифы</strong><small>Что известно и какие обещания поддерживают ритуал</small></span><Icon name="arrow"/></button><button onClick={()=>go('/experiment')}><Icon name="shield"/><span><strong>Как работает эксперимент</strong><small>Методология, ограничения и приватность</small></span><Icon name="arrow"/></button><button onClick={()=>go('/releases')}><Icon name="path"/><span><strong>История версий</strong><small>Что меняется в ALIVE</small></span><Icon name="arrow"/></button></div><ShellButton className="danger" onClick={logout}>Выйти из аккаунта</ShellButton></section></main>;
}

function Releases(){return <main className="r-reading"><Brand compact/><article><p className="r-kicker">История версий</p><h1>ALIVE развивается как эксперимент.</h1><div className="r-release"><b>3.0</b><div><h2>Универсальная платформа</h2><p>Google-вход, отдельная база данных, сигареты / кальян / электронка, Связки, Смыслы, контекстные Замены и персональная аналитика.</p></div></div><div className="r-release"><b>2.7</b><div><h2>Последний эталон предыдущей архитектуры</h2><p>Версия, от которой 3.0 обязана не регрессировать по глубине, вовлечению и качеству интерфейса.</p></div></div><div className="r-actions"><ShellButton className="primary" onClick={()=>go('/')}>Назад в ALIVE</ShellButton></div></article></main>}

export default function RedesignApp() {
  const path=usePath(); const [session,setSession]=useState<Session|null>(null); const [data,setData]=useState<Bootstrap|null>(null); const [knowledge,setKnowledge]=useState<Knowledge>(EMPTY_KNOWLEDGE); const [knowledgeError,setKnowledgeError]=useState(''); const [loading,setLoading]=useState(true); const [setup,setSetup]=useState(false); const [flow,setFlow]=useState<{open:boolean;trigger?:string}>({open:false}); const [quick,setQuick]=useState(false); const [evening,setEvening]=useState(false);
  const configured=Boolean(publicEnv.supabaseUrl&&publicEnv.supabasePublishableKey);
  async function reloadKnowledgeForSession(s:Session=session as Session){try{const next=await loadKnowledge(s);setKnowledge(next);setKnowledgeError('');}catch(error){setKnowledgeError(error instanceof Error?error.message:'Не удалось загрузить библиотеку знаний');}}
  async function reload(s:Session=session as Session){const [next]=await Promise.all([loadBootstrap(s),reloadKnowledgeForSession(s)]);setData(next);return next;}
  useEffect(()=>{if(!configured){setLoading(false);return;}const supabase=getSupabase();if(!supabase)return;supabase.auth.getSession().then(async({data:{session:s}})=>{setSession(s);if(s)await reload(s);setLoading(false);});const {data:listener}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);if(!s){setData(null);setKnowledge(EMPTY_KNOWLEDGE);setKnowledgeError('');}});return()=>listener.subscription.unsubscribe();},[configured]);
  if(!configured)return <main className="r-login"><section className="r-login-card"><Brand/><h1>Не хватает настроек подключения.</h1><p>Интерфейс не получил адрес Supabase или публичный ключ. Секретные ключи сюда передавать нельзя.</p></section></main>;
  if(loading)return <main className="r-loading"><span/><p>Загружаю ALIVE…</p></main>;
  if(path==='/experiment'&&!session)return <Experiment/>;
  if(!session)return <Login/>;
  if(!data)return <main className="r-loading"><span/><p>Собираю личную карту…</p></main>;
  if(!data.profile.onboarding_completed_at||!data.products.length)return <Setup session={session} data={data} done={async()=>{await reload(session);}}/>;
  if(setup)return <Setup session={session} data={data} done={async()=>{await reload(session);setSetup(false);}} cancel={()=>setSetup(false)}/>;
  let page:ReactNode;
  if(path==='/links')page=<Links session={session} data={data} reload={()=>reload(session).then(()=>{})} openFlow={(trigger)=>setFlow({open:true,trigger})}/>;
  else if(path==='/path')page=<PathPage data={data}/>;
  else if(path==='/meanings')page=<Meanings session={session} data={data} reload={()=>reload(session).then(()=>{})}/>;
  else if(path==='/facts')page=<FactsPage session={session} knowledge={knowledge} error={knowledgeError} reloadKnowledge={()=>reloadKnowledgeForSession(session)}/>;
  else if(path==='/experiment')page=<Experiment/>;
  else if(path==='/profile')page=<Profile session={session} data={data} editSetup={()=>setSetup(true)}/>;
  else if(path==='/releases')page=<Releases/>;
  else page=<Today session={session} data={data} reload={()=>reload(session).then(()=>{})} openFlow={(trigger)=>setFlow({open:true,trigger})} openQuick={()=>setQuick(true)} openEvening={()=>setEvening(true)}/>;
  const standalone=path==='/experiment'||path==='/releases';
  return <>{!standalone&&<Header data={data} path={path}/>} {page}{flow.open&&<Guided session={session} data={data} knowledge={knowledge} close={()=>setFlow({open:false})} saved={()=>reload(session).then(()=>{})} initialTrigger={flow.trigger}/>} {quick&&<QuickUse session={session} data={data} close={()=>setQuick(false)} saved={()=>reload(session).then(()=>{})}/>} {evening&&<Evening session={session} data={data} close={()=>setEvening(false)} saved={()=>reload(session).then(()=>{})}/>}</>;
}
