import { useEffect, useState } from 'react';
import { Icon } from '../ui-icons';
import { ShellButton } from './shared';
import qrUrl from '../assets/qr-habitoff.svg';

/**
 * Ярлык на домашнем экране.
 *
 * Продукт открывают в момент тяги — то есть тогда, когда искать вкладку в браузере
 * труднее всего. Ярлык на первом экране телефона убирает этот поиск: одно нажатие, и
 * человек уже внутри, без адресной строки и вкладок (`display: standalone` в манифесте).
 *
 * Блок стоит на главной, сразу под главным действием, и держится там, пока человек не
 * поставит ярлык или не откажется. Раньше он показывался один раз после настройки — то
 * есть ровно в тот момент, когда человек ещё не понимает, зачем ему это, и почти всегда
 * проходил мимо.
 *
 * Сессия сохраняется: Supabase держит её в хранилище браузера, и повторно входить не
 * нужно. **Кроме одного случая**, и о нём здесь сказано честно: на iPhone приложение с
 * домашнего экрана получает собственное хранилище, отдельное от Safari. Значит первый
 * заход внутри ярлыка попросит войти ещё раз — один раз. Умолчать значило бы пообещать
 * то, что не выполнится, и первое же нажатие это покажет.
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
 * `matchMedia` есть везде, где продукт работает, но проверки отсюда вызываются с главной —
 * то есть падение здесь уронило бы главный экран целиком ради предложения поставить
 * ярлык. Цена страховки — три строки.
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
  return media('(pointer: coarse)') || media('(max-width: 900px)') || isIos();
}

/** Событие Chrome, которого нет в типах DOM. */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Отметка «человек только что закончил настройку».
 *
 * Блок и так стоит на главной постоянно; отметка нужна, чтобы сразу после регистрации
 * показать его раскрытым с инструкцией, а не свёрнутой строкой.
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
  const [phone, setPhone] = useState(true);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    // `always` — точка входа в профиле: там блок показывается даже после отказа,
    // иначе передумавшему человеку некуда вернуться.
    if (!always && recalled()) return;
    setOpen(true);
    setPhone(isPhone());
    if (justOnboarded()) setSteps(isIos());
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
    <section className="r-install">
      {/* Показываем ровно ту картинку, которая появится на экране телефона: обещание
          и результат должны совпадать буквально. */}
      <img className="r-install-icon" src="/icon-192.png" alt="" width={72} height={72} />
      <div className="r-install-body">
        <p className="r-kicker">Быстрый доступ</p>
        <h2>Открывать одним нажатием, без поиска вкладки</h2>
        <p>
          Разбор нужен в момент тяги — тогда листать браузер труднее всего. С ярлыка продукт
          открывается сразу и без адресной строки, как обычное приложение. Ты остаёшься в своём
          аккаунте: заходить заново не нужно.
        </p>

        {steps && (
          <ol className="r-install-steps">
            <li>
              Нажми <b>Поделиться</b> внизу экрана — квадрат со стрелкой вверх.
            </li>
            <li>
              Выбери <b>На экран «Домой»</b>, подтверди <b>Добавить</b>.
            </li>
            <li>
              Открой ярлык и войди один раз: на iPhone у приложения с домашнего экрана своё
              хранилище, отдельное от Safari. Дальше вход не понадобится.
            </li>
          </ol>
        )}

        <div className="r-install-actions">
          {phone && !steps && (
            <ShellButton className="primary" onClick={install}>
              {event ? 'Добавить на экран' : 'Показать как'} <Icon name="arrow" size={18} />
            </ShellButton>
          )}
          <ShellButton className="ghost" onClick={dismiss}>
            {steps ? 'Готово' : 'Не сейчас'}
          </ShellButton>
        </div>
      </div>

      {!phone && (
        <div className="r-install-qr">
          <img src={qrUrl} alt="QR-код, ведущий на habitoff.ru" width={112} height={112} />
          <small>Наведи камеру телефона — и добавь ярлык уже там</small>
        </div>
      )}
    </section>
  );
}
