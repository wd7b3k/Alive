import { useEffect, useState, type ReactNode } from 'react';
import type { Bootstrap } from '../data';
import { getSupabase } from '../supabase';
import { GOOGLE, fetchProviders, overrideFromEnv, type AuthProvider } from '../auth-providers';
import { navigateTo } from '../services/navigation';
import { Icon, type IconName } from '../ui-icons';
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
// на 360px каждая ячейка становится 60px. Проверено на реальной ширине, а не на глаз;
// сетка в redesign.css расширена до шести колонок — панель, оставшаяся пятиколоночной,
// молча срезала бы последний пункт.
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
export async function startSignIn(provider = 'google'): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return 'Supabase не настроен';
  const result = await supabase.auth.signInWithOAuth({
    provider: provider as Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider'],
    options: { redirectTo: `${window.location.origin}/` },
  });
  return result.error ? result.error.message : null;
}

/** Прежнее имя: вызовов много, и переименовывать их все ради одного смысла незачем. */
export const startGoogleSignIn = () => startSignIn('google');

export function LoginPage() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
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
    setBusy(provider.id);
    setError('');
    const message = await startSignIn(provider.id);
    if (message) {
      setError(message);
      setBusy('');
    }
  }

  return (
    <main className="r-login">
      <section className="r-login-card">
        <img src={logoUrl} className="r-login-logo" alt="Habitoff" />
        <p className="r-kicker">Некоммерческий эксперимент · метод Habitoff v1</p>
        <h1>Не запрещать себе — вернуть себе выбор</h1>
        <p className="r-lead">
          Habitoff помогает заметить, что именно запускает автоматический ритуал, понять, какое
          состояние ты на самом деле ищешь, и подобрать другой ответ — под конкретный момент.
        </p>
        <div className="r-login-actions">
          {providers.map((provider, index) => (
            <ShellButton
              key={provider.id}
              className={index === 0 ? 'primary' : 'ghost'}
              onClick={() => start(provider)}
              disabled={busy !== ''}
            >
              {busy === provider.id
                ? `Открываю ${provider.opening}…`
                : `Войти через ${provider.label}`}{' '}
              <Icon name="arrow" size={18} />
            </ShellButton>
          ))}
          <ShellButton className="ghost" onClick={() => navigateTo('/experiment')}>
            Как устроен эксперимент
          </ShellButton>
        </div>
        {error && <p className="r-error">{error}</p>}
        <p className="r-privacy">
          {providers.length > 1
            ? 'Любой из этих аккаунтов нужен только для входа.'
            : `${providers[0].label} нужен только для входа.`}{' '}
          Поведенческие данные хранятся отдельно и защищаются правилами доступа PostgreSQL.
        </p>
      </section>
    </main>
  );
}
