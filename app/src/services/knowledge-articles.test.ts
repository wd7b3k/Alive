import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  checkClaimsAgainstCatalog,
  checkEditorial,
  citedClaims,
  parseArticle,
  readContent,
  RESERVED_SEGMENTS,
} from './knowledge-articles';
import { cards } from './knowledge-catalog';

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

/** Каталог теста: один код, тот же, что цитирует учебная статья. */
const KNOWN = (code: string) => code === 'calms_me';

function article(patch: (raw: string) => string = (raw) => raw) {
  return parseArticle(patch(VALID), 'content/knowledge/telo-posle-otkaza/proba.md');
}

function broken(patch: (raw: string) => string) {
  return () => {
    const parsed = article(patch);
    checkEditorial(parsed);
    checkClaimsAgainstCatalog(parsed, KNOWN);
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
    expect(() => checkClaimsAgainstCatalog(parsed, KNOWN)).not.toThrow();
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

  /**
   * Послабления 05.09.2026, сделанные ради кластера «Что нового».
   *
   * Каждое из них — сужение медицинского или языкового запрета, поэтому проверяется в
   * обе стороны: что послабление работает и что запрет от него не исчез. Тест «стало
   * зелено» доказывал бы только, что гард замолчал.
   */
  it('пропускает адрес и идентификатор публикации, но не постороннюю латиницу', () => {
    const notes =
      '[^1]: Стимулы, Cochrane Database of Systematic Reviews, CD004307.pub7, https://www.cochrane.org/evidence/CD004307';
    expect(broken((raw) => `${raw}\n\n${notes}\n`)).not.toThrow();
    expect(broken((raw) => `${raw}\n\n${notes} Lung Health Study\n`)).toThrow(/латиниц/);
  });

  it('пропускает содержание вещества, но не дозу', () => {
    // «0,70 мг на грамм табака» — предмет регуляторного стандарта, и статья про него
    // обязана назвать число. «21 мг в сутки» — назначение, и оно запрещено по-прежнему.
    expect(
      broken((raw) => `${raw}\n\nПредел — 0,70 миллиграмма никотина на грамм табака.\n`),
    ).not.toThrow();
    expect(broken((raw) => `${raw}\n\nСейчас в среднем 17,2 мг/г.\n`)).not.toThrow();
    expect(broken((raw) => `${raw}\n\nСхема — 21 мг в сутки.\n`)).toThrow(/дозировк/);
    expect(broken((raw) => `${raw}\n\nПластырь на 14 мг.\n`)).toThrow(/дозировк/);
  });

  it('считает первоисточником издающий орган, но не любой сайт', () => {
    const url = (value: string) => (raw: string) =>
      raw.replace(/^ {4}url: .*$/m, `    url: ${value}`);
    expect(
      broken(url('https://www.gov.uk/government/collections/tobacco-and-vapes-bill')),
    ).not.toThrow();
    expect(
      broken(url('https://www.federalregister.gov/documents/2025/01/16/2025-00787')),
    ).not.toThrow();
    expect(broken(url('https://www.consultant.ru/document/cons_doc_LAW_1/'))).not.toThrow();
    expect(broken(url('https://example.com/press-release'))).toThrow(/первоисточник/);
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
  const codes = new Set(cards().map((card) => card.code));
  const { registry, articles } = readContent(contentDir, codes);

  it('все статьи проходят структуру и протокол', () => {
    // readContent уже прогнал checkEditorial по каждой; сюда доходит только годное.
    expect(articles.length).toBeGreaterThanOrEqual(8);
    for (const item of articles) {
      expect(item.sources.length, `${item.file} без источников`).toBeGreaterThan(0);
      expect(item.changelog.length, `${item.file} без записи об изменениях`).toBeGreaterThan(0);
    }
  });

  it('каждый процитированный код есть в выгрузке каталога', () => {
    for (const item of articles) checkClaimsAgainstCatalog(item, (code) => codes.has(code));
  });

  it('слаг кластера не совпадает с кодом карточки', () => {
    // Одно пространство имён: `/knowledge/<код>` и `/knowledge/<кластер>/<слаг>`.
    for (const cluster of registry.clusters) {
      expect(codes.has(cluster.slug.replace(/-/g, '_')), cluster.slug).toBe(false);
    }
  });

  it('кластеры не занимают адреса, которые раскладывает сборка', () => {
    for (const cluster of registry.clusters) {
      expect(RESERVED_SEGMENTS).not.toContain(cluster.slug);
    }
  });

  it('в рантайм приложения модули базы знаний не попадают', () => {
    // Тот же приём, что у предрендера: единственный способ утянуть чтение каталога в
    // браузер — импорт. Ищем его во всём, что бандлится.
    //
    // `knowledge-articles.json` под запрет не подпадает и не должен: это не модуль
    // сборки, а готовый индекс, ради которого всё и делалось, — приложение обязано его
    // читать, иначе из него в разборы не попасть. Запрещены именно модули: они тянут за
    // собой `node:fs` и разбор markdown.
    const src = fileURLToPath(new URL('..', import.meta.url));
    const forbidden = /knowledge-articles(?!\.json)|knowledge-article-pages/;
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
