# Habitoff v3 Supabase / PostgreSQL

## Source of truth

Схема БД меняется только через migrations в `wd7b3k/Alive/supabase/migrations/`.

Запрещено считать ручные изменения через Supabase Dashboard каноническими. Если изменение сделано для эксперимента через Dashboard/SQL editor, оно должно быть немедленно оформлено migration и проверено через fresh reset до merge.

## Local workflow

Из корня `wd7b3k/Alive`:

```bash
npx supabase start
npx supabase db reset
```

Если локальная Supabase CLI конфигурация ещё не создана, сначала выполнить `npx supabase init`, review полученного `supabase/config.toml` и только затем commit безопасной конфигурации. Секреты не hardcode — использовать environment references.

## Remote workflow

Remote project уже создан:

- project ref: `xkigijaqimzuveyzyzyk`
- region: `eu-west-1`

Для CLI-link:

```bash
npx supabase login
npx supabase link --project-ref xkigijaqimzuveyzyzyk
npx supabase db push --dry-run
npx supabase db push
```

Не использовать `db reset --linked` на production.

## Migrations

- `migrations/20260815170000_v3_platform_initial.sql`
- `migrations/20260815171500_v3_platform_security_indexes.sql`

Обе migration уже применены к remote project. Security hardening довёл Supabase Database Security Advisor до `0 warnings` на момент последней проверки.

## Обязательная проверка до внешних участников

1. fresh local `db reset` PASS;
2. два test users;
3. user A не видит private rows user B;
4. catalog read работает;
5. profile auto-create работает;
6. service-role key отсутствует во frontend и git.
