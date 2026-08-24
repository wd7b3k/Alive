import { describe, expect, it } from 'vitest';

import { parseProviders } from './auth-providers';

describe('parseProviders', () => {
  it('falls back to Google when nothing is configured', () => {
    expect(parseProviders(undefined).map((p) => p.id)).toEqual(['google']);
    expect(parseProviders('').map((p) => p.id)).toEqual(['google']);
    expect(parseProviders(' , , ').map((p) => p.id)).toEqual(['google']);
  });

  it('keeps the configured order — the first button is the primary one', () => {
    expect(parseProviders('google,custom:yandex').map((p) => p.id)).toEqual([
      'google',
      'custom:yandex',
    ]);
    expect(parseProviders('custom:yandex,google').map((p) => p.id)).toEqual([
      'custom:yandex',
      'google',
    ]);
  });

  it('names Russian providers in Russian', () => {
    const labels = parseProviders('custom:yandex,custom:vk,custom:mailru').map((p) => p.label);
    expect(labels).toEqual(['Яндекс', 'VK ID', 'Mail.ru']);
  });

  it('shows an unknown provider rather than hiding the way in', () => {
    const [provider] = parseProviders('custom:okru');
    expect(provider.id).toBe('custom:okru');
    expect(provider.label).toBe('okru');
  });

  it('tolerates spacing and repeats', () => {
    expect(parseProviders(' google , custom:yandex , google ').map((p) => p.id)).toEqual([
      'google',
      'custom:yandex',
    ]);
  });
});
