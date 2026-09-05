import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import type { Bootstrap } from '../data';
import { getSupabase } from '../supabase';
import { GOOGLE, fetchProviders, overrideFromEnv, type AuthProvider } from '../auth-providers';
import { reachStageGoal, trackAnonEvent } from '../services/analytics';
import { navigateTo } from '../services/navigation';
import { Icon, type IconName } from '../ui-icons';
import { ProviderMark, providerTile } from './provider-marks';
import { rememberConsent } from '../services/consent';
import logoUrl from '../assets/brand-logo-full.svg';

/**
 * Внутренний переход — ссылкой, а не кнопкой.
 *
 * До 31.08.2026 вся навигация продукта была кнопками с `onClick={() => navigateTo(...)}`.
 * Человеку с мышью разницы нет, всему остальному — принципиальная:
 *
 * - **робот не может уйти с главной.** В сыром HTML не было ни одного `<a href="/...">`,
 *   и обход держался на одной карте сайта: ссылочной связности у домена не было вовсе;
 * - **нельзя открыть в новой вкладке**, скопировать адрес, вернуться средней кнопкой;
 * - **скринридер не объявляет переход.** Кнопка без роли ссылки — это «кнопка», а не
 *   «ссылка на раздел Факты», и человек не знает, что сейчас сменится страница.
 *
 * Одностраничность при этом сохраняется: обычный левый клик перехватывается и уходит в
 * роутер, полной перезагрузки нет. А вот клик с Ctrl, Cmd, Shift или средней кнопкой
 * не перехватывается сознательно — это ровно те жесты, ради которых ссылка и нужна.
 *
 * Кнопкой остаётся всё, что не меняет адрес: «Записать», «Выйти», открыть модальное окно.
 */
function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function AppLink({
  href,
  children,
  className = '',
  label,
  title,
  current = false,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  label?: string;
  title?: string;
  /** Текущий раздел: `aria-current` объявляет его скринридеру, класс красит. */
  current?: boolean;
}) {
  return (
    <a
      href={href}
      className={`${className}${current ? ' active' : ''}`.trim()}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      title={title}
      onClick={(event) => {
        if (!isPlainLeftClick(event)) return;
        event.preventDefault();
        navigateTo(href);
      }}
    >
      {children}
    </a>
  );
}

/** То же самое, но с видом основной кнопки: переход, оформленный как действие. */
export function ShellLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppLink href={href} className={`r-button ${className}`.trim()}>
      {children}
    </AppLink>
  );
}

