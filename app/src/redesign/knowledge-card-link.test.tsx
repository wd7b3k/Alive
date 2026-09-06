import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { KnowledgeCardBody, KnowledgeCardView } from './knowledge';
import { pathForCode } from '../domain/knowledge-address';
import type { Knowledge, KnowledgeCard } from '../data';
import { EVIDENCE_LEVELS } from '../domain/evidence-levels';

/**
 * Карточка «Фактов» — это ссылка на свой адрес, и проверять это надо на том, что рисует
 * React, а не на статическом слепке: слепок кладёт сборка, а человек видит приложение.
 * До 06.09.2026 адрес жил в отдельной строке-ссылке под карточкой — служебной подписи,
 * которая на узкой ширине читалась как мусор между карточками, сорок два раза подряд.
 */
const card: KnowledgeCard = {
  code: 'calms_me',
  kind: 'myth',
  claim_ru: 'Сигарета меня успокаивает',
  question_ru: 'Правда ли, что сигарета успокаивает?',
  known_ru: 'Облегчение реально, но часть напряжения создаёт сама зависимость.',
  changes_ru: 'Если напряжение вернулось через час — это отмена, а не характер.',
  detail_ru: 'Первый абзац о механизме.\n\nВторой абзац о границах.',
  evidence_level: 'B',
  product_types: ['cigarette'],
  surfaces: ['public'],
  sort_order: 10,
  sources: [
    {
      title: 'CDC — 7 Common Withdrawal Symptoms',
      original: '7 Common Withdrawal Symptoms',
      url: 'https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/',
      publication: 'CDC',
      year: 2024,
    },
  ],
};

const knowledge: Knowledge = {
  cards: [card],
  levels: EVIDENCE_LEVELS.map((level) => ({ ...level })),
  cardTriggers: [],
  evidence: [],
  sources: [],
} as unknown as Knowledge;

const linked = renderToStaticMarkup(
  <KnowledgeCardView knowledge={knowledge} card={card} href={pathForCode(card.code)} />,
);
const plain = renderToStaticMarkup(<KnowledgeCardView knowledge={knowledge} card={card} />);

