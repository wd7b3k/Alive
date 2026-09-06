# Сеть агентов Habitoff

Роли лежат рядом файлами `<имя>.md`. Общие правила — `AGENTS.md`, раздел «Сеть агентов»;
здесь только карта: кто за что отвечает, кому какой файл принадлежит и в каком порядке
роли включаются.

Роль не пересказывает `AGENTS.md`. Инварианты, таблица «правило → проверка», git и гейты
владельца действуют для всех и живут в одном месте.

## Порядок в сессии

```
sostoyanie  →  postanovka  →  роль направления  →  priyomka
   снимок        R- / T-           работа            «сделано»
```

`sostoyanie` включается первым всегда. `priyomka` — последним всегда. Между ними работает
одна роль направления; если задача задевает два направления, она делится на две задачи,
а не отдаётся двум ролям сразу.

## Кто чем владеет

Файл правит только его владелец. Другой роли, которой нужна правка, владелец её вносит
сам или задача переоформляется. Это правило существует потому, что двойное владение уже
дважды приводило к затиранию работы (`docs/INCIDENTS.md`, класс 7).

| Роль | Модель | Владеет | Тема доски |
|---|---|---|---|
| `sostoyanie` | sonnet | `NAVIGATOR.md`, `CURRENT_STATE.md`, `board/cards.json`, `BACKLOG.md` | `process` |
| `postanovka` | opus | `docs/tasks/**` | все |
| `priyomka` | sonnet | — | все |
| `strateg` | opus | `PRODUCT_STRATEGY.md`, `PROJECT_CHARTER.md`, `ROADMAP.md`, `HYPOTHESES_AND_METRICS.md`, `PRODUCT_PRINCIPLES.md` | `pilot`, `money` |
| `smm` | sonnet | `content/social/**` | `social` |
| `vidimost` | sonnet | `SEO_AND_ANALYTICS.md`, `SEO_VISIBILITY_AUDIT.md`, sitemap, robots, `llms.txt`, предрендер | `seo` |
| `front` | sonnet | `app/src/**` | `design`, `flow` |
| `dizayner` | sonnet | `DESIGN_SYSTEM.md`, `BRANDBOOK.md`, `SCREENS.md`, `V3_VISUAL_UX_BASELINE.md`, `app/src/assets/**` | `design`, `brand` |
| `redaktor` | opus | `TONE_OF_VOICE.md`, `GLOSSARY.md`, словарь переводов | `content`, `i18n` |
| `infra` | opus | `infra/**`, `supabase/**`, `INFRASTRUCTURE_STATE.md`, `RELEASE_POLICY.md`, `ROLLOUT.md`, `RUNBOOK_ALERTS.md`, `AUTH_PROVIDERS.md` | `infra`, `release`, `auth` |
| `analitik` | sonnet | `METRICS.md`, `HYPOTHESES_AND_METRICS.md` в части метрик, витрины и `admin_`-функции | `data`, `seo` |
| `yurist` | opus | `PRIVACY_AND_DATA.md`, юридические тексты, `ORIGINS_AND_ATTRIBUTION.md` | `legal`, `privacy` |
| `znaniya` | opus | `content/knowledge/**`, миграции каталога, `METHODOLOGY.md`, `SOURCE_REGISTER.md`, `RUNBOOK_KNOWLEDGE_WEEKLY.md` | `knowledge` |

## Почему модель такая

Модель выбрана по цене ошибки, а не по объёму текста. `opus` там, где ошибка необратима
или дорого стоит: миграции и прод, юридический текст, медицинские утверждения, постановка
(три из трёх случаев «построили вторую сущность» родились в ней), стратегия и язык
продукта. `sonnet` там, где ошибка ловится проверкой в том же заходе: код с зелёными
тестами, вёрстка, разметка, сводка состояния.

**Роль не меняет свою модель на ходу.** Задача выше уровня — роль останавливается и
возвращает её с пометкой «нужна модель выше». Догадка вместо остановки — то, ради чего
эта сеть заведена.

## Чего в сети нет и почему

- **ASO.** Продукт не идёт в магазины приложений: видимость PWA его заменяет. Вместо
  ASO у роли `vidimost` есть AISO — цитируемость страниц языковыми моделями.
- **Отдельного «администратора процессов».** Это `sostoyanie` плюс проверки в CI:
  администрирование, которое держится на роли, а не на команде, уже не удержалось.
- **Роли-исполнителя «за всё».** Задача без роли — признак того, что у направления нет
  темы на доске, а не повод завести общего исполнителя.
