import type { Bootstrap, Episode, EpisodeAction, TobaccoEvent, Trigger } from './data';
import { baselineDailyCost, baselineDailyUnits, eventAliveUnits } from './data';

export type PeriodStats = {
  aliveUnits: number;
  baselineUnits: number;
  baselineDeltaPct: number | null;
  successfulResponses: number;
  nicotineEpisodes: number;
  cigarettes: number;
  hookahs: number;
  vapePuffs: number;
  actualCost: number;
  baselineCost: number;
  freedomFund: number;
  activeDays: number;
};

function startOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function inPeriod(timestamp: string, days: number) {
  const border = startOfDay();
  border.setDate(border.getDate() - (days - 1));
  return new Date(timestamp) >= border;
}

export function statsForDays(data: Bootstrap, days: number): PeriodStats {
  const events = data.tobaccoEvents.filter((event) => inPeriod(event.occurred_at, days));
  const episodes = data.episodes.filter((episode) => inPeriod(episode.started_at, days));
  const aliveUnits = events.reduce((sum, event) => sum + eventAliveUnits(event), 0);
  const baselineUnits = baselineDailyUnits(data.products) * days;
  const baselineDeltaPct = baselineUnits > 0 ? ((aliveUnits - baselineUnits) / baselineUnits) * 100 : null;
  const actualCost = events.reduce((sum, event) => sum + Number(event.cost_actual_rub ?? 0), 0);
  const baselineCost = baselineDailyCost(data.products) * days;
  const daysSet = new Set<string>();
  episodes.forEach((episode) => daysSet.add(episode.started_at.slice(0, 10)));
  events.forEach((event) => daysSet.add(event.occurred_at.slice(0, 10)));
  return {
    aliveUnits,
    baselineUnits,
    baselineDeltaPct,
    successfulResponses: episodes.filter((episode) => episode.outcome === 'successful_response').length,
    nicotineEpisodes: episodes.filter((episode) => episode.outcome === 'nicotine_used').length,
    cigarettes: events.reduce((sum, event) => sum + Number(event.cigarette_quantity ?? 0), 0),
    hookahs: events.reduce((sum, event) => sum + Number(event.hookah_session_count ?? 0), 0),
    vapePuffs: events.reduce((sum, event) => sum + Number(event.vape_puffs ?? 0), 0),
    actualCost,
    baselineCost,
    freedomFund: Math.max(0, baselineCost - actualCost),
    activeDays: daysSet.size,
  };
}

export type TriggerStat = {
  trigger: Trigger;
  episodes: number;
  successes: number;
  successRate: number | null;
  avgCravingDelta: number | null;
};

export function triggerStats(data: Bootstrap): TriggerStat[] {
  return data.triggers.map((trigger) => {
    const episodes = data.episodes.filter((episode) => episode.trigger_code === trigger.code);
    const successes = episodes.filter((episode) => episode.outcome === 'successful_response').length;
    const deltas = episodes
      .filter((episode) => episode.craving_before !== null && episode.craving_after !== null)
      .map((episode) => Number(episode.craving_before) - Number(episode.craving_after));
    return {
      trigger,
      episodes: episodes.length,
      successes,
      successRate: episodes.length ? (successes / episodes.length) * 100 : null,
      avgCravingDelta: deltas.length ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length : null,
    };
  });
}

export type ReplacementStat = {
  code: string;
  title: string;
  uses: number;
  avgHelpfulness: number | null;
  avgCravingDelta: number | null;
  successRate: number | null;
};

export function replacementStats(data: Bootstrap): ReplacementStat[] {
  const episodeById = new Map<string, Episode>(data.episodes.map((episode) => [episode.id, episode]));
  const actionsByCode = new Map<string, EpisodeAction[]>();
  data.actions.forEach((action) => {
    if (!action.replacement_code) return;
    const list = actionsByCode.get(action.replacement_code) ?? [];
    list.push(action);
    actionsByCode.set(action.replacement_code, list);
  });

  return data.replacements
    .map((replacement) => {
      const actions = actionsByCode.get(replacement.code) ?? [];
      const episodes = actions
        .map((action) => episodeById.get(action.episode_id))
        .filter((episode): episode is Episode => Boolean(episode));
      const helpful = episodes.filter((episode) => episode.helpfulness !== null).map((episode) => Number(episode.helpfulness));
      const deltas = episodes
        .filter((episode) => episode.craving_before !== null && episode.craving_after !== null)
        .map((episode) => Number(episode.craving_before) - Number(episode.craving_after));
      const successes = episodes.filter((episode) => episode.outcome === 'successful_response').length;
      return {
        code: replacement.code,
        title: replacement.title,
        uses: episodes.length,
        avgHelpfulness: helpful.length ? helpful.reduce((sum, value) => sum + value, 0) / helpful.length : null,
        avgCravingDelta: deltas.length ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length : null,
        successRate: episodes.length ? (successes / episodes.length) * 100 : null,
      };
    })
    .filter((item) => item.uses > 0)
    .sort((a, b) => {
      const aScore = (a.avgHelpfulness ?? 0) * 10 + (a.successRate ?? 0) + a.uses;
      const bScore = (b.avgHelpfulness ?? 0) * 10 + (b.successRate ?? 0) + b.uses;
      return bScore - aScore;
    });
}

export function dailyUnits(data: Bootstrap, days = 7) {
  const result: Array<{ date: string; units: number; successes: number }> = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const units = data.tobaccoEvents
      .filter((event: TobaccoEvent) => event.occurred_at.slice(0, 10) === key)
      .reduce((sum, event) => sum + eventAliveUnits(event), 0);
    const successes = data.episodes.filter((episode) => episode.started_at.slice(0, 10) === key && episode.outcome === 'successful_response').length;
    result.push({ date: key, units, successes });
  }
  return result;
}
