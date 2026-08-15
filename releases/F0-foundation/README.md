# F0 — Project Foundation

Статус: candidate до merge PR.

## Цель

Создать воспроизводимую проектную основу ALIVE до начала разработки v3.0.

## Scope

Только документация/governance. Runtime-код не изменяется и не создаётся.

## Добавлено

- product root README/AGENTS;
- Project Charter;
- Product Strategy;
- Methodology;
- Origins & Attribution;
- Product Principles;
- Privacy & Data;
- Architecture direction;
- Modules;
- Data Model;
- Hypotheses & Metrics;
- Roadmap;
- Release Policy;
- Glossary;
- Source Register;
- ADR-0001;
- AI prompt/response trail.

## Validation

Foundation считается валидным если:

1. все ключевые документы доступны из `README.md`;
2. некоммерческий статус сформулирован явно;
3. авторство не маскирует заимствования;
4. facts/hypotheses/heuristics разделены;
5. privacy rules не допускают auto-publication UGC;
6. v2.7/v2.8/v3.0 version history непротиворечива;
7. v3.0 code не добавлен;
8. следующий developer/AI может определить next gate без чата.

## Rollback

Поскольку release unit не меняет runtime, rollback — revert foundation commit/PR.

HumanOS 2.0 runtime/roadmap не изменяются.

## Next

После merge открыть v3.0 Platform release unit и отдельную feature branch.
