-- ALIVE 4.0.0-alpha.1: atomic and idempotent canonical-flow evidence.

create unique index if not exists analytics_events_one_canonical_event_per_flow_idx
on public.analytics_events (user_id, event_type, ((metadata ->> 'flow_id')))
where metadata ? 'flow_id'
  and event_type in ('awareness_shown', 'outcome_saved');

create or replace function public.alive_record_awareness_exposure(
  p_content_code text,
  p_product_type text,
  p_trigger_code text,
  p_flow_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_impression_id uuid;
begin
  if v_user_id is null then
    raise exception 'Требуется авторизация' using errcode = '42501';
  end if;

  if p_product_type not in ('cigarette','vape','hookah') then
    raise exception 'Неизвестный тип продукта' using errcode = '22023';
  end if;

  if p_flow_id is null then
    raise exception 'Не указан идентификатор запуска' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.awareness_content content
    join public.evidence_claims claim on claim.code = content.claim_code
    where content.code = p_content_code
      and content.published = true
      and claim.status = 'проверено'
      and p_product_type = any(content.product_types)
      and exists (
        select 1
        from public.awareness_content_contexts context
        where context.content_code = content.code
          and context.moment = 'микроосознанность'
          and (context.trigger_code is null or context.trigger_code = p_trigger_code)
          and (context.product_type is null or context.product_type = p_product_type)
      )
  ) then
    raise exception 'Материал не опубликован или не подтверждён' using errcode = '22023';
  end if;

  -- Serialize retries for one anonymous flow without exposing the flow id as private text.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_flow_id::text, 0));

  select nullif(event.metadata ->> 'impression_id', '')::uuid
  into v_impression_id
  from public.analytics_events event
  where event.user_id = v_user_id
    and event.event_type = 'awareness_shown'
    and event.metadata ->> 'flow_id' = p_flow_id::text
    and event.content_code = p_content_code
    and event.product_type = p_product_type
    and event.trigger_code is not distinct from p_trigger_code
  limit 1;

  if v_impression_id is not null then
    return v_impression_id;
  end if;

  if exists (
    select 1
    from public.analytics_events event
    where event.user_id = v_user_id
      and event.event_type = 'awareness_shown'
      and event.metadata ->> 'flow_id' = p_flow_id::text
  ) then
    raise exception 'Идентификатор запуска уже связан с другим показом' using errcode = '22023';
  end if;

  insert into public.content_impressions(
    user_id,
    content_code,
    moment,
    product_type,
    trigger_code
  ) values (
    v_user_id,
    p_content_code,
    'микроосознанность',
    p_product_type,
    p_trigger_code
  )
  returning id into v_impression_id;

  insert into public.analytics_events(
    user_id,
    event_type,
    funnel_stage,
    surface,
    product_type,
    trigger_code,
    content_code,
    metadata
  ) values (
    v_user_id,
    'awareness_shown',
    'микроосознанность',
    'веб',
    p_product_type,
    p_trigger_code,
    p_content_code,
    jsonb_build_object(
      'flow_id', p_flow_id::text,
      'impression_id', v_impression_id::text
    )
  );

  return v_impression_id;
end;
$$;

revoke all on function public.alive_record_awareness_exposure(text,text,text,uuid) from public, anon;
grant execute on function public.alive_record_awareness_exposure(text,text,text,uuid) to authenticated;

comment on function public.alive_record_awareness_exposure(text,text,text,uuid)
is 'Идемпотентно и атомарно фиксирует показ published content с проверенным Evidence claim; payload не содержит private text.';

