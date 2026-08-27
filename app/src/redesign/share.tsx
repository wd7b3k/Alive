import { useState } from 'react';

import { Icon } from '../ui-icons';

/**
 * Текст, который человек отправляет другу.
 *
 * Собирается из двух публичных вещей: названия замены (это редакционный каталог, а не
 * его данные) и адреса продукта. Ни тяги, ни контекста, ни заметок здесь нет и быть не
 * может — момент тяги приватен, и «поделиться» не должно превращаться в утечку того,
 * что человек только что о себе записал.
 */
export function shareText(replacementTitle: string | null, origin: string): string {
  const what = replacementTitle
    ? `Сработало: ${replacementTitle.toLowerCase()}.`
    : 'Просто заметил момент — и этого хватило.';
  return `Только что поймал автоматизм и выбрал другой ответ. ${what} Я разбираю такие моменты в Habitoff: ${origin}`;
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
    const text = shareText(replacementTitle, origin);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Habitoff', text });
        return;
      }
      await navigator.clipboard.writeText(text);
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
            : 'Кто-то рядом сейчас в том же месте, где был ты. Одного примера бывает достаточно.'}
      </span>
      <button type="button" onClick={share}>
        Поделиться с другом
      </button>
    </p>
  );
}
