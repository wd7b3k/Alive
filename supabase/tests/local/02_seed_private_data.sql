-- seed one private row per RLS-protected table for each of the two test users
insert into public.episodes (id, user_id, target_product, outcome, private_note)
values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cigarette', 'successful_response', 'A private note'),
  ('b2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'vape', 'successful_response', 'B private note');

insert into public.tobacco_events (id, user_id, product_type, cigarette_quantity)
values
  ('a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cigarette', 1),
  ('b2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'vape', 5);

insert into public.user_meanings (id, user_id, title, body)
values
  ('a1111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'A meaning', 'private body A'),
  ('b2222222-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'B meaning', 'private body B');

insert into public.user_links (id, user_id, title, situation)
values
  ('a1111111-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'A link', 'private situation A'),
  ('b2222222-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'B link', 'private situation B');

insert into public.ugc_submissions (id, source_user_id, source_type, content_snapshot)
values
  ('a1111111-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'meaning', '{"title":"A"}'::jsonb),
  ('b2222222-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'meaning', '{"title":"B"}'::jsonb);

insert into public.daily_checkins (id, user_id, irritability)
values
  ('a1111111-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 5),
  ('b2222222-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 7);

insert into public.daily_support_state (user_id, nrt_patch_active)
values
  ('11111111-1111-1111-1111-111111111111', true),
  ('22222222-2222-2222-2222-222222222222', false);

-- baseline у первого пользователя заполнен намеренно: без него в
-- get_together_summary некого сравнивать с исходным уровнем, `evaluable` остаётся
-- нулём, и проверка порога подавления проходит всегда — то есть не проверяет ничего.
-- Оба пользователя считаются завершившими настройку. get_together_summary берёт в
-- расчёт только таких (participant_pool), и без этой строки любая проверка «Вместе»
-- проходит на пустом множестве — то есть не проверяет ничего.
update public.profiles
   set onboarding_completed_at = now() - interval '10 days'
 where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

insert into public.user_nicotine_products (user_id, product_type, role, baseline)
values
  ('11111111-1111-1111-1111-111111111111', 'cigarette', 'target_dependency',
   '{"cigarettes_per_day": 15}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'vape', 'target_dependency', '{}'::jsonb);
