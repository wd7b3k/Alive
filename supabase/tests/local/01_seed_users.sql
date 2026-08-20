insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.test', '{"full_name":"User A"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.test', '{"full_name":"User B"}'::jsonb);
