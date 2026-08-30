import { describe, expect, it } from 'vitest';

import { SHARE_SOURCE, shareText, shareUrl } from './share';

const PRIVATE_WORDS = ['тяга', 'заметк', 'связк', 'кофе', 'стресс', '/10'];

describe('shareText', () => {
  it('names the replacement when one helped', () => {
    expect(shareText('90 секунд длинного выдоха')).toContain('90 секунд длинного выдоха');
  });

  it('still says something worth sending when no replacement was chosen', () => {
    const text = shareText(null);
    expect(text).not.toContain('Сработало');
    expect(text.length).toBeGreaterThan(40);
  });

  it('carries nothing private, whatever the replacement is called', () => {
    const text = shareText('Прогулка').toLowerCase();
    for (const word of PRIVATE_WORDS) expect(text).not.toContain(word);
  });

  /**
   * Адрес уезжает отдельным полем `url`, поэтому в тексте его быть не должно: иначе
   * получатель увидит ссылку дважды, а часть приложений склеит её с последним словом.
   */
  it('не вклеивает адрес в текст', () => {
    const text = shareText('Прогулка');
    expect(text).not.toContain('http');
    expect(text).not.toContain('habitoff.ru');
  });
});

describe('shareUrl', () => {
  it('помечает ссылку источником, который читают собственные счётчики', () => {
    const url = new URL(shareUrl('https://habitoff.example'));
    expect(url.origin).toBe('https://habitoff.example');
    expect(url.searchParams.get('utm_source')).toBe(SHARE_SOURCE);
    expect(url.searchParams.get('utm_medium')).toBe('share');
  });

  /**
   * `readAttribution` в services/visitor.ts объявляет заход кампанией по наличию
   * `utm_source` — то есть метка попадает в `analytics_visitors` и в витрину
   * `admin_sources` без единой правки на той стороне. Если поле переименуют, упадёт
   * здесь, а не через месяц в отчёте, где приход по совету друга снова станет «direct».
   */
  it('пользуется теми полями, которые уже разбирает readAttribution', () => {
    expect(shareUrl('https://habitoff.example')).toContain('utm_source=');
  });

  it('не ломается и остаётся рабочей ссылкой, когда origin пустой', () => {
    expect(() => new URL(shareUrl(''))).not.toThrow();
    expect(shareUrl('')).toContain('habitoff.ru');
  });
});
