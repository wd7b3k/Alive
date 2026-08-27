import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { InstallCard, detectPlatform, planInstall, type InstallKind } from './install';

/**
 * Ярлык на домашнем экране.
 *
 * Первая версия блока знала только про iPhone: всем, у кого браузер не отдал системное
 * окно установки, она показывала «Поделиться → На экран „Домой“». На Android такого
 * пункта в меню нет, а пользователей Android больше — то есть большинство получало
 * инструкцию, которую невозможно выполнить. Тесты ниже держат именно эту границу.
 */

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  androidYandex:
    'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/24.1.0.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

const html = (kind: InstallKind) => renderToStaticMarkup(<InstallCard kind={kind} />);

describe('определение платформы', () => {
  it('узнаёт Android по строке браузера', () => {
    expect(detectPlatform(UA.androidChrome, true)).toBe('android');
    expect(detectPlatform(UA.androidYandex, true)).toBe('android');
  });

  it('узнаёт iPhone', () => {
    expect(detectPlatform(UA.iphone, true)).toBe('ios');
  });

  /** iPadOS 13+ представляется маком: без признака касания он неотличим от десктопа. */
  it('отличает iPad от мака по касанию', () => {
    expect(detectPlatform(UA.ipad, true)).toBe('ios');
    expect(detectPlatform(UA.ipad, false)).toBe('desktop');
  });

  it('незнакомое считает десктопом', () => {
    expect(detectPlatform(UA.windows, false)).toBe('desktop');
    expect(detectPlatform('', false)).toBe('desktop');
  });
});

describe('выбор сценария', () => {
  it('даёт установку в одно нажатие, когда браузер отдал событие', () => {
    expect(planInstall('android', true)).toBe('one-tap');
    expect(planInstall('ios', true)).toBe('one-tap');
  });

  /**
   * Событие приходит не сразу: Chrome ждёт около тридцати секунд на странице. До него
   * человек обязан видеть путь через меню своей платформы, а не кнопку, которая ничего
   * не сделает.
   */
  it('до события ведёт через меню своей платформы', () => {
    expect(planInstall('android', false)).toBe('android-menu');
    expect(planInstall('ios', false)).toBe('ios-share');
  });

  it('с десктопа всегда предлагает QR, даже если событие есть', () => {
    expect(planInstall('desktop', false)).toBe('qr');
    expect(planInstall('desktop', true)).toBe('qr');
  });
});

describe('текст карточки', () => {
  it('на Android не показывает ни одного слова из инструкции iPhone', () => {
    const markup = html('android-menu');
    for (const foreign of ['Поделиться', 'Домой', 'iPhone', 'Safari']) {
      expect(markup, `на Android не должно быть слова «${foreign}»`).not.toContain(foreign);
    }
    expect(markup).toContain('Установить приложение');
    expect(markup).toContain('На главный экран');
  });

  it('на iPhone не показывает меню Chrome', () => {
    const markup = html('ios-share');
    expect(markup).toContain('Поделиться');
    expect(markup).not.toContain('Установить приложение');
    expect(markup).not.toContain('главный экран');
  });

  /**
   * На Android сессия у ярлыка общая с браузером, и повторный вход не нужен. Оговорка
   * про отдельное хранилище — правда только про iPhone, и стоять она должна только там,
   * иначе это лишний повод не ставить ярлык.
   */
  it('предупреждает про повторный вход только там, где это правда', () => {
    expect(html('ios-share')).toContain('своё хранилище');
    for (const kind of ['android-menu', 'one-tap', 'qr'] as const) {
      expect(html(kind), kind).not.toContain('хранилище');
    }
  });

  it('в сценарии одного нажатия даёт кнопку и ничего не объясняет шагами', () => {
    const markup = html('one-tap');
    expect(markup).toContain('Установить');
    expect(markup).toContain('Телефон спросит подтверждение');
    expect(markup).not.toContain('r-install-steps');
  });

  it('на десктопе показывает QR и не показывает кнопку установки', () => {
    const markup = html('qr');
    expect(markup).toContain('r-install-qr');
    expect(markup).not.toContain('r-button primary');
  });

  /** Слева стоит тот самый файл, который появится на экране телефона. */
  it('во всех сценариях показывает настоящую иконку', () => {
    for (const kind of ['one-tap', 'android-menu', 'ios-share', 'qr'] as const) {
      expect(html(kind), kind).toContain('/icon-192.png');
    }
  });
});
