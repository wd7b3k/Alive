// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminBoard } from './admin-board';

/**
 * Разворот доски на всё окно.
 *
 * Единственное, что здесь по-настоящему опасно, — пересоздание узла `<iframe>`. Доска
 * внутри рамки это чужая страница со своим состоянием: выбранный вид, фильтры,
 * прокрутка и ручные правки, которые до выгрузки в `overrides.json` лежат только в
 * `localStorage` браузера. Новый узел значит перезагрузку и потерю всего этого — молча,
 * без единой ошибки в консоли. Замечается такое через неделю, по пропавшим правкам,
 * поэтому граница держится тестом, а не внимательностью.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: { root: Root; container: HTMLElement } | null = null;

afterEach(() => {
  if (!mounted) return;
  const { root, container } = mounted;
  mounted = null;
  act(() => root.unmount());
  container.remove();
});

/** Живой раздел в jsdom: нужен настоящий DOM, разметки строкой здесь не хватит. */
function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<AdminBoard />));
  mounted = { root, container };
  const frame = container.querySelector('iframe');
  const button = container.querySelector('button');
  if (!frame || !button) throw new Error('в разделе нет рамки или кнопки разворота');
  return { container, frame, button, click: () => act(() => button.click()) };
}

/**
 * Значение `srcdoc` из готовой разметки: сравнивать 200 КБ целиком незачем.
 *
 * Регистр не фиксируется: React отдаёт атрибут как `srcDoc`, браузер читает его как
 * `srcdoc`, и обе записи одинаково верны.
 */
function srcdocOf(markup: string): string {
  const found = /\ssrcdoc="([^"]*)"/i.exec(markup);
  if (!found) throw new Error('в разметке нет srcdoc');
  return found[1];
}

describe('раздел «Доска»: разворот на всё окно', () => {
  it('переключает состояние на том же узле рамки, а не пересоздаёт его', () => {
    const { container, frame, button, click } = mount();

    click();
    expect(container.querySelector('iframe'), 'рамка после разворота — новый узел').toBe(frame);
    expect(frame.className).toContain('r-board-frame-full');

    click();
    expect(container.querySelector('iframe'), 'рамка после сворачивания — новый узел').toBe(frame);
    expect(frame.className).not.toContain('r-board-frame-full');

    // И кнопка та же: разные узлы кнопки означали бы, что перерисовывается всё поддерево.
    expect(container.querySelector('button')).toBe(button);
  });

  /**
   * То же самое, но с той стороны, с какой это видит человек: внутри рамки живёт
   * состояние страницы доски, и разворот не смеет его обнулить. Скрипты шаблона в jsdom
   * не выполняются, поэтому проверяется само окно рамки — то, что переживает или не
   * переживает переключение вместе с выбранным видом, фильтрами и прокруткой.
   */
  it('сохраняет окно рамки со всем, что в нём нажато', () => {
    const { container, frame, click } = mount();
    const inside = frame.contentWindow as unknown as Record<string, unknown>;
    expect(inside, 'у рамки нет окна — проверять нечего').toBeTruthy();
    inside.habitoffBoardState = 'вид «Доска», фильтр P0';

    click();

    const afterExpand = container.querySelector('iframe')!.contentWindow as unknown as Record<
      string,
      unknown
    >;
    expect(afterExpand.habitoffBoardState).toBe('вид «Доска», фильтр P0');

    click();

    const afterCollapse = container.querySelector('iframe')!.contentWindow as unknown as Record<
      string,
      unknown
    >;
    expect(afterCollapse.habitoffBoardState).toBe('вид «Доска», фильтр P0');
  });

  it('не меняет srcDoc при переключении: другая строка перезагрузила бы доску', () => {
    const { frame, click } = mount();
    const before = frame.getAttribute('srcdoc');

    click();

    expect(frame.getAttribute('srcdoc')).toBe(before);
    expect(before?.length ?? 0).toBeGreaterThan(1000);
  });

  it('сворачивается по Escape и возвращает прокрутку документу', () => {
    const { frame, click } = mount();
    document.body.style.overflow = 'scroll';

    click();
    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(frame.className).not.toContain('r-board-frame-full');
    expect(document.body.style.overflow, 'прокрутка не вернулась как было').toBe('scroll');
  });

  /** Уйти с раздела развёрнутым — не повод оставить страницу без прокрутки навсегда. */
  it('возвращает прокрутку и при размонтировании', () => {
    const { click } = mount();
    document.body.style.overflow = '';

    click();
    expect(document.body.style.overflow).toBe('hidden');

    const { root, container } = mounted!;
    mounted = null;
    act(() => root.unmount());
    container.remove();

    expect(document.body.style.overflow).toBe('');
  });
});

describe('раздел «Доска»: разметка обоих состояний', () => {
  const markup = renderToStaticMarkup(<AdminBoard />);

  it('в свёрнутом виде даёт кнопку «Развернуть» с aria-pressed="false"', () => {
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('>Развернуть<');
    expect(markup).toContain('class="r-board-frame"');
    expect(markup).not.toContain('r-board-frame-full');
    expect(markup).not.toContain('r-board-bar-float');
  });

  /**
   * Разметку развёрнутого состояния `renderToStaticMarkup` сам не даст: состояние живёт
   * в компоненте. Поэтому берём её из живого узла — там же, где она и оказывается.
   */
  it('в развёрнутом виде меняет класс рамки, надпись и aria-pressed', () => {
    const { container, click } = mount();
    click();

    const expandedFrame = container.querySelector('iframe')!;
    const expandedButton = container.querySelector('button')!;
    expect(expandedFrame.className).toBe('r-board-frame r-board-frame-full');
    expect(expandedButton.getAttribute('aria-pressed')).toBe('true');
    expect(expandedButton.textContent).toBe('Свернуть');
    expect(expandedButton.getAttribute('title')).toContain('Escape');
    expect(container.querySelector('.r-board-bar')!.className).toContain('r-board-bar-float');
  });

  it('подставляет в рамку данные, а не плейсхолдеры шаблона', () => {
    const { frame, click } = mount();
    const collapsed = frame.getAttribute('srcdoc');
    click();

    expect(frame.getAttribute('srcdoc'), 'srcDoc изменился при развороте').toBe(collapsed);
    for (const source of [collapsed ?? '', srcdocOf(markup)]) {
      expect(source.length).toBeGreaterThan(1000);
      expect(source).not.toContain('__CARDS_JSON__');
      expect(source).not.toContain('__OVERRIDES_JSON__');
    }
  });
});
