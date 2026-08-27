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
 * **Сценарий разный на разных телефонах, и это главное в этом файле.** Первая версия
 * знала только про iPhone: она показывала «Поделиться → На экран „Домой“» всем, у кого
 * браузер не дал системного окна установки. На Android эти слова не значат ничего —
 * такого пункта в меню нет, — а пользователей Android больше. Теперь платформа
 * определяется явно, и каждая получает свой короткий путь.
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

export type Platform = 'android' | 'ios' | 'desktop';

/**
 * Платформа по строке браузера.
 *
 * Определяется ровно для того, чтобы выбрать слова инструкции, поэтому неизвестное
 * считается десктопом: там показывается QR-код, который не врёт ни на одном телефоне.
 * iPadOS 13+ представляется маком, поэтому одного `userAgent` мало — нужен признак
 * касания.
 */
export function detectPlatform(ua: string, touch: boolean): Platform {
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Macintosh/.test(ua) && touch) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export type InstallKind = 'one-tap' | 'android-menu' | 'ios-share' | 'qr';

/**
 * Какой сценарий показать.
 *
 * `one-tap` — единственный настоящий «в один клик»: браузер отдал событие установки, и
 * нажатие открывает системное окно. С декабря 2022 (Chrome 108 на мобильных) для этого
 * не нужен service worker — достаточно манифеста, который у продукта есть. Событие
 * приходит не сразу: Chrome ждёт около тридцати секунд на странице и хотя бы одно
 * нажатие, поэтому до него показывается путь через меню, а не пустая кнопка.
 *
 * Десктоп не получает кнопку установки намеренно: ярлык нужен на телефоне, и с большого
 * экрана быстрее всего туда попасть через QR-код.
 */
export function planInstall(platform: Platform, hasEvent: boolean): InstallKind {
  if (platform === 'desktop') return 'qr';
  if (hasEvent) return 'one-tap';
  return platform === 'ios' ? 'ios-share' : 'android-menu';
}

/** Событие Chrome, которого нет в типах DOM. */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Событие установки живёт в модуле, а не в компоненте.
 *
 * `beforeinstallprompt` приходит один раз за загрузку страницы. Слушатель внутри эффекта
 * терял его при любом уходе с главной: человек заглянул в «Факты», вернулся — компонент
 * смонтировался заново, а событие уже случилось и второй раз не придёт. Здесь оно
 * переживает размонтирование.
 */
let deferred: InstallEvent | null = null;
let installedNow = false;
let attached = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((notify) => notify());
}

function attach() {
  if (attached || typeof window === 'undefined') return;
  attached = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Без этого Chrome покажет собственную мини-плашку внизу экрана, и предложений
    // станет два: наше и его.
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    remember('installed');
    emit();
  });
}

function subscribe(notify: () => void): () => void {
  attach();
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/**
 * Карточка предложения.
 *
 * Отделена от решения о показе, чтобы каждый из четырёх сценариев можно было отрендерить
 * в тесте и прочитать глазами то, что увидит человек.
 */
export function InstallCard({
  kind,
  onInstall,
  onDismiss,
}: {
  kind: InstallKind;
  onInstall?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <section className="r-install">
      {/* Показываем ровно ту картинку, которая появится на экране телефона: обещание
          и результат должны совпадать буквально. */}
      <img className="r-install-icon" src="/icon-192.png" alt="" width={72} height={72} />
      <div className="r-install-body">
        <p className="r-kicker">Быстрый доступ</p>
        <h2>Открывать одним нажатием</h2>
        <p>Значок на экране телефона — как у обычного приложения. Без вкладок и адреса.</p>

        {kind === 'android-menu' && (
          <ol className="r-install-steps">
            <li>
              Меню браузера — <b>⋮</b> вверху справа
            </li>
            <li>
              <b>«Установить приложение»</b> — или «На главный экран»
            </li>
          </ol>
        )}

        {kind === 'ios-share' && (
          <ol className="r-install-steps">
            <li>
              Кнопка <b>«Поделиться»</b> внизу — квадрат со стрелкой
            </li>
            <li>
              <b>«На экран „Домой“»</b> → «Добавить»
            </li>
            <li>Войди один раз при первом открытии: на iPhone у ярлыка своё хранилище</li>
          </ol>
        )}

        <div className="r-install-actions">
          {kind === 'one-tap' && (
            <ShellButton className="primary" onClick={onInstall}>
              Установить <Icon name="arrow" size={18} />
            </ShellButton>
          )}
          <ShellButton className="ghost" onClick={onDismiss}>
            {kind === 'one-tap' || kind === 'qr' ? 'Не сейчас' : 'Понятно'}
          </ShellButton>
        </div>

        {kind === 'one-tap' && (
          <small className="r-install-note">Телефон спросит подтверждение</small>
        )}
      </div>

      {kind === 'qr' && (
        <div className="r-install-qr">
          <img src={qrUrl} alt="QR-код, ведущий на habitoff.ru" width={112} height={112} />
          <small>Наведи камеру телефона</small>
        </div>
      )}
    </section>
  );
}

export function InstallPrompt({ always = false }: { always?: boolean }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [hasEvent, setHasEvent] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    // `always` — точка входа в профиле: там блок показывается даже после отказа,
    // иначе передумавшему человеку некуда вернуться.
    if (!always && recalled()) return;
    setOpen(true);
    setPlatform(detectPlatform(window.navigator.userAgent, 'ontouchend' in document));
    setHasEvent(deferred !== null);
    return subscribe(() => {
      if (installedNow) {
        setOpen(false);
        return;
      }
      setHasEvent(deferred !== null);
    });
  }, [always]);

  if (!open) return null;

  async function install() {
    const event = deferred;
    if (!event) return;
    // Событие одноразовое: после `prompt()` его нельзя использовать снова, поэтому
    // ссылка снимается до вызова, а не после.
    deferred = null;
    setHasEvent(false);
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
    <InstallCard
      kind={planInstall(platform, hasEvent)}
      onInstall={() => void install()}
      onDismiss={dismiss}
    />
  );
}
