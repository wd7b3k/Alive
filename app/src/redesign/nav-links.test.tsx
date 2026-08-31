import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PUBLIC_NAV, PublicHeader } from './shared';

/**
 * Навигация обязана быть ссылками и в приложении, а не только в статическом слепке.
 *
 * До 31.08.2026 всё меню было кнопками с `onClick={() => navigateTo(...)}`. Пререндер
 * можно починить отдельно, и тогда робот увидит ссылки, а человек со скринридером —
 * по-прежнему «кнопку» вместо «ссылки на раздел Факты», и по-прежнему не сможет
 * открыть раздел в новой вкладке. Этот тест смотрит на то, что рисует React.
 */
const markup = renderToStaticMarkup(<PublicHeader path="/knowledge" />);

describe('меню до входа', () => {
  it('каждый пункт — настоящая ссылка с адресом', () => {
    for (const [href] of PUBLIC_NAV) {
      expect(markup, href).toContain(`href="${href}"`);
    }
  });

  it('текущий раздел объявлен скринридеру, а не только покрашен', () => {
    expect(markup).toMatch(/<a[^>]*href="\/knowledge"[^>]*aria-current="page"/);
  });

  it('вход и знак тоже ссылки: их адреса существуют', () => {
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/"');
  });

  it('ссылок в меню не меньше, чем пунктов', () => {
    const links = [...markup.matchAll(/<a[^>]*href="(\/[^"]*)"/g)].map((m) => m[1]);
    expect(new Set(links).size).toBeGreaterThanOrEqual(PUBLIC_NAV.length);
  });
});