describe('карточка каталога ведёт на свой адрес', () => {
  it('в карточке ровно одна ссылка на её адрес', () => {
    const own = [...linked.matchAll(/href="(\/knowledge\/[^"]+)"/g)].map((match) => match[1]);
    expect(own).toEqual(['/knowledge/calms-me']);
  });

  it('ссылка — в заголовке, а не отдельной подписью под карточкой', () => {
    expect(linked).toMatch(/<h3[^>]*><a[^>]*href="\/knowledge\/calms-me"/);
  });

  /**
   * Негативная проверка: без адреса карточка обязана остаться прежней. Иначе тридцать
   * восемь карточек в местах, где страницы карточки нет вовсе, стали бы ссылками в никуда.
   */
  it('без адреса ссылки не появляется', () => {
    expect(plain).not.toContain('href="/knowledge/');
    expect(plain).not.toContain('linked');
  });

  it('ссылка на первоисточник живёт своей жизнью и не вложена в ссылку карточки', () => {
    expect(linked).toContain('href="https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/"');
    // Ссылка внутри ссылки — невалидная разметка, которую браузеры чинят по-своему.
    const own = linked.match(/<a[^>]*href="\/knowledge\/[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    expect(own, 'ссылки карточки нет вовсе').toBeTruthy();
    expect(own![1]).not.toContain('<a ');
  });

  it('раскрытие «Границы и источники» осталось на месте', () => {
    expect(linked).toContain('Границы и источники');
    expect(linked).toContain('<details');
  });
});

const appSource = readFileSync(
  fileURLToPath(new URL('../RedesignApp.tsx', import.meta.url)),
  'utf8',
);
const css = readFileSync(fileURLToPath(new URL('../redesign.css', import.meta.url)), 'utf8');

describe('строка-ссылка под карточкой не возвращается', () => {
  it('текста «Отдельная страница карточки» в приложении нет', () => {
    expect(appSource).not.toContain('Отдельная страница карточки');
  });

  it('обёртки r-knowledge-card-linked нет ни в разметке, ни в стилях', () => {
    expect(appSource).not.toContain('r-knowledge-card-linked');
    expect(css).not.toContain('r-knowledge-card-linked');
  });

  /**
   * Оба места, где раздел показывает сетку карточек до входа, обязаны передавать адрес.
   * Смонтировать здесь весь `RedesignApp` нельзя — он тянет клиент Supabase и роутер, —
   * поэтому проверяется вызов: карточка в сетке без `href` это карточка без адреса.
   */
  it('все сетки раздела передают адрес карточки — и до входа, и после', () => {
    const calls = [...appSource.matchAll(/<KnowledgeCardView[\s\S]*?\/>/g)].map((m) => m[0]);
    const grids = calls.filter((call) => call.includes('key={card.code}'));
    // Четыре сетки: факты и мифы до входа, факты и мифы после. Карточка в сетке без
    // `href` — это карточка без адреса, и раздел снова начинает вести себя по-разному
    // до и после входа.
    expect(grids.length).toBe(4);
    for (const call of grids) expect(call).toContain('href={pathForCode(card.code)}');
  });
});

describe('адрес карточки открывается и после входа', () => {
  /**
   * До 06.09.2026 ветки `/knowledge/<код>` в роутере со входом не было: путь
   * проваливался в `else` и показывал «Сегодня». Обновление страницы на адресе карточки
   * уводило вошедшего человека на другой экран — раздел вёл себя по-разному до и после
   * входа. Тест падает, если ветка пропала или начала разбирать адрес по-своему.
   */
  it('роутер после входа разбирает адрес тем же codeFromPath', () => {
    expect(appSource).toMatch(
      /else if \(codeFromPath\(path\)\) page = <KnowledgeCardPage data=\{data\} code=\{codeFromPath\(path\)!\} \/>;/,
    );
    // Второго разбора адреса в продукте нет: и сборка, и оба роутера зовут одну функцию.
    expect(appSource).not.toMatch(/path\.startsWith\('\/knowledge\//);
  });

  it('содержание страницы карточки — одно на оба входа', () => {
    // `KnowledgeCardBody` рисуется и публичной оболочкой, и экраном после входа.
    expect(appSource).toContain('<KnowledgeCardBody');
    expect(appSource.match(/<KnowledgeCardBody/g)?.length).toBe(2);
  });

  it('страница карточки показывает вопрос, утверждение и развёрнутый текст', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeCardBody knowledge={knowledge} code="calms_me" />,
    );
    expect(markup).toContain('<h1>Правда ли, что сигарета успокаивает?</h1>');
    expect(markup).toContain('Сигарета меня успокаивает');
    expect(markup).toContain('Первый абзац о механизме.');
    expect(markup).toContain('Второй абзац о границах.');
    expect(markup).toContain('href="/knowledge"');
    // На своей странице карточка не ссылается сама на себя.
    expect(markup).not.toContain('href="/knowledge/calms-me"');
  });

  it('неизвестный код — не пустая страница и не «Сегодня»', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeCardBody knowledge={knowledge} code="net_takoy" />,
    );
    expect(markup).toContain('Такой карточки нет');
    expect(markup).toContain('href="/knowledge"');
  });

  it('пока каталог грузится, «не найдено» не показывается', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeCardBody knowledge={knowledge} code="net_takoy" loading />,
    );
    expect(markup).toBe('');
  });
});

describe('состояния кликабельной карточки объявлены', () => {
  /**
   * Требования `docs/DESIGN_SYSTEM.md` §6 и §8: подъём на hover, уменьшение на нажатие,
   * обвод на фокусе — и всё это выключено при «уменьшить движение». Проверяется в CSS,
   * потому что в jsdom состояний нет вовсе.
   */
  it('hover поднимает, нажатие уменьшает', () => {
    expect(css).toContain('.r-knowledge-card.linked:hover{transform:translateY(-1px)');
    expect(css).toContain('.r-knowledge-card.linked:active{transform:scale(.995)}');
  });

  it('обвод фокуса рисуется на карточке, а не на строке заголовка', () => {
    expect(css).toContain(
      '.r-knowledge-card.linked:has(.r-knowledge-card-link:focus-visible){outline:2px solid var(--r-sand);outline-offset:3px}',
    );
  });

  it('«Границы и источники» подняты над растянутой ссылкой', () => {
    expect(css).toContain(
      '.r-knowledge-card.linked>.r-evidence-detail{position:relative;z-index:1}',
    );
  });

  it('при «уменьшить движение» карточка не дёргается', () => {
    expect(css).toMatch(
      /@media\(prefers-reduced-motion:reduce\)\{\.r-knowledge-card\.linked:hover,\.r-knowledge-card\.linked:active\{transform:none!important\}\}/,
    );
  });
});
