# ALIVE v3 Supabase / PostgreSQL

## Source of truth

Схема БД меняется только через migrations в этом каталоге.

Запрещено считать ручные изменения через Supabase Dashboard каноническими. Если изменение сделано для эксперимента через Dashboard/SQL editor, оно должно быть немедленно оформлено migration и проверено через fresh reset до merge.

## Local workflow

Из корня `projectsv2.0/products/alive/`:

```bash
npx supabase init
npx supabase start
npx supabase db reset
```

Если `supabase init` создаёт/обновляет `supabase/config.toml`, этот файл коммитится после review. Секреты в `config.toml` не hardcode — использовать environment references.

## Remote workflow

После создания отдельного remote Supabase project:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --dry-run
npx supabase db push
```

Не использовать `db reset --linked` на production.

## Initial migration

`migrations/20260815170000_v3_platform_initial.sql`

Содержит:

- profiles / settings / nicotine products;
- methodology/equivalence versions;
- Trigger/Need/Replacement catalogs;
- Episodes / Actions / raw Tobacco Events;
- personal Meanings / Links;
- explicit UGC submissions;
- initial RLS policies;
- auth-user → profile creation trigger.

## Обязательная проверка

До подключения реальных участников:

1. fresh `db reset` PASS;
2. два test users;
3. user A не видит private rows user B;
4. catalog read работает;
5. profile auto-create работает;
6. service-role key отсутствует во frontend и git.
