import type { ReactNode } from 'react';
import type { Bootstrap } from '../data';
import { navigateTo } from '../services/navigation';
import { Icon, type IconName } from '../ui-icons';
import { AnalyticsModule } from '../modules/analytics';
import { MonitoringModule } from '../modules/monitoring';
import { AdminBoard } from './admin-board';

/**
 * Закрытый раздел управления: одно место, одна структура.
 *
 * Разделы админки пишутся разными сессиями и в разное время. Чтобы они не разошлись в
 * три несовместимых каркаса, оболочка здесь одна, а блок — это строка в `ADMIN_SECTIONS`
 * и один файл рядом. Добавить блок значит дописать строку, а не придумать навигацию
 * заново. Порядок и требования — `docs/ADMIN.md`, решение — ADR-0014.
 *
 * Что эта оболочка НЕ делает: она не защищает данные. Проверка `role === 'admin'` ниже
 * решает только, рисовать ли пункты меню. Настоящая защита — на сервере: RPC вида
 * `admin_*` отказывают не-администратору, и роль ставится миграцией, а не приложением.
 * Тот же принцип уже записан в `health.tsx`: спрятанная кнопка ничего не защищает.
 * Поэтому блок, который показывает чьи-то данные, обязан брать их через `admin_*`.
 */

export type AdminSectionStatus = 'live' | 'wip' | 'planned';

export type AdminContext = { data: Bootstrap };

export type AdminSection = {
  /** Сегмент адреса: `/admin/<id>`. Меняется только вместе со ссылками на него. */
  id: string;
  title: string;
  /** Одна строка под заголовком: что тут человек увидит. Без неё пункт не заводить. */
  hint: string;
  icon: IconName;
  status: AdminSectionStatus;
  /** Нет функции — рисуется честная заглушка со статусом. */
  render?: (ctx: AdminContext) => ReactNode;
  /** Внешний адрес вместо раздела: пункт становится ссылкой. */
  href?: string;
};

/**
 * Реестр разделов. Единственное место, где заводится пункт админки.
 *
 * `status` — не украшение, а обещание: `live` значит, что раздел показывает настоящие
 * данные; `wip` — что его прямо сейчас пишут в отдельной ветке; `planned` — что решения
 * ещё нет. Заглушка честно говорит, чего не хватает, вместо пустого экрана.
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: 'monitoring',
    title: 'Мониторинг',
    hint: 'Техническое состояние: фронты, бэкенд, платформа — что живо, что молчит, что медленно.',
    icon: 'eye',
    status: 'live',
    // Раздел про машины, а не про людей. «Живёт ли продукт» — приходят, остаются,
    // доходят до сценария — осталось там, где и было: экран /health и раздел
    // «Аналитика». Смешивать их в одном пункте значит отвечать на вопрос «почему не
    // работает» числом пришедших за неделю.
    render: () => <MonitoringModule />,
  },
  {
    id: 'analytics',
    title: 'Аналитика',
    hint: 'Воронка, когорты, источники и отток. Что посчитано, а что посчитать нечем.',
    icon: 'target',
    status: 'live',
    render: () => <AnalyticsModule />,
  },
  {
    id: 'push',
    title: 'Пуши',
    hint: 'Напоминания и их расписание.',
    icon: 'phone',
    status: 'planned',
  },
  {
    id: 'board',
    title: 'Доска',
    hint: 'Работы проекта из docs/board/cards.json. Двигает карточку коммит.',
    icon: 'journal',
    status: 'live',
    render: () => <AdminBoard />,
  },
  {
    id: 'releases',
    title: 'Релизы',
    hint: 'Версии, гейты и выкладка.',
    icon: 'flag',
    status: 'planned',
  },
  {
    id: 'repo',
    title: 'Репозиторий',
    hint: 'Источник истины проекта на GitHub.',
    icon: 'chain',
    status: 'live',
    href: 'https://github.com/wd7b3k/Alive',
  },
];

const STATUS_LABEL: Record<AdminSectionStatus, string> = {
  live: 'работает',
  wip: 'пишется',
  planned: 'в плане',
};

/** Раздел из адреса. `/admin` без хвоста открывает первый рабочий раздел. */
export function adminSectionFromPath(path: string): AdminSection | null {
  const id = path.replace(/^\/admin\/?/, '').split('/')[0];
  if (!id) return ADMIN_SECTIONS.find((s) => s.status === 'live' && !s.href) ?? null;
  return ADMIN_SECTIONS.find((s) => s.id === id) ?? null;
}

function Placeholder({ section }: { section: AdminSection }) {
  return (
    <section className="r-admin-empty">
      <p className="r-kicker">{STATUS_LABEL[section.status]}</p>
      <h2>{section.title}</h2>
      <p>{section.hint}</p>
      <p className="r-admin-empty-note">
        {section.status === 'wip'
          ? 'Раздел пишется в отдельной ветке. Когда она приедет в main, здесь появятся данные — оболочку менять не придётся, блок подставляется строкой в ADMIN_SECTIONS.'
          : 'Решения по разделу ещё нет. Требования к блоку — docs/ADMIN.md.'}
      </p>
    </section>
  );
}

export function AdminPage({ data, path }: { data: Bootstrap; path: string }) {
  const isAdmin = data.profile.role === 'admin';

  // Не «страница не найдена»: человеку без роли честнее сказать, что раздел есть и он
  // закрыт, чем делать вид, что адреса не существует. Данные всё равно не отдаст сервер.
  if (!isAdmin)
    return (
      <main className="r-page r-admin">
        <div className="r-title">
          <p className="r-kicker">Закрытый раздел</p>
          <h1>Управление</h1>
          <p>
            Раздел открыт учётной записи с ролью администратора. Роль ставится миграцией в
            репозитории, а не в приложении.
          </p>
        </div>
      </main>
    );

  const section = adminSectionFromPath(path);

  return (
    <main className="r-page r-admin">
      <div className="r-title">
        <p className="r-kicker">Закрытый раздел</p>
        <h1>Управление</h1>
      </div>
      <nav className="r-admin-nav">
        {ADMIN_SECTIONS.map((item) =>
          item.href ? (
            <a key={item.id} href={item.href} target="_blank" rel="noreferrer">
              <Icon name={item.icon} size={18} />
              <span>{item.title}</span>
            </a>
          ) : (
            <button
              key={item.id}
              type="button"
              className={section?.id === item.id ? 'active' : ''}
              onClick={() => navigateTo(`/admin/${item.id}`)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.title}</span>
              {item.status !== 'live' && <em>{STATUS_LABEL[item.status]}</em>}
            </button>
          ),
        )}
      </nav>
      {!section ? (
        <section className="r-admin-empty">
          <h2>Такого раздела нет</h2>
          <p>Список разделов — слева. Завести новый: строка в ADMIN_SECTIONS и файл рядом.</p>
        </section>
      ) : section.render ? (
        section.render({ data })
      ) : (
        <Placeholder section={section} />
      )}
    </main>
  );
}
