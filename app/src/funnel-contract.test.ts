import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Договор воронки: объявленный этап обязан отправляться, объявленная цель — достигаться.
 *
 * Ошибка, ради которой файл написан, держалась неделю и выглядела безупречно. В коде
 * было объявлено пять целей и пять этапов; отправлялась одна цель и записывались два
 * этапа. Ни компилятор, ни линтер такого не видят: незаписанного вызова не существует,
 * а объявление типа само по себе валидно. Увидеть можно только одно — что имени нет
 * ни в одном вызове. Этот файл проверяет ровно это и ничего больше.
 *
 * Он намеренно читает исходники текстом, а не импортирует модули: вызов, спрятанный за
 * условием или мёртвой веткой, всё равно будет виден, а импорт потянул бы за собой
 * половину приложения и превратил бы договор в интеграционный тест.
 */

const root = fileURLToPath(new URL('./', import.meta.url));

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = `${directory}/${name}`;
    if (statSync(path).isDirectory()) return sources(path);
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return [path];
  });
}

const files = sources(root.replace(/\/$/, ''));
const code = files.map((path) => readFileSync(path, 'utf8')).join('\n');

const counters = readFileSync(`${root}services/counters.ts`, 'utf8');
const analytics = readFileSync(`${root}services/analytics.ts`, 'utf8');

/** Значения строкового объединения: `type X =\n | 'a'\n | 'b';` и запись в одну строку. */
function unionValues(source: string, name: string): string[] {
  const declaration = new RegExp(`export type ${name} =([\\s\\S]*?);`).exec(source);
  expect(declaration, `объявление ${name} не найдено`).toBeTruthy();
  return [...declaration![1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
}

const stages = unionValues(analytics, 'FunnelStage');
const goals = unionValues(counters, 'FunnelGoal');

/** Пары «этап → цель» из единственного места, где они записаны. */
const mapping = new Map(
  [...counters.matchAll(/^\s{2}([a-z_]+):\s*'([a-z_]+)',$/gm)].map((match) => [match[1], match[2]]),
);

describe('словарь воронки', () => {
  it('перечисления непусты — иначе проверки ниже ничего не значат', () => {
    expect(stages.length).toBeGreaterThan(0);
    expect(goals.length).toBeGreaterThan(0);
  });

  it('у каждого этапа есть цель', () => {
    const orphans = stages.filter((stage) => !mapping.has(stage)).sort();
    expect(orphans).toEqual([]);
  });

  it('до каждой цели можно добраться с какого-то этапа', () => {
    // Обратную сторону карты компилятор не проверяет: `Record<FunnelStage, FunnelGoal>`
    // требует полноты ключей, но не полноты значений. Цель, до которой нельзя дойти, —
    // это цель, которую заведут в кабинете и будут ждать вечно.
    const reachable = new Set(mapping.values());
    const unreachable = goals.filter((goal) => !reachable.has(goal)).sort();
    expect(unreachable).toEqual([]);
  });
});

describe('этапы воронки отправляются', () => {
  it('каждый объявленный этап встречается хотя бы в одном вызове', () => {
    // Три законных способа отправить этап: веха с записью и целью, только цель
    // (там, где событие уже пишется рядом со своим смыслом) и прямая пометка события.
    const sent = stages.filter((stage) => {
      const patterns = [
        new RegExp(`trackStageOnce\\([^)]*'${stage}'`, 's'),
        new RegExp(`reachStageGoal\\('${stage}'\\)`),
        new RegExp(`funnel_stage: '${stage}'`),
      ];
      return patterns.some((pattern) => pattern.test(code));
    });
    const missing = stages.filter((stage) => !sent.includes(stage)).sort();
    expect(missing, 'этап объявлен, но не отправляется ниоткуда').toEqual([]);
  });

  it('каждая цель достигается через отправляемый этап', () => {
    const reached = new Set(
      stages
        .filter((stage) =>
          [
            new RegExp(`trackStageOnce\\([^)]*'${stage}'`, 's'),
            new RegExp(`reachStageGoal\\('${stage}'\\)`),
          ].some((pattern) => pattern.test(code)),
        )
        .map((stage) => mapping.get(stage)),
    );
    const missing = goals.filter((goal) => !reached.has(goal)).sort();
    expect(missing, 'цель объявлена, но её некому достичь').toEqual([]);
  });
});

describe('дата включения счётчиков', () => {
  it('записана в коде и в METRICS.md одним и тем же числом', () => {
    const declared = /COUNTERS_LIVE_SINCE = '([\d-]+)'/.exec(counters);
    expect(declared, 'COUNTERS_LIVE_SINCE не объявлена').toBeTruthy();
    const metrics = readFileSync(`${root}../../docs/METRICS.md`, 'utf8');
    // Дата в документе и в коде — одно и то же число. Разъедутся — и снова будет
    // сравнение периода, в котором счётчика ещё не было.
    expect(metrics).toContain(declared![1]);
  });
});
