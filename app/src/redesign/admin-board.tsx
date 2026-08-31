import { useEffect, useMemo, useState } from 'react';
import template from '../../../scripts/board-template.html?raw';
import cards from '../../../docs/board/cards.json';
import overrides from '../../../docs/board/overrides.json';

/**
 * Доска работ. Перенесена как есть.
 *
 * Раздел показывает `scripts/board-template.html` — ту самую страницу, которую собирает
 * `node scripts/board.mjs build` и которая раньше публиковалась артефактом. Она не
 * переписана на React намеренно: в шаблоне уже отлажены три вида (роадмэп, доска,
 * список), фильтры, панель карточки, перетаскивание и обе выгрузки. Переписывание дало бы
 * тот же объём заново и растеряло бы мелочи, которых там накопилось много.
 *
 * Цена решения видна глазом: у страницы свои стили, а не шкалы дизайн-системы, поэтому
 * между шапкой админки и доской есть шов. Это осознанный размен полноты на единообразие;
 * переписать на React можно позже, когда станет ясно, чем из этого пользуются.
 *
 * Данные подставляются ровно так же, как в `board.mjs build`, — два плейсхолдера в
 * шаблоне. Отдельного шага сборки нет: файлы репозитория попадают в чанк админки при
 * сборке приложения, поэтому доска не может отстать от кода, с которым выложена.
 *
 * Правки. Страница пишет их в `localStorage` этого домена, а кнопка выгрузки отдаёт
 * готовый `overrides.json`, который кладётся в `docs/board/` и коммитится. Источником
 * истины остаётся репозиторий: правка живёт в браузере ровно до тех пор, пока её не
 * перенесли в git.
 *
 * Разворот на всё окно. Канбан из пяти колонок и список с сортировкой не помещаются в
 * рамку раздела, а шаблон трогать нельзя: его собирает ещё и `board.mjs build`, и правка
 * в одном месте разъедет два. Поэтому кнопка живёт здесь, снаружи рамки, — внутри неё
 * чужая страница.
 *
 * ГЛАВНОЕ ОГРАНИЧЕНИЕ: переключение не смеет пересоздать узел `<iframe>`. Новый узел —
 * это перезагрузка страницы доски: слетают фильтры, выбранный вид, прокрутка и ручные
 * правки, которые до выгрузки в `overrides.json` живут только в `localStorage` браузера.
 * Поэтому здесь один и тот же элемент в обоих состояниях, меняется только класс: ни
 * ветки `expanded ? <iframe/> : <iframe/>`, ни смены `key`, ни переноса узла к другому
 * родителю. По той же причине `html` считается один раз в `useMemo`: другая строка в
 * `srcDoc` перезагрузила бы рамку не хуже пересоздания. Проверяет это
 * `admin-board.test.tsx` — глазами такое ловится через неделю по потерянным правкам.
 */

/**
 * Экранирование при вставке JSON внутрь `<script>`.
 *
 * Один в один с `board.mjs`: без подмены `<` строка вида `</script>` внутри данных
 * закрыла бы тег и разорвала страницу, а U+2028 и U+2029 — переводы строк для
 * JavaScript, но не для JSON.
 */
function safe(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\u003c')
    .replace(/\u2028/g, '\u2028')
    .replace(/\u2029/g, '\u2029');
}

export function AdminBoard() {
  const html = useMemo(
    () =>
      template
        .replace('__CARDS_JSON__', () => safe(cards))
        .replace('__OVERRIDES_JSON__', () => safe(overrides)),
    [],
  );

  const [expanded, setExpanded] = useState(false);

  /**
   * Пока доска развёрнута: Escape сворачивает, документ под ней не прокручивается.
   *
   * Прокрутка возвращается тем же кодом и при сворачивании, и при уходе с раздела —
   * иначе развёрнутая доска оставила бы после себя намертво залипшую страницу.
   * Сохраняется прежнее значение, а не `''`: правило может прийти и снаружи.
   */
  useEffect(() => {
    if (!expanded) return;
    const body = document.body;
    const overflowBefore = body.style.overflow;
    body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      body.style.overflow = overflowBefore;
    };
  }, [expanded]);

  // Без `sandbox`: страница своя, а атрибут отрезал бы ей `localStorage` — тот самый
  // слой, в котором живут ручные правки до переноса в репозиторий.
  return (
    <div className="r-board">
      <div className={expanded ? 'r-board-bar r-board-bar-float' : 'r-board-bar'}>
        <button
          type="button"
          aria-pressed={expanded}
          title={
            expanded
              ? 'Свернуть доску до размеров раздела. То же делает Escape.'
              : 'Развернуть доску на всё окно: канбан из пяти колонок в рамку раздела не помещается.'
          }
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Свернуть' : 'Развернуть'}
        </button>
      </div>
      <iframe
        className={expanded ? 'r-board-frame r-board-frame-full' : 'r-board-frame'}
        title="Доска работ"
        srcDoc={html}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
