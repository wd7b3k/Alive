import { useMemo, useState } from 'react';

import type { Goal } from '../data';
import { Icon, type IconName } from '../ui-icons';

export type GoalType = Goal['goal_type'];

/**
 * The three kinds of «Смысл», in the order the library shows them.
 *
 * Order is deliberate: a person who has no answer yet finds it easier to recognise a
 * direction («хочу научиться успокаиваться без никотина») than to commit to a goal, so
 * the widest category is not the first thing they read, but it is never hidden either.
 */
export const GOAL_TYPES: GoalType[] = ['цель', 'ценность', 'направление'];

const TYPE_ICON: Record<GoalType, IconName> = {
  цель: 'target',
  ценность: 'heart',
  направление: 'flag',
};

const TYPE_HINT: Record<GoalType, string> = {
  цель: 'Что-то, что можно однажды признать достигнутым',
  ценность: 'То, что важно само по себе и не заканчивается',
  направление: 'Навык или сдвиг, который набирается постепенно',
};

export function typeSlug(type: GoalType): string {
  return type === 'цель' ? 'goal' : type === 'ценность' ? 'value' : 'course';
}

export function typeHint(type: GoalType): string {
  return TYPE_HINT[type];
}

/**
 * Picks the goal shown large at the top of the section, rotating once per day.
 *
 * Deterministic on purpose: the same day shows the same card on every device and after
 * every reload, so the spotlight reads as today's thought rather than as a slot machine
 * the person is tempted to re-roll.
 */
export function goalOfTheDay(goals: Goal[], isoDate: string): Goal | null {
  if (!goals.length) return null;
  let hash = 0;
  for (const ch of isoDate) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_003;
  return goals[hash % goals.length];
}

export function GoalTypeBadge({ type }: { type: GoalType }) {
  return (
    <span className={`r-goal-type ${typeSlug(type)}`}>
      <Icon name={TYPE_ICON[type]} size={14} />
      {type}
    </span>
  );
}

/**
 * One library card.
 *
 * Every card carries its reflection prompt, because the point of the section is not to
 * hand someone a slogan but to leave them with a question they can answer today. `onTake`
 * is what turns the library from a wall of other people's words into a starting draft of
 * their own — it is absent on the pre-login screens, where there is nowhere to save to.
 */
export function GoalCard({ goal, onTake }: { goal: Goal; onTake?: (goal: Goal) => void }) {
  return (
    <article className={`r-goal-card ${typeSlug(goal.goal_type)}`}>
      <header>
        <GoalTypeBadge type={goal.goal_type} />
      </header>
      <h3>{goal.title_ru}</h3>
      <p>{goal.body_ru}</p>
      {goal.reflection_prompt_ru && (
        <blockquote className="r-goal-prompt">{goal.reflection_prompt_ru}</blockquote>
      )}
      <footer>
        {goal.context_tags.length > 0 && (
          <span className="r-goal-tags">
            {goal.context_tags.slice(0, 3).map((tag) => (
              <em key={tag}>{tag}</em>
            ))}
          </span>
        )}
        {onTake && (
          <button type="button" className="r-goal-take" onClick={() => onTake(goal)}>
            Примерить на себя <Icon name="arrow" size={14} />
          </button>
        )}
      </footer>
    </article>
  );
}

/**
 * The library with its type filter.
 *
 * The filter is a real narrowing tool, not decoration: eighteen cards in one column read
 * as a list to scroll past, while five cards of the kind a person came for read as a
 * choice.
 */
export function GoalLibrary({ goals, onTake }: { goals: Goal[]; onTake?: (goal: Goal) => void }) {
  const [filter, setFilter] = useState<GoalType | null>(null);
  const present = useMemo(
    () => GOAL_TYPES.filter((type) => goals.some((goal) => goal.goal_type === type)),
    [goals],
  );
  const shown = filter ? goals.filter((goal) => goal.goal_type === filter) : goals;
  return (
    <>
      {present.length > 1 && (
        <div className="r-goal-filter">
          <button
            type="button"
            className={filter === null ? 'active' : ''}
            onClick={() => setFilter(null)}
          >
            Всё
          </button>
          {present.map((type) => (
            <button
              key={type}
              type="button"
              className={`${typeSlug(type)} ${filter === type ? 'active' : ''}`}
              onClick={() => setFilter(filter === type ? null : type)}
            >
              <Icon name={TYPE_ICON[type]} size={14} />
              {type}
            </button>
          ))}
        </div>
      )}
      {filter && <p className="r-goal-filter-hint">{TYPE_HINT[filter]}</p>}
      <div className="r-goal-grid">
        {shown.map((goal) => (
          <GoalCard key={goal.code} goal={goal} onTake={onTake} />
        ))}
      </div>
    </>
  );
}

/**
 * Today's card, shown once and large.
 *
 * This is the one place in Habitoff that is allowed to be purely inspiring: it asserts
 * nothing about the person's data and asks a single question.
 */
export function GoalSpotlight({ goal, onTake }: { goal: Goal; onTake?: (goal: Goal) => void }) {
  return (
    <div className={`r-goal-spotlight ${typeSlug(goal.goal_type)}`}>
      <div className="r-goal-spotlight-head">
        <p className="r-kicker">Смысл дня</p>
        <GoalTypeBadge type={goal.goal_type} />
      </div>
      <h2>{goal.title_ru}</h2>
      <p>{goal.body_ru}</p>
      {goal.reflection_prompt_ru && (
        <blockquote className="r-goal-prompt">{goal.reflection_prompt_ru}</blockquote>
      )}
      {onTake && (
        <button type="button" className="r-goal-take strong" onClick={() => onTake(goal)}>
          Сделать это своим <Icon name="arrow" size={16} />
        </button>
      )}
    </div>
  );
}
