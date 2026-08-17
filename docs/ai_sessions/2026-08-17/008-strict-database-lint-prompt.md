# Prompt 008 — строгая семантика database lint в PR #8

Дата: 2026-08-17

Независимая проверка final head `02a487ac67631a658921629108806ffefb7ca723` установила, что формально зелёный `ALIVE database CI` run #32 был false-green.

В логе `supabase db lint --level error` присутствовал diagnostic уровня error:

`private.alive_migrate_legacy_awareness_state: relation "public.user_myth_state" does not exist`

Причина: Supabase CLI по умолчанию использовал `--fail-on none`.

Обязательная корректировка:

- запускать `supabase db lint --level error --fail-on error`;
- исправить defect, не скрывая его фильтром или `continue-on-error`;
- сохранить legacy compatibility;
- повторить fresh migration replay, все pgTAP/RLS tests, strict schema lint и frontend CI;
- синхронизировать PR и release state только по фактическим logs/head;
- закрепить урок: CI evidence требует проверки fail semantics инструмента, а не только GitHub conclusion.

Paid Supabase branch, live project и локальное постоянное хранилище запрещены.
