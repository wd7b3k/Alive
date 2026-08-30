import { useState } from 'react';

import { Icon } from '../ui-icons';

/**
 * Текст, который человек отправляет другу.
 *
 * Собирается из одной публичной вещи — названия замены: это редакционный каталог, а не
 * данные человека. Ни тяги, ни контекста, ни заметок здесь нет и быть не может — момент
 * тяги приватен, и «поделиться» не должно превращаться в утечку того, что человек
 * только что о себе записал.
 *
 * Адреса в тексте больше нет: он уезжает отдельным полем `url`. Приложение-получатель,
 * которому ссылка приходит внутри строки, обрабатывает её как часть текста — часть
 * целей теряет превью, часть обрезает. Отдельное поле — это ровно то, из чего Telegram,
 * ВКонтакте и системный лист iOS собирают карточку.
 */
export function shareText(replacementTitle: string | null): string {
  const what = replacementTitle
    ? `Сработало: ${replacementTitle.toLowerCase()}.`
    : 'Хватило того, что момент вообще замечен.';
  return `Автоматизм включился — и ответ на него был другой. ${what} Я разбираю такие моменты в Habitoff.`;
}

/**
 * Адрес с меткой источника.
 *
 * Совет друга — единственный органический канал, который у продукта уже написан в коде,
 * и до 30.08.2026 отличить приход по нему от прочих заходов было нечем: отправлялся
 * голый `origin`.
 *
 * Метка — обычные utm-поля, и это не выбор из вкусовых соображений. Их уже читает
 * `services/visitor.ts` при первом визите и кладёт в `analytics_visitors`, откуда их
 * показывает витрина `admin_sources` (`utm_source` приезжает туда полем `detail`).
 * Те же поля понимают счётчики. То есть метка читается тем, что уже стоит, и не требует
 * ни нового внешнего сервиса, ни миграции.
 */
export const SHARE_SOURCE = 'friend';

export function shareUrl(origin: string): string {
  const base = origin || 'https://habitoff.ru';
  return `${base}/?utm_source=${SHARE_SOURCE}&utm_medium=share`;
}

/**
 * Предложение поделиться в тот момент, когда желание возникает само.
 *
 * Появляется ровно один раз за сценарий и только когда автоматизм действительно
 * прерван: предлагать это после сорвавшегося эпизода было бы бестактно. Ничего не
 * отправляется само — открывается системное окно, а там решает человек.
 */
export function ShareWin({ replacementTitle }: { replacementTitle: string | null }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function share() {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    const text = shareText(replacementTitle);
    const url = shareUrl(origin);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Habitoff', text, url });
        return;
      }
      // В буфер — одной строкой: там поля `url` нет, и человек вставляет то, что видит.
      await navigator.clipboard.writeText(`${text} ${url}`);
      setState('copied');
    } catch {
      // Отмена в системном окне — это тоже исход, и он не ошибка. Отличить её от
      // настоящего отказа нельзя, поэтому текст говорит про буфер, а не про сбой.
      setState('failed');
    }
  }

  return (
    <p className="r-flow-share">
      <Icon name="people" size={20} />
      <span>
        <b>Это стоит рассказать</b>
        {state === 'copied'
          ? 'Текст скопирован — вставь его туда, где общаешься с этим человеком.'
          : state === 'failed'
            ? 'Не получилось открыть окно «Поделиться». Скопируй текст вручную или попробуй ещё раз.'
            : 'Кто-то рядом сейчас в той же точке. Одного живого примера бывает достаточно.'}
      </span>
      <button type="button" onClick={share}>
        Поделиться с другом
      </button>
    </p>
  );
}