export function ShellButton({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`r-button ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="r-modal-backdrop"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section className={`r-modal ${wide ? 'r-modal-wide' : ''}`}>{children}</section>
    </div>
  );
}

/**
 * Инициалы вместо фотографии из Google.
 *
 * Раньше сюда подставлялся `avatar_url` из профиля Google. Это стоило двух вещей:
 * каждая страница Habitoff запрашивала картинку у `lh3.googleusercontent.com`, то есть
 * сообщала Google о посещении, — а в продукте, который обещает приватность, это плохой
 * размен ради украшения; и картинка приходила квадратной 96×96, а вставала в сетку
 * искажённой.
 *
 * Инициалы ничего не запрашивают, всегда одного размера и остаются узнаваемыми на
 * мелком размере в шапке.
 */
export function AvatarMark({ name }: { name: string | null }) {
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  if (!initials) {
    return <Icon name="user" size={20} />;
  }
  return (
    <span className="r-avatar-initials" aria-hidden="true">
      {initials}
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <AppLink
      href="/"
      className={`r-brand ${compact ? 'compact' : ''}`.trim()}
      label="Habitoff — на главную"
    >
      <img src={logoUrl} alt="Habitoff" />
    </AppLink>
  );
}

// Шесть пунктов. «Факты» и «Вместе» — места, куда возвращаются, и спрятанный за
// «Сегодня» раздел превращается в баннер, а не в раздел.
//
// Шесть — это на один больше, чем обычно советуют для нижней панели, и цена честная:
// на 360px каждая ячейка становится 60px. Проверено на реальной ширине, а не на глаз.
//
// Число колонок в redesign.css не записано: панель раскладывается по числу пришедших
// кнопок (`grid-auto-flow:column`). Записанное число ошибалось дважды в обе стороны —
// пятиколоночная сетка срезала шестой пункт, шестиколоночная оставляла до входа пустую
// колонку справа, и панель прижималась к левому краю.
const MAIN_NAV: ReadonlyArray<[string, string, IconName]> = [
  ['/', 'Сегодня', 'spark'],
  ['/links', 'Связки', 'chain'],
  ['/path', 'Путь', 'path'],
  ['/meanings', 'Смыслы', 'meaning'],
  ['/knowledge', 'Факты', 'shield'],
  ['/together', 'Вместе', 'people'],
];

/**
 * Что видно до входа.
 *
 * «Путь» и «Вместе» сюда не входят и это не забывчивость: путь строится на твоих
 * эпизодах, «Вместе» — на агрегатах участников. Без аккаунта обе страницы показали бы
 * пустые графики, и человек решил бы, что продукт пустой, а не что он ещё не вошёл.
 *
 * Всё остальное — редакционный каталог, он открыт для чтения ролью `anon` и одинаков
 * для всех. Прятать его за входом значит требовать аккаунт за право посмотреть, о чём
 * вообще речь.
 */
export const PUBLIC_NAV: ReadonlyArray<[string, string, IconName]> = [
  ['/', 'Главная', 'spark'],
  ['/links', 'Связки', 'chain'],
  ['/meanings', 'Смыслы', 'meaning'],
  ['/knowledge', 'Факты', 'shield'],
  ['/experiment', 'О методе', 'question'],
];

export function PublicHeader({ path }: { path: string }) {
  return (
    <>
      <header className="r-header r-header-public">
        <Brand />
        <nav className="r-desktop-nav">
          {PUBLIC_NAV.map(([href, label, icon]) => (
            <AppLink key={href} href={href} current={path === href}>
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </AppLink>
          ))}
        </nav>
        <div className="r-header-tools">
          <ShellLink href="/login" className="primary small">
            Войти
          </ShellLink>
        </div>
      </header>
      <nav className="r-mobile-nav">
        {PUBLIC_NAV.map(([href, label, icon]) => (
          <AppLink key={href} href={href} current={path === href}>
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </AppLink>
        ))}
      </nav>
    </>
  );
}

export function Header({ data, path }: { data: Bootstrap; path: string }) {
  return (
    <>
      <header className="r-header">
        <Brand />
        <nav className="r-desktop-nav">
          {MAIN_NAV.map(([href, label, icon]) => (
            <AppLink key={href} href={href} current={path === href}>
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </AppLink>
          ))}
        </nav>
        <div className="r-header-tools">
          <AppLink href="/experiment" className="r-method-link">
            О методе
          </AppLink>
          <AppLink href="/profile" className="r-avatar" title="Профиль" label="Профиль">
            <AvatarMark name={data.profile.display_name} />
          </AppLink>
        </div>
      </header>
      <nav className="r-mobile-nav">
        {MAIN_NAV.map(([href, label, icon]) => (
          <AppLink key={href} href={href} current={path === href}>
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </AppLink>
        ))}
      </nav>
    </>
  );
}

/**
 * Starts Google sign-in and returns an error message, or null on success.
 *
 * Shared rather than inlined per screen: since the owner's 2026-08-22 decision the
 * product opens before sign-in, so several controls across the pre-login surface can
 * each be the moment an account first becomes necessary. They must all raise the same
 * flow — one implementation means one redirect target and one failure path.
 */
/**
 * Открывает вход у выбранного провайдера.
 *
 * `provider` уходит в Supabase строкой, потому что кастомные провайдеры называются
 * `custom:<имя>` и в union типов клиента их нет. Проверять эту строку здесь нечем:
 * настроен провайдер или нет, знает только проект Supabase, и он же скажет об этом
 * ошибкой, которую увидит человек.
 */
/**
 * Провайдеры, вход которых живёт своим мостом на этом же домене.
 *
 * GoTrue знать о них не может: в self-hosted список внешних провайдеров фиксирован, и
 * Яндекса в нём нет. Плюс GoTrue ищет claim `email`, а Яндекс отдаёт `default_email` —
 * настройкой это не лечится. Поэтому обмен кода на профиль делает наша функция, а
 * кнопка просто уводит на неё.
 */
const BRIDGED: Record<string, string> = {
  yandex: '/functions/v1/yandex/start',
  'custom:yandex': '/functions/v1/yandex/start',
};

export async function startSignIn(provider = 'google'): Promise<string | null> {
  const bridge = BRIDGED[provider];
  if (bridge) {
    // Навигация верхнего уровня, а не fetch: дальше человек попадает на страницу
    // согласия Яндекса, и это должен быть настоящий переход.
    window.location.assign(bridge);
    return null;
  }
  const supabase = getSupabase();
  if (!supabase) return 'Supabase не настроен';
  const result = await supabase.auth.signInWithOAuth({
    provider: provider as Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider'],
    options: { redirectTo: `${window.location.origin}/` },
  });
  return result.error ? result.error.message : null;
}

export function LoginPage() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [consented, setConsented] = useState(false);
  // Пока Supabase не ответил, показываем Google: это способ, которым люди уже входят, и
  // мигать кнопками на экране входа хуже, чем показать одну верную сразу.
  const [providers, setProviders] = useState<AuthProvider[]>(() => overrideFromEnv() ?? [GOOGLE]);

  useEffect(() => {
    if (overrideFromEnv()) return;
    let mounted = true;
    fetchProviders().then((list) => {
      if (mounted && list) setProviders(list);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function start(provider: AuthProvider) {
    if (!consented) return;
    // Отметка ставится до ухода к провайдеру: обратно человек вернётся уже другой
    // загрузкой страницы, и состояние компонента до неё не доживёт.
    rememberConsent();
    // Последнее событие, которое можно записать до входа: дальше человек уходит к
    // провайдеру. Пара «нажал кнопку» и «профиль создан» показывает, сколько людей
    // теряется на самом входе — до 28.08 этот отрезок не считался ничем.
    trackAnonEvent({
      event_type: 'auth_provider_click',
      surface: 'login',
      funnel_stage: 'landing',
      metadata: { provider: provider.id },
    });
    // Цель, а не событие: событие про нажатие и уходит при каждом, цель про человека
    // и уходит один раз. Пара «этап → цель» живёт в STAGE_TO_GOAL.
    reachStageGoal('landing');
    setBusy(provider.id);
    setError('');
    const message = await startSignIn(provider.id);
    if (message) {
      setError(message);
      setBusy('');
      trackAnonEvent({
        event_type: 'auth_provider_failed',
        surface: 'login',
        metadata: { provider: provider.id },
      });
    }
  }

  return (
    <main className="r-login">
      <section className="r-login-card split">
        <div className="r-login-copy">
          <img src={logoUrl} className="r-login-logo" alt="Habitoff" />
          <p className="r-kicker">Некоммерческий эксперимент · метод Habitoff v1</p>
          <h1>Не запрещать себе — вернуть себе выбор</h1>
          <p className="r-lead">
            Habitoff помогает заметить, что именно запускает автоматический ритуал, понять, какое
            состояние ты на самом деле ищешь, и подобрать другой ответ — под конкретный момент.
          </p>
        </div>
        <div className="r-login-enter">
          <label className="r-consent">
            <input
              type="checkbox"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
            />
            <span id="consent-note">
              Я понимаю, что это исследование, и даю согласие на участие. Сайт считает посещения
              Яндекс Метрикой и Google Analytics — без записи экрана и без содержимого личных
              записей; Google обрабатывает эти данные за пределами России.{' '}
              <AppLink href="/experiment" className="r-linklike">
                Как устроен эксперимент
              </AppLink>
            </span>
          </label>
          <div className="r-login-actions">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className="r-provider"
                onClick={() => start(provider)}
                disabled={busy !== '' || !consented}
                aria-busy={busy === provider.id}
                aria-describedby="consent-note"
              >
                <span className="r-provider-mark" style={{ background: providerTile(provider.id) }}>
                  <ProviderMark id={provider.id} />
                </span>
                <span className="r-provider-text">
                  <strong>
                    {busy === provider.id
                      ? `Открываю ${provider.opening}…`
                      : `Войти через ${provider.label}`}
                  </strong>
                  <small>
                    {busy === provider.id
                      ? 'Открывается страница провайдера'
                      : 'Подтвердит, что это ты, и вернёт сюда'}
                  </small>
                </span>
                <Icon name="arrow" size={18} />
              </button>
            ))}
            <div className="r-login-alt">
              <ShellLink href="/knowledge" className="ghost">
                Сначала почитать Факты
              </ShellLink>
            </div>
          </div>
          {error && <p className="r-error">{error}</p>}
          <p className="r-privacy">
            {providers.length > 1
              ? 'Любой из этих аккаунтов нужен только для входа.'
              : `${providers[0].label} нужен только для входа.`}{' '}
            Поведенческие данные хранятся отдельно и защищаются правилами доступа PostgreSQL.
          </p>
        </div>
      </section>
    </main>
  );
}
