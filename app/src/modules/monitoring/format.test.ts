import { describe, expect, it } from 'vitest';
import { STATUS_LABEL, ago, measurement, percent, period, statusTone } from './format';

describe('возраст отчёта', () => {
  it('не округляет молчание до «только что»', () => {
    // Проверка обязана отчитываться раз в минуту. Разница между пятью и пятьюдесятью
    // секундами — это разница между нормой и пропущенным запуском.
    expect(ago(5)).toBe('5 секунд назад');
    expect(ago(50)).toBe('50 секунд назад');
  });

  it('склоняет по-русски', () => {
    expect(ago(1)).toBe('1 секунду назад');
    expect(ago(3)).toBe('3 секунды назад');
    expect(ago(11)).toBe('11 секунд назад');
    expect(ago(120)).toBe('2 минуты назад');
    expect(ago(3600 * 5)).toBe('5 часов назад');
    expect(ago(86400 * 3)).toBe('3 дня назад');
  });

  it('отсутствие отчёта называет отсутствием, а не нулём', () => {
    expect(ago(null)).toBe('никогда');
  });
});

describe('период отчёта', () => {
  it('переводит секунды в человеческую частоту', () => {
    expect(period(60)).toBe('раз в минуту');
    expect(period(300)).toBe('раз в 5 мин');
    expect(period(86400)).toBe('раз в сутки');
  });

  it('не выдумывает период, которого нет в каталоге', () => {
    expect(period(null)).toBe('период не описан');
  });
});

describe('измеренное значение', () => {
  it('показывает значение с единицей', () => {
    expect(measurement({ value: 15, unit: '%', latency_ms: null })).toBe('15 %');
    expect(measurement({ value: 0.95, unit: null, latency_ms: null })).toBe('0.95');
  });

  it('падает на задержку, когда значения нет: у проверок доступности замер — это отклик', () => {
    expect(measurement({ value: null, unit: null, latency_ms: 27 })).toBe('27 мс');
  });

  it('не выдумывает число, когда его нет вовсе', () => {
    expect(measurement({ value: null, unit: null, latency_ms: null })).toBeNull();
  });
});

describe('цвет статуса', () => {
  it('молчание красит не как аварию: неизвестность — не поломка', () => {
    expect(statusTone('stale')).toBe('unknown');
    expect(statusTone('silent')).toBe('unknown');
    expect(statusTone('unknown')).toBe('unknown');
  });

  it('отказ и авария — один цвет', () => {
    expect(statusTone('fail')).toBe('fail');
    expect(statusTone('down')).toBe('fail');
  });

  it('запланированная часть не тревожит', () => {
    expect(statusTone('planned')).toBe('planned');
  });
});

describe('подписи статусов', () => {
  it('у каждого статуса базы есть слово', () => {
    for (const status of ['ok', 'warn', 'stale', 'silent', 'fail', 'planned'] as const) {
      expect(STATUS_LABEL[status]).toBeTruthy();
    }
  });
});

describe('проценты', () => {
  it('пустое остаётся пустым, а не превращается в ноль', () => {
    expect(percent(null)).toBeNull();
    expect(percent(0)).toBe('0%');
    expect(percent(94.12)).toBe('94.12%');
  });
});
