import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { RELEASES } from './releases';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
) as { version: string };

/**
 * Тест против протухания.
 *
 * Страница «Что нового» обрывалась на 3.1, когда в продукте уже были новое имя, свой
 * сервер, второй способ входа и переделанный сценарий тяги. Ни один существующий
 * тест этого не замечал, потому что страница была разметкой, а не данными.
 *
 * Дисциплина здесь не работает: за неделю четыре сессии подряд честно закрывали свою
 * работу и ни одна не вспомнила про эту страницу. Работает только то, что падает.
 */
describe('история версий на /releases', () => {
  it('содержит версию, которая сейчас в package.json', () => {
    const [major, minor] = pkg.version.split('.');
    expect(RELEASES.map((r) => r.version)).toContain(`${major}.${minor}`);
  });

  it('перечисляет версии от новой к старой', () => {
    const numeric = RELEASES.map((r) => r.version.split('.').map(Number));
    for (let i = 1; i < numeric.length; i += 1) {
      const [prevMajor, prevMinor] = numeric[i - 1];
      const [major, minor] = numeric[i];
      expect(prevMajor * 1000 + prevMinor).toBeGreaterThan(major * 1000 + minor);
    }
  });

  it('не оставляет запись без объяснения', () => {
    for (const release of RELEASES) {
      expect(release.title.trim().length).toBeGreaterThan(0);
      expect(release.summary.trim().length).toBeGreaterThan(0);
    }
  });
});
