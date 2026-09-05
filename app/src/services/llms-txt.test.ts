import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { cards } from './knowledge-catalog';
import { pathForCode } from '../domain/knowledge-address';

/**
 * `llms.txt` против каталога, из которого он собран.
 *
 * До 05.09.2026 файл набирался руками: «19 фактов и 19 разобранных мифов», «28 пусковых
 * моментов», четыре адреса разделов. Последнее число было просто неправдой — в базе их
 * 25, — и заметить это можно было только сверив глазами.
 *
 * Теперь файл собирает `scripts/dump-knowledge-catalog.mjs` из той же выгрузки, что и
 * страницы. У скрипта есть `--check`, но он требует базы; здесь проверяется то же самое
 * по тому, что лежит в репозитории, — и потому работает в CI.
 */
const llms = readFileSync(fileURLToPath(new URL('../../public/llms.txt', import.meta.url)), 'utf8');
const counts = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../catalog-counts.json', import.meta.url)), 'utf8'),
) as { triggers: number; replacements: number; goals: number; meanings: number };

const all = cards();
const facts = all.filter((card) => card.kind === 'fact');
const myths = all.filter((card) => card.kind === 'myth');

describe('llms.txt', () => {
  it('перечисляет все опубликованные карточки абсолютным адресом', () => {
    for (const card of all) {
      expect(llms, card.code).toContain(`https://habitoff.ru${pathForCode(card.code)})`);
    }
    const listed = [...llms.matchAll(/https:\/\/habitoff\.ru\/knowledge\/[a-z0-9-]+\)/g)];
    expect(listed.length, 'адресов больше, чем карточек').toBe(all.length);
  });

  it('у каждой карточки в списке есть заголовок, ответ и источник', () => {
    for (const card of all) {
      expect(llms, `${card.code}: нет заголовка`).toContain(`- [${card.claim}](`);
      expect(llms, `${card.code}: нет источника`).toContain(`Источник: ${card.source_title}.`);
    }
  });

  it('числа посчитаны, а не написаны', () => {
    // Каждое число в файле обязано сходиться с тем, что лежит в выгрузке. «28 пусковых
    // моментов» держалось руками и разошлось с базой — этот тест ловит именно такое.
    expect(llms).toContain(`## Факты (${facts.length})`);
    expect(llms).toContain(`## Разобранные убеждения (${myths.length})`);
    expect(llms).toContain(`${counts.triggers} пусковых моментов`);
    expect(llms).toContain(`${counts.replacements} ответов`);
    expect(llms).toContain(`${counts.goals} целей`);
    // И прямо: старого неверного числа в файле быть не должно.
    expect(llms).not.toContain('28 пусковых');
  });

  it('три запретных утверждения на месте дословно', () => {
    /**
     * Единственное место, где продукт говорит моделям, чего ему приписывать нельзя.
     * Ради этого файл в основном и существует, поэтому проверка дословная: пересказ
     * своими словами здесь равен потере.
     */
    expect(llms).toContain('«тяга длится 3–5 минут»');
    expect(llms).toContain('«вейп на 95 % безопаснее сигарет»');
    expect(llms).toContain('любое соотношение «один кальян = N сигарет»');
  });

  it('сохраняет разбор доказательной базы и оговорку про лечение', () => {
    expect(llms).toContain('## Как устроена доказательная база');
    expect(llms).toContain('## Чего в продукте нет');
    expect(llms).toContain('не назначает лечение');
  });

  it('устроен по соглашению llms.txt: заголовок, выжимка, разделы со ссылками', () => {
    expect(llms.startsWith('# Habitoff\n')).toBe(true);
    expect(llms).toMatch(/^> Некоммерческий эксперимент/m);
    const sections = [...llms.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('говорит, что собран машиной: иначе его снова начнут править руками', () => {
    expect(llms).toContain('scripts/dump-knowledge-catalog.mjs');
  });
});
