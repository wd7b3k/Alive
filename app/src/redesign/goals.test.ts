import { describe, expect, it } from 'vitest';

import type { Goal } from '../data';
import { GOAL_TYPES, goalOfTheDay, typeHint, typeSlug } from './goals';

function goal(code: string): Goal {
  return {
    code,
    goal_type: 'цель',
    title_ru: code,
    body_ru: code,
    reflection_prompt_ru: null,
    context_tags: [],
    sort_order: 1,
  };
}

describe('goalOfTheDay', () => {
  it('returns null when the library is empty', () => {
    expect(goalOfTheDay([], '2026-08-24')).toBeNull();
  });

  it('is stable for the same day', () => {
    const goals = ['a', 'b', 'c', 'd', 'e'].map(goal);
    expect(goalOfTheDay(goals, '2026-08-24')).toBe(goalOfTheDay(goals, '2026-08-24'));
  });

  it('does not stay on one card across a month', () => {
    const goals = ['a', 'b', 'c', 'd', 'e'].map(goal);
    const picked = new Set(
      Array.from(
        { length: 30 },
        (_, i) => goalOfTheDay(goals, `2026-08-${String(i + 1).padStart(2, '0')}`)?.code,
      ),
    );
    expect(picked.size).toBeGreaterThan(1);
  });

  it('always returns a card from the library', () => {
    const goals = ['a', 'b', 'c'].map(goal);
    for (let i = 1; i <= 28; i += 1) {
      const picked = goalOfTheDay(goals, `2026-02-${String(i).padStart(2, '0')}`);
      expect(goals).toContain(picked);
    }
  });
});

describe('goal types', () => {
  it('gives every type a distinct latin slug for CSS', () => {
    const slugs = GOAL_TYPES.map(typeSlug);
    expect(new Set(slugs).size).toBe(GOAL_TYPES.length);
    expect(slugs.every((s) => /^[a-z]+$/.test(s))).toBe(true);
  });

  it('explains every type in Russian', () => {
    for (const type of GOAL_TYPES) expect(typeHint(type).length).toBeGreaterThan(10);
  });
});
