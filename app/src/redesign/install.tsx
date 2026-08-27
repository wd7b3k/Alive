import { useEffect, useState } from 'react';
import { Icon } from '../ui-icons';
import { ShellButton } from './shared';

/**
 * Ярлык Habitoff на домашнем экране.
 *
 * Продукт открывают в момент тяги — то есть тогда, когда искать вкладку в браузере
 * труднее всего. Ярлык на первом экране телефона убирает этот поиск: одно нажатие, и
 * человек уже внутри, без адресной строки и вкладок (`display: standalone` в манифесте).
 *
 * Сессия при этом сохраняется: Supabase держит её в хранилище браузера, и повторно
 * входить не нужно. **Кроме одного случая**, и о нём здесь сказано честно: на iPhone
 * приложение с домашнего экрана получает собственное хранилище, отдельное от Safari.
 * Значит первый заход внутри ярлыка попросит войти ещё раз — один раз. Умолчать об этом
 * значило бы пообещать то, что не выполнится, и первое же нажатие это покажет.
 */

const KEY = 'habitoff.install';

type Outcome = 'installed' | 'dismissed' | 'later';

function remember(outcome: Outcome) {
  try {
    window.localStorage.setItem(KEY, outcome);
  } catch {
    /* приватное окно — просто предложим ещё раз */
  }
}

function recalled(): Outcome | null {
  try {
    return window.localStorage.getItem(KEY) as Outcome | null;
  } catch {
    return null;
  }
}

/**
 * Медиазапрос без падения.
 *
 * `matchMedia` есть везде, где продукт работает, но проверки отсюда вызываются с экрана
 * «Сегодня» — то есть падение здесь уронило бы главный экран целиком ради предложения
 * поставить ярлык. Цена страховки — три строки.
 */
function media(query: string): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** Ярлык уже открыт как приложение — предлагать нечего. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return iosStandalone || media('(display-mode: standalone)');
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  // iPadOS 13+ представляется маком, поэтому одного userAgent мало.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
}

function isPhone(): boolean {
  return media('(max-width: 900px)') || isIos();
}

/** Событие Chrome, которого нет в типах DOM. */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Отметка «человек только что закончил настройку».
 *
 * Предложение показывается сразу после регистрации, а не при каждом заходе: это первый
 * момент, когда понятно, что человек остаётся, и последний, когда он ещё настроен
 * что-то настраивать.
 */
export function markJustOnboarded() {
  try {
    window.sessionStorage.setItem('habitoff.onboarded', '1');
  } catch {
    /* переживём */
  }
}

function justOnboarded(): boolean {
  try {
    return window.sessionStorage.getItem('habitoff.onboarded') === '1';
  } catch {
    return false;
  }
}

export function InstallPrompt({ always = false }: { always?: boolean }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const decided = recalled();
    const wanted = always || (justOnboarded() && !decided);
    if (!wanted) return;
    if (!always && !isPhone()) return;
    setOpen(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [always]);

  if (!open) return null;

  async function install() {
    if (!event) {
      // Safari своего диалога не даёт — показываем, куда нажать.
      setSteps(true);
      return;
    }
    await event.prompt();
    const choice = await event.userChoice;
    remember(choice.outcome === 'accepted' ? 'installed' : 'later');
    if (choice.outcome === 'accepted') setOpen(false);
  }

  function dismiss() {
    remember('dismissed');
    setOpen(false);
  }

  return (
    <div className="r-install">
      <span className="r-install-mark">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M22.31 6.99A11 11 0 1 1 9.69 6.99"
            fill="none"
            stroke="#51ddd0"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="16" cy="5" r="2.4" fill="#f2ca69" />
        </svg>
      </span>
      <div className="r-install-body">
        <strong>Ярлык на домашнем экране</strong>
        <p>
          Разбор нужен в момент тяги — тогда искать вкладку труднее всего. Ярлык на первом экране
          открывает продукт одним нажатием, без адресной строки, и ты уже внутри.
        </p>
        {steps && (
          <ol>
            <li>
              Нажми <b>Поделиться</b> внизу экрана — квадрат со стрелкой вверх.
            </li>
            <li>
              Выбери <b>На экран «Домой»</b>.
            </li>
            <li>
              Подтверди <b>Добавить</b>.
            </li>
            <li>
              Открой ярлык и войди один раз: на iPhone у приложения с домашнего экрана своё
              хранилище, отдельное от Safari. Дальше вход не понадобится.
            </li>
          </ol>
        )}
        <div className="r-install-actions">
          {!steps && (
            <ShellButton className="primary small" onClick={install}>
              {event ? 'Добавить на экран' : 'Как добавить'} <Icon name="arrow" size={16} />
            </ShellButton>
          )}
          <ShellButton className="ghost small" onClick={dismiss}>
            {steps ? 'Готово' : 'Не сейчас'}
          </ShellButton>
        </div>
      </div>
      <button className="r-install-close" onClick={dismiss} aria-label="Скрыть предложение">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
