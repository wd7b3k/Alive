-- Человек должен уметь забрать всё своё.
--
-- `PRIVACY_AND_DATA.md` обещает выгрузку. Выгрузка, из которой выпала часть данных о
-- человеке, — это не выгрузка, а выборка, и обещание она не выполняет.
--
-- Сейчас из-под неё выпадает журнал событий: analytics_events и content_impressions
-- читает только администратор (20260817170000). Логика той политики понятна — журнал
-- поведения не должен быть доступен посторонним, — но собственные строки человека
-- посторонними не являются.
--
-- Ниже добавляется чтение строго своего. Ни одна чужая строка при этом не открывается:
-- условие то же самое, что и во всех остальных пользовательских таблицах продукта.

drop policy if exists analytics_events_select_own on public.analytics_events;
create policy analytics_events_select_own on public.analytics_events
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists content_impressions_select_own on public.content_impressions;
create policy content_impressions_select_own on public.content_impressions
  for select to authenticated using ((select auth.uid()) = user_id);

-- Права уже выданы 20260817170000 (grant select,insert на analytics_events и
-- select,insert,update,delete на content_impressions); здесь добавляется только
-- политика — тот самый замок, который решает, какие строки видно.

-- system_errors намеренно остаются вне выгрузки: в них нет ни текста, ни данных
-- человека — только отпечаток сообщения и экран. Отдавать по ним «свои» строки значит
-- заводить связь «человек ↔ ошибка» там, где её сейчас нет.
