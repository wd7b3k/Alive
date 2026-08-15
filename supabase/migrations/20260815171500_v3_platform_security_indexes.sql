-- ALIVE v3.0 Platform — security hardening and FK indexes.
-- REPO is source of truth: this migration was created before being applied remotely.

alter function public.set_updated_at() set search_path = public, pg_temp;

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.handle_new_auth_user() from anon;
revoke all on function public.handle_new_auth_user() from authenticated;

create index if not exists episode_actions_episode_id_idx
  on public.episode_actions (episode_id);

create index if not exists episode_actions_replacement_code_idx
  on public.episode_actions (replacement_code);

create index if not exists episodes_trigger_code_idx
  on public.episodes (trigger_code);

create index if not exists episodes_need_code_idx
  on public.episodes (need_code);

create index if not exists tobacco_events_episode_id_idx
  on public.tobacco_events (episode_id);

create index if not exists user_links_need_code_idx
  on public.user_links (need_code);

create index if not exists user_links_preferred_replacement_code_idx
  on public.user_links (preferred_replacement_code);
