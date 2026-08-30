-- Витрины админки обязаны выполняться, а не только компилироваться.
--
-- 30.08.2026 четыре функции из шести упали при первом вызове на проде: `round` от
-- double precision, неоднозначная колонка, колонка вне группировки. Ни одна из этих
-- ошибок не видна при `create or replace function` — тело принимается целиком и
-- проверяется только в момент выполнения. Глазами такое не ловится, и «я прочитал
-- запрос внимательно» — это не проверка.
--
-- Тест не смотрит на числа: на пустой базе они все нулевые и ничего не доказывают.
-- Он проверяет ровно одно — что вызов не падает.

do $$
declare
  target uuid;
  statement text;
  rows_out bigint;
begin
  select p.id into target from public.profiles p order by p.created_at limit 1;
  if target is null then
    raise exception 'нет ни одного профиля: тест витрин бессмысленен без пользователя';
  end if;

  update public.profiles set role = 'admin', status = 'active' where id = target;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', target, 'role', 'authenticated')::text,
    true
  );

  foreach statement in array array[
    'select count(*) from public.admin_core_metrics(12)',
    'select count(*) from public.admin_funnel(30)',
    'select count(*) from public.admin_flow_steps(30)',
    'select count(*) from public.admin_retention(8)',
    'select count(*) from public.admin_sources(30)',
    'select count(*) from public.admin_user_states()'
  ]
  loop
    execute statement into rows_out;
    raise notice 'ok: % -> % строк', statement, rows_out;
  end loop;

  -- Отдельно: не-администратор обязан получать отказ. Иначе проверка прав внутри
  -- функций — украшение, а не защита.
  update public.profiles set role = 'participant' where id = target;
  begin
    execute 'select count(*) from public.admin_funnel(30)' into rows_out;
    raise exception 'участник без роли admin получил данные витрины';
  exception when others then
    if sqlerrm like '%участник без роли admin%' then
      raise;
    end if;
    raise notice 'ok: не-администратору отказано (%)', left(sqlerrm, 60);
  end;
end $$;
