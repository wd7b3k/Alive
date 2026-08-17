-- ALIVE R1 — причины остановки пользовательских сценариев должны быть структурированными и понятными.

create table public.analytics_reason_catalog (
  code text primary key,
  title_ru text not null,
  category_ru text not null,
  description_ru text not null default '',
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.analytics_reason_catalog enable row level security;
create policy analytics_reason_catalog_read on public.analytics_reason_catalog for select to authenticated using (active=true);
grant select on public.analytics_reason_catalog to authenticated;

insert into public.analytics_reason_catalog(code,title_ru,category_ru,description_ru,sort_order) values
('closed_flow','Закрыл сценарий до результата','Поведение','Пользователь вышел из сценария до сохранения итогового результата.',10),
('closed_without_rating','Закрыл без оценки результата','Поведение','Пользователь дошёл до результата, но сознательно не стал его оценивать.',20),
('no_trigger_match','Не нашёл подходящую ситуацию','Контент','В предложенных Триггерах не нашлось подходящего варианта.',30),
('no_intervention_fit','Не подошёл ни один предложенный ответ','Контент','Предложенные вмешательства не соответствовали реальному моменту пользователя.',40),
('skipped_intervention','Не хотел пробовать предложенный ответ','Выбор','Пользователь предпочёл наблюдать эпизод без Замены.',50),
('question_unclear','Вопрос оказался непонятным','Понятность','Пользователь не смог уверенно ответить на вопрос шага.',60),
('too_many_steps','Сценарий показался слишком длинным','Понятность','Пользователь вышел из-за количества действий или воспринимаемой сложности.',70),
('no_time','Не было времени продолжать','Контекст','Ситуация требовала более быстрого вмешательства.',80),
('technical_error','Техническая ошибка','Техника','Сценарий прервался из-за ошибки приложения, API или записи данных.',90),
('network_error','Проблема с сетью','Техника','Сценарий прервался из-за сетевой ошибки или недоступности backend.',100),
('authorization_error','Проблема со входом или доступом','Техника','Сценарий не продолжился из-за авторизации или доступа.',110),
('unknown','Причина пока неизвестна','Не определено','Есть факт остановки, но система пока не знает более точную структурированную причину.',999)
on conflict(code) do update set
  title_ru=excluded.title_ru,
  category_ru=excluded.category_ru,
  description_ru=excluded.description_ru,
  sort_order=excluded.sort_order,
  active=true;

-- Явно сохранённый outcome «abandoned» получает структурированную причину автоматически.
create or replace function public.alive_record_episode_completed()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  delta numeric;
  resolved_reason text;
begin
  if new.deleted_at is null and new.outcome is not null and new.outcome <> 'open' then
    if new.craving_before is not null and new.craving_after is not null then
      delta := new.craving_after - new.craving_before;
    end if;
    if new.outcome = 'abandoned' then resolved_reason := 'closed_without_rating'; end if;
    insert into public.analytics_events(
      user_id,event_type,funnel_stage,surface,product_type,trigger_code,outcome,reason_code,numeric_value,occurred_at,metadata
    ) values (
      new.user_id,'craving_completed','результат импульса','веб',new.target_product,new.trigger_code,new.outcome,resolved_reason,delta,
      coalesce(new.completed_at,new.created_at),
      jsonb_build_object('есть_оценка_тяги',new.craving_before is not null and new.craving_after is not null)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.alive_record_episode_completed() from public, anon, authenticated;
