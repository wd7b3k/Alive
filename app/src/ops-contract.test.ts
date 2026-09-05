import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Договор «не выполнено — значит не сделано».
 *
 * За три дня один и тот же класс ошибки повторился четыре раза: код писали, не запускали
 * и объявляли готовым. Четыре витрины из шести падали при первом вызове; проверка входа
 * не слала ключ и сообщала об отказе при работающем входе; проверка бэкапов искала метку
 * с выдуманным именем и двое суток кричала при исправном восстановлении; проверка
 * счётчиков искала строку, которая есть в бандле всегда.
 *
 * Ни одну из них не поймал бы линтер или компилятор: SQL проверяется в момент вызова,
 * shell — в момент запуска. Поймать можно только одно — что вызова вообще нет нигде.
 * Этот файл проверяет именно это и ничего больше.
 */

const root = fileURLToPath(new URL('../../', import.meta.url));

const migrations = readdirSync(`${root}supabase/migrations`)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => readFileSync(`${root}supabase/migrations/${name}`, 'utf8'))
  .join('\n');

const smokeTest = readFileSync(`${root}supabase/tests/local/04_admin_views_test.sql`, 'utf8');

describe('витрины админки', () => {
  it('каждая admin_-функция вызывается хотя бы одним тестом', () => {
    const declared = new Set(
      [...migrations.matchAll(/create or replace function public\.(admin_\w+)/g)].map(
        (match) => match[1],
      ),
    );
    const missing = [...declared].filter((name) => !smokeTest.includes(`public.${name}(`)).sort();
    expect(missing).toEqual([]);
  });
});

const checksDirectory = `${root}infra/monitoring/checks`;
const runner = readFileSync(`${root}infra/monitoring/run-check.sh`, 'utf8');

describe('проверки мониторинга', () => {
  it('каждая проверка подключена к группе запуска', () => {
    const scripts = readdirSync(checksDirectory)
      .filter((name) => name.endsWith('.sh'))
      .map((name) => name.replace(/\.sh$/, ''));
    const orphans = scripts.filter((name) => !runner.includes(name)).sort();
    expect(orphans).toEqual([]);
  });

  it('каждая проверка сливает буфер и очередь алертов', () => {
    // Проверка, которая записала результат и не слила его, молчит ровно так же, как
    // проверка, которой нет. Разница видна только через сутки, в разборе аварии.
    const silent = readdirSync(checksDirectory)
      .filter((name) => name.endsWith('.sh'))
      .filter((name) => {
        const body = readFileSync(`${checksDirectory}/${name}`, 'utf8');
        return !body.includes('flush_buffer') || !body.includes('flush_alerts');
      })
      .sort();
    expect(silent).toEqual([]);
  });
});
