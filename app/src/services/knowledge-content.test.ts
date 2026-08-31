import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  checkClaimsAgainstLock,
  checkEditorial,
  citedClaims,
  parseArticle,
  readContent,
  RESERVED_SEGMENTS,
} from './knowledge-content';

/**
 * Гарды базы знаний — каждый со своей негативной проверкой.
 *
 * Правило раздела: у статьи о здоровье нет рецензента, поэтому вся страховка — форма
 * (`docs/EDITORIAL_PROTOCOL_MED.md`). Форма, которую проверяет внимание на ревью, не
 * проверяется никак — это уже случалось в этом репозитории с текстом на картинке
 * превью. Значит каждое правило протокола обязано иметь тест, который его ломает и
 * видит падение; тест «всё хорошо» доказывает только, что сегодня никто не ошибся.
 */
const contentDir = fileURLToPath(new URL('../../../content/knowledge', import.meta.url));

/** Заведомо годная статья. Каждый тест ломает в ней ровно одну вещь. */
const VALID = `---
slug: proba
cluster: telo-posle-otkaza
title: Проба — заголовок для поиска | Habitoff
h1: Проба: заголовок страницы
question: Что проверяет этот файл?
answer_short: Это учебная статья, существующая только внутри теста. Она нужна, чтобы каждый гард раздела можно было сломать намеренно и увидеть падение, а не надеяться на внимательность того, кто читает изменения.
level: B
claims:
  - calms_me
sources:
  - title: Семь частых симптомов отмены
    publication: CDC
    date: 2024
    url: https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/7-common-withdrawal-symptoms/index.html
    type: материал органа здравоохранения
author:
reviewer:
updated: 2026-08-31
changelog:
  - date: 2026-08-31
    what: Заведена вместе с гардами.
related:
faq:
  - q: Это настоящая статья?
    a: Нет, учебная.
---

## На чём это основано

Уровень B, и источник у утверждения один[^1].

{{claim:calms_me}}

## Что известно

Ничего нового: файл существует ради проверки гардов.
`;

const LOCK = { claims: { calms_me: { kind: 'myth', level: 'B', hash: 'x' } } };

function article(patch: (raw: string) => string = (raw) => raw) {
  return parseArticle(patch(VALID), 'content/knowledge/telo-posle-otkaza/proba.md');
}

function broken(patch: (raw: string) => string) {
  return () => {
    const parsed = article(patch);
    checkEditorial(parsed);
    checkClaimsAgainstLock(parsed, LOCK);
  };
}

describe('структура статьи', () => {
  it('разбирает годную статью целиком', () => {
    const parsed = article();
    expect(parsed.slug).toBe('proba');
    expect(parsed.level).toBe('B');
    expect(parsed.sources).toHaveLength(1);
    expect(parsed.faq[0].q).toBe('Это настоящая статья?');
    // Пустое поле остаётся пустым, а не превращается в пустой список.
    expect(parsed.author).toBeNull();
    expect(parsed.reviewer).toBeNull();
    expect(parsed.related).toEqual([]);
    expect(citedClaims(parsed)).toEqual(['calms_me']);
    expect(() => checkEditorial(parsed)).not.toThrow();
    expect(() => checkClaimsAgainstLock(parsed, LOCK)).not.toThrow();
  });

  it('падает без короткого ответа', () => {
    expect(broken((raw) => raw.replace(/^answer_short: .*$/m, 'answer_short:'))).toThrow(
      /answer_short/,
    );
  });

  it('падает, если короткий ответ не самодостаточен', () => {
    // Первый абзац — то, что заберёт ИИ-ответ. Одна строка «да» там бесполезна.
    expect(
      broken((raw) => raw.replace(/^answer_short: .*$/m, 'answer_short: Да, конечно.')),
    ).toThrow(/answer_short/);
  });

  it('падает без уровня и на уровне вне словаря', () => {
    expect(broken((raw) => raw.replace(/^level: B$/m, 'level:'))).toThrow(/level/);
    expect(broken((raw) => raw.replace(/^level: B$/m, 'level: D'))).toThrow(/словаря/);
  });

  it('падает без даты обновления и на неверной дате', () => {
    expect(broken((raw) => raw.replace(/^updated: .*$/m, 'updated:'))).toThrow(/updated/);
    expect(broken((raw) => raw.replace(/^updated: .*$/m, 'updated: 31.08.2026'))).toThrow(/ГГГГ/);
  });

  it('падает на правке без записи в changelog', () => {
    // Самая свежая запись обязана совпадать с датой обновления: граница, изменившаяся
    // молча, — ровно то, чего этот раздел не должен допускать.
    expect(broken((raw) => raw.replace(/^updated: 2026-08-31$/m, 'updated: 2026-09-15'))).toThrow(
      /changelog/,
    );
  });

  it('падает без единой записи в changelog', () => {
    expect(
      broken((raw) => raw.replace(/^changelog:\n {2}- date: .*\n {4}what: .*$/m, 'changelog:')),
    ).toThrow(/changelog/);
  });

  it('падает на нераспознанной строке фронтматтера', () => {
    expect(broken((raw) => raw.replace('level: B', 'level: B\n\tчто-то не то'))).toThrow(
      /не разобрана/,
    );
  });
});

