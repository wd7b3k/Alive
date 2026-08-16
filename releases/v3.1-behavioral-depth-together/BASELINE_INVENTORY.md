# ALIVE v3.1 — baseline inventory

Статус: **BLOCKING CONTRACT**

Основание: owner visual approval of restored v3.0 shell on 2026-08-16

## Сохраняется без изменения продуктового смысла

### Shell и бренд

- `RedesignApp` остаётся root
- `redesign.css` остаётся базовой дизайн-системой
- тёмная calm-premium палитра
- текущая геометрия Header / Today / sections / modal
- approved ALIVE Om/logo asset
- mobile bottom navigation из четырёх основных разделов

### Сегодня

- текущий hero и его иерархия
- главный craving action на том же месте и в том же визуальном формате
- `Никотин уже был`
- `Итоги дня`
- карточки пульса
- Карта внимания
- История обучения
- удаление ошибочного/тестового эпизода с автоматическим пересчётом

### Guided flow

- modal pattern
- выбор продукта при нескольких продуктах
- выбор контекста
- определение потребности
- выбор Замены
- оценка результата
- отдельная запись никотина как outcome, а не Replacement
- сохранение episode/action/tobacco event через существующие data contracts

### Связки

- общая карта контекстов
- пользовательские Связки
- создание
- удаление
- предложение в общую базу только явным действием
- запуск craving flow из Связки/контекста

### Путь

- сравнение с собственным baseline
- 7/30 дней
- Фонд свободы
- график
- рейтинг/эффективность собственных Замен
- исходные факты по продуктам

### Смыслы

- библиотека
- пользовательские Смыслы
- создание
- скрытие/возврат
- удаление
- явное предложение в общую базу
- identity scripts

### Системные сценарии

- Google OAuth
- onboarding
- profile/baseline edit
- experiment/methodology
- release history
- logout
- RLS/privacy semantics

## Изменяется в v3.1

Только следующие существующие элементы могут быть изменены в рамках утверждённого scope:

1. CTA `Меня тянет` → конкретный product-aware текст
2. progress guided flow → более заметный и понятный
3. guided flow → completed steps кликабельны для возврата/исправления
4. craving intensity становится отдельным понятным шагом без потери существующих данных
5. Replacement selection использует расширенный каталог и diversity ranking
6. lapse copy/context disruption становится глубже и безопаснее
7. onboarding сигарет получает approximate start year
8. карточки/разделы получают мягкие contextual Facts/Myths там, где это не перегружает flow

## Добавляется в v3.1

- 75 Replacement catalog items / 18 mechanisms
- Myth Engine
- Facts knowledge layer
- `Вместе` aggregate view
- evidence/source metadata
- private myth relevance
- contextual Myth reminder с frequency cap
- general Fact reminders
- smoking exposure metadata для evidence matching
- Together privacy-safe aggregate contract

## Не удаляется

**Ничего из утверждённого v3.0 функционала не удаляется в v3.1**

Если при реализации выясняется, что существующую функцию якобы необходимо удалить или заменить, работа останавливается до owner gate

## IA rule

`Факты` и `Вместе` должны быть доступны как отдельные разделы, но их добавление не должно разрушить четырёхэлементную mobile bottom navigation

Desktop может получить secondary navigation affordance в существующем header pattern

Mobile должен получить secondary entry point через существующую product hierarchy, а не шесть мелких пунктов в bottom bar

Конкретный вариант IA подлежит visual review

## Release test rule

Каждый vertical slice v3.1 проходит:

1. `node app/scripts/check-ui-contract.mjs` (из repo root эквивалентно `cd app && node scripts/check-ui-contract.mjs`)
2. typecheck
3. build
4. smoke-test изменённого сценария
5. smoke-test затронутых baseline-функций

После завершения всех slices обязательна полная regression matrix из `docs/RELEASE_ENGINEERING_RULES.md`
