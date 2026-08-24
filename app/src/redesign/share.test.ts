import { describe, expect, it } from 'vitest';

import { shareText } from './share';

const PRIVATE_WORDS = ['тяга', 'заметк', 'связк', 'кофе', 'стресс', '/10'];

describe('shareText', () => {
  it('names the replacement when one helped', () => {
    const text = shareText('90 секунд длинного выдоха', 'https://alive.example');
    expect(text).toContain('90 секунд длинного выдоха');
    expect(text).toContain('https://alive.example');
  });

  it('still says something worth sending when no replacement was chosen', () => {
    const text = shareText(null, 'https://alive.example');
    expect(text).not.toContain('Сработало');
    expect(text.length).toBeGreaterThan(40);
  });

  it('carries nothing private, whatever the replacement is called', () => {
    const text = shareText('Прогулка', 'https://alive.example').toLowerCase();
    for (const word of PRIVATE_WORDS) expect(text).not.toContain(word);
  });

  it('does not break when the origin is empty', () => {
    expect(shareText('Прогулка', '')).toContain('Прогулка'.toLowerCase());
  });
});