describe('источники', () => {
  it('падает без источников вовсе', () => {
    expect(
      broken((raw) => raw.replace(/^sources:\n( {2}- .*\n| {4}.*\n)+/m, 'sources:\n')),
    ).toThrow(/источник/);
  });

  it('падает у источника без даты', () => {
    expect(broken((raw) => raw.replace(/^ {4}date: 2024$/m, '    date:'))).toThrow(/date/);
  });

  it('падает у источника без адреса', () => {
    expect(broken((raw) => raw.replace(/^ {4}url: .*$/m, '    url:'))).toThrow(/url/);
  });

  it('падает на ссылке не на первоисточник', () => {
    // Пересказ пересказа источником не считается — EDITORIAL_PROTOCOL_MED §3.
    expect(
      broken((raw) => raw.replace(/^ {4}url: .*$/m, '    url: https://example.com/pereskaz')),
    ).toThrow(/первоисточник/);
  });

  it('падает на сноске, указывающей в никуда', () => {
    expect(broken((raw) => raw.replace('[^1]', '[^7]'))).toThrow(/сноска/);
  });
});

describe('редакционный протокол', () => {
  const cases: [string, string, RegExp][] = [
    ['дозировка', 'Обычная схема — принимать по 2 таблетки утром.', /дозировк/],
    ['доза в миллиграммах', 'Начинают с 21 мг в сутки.', /дозировк/],
    ['сравнение препаратов', 'Варениклин лучше, чем пластырь.', /сравнение препаратов/],
    ['рекомендация', 'Принимайте это две недели.', /рекомендация/],
    ['обещание', 'Метод гарантированно поможет бросить.', /обещание/],
    ['подмена врача', 'Разбор связок заменяет врача при отказе.', /обещание/],
    ['срок тяги', 'Тяга длится 3–5 минут и уходит.', /срок тяги/],
    ['проценты по вейпу', 'Вейп на 95 % безопаснее сигарет.', /проценты/],
    ['кальян в сигаретах', 'Один кальян = 100 сигарет по объёму дыма.', /кальян/],
    ['изображение', '![Пачка сигарет](/kartinka.png)', /изображени/],
  ];

  for (const [name, sentence, expected] of cases) {
    it(`падает на конструкции «${name}»`, () => {
      expect(broken((raw) => `${raw}\n\n${sentence}\n`)).toThrow(expected);
    });
  }

  it('падает, если статья называет препараты и молчит про врача', () => {
    expect(
      broken((raw) => `${raw}\n\nСуществует несколько препаратов с доказанной пользой.\n`),
    ).toThrow(/врач/);
  });

  it('пропускает разговор о препаратах, когда врач назван', () => {
    expect(
      broken(
        (raw) =>
          `${raw}\n\nСуществует несколько препаратов с доказанной пользой; решение о препарате принимает врач.\n`,
      ),
    ).not.toThrow();
  });

  it('падает на латинице вне списка разрешённых', () => {
    expect(broken((raw) => `${raw}\n\nВ исследовании Lung Health Study так и вышло.\n`)).toThrow(
      /латиниц/,
    );
  });

  it('не считает латиницей имена организаций из списка', () => {
    expect(broken((raw) => `${raw}\n\nЭто позиция CDC и WHO, а не Habitoff.\n`)).not.toThrow();
  });
});

describe('связь с каталогом', () => {
  it('падает на коде, которого нет среди опубликованных', () => {
    expect(broken((raw) => raw.replace(/calms_me/g, 'net_takogo_koda'))).toThrow(
      /которого нет среди опубликованных/,
    );
  });

  it('падает, если код обещан во фронтматтере, но не процитирован в тексте', () => {
    expect(broken((raw) => raw.replace('{{claim:calms_me}}', 'Пересказ своими словами.'))).toThrow(
      /не процитирован/,
    );
  });
});

describe('настоящее содержание раздела', () => {
  const { registry, articles } = readContent(contentDir);

  it('все статьи проходят структуру и протокол', () => {
    // readContent уже прогнал checkEditorial по каждой; сюда доходит только годное.
    expect(articles.length).toBeGreaterThanOrEqual(8);
    for (const item of articles) {
      expect(item.sources.length, `${item.file} без источников`).toBeGreaterThan(0);
      expect(item.changelog.length, `${item.file} без записи об изменениях`).toBeGreaterThan(0);
    }
  });

  it('каждый процитированный код есть в замке', () => {
    const lock = JSON.parse(readFileSync(`${contentDir}/claims.lock.json`, 'utf8'));
    for (const item of articles) checkClaimsAgainstLock(item, lock);
  });

  it('кластеры не занимают адреса, которые раскладывает сборка', () => {
    for (const cluster of registry.clusters) {
      expect(RESERVED_SEGMENTS).not.toContain(cluster.slug);
    }
  });

  it('вопросы на главной ведут на существующие статьи', () => {
    const paths = new Set(articles.map((item) => `${item.cluster}/${item.slug}`));
    for (const path of registry.home_faq) expect(paths).toContain(path);
  });

  it('в рантайм приложения модули базы знаний не попадают', () => {
    // Тот же приём, что у предрендера: единственный способ утянуть чтение каталога в
    // браузер — импорт. Ищем его во всём, что бандлится.
    const src = fileURLToPath(new URL('..', import.meta.url));
    const forbidden = /knowledge-(content|pages|build)/;
    const walk = (dir: string, found: string[] = []): string[] => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(full, found);
        else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(full);
      }
      return found;
    };
    const guilty = walk(src)
      .filter((file) => !forbidden.test(file))
      .filter((file) => {
        const code = readFileSync(file, 'utf8');
        return [...code.matchAll(/^import[^;]*from '([^']+)';/gm)].some((m) =>
          forbidden.test(m[1]),
        );
      });
    expect(guilty, 'модуль сборки утёк в бандл приложения').toEqual([]);
  });
});
