# Prompt

Owner review of ALIVE v3.1 preview found a severe design and functionality regression relative to the approved v3.0 interface

Owner requirements:

- stop replacing the approved design on every release
- use repository/history instead of rebuilding from scratch
- create a detailed persistent Brandbook for ALIVE and follow it
- preserve previous release functionality
- treat the approved v3.0 design as the baseline rather than generating a new shell
- keep the service Russian-language
- continue development only through additive, regression-safe changes

Specific owner feedback from browser preview:

> «это что за треш? почему изговнял весь дизайн»

> «пиши развернутый брендбук для себя и придерживайся его»

> «вчерашний функционал весь поломан... почему ты обнуляешься и все ломаешь каждый релиз, у тебя же есть история, репо»

Required response:

1. identify the root cause in git diff
2. restore the approved v3.0 frontend shell before further integration
3. write a canonical detailed Brandbook into the repo
4. enforce it through AI/frontend guardrails
5. record the UI regression in the v3.1 release validation
6. re-integrate v3.1 frontend functions incrementally into the approved existing UI rather than through a parallel root shell
