-- R1 correction: контент может быть релевантен всему продукту или моменту без обязательного trigger/product.

alter table public.awareness_content_contexts
  drop constraint if exists awareness_content_contexts_pkey;

alter table public.awareness_content_contexts
  alter column trigger_code drop not null,
  alter column product_type drop not null;

alter table public.awareness_content_contexts
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.awareness_content_contexts
  add constraint awareness_content_contexts_pkey primary key (id);

create unique index awareness_content_contexts_scope_unique
  on public.awareness_content_contexts(
    content_code,
    coalesce(trigger_code, '__любой_триггер__'),
    coalesce(product_type, '__любой_продукт__'),
    moment
  );
