-- Ноль на шкале тяги.
--
-- Ползунок «Тяга после» размечен от 0, а колонка проверяла `between 1 and 10`. То есть
-- лучший из возможных ответов — «тяги не осталось» — приводил к отказу записи, и человек
-- в момент, когда он только что прервал автоматизм, получал ошибку сохранения.
--
-- Правильная сторона починки — база, а не разметка: ноль здесь осмыслен. «Тяга 1» и
-- «тяги нет» — разные ответы, и сводить их к одному ради старого ограничения значит
-- терять как раз тот случай, ради которого продукт существует.
--
-- `helpfulness` остаётся `1..5`: ноль там означал бы «не помогло вовсе», а для этого
-- уже есть исход эпизода. Разметка ползунка приведена к шкале в том же коммите.

alter table public.episodes drop constraint if exists episodes_craving_before_check;
alter table public.episodes
  add constraint episodes_craving_before_check
  check (craving_before is null or craving_before between 0 and 10);

alter table public.episodes drop constraint if exists episodes_craving_after_check;
alter table public.episodes
  add constraint episodes_craving_after_check
  check (craving_after is null or craving_after between 0 and 10);

comment on column public.episodes.craving_before is
  'Сила тяги до разбора, 0..10. Null — человек не отвечал; это не ноль.';
comment on column public.episodes.craving_after is
  'Сила тяги после разбора, 0..10. Null — человек не отвечал; это не ноль.';
