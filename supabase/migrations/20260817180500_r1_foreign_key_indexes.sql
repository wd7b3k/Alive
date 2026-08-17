-- ALIVE R1 — покрываем внешние ключи, которые участвуют в удалении/поиске и будут замечены database advisor.

-- Два существующих замечания текущей alpha schema.
create index if not exists trigger_replacement_map_replacement_idx on public.trigger_replacement_map(replacement_code);
do $legacy$
begin
  if pg_catalog.to_regclass('public.user_myth_state') is not null then
    execute 'create index if not exists user_myth_state_myth_code_idx on public.user_myth_state(myth_code)';
  end if;
end
$legacy$;

-- R1 catalogs / personal entities.
create index if not exists triggers_catalog_category_code_idx on public.triggers_catalog(category_code) where category_code is not null;
create index if not exists user_triggers_category_code_idx on public.user_triggers(category_code) where category_code is not null;
create index if not exists replacements_catalog_category_code_idx on public.replacements_catalog(category_code) where category_code is not null;
create index if not exists user_replacements_category_code_idx on public.user_replacements(category_code) where category_code is not null;
create index if not exists user_replacement_preferences_replacement_idx on public.user_replacement_preferences(replacement_code);
create index if not exists intervention_context_rules_replacement_idx on public.intervention_context_rules(replacement_code) where replacement_code is not null;
create index if not exists user_links_user_trigger_idx on public.user_links(user_trigger_id) where user_trigger_id is not null;
create index if not exists user_links_user_replacement_idx on public.user_links(preferred_user_replacement_id) where preferred_user_replacement_id is not null;
create index if not exists episodes_user_trigger_idx on public.episodes(user_trigger_id) where user_trigger_id is not null;
create index if not exists episode_actions_user_replacement_idx on public.episode_actions(user_replacement_id) where user_replacement_id is not null;

-- Goals / evidence / content.
create index if not exists user_goals_source_goal_idx on public.user_goals(source_goal_code) where source_goal_code is not null;
create index if not exists user_goals_source_meaning_idx on public.user_goals(source_meaning_id) where source_meaning_id is not null;
create index if not exists evidence_claim_sources_source_idx on public.evidence_claim_sources(source_id);
create index if not exists awareness_content_claim_idx on public.awareness_content(claim_code) where claim_code is not null;
create index if not exists awareness_content_context_trigger_idx on public.awareness_content_contexts(trigger_code) where trigger_code is not null;
create index if not exists content_impressions_episode_idx on public.content_impressions(episode_id) where episode_id is not null;
create index if not exists content_impressions_trigger_idx on public.content_impressions(trigger_code) where trigger_code is not null;

-- Learning projections.
create index if not exists user_trigger_stats_global_trigger_idx on public.user_trigger_stats(global_trigger_code) where global_trigger_code is not null;
create index if not exists user_trigger_stats_user_trigger_idx on public.user_trigger_stats(user_trigger_id) where user_trigger_id is not null;
create index if not exists user_replacement_stats_global_replacement_idx on public.user_replacement_stats(global_replacement_code) where global_replacement_code is not null;
create index if not exists user_replacement_stats_user_replacement_idx on public.user_replacement_stats(user_replacement_id) where user_replacement_id is not null;
create index if not exists user_awareness_state_content_idx on public.user_awareness_state(content_code);
