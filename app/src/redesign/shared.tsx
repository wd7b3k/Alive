import { useEffect, useState, type ReactNode } from 'react';
import type { Bootstrap } from '../data';
import { getSupabase } from '../supabase';
import { navigateTo } from '../services/navigation';
import { Icon, type IconName } from '../ui-icons';
import logoUrl from '../assets/brand-logo-full.png';

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

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      className={`r-brand ${compact ? 'compact' : ''}`}
      onClick={() => navigateTo('/')}
      aria-label="ALIVE — на главную"
    >
      <img src={logoUrl} alt="ALIVE" />
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
            {data.profile.avatar_url ? (
              <img src={data.profile.avatar_url} alt="" referrerPolicy="no-referrer" />
            ) : (
              <Icon name="user" size={20} />
            )}
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
export async function startGoogleSignIn(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return 'Supabase не настроен';
  const result = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
  return result.error ? result.error.message : null;
}

export function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setBusy(true);
    setError('');
    const message = await startGoogleSignIn();
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <main className="r-login">
      <section className="r-login-card">
        <img src={logoUrl} className="r-login-logo" alt="ALIVE" />
        <p className="r-kicker">Некоммерческий эксперимент · метод ALIVE v1</p>
        <h1>Не запрещать себе — вернуть себе выбор</h1>
        <p className="r-lead">
          ALIVE помогает заметить, что именно запускает автоматический ритуал, понять, какое
          состояние ты на самом деле ищешь, и подобрать другой ответ — под конкретный момент.
        </p>
        <div className="r-login-actions">
          <ShellButton className="primary" onClick={start} disabled={busy}>
            {busy ? 'Открываю Google…' : 'Войти через Google'} <Icon name="arrow" size={18} />
          </ShellButton>
          <ShellButton className="ghost" onClick={() => navigateTo('/experiment')}>
            Как устроен эксперимент
          </ShellButton>
        </div>
        {error && <p className="r-error">{error}</p>}
        <p className="r-privacy">
          Google нужен только для входа. Поведенческие данные хранятся отдельно и защищаются
          правилами доступа PostgreSQL.
        </p>
      </section>
    </main>
  );
}
