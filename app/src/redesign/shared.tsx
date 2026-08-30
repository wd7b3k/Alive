import { useEffect, useState, type ReactNode } from 'react';
import type { Bootstrap } from '../data';
import { getSupabase } from '../supabase';
import { GOOGLE, fetchProviders, overrideFromEnv, type AuthProvider } from '../auth-providers';
import { trackAnonEvent } from '../services/analytics';
import { trackGoal } from '../services/counters';
import { navigateTo } from '../services/navigation';
import { Icon, type IconName } from '../ui-icons';
import { ProviderMark, providerTile } from './provider-marks';
import { rememberConsent } from '../services/consent';
import logoUrl from '../assets/brand-logo-full.svg';

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
    <button
      type="button"
      className={`r-brand ${compact ? 'compact' : ''}`}
      onClick={() => navigateTo('/')}
      aria-label="Habitoff — на главную"
    >
      <img src={logoUrl} alt="Habitoff" />
    </button>
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
const PUBLIC_NAV: ReadonlyArray<[string, string, IconName]> = [
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
            <button
              key={href}
              type="button"
              className={path === href ? 'active' : ''}
              onClick={() => navigateTo(href)}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="r-header-tools">
          <ShellButton className="primary small" onClick={() => navigateTo('/login')}>
            Войти
          </ShellButton>
        </div>
      </header>
      <nav className="r-mobile-nav">
        {PUBLIC_NAV.map(([href, label, icon]) => (
          <button
            key={href}
            type="button"
            className={path === href ? 'active' : ''}
            onClick={() => navigateTo(href)}
          >
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </button>
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
            <button
              key={href}
              type="button"
              className={path === href ? 'active' : ''}
              onClick={() => navigateTo(href)}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="r-header-tools">
          <button type="button" className="r-method-link" onClick={() => navigateTo('/experiment')}>
            О методе
          </button>
          <button
            type="button"
            className="r-avatar"
            onClick={() => navigateTo('/profile')}
            title="Профиль"
          >
            <AvatarMark name={data.profile.display_name} />
          </button>
        </div>
      </header>
      <nav className="r-mobile-nav">
        {MAIN_NAV.map(([href, label, icon]) => (
          <button
            key={href}
            type="button"
            className={path === href ? 'active' : ''}
            onClick={() => navigateTo(href)}
          >
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </button>
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
    trackGoal('auth_started');
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
              <button
                type="button"
                className="r-linklike"
                onClick={() => navigateTo('/experiment')}
              >
                Как устроен эксперимент
              </button>
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
              <ShellButton className="ghost" onClick={() => navigateTo('/knowledge')}>
                Сначала почитать Факты
              </ShellButton>
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
