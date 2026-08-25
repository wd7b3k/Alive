/**
 * Заголовок и описание страницы под конкретный раздел.
 *
 * Google выполняет JavaScript и увидит то, что здесь проставлено; Яндекс делает это
 * хуже, а краулеры языковых моделей чаще всего не выполняют вовсе — для них в
 * `index.html` лежит статический слепок сути метода. Поэтому здесь только уточнение, а
 * не единственный источник: если этот код не выполнится, страница всё равно останется
 * осмысленной.
 *
 * Личные экраны закрыты от индекса не только в `robots.txt`, но и мета-тегом: файл
 * запрещает обход, но не запрещает показ уже известного адреса, а `noindex` запрещает.
 */
export const ORIGIN = 'https://alive.hmnos.ru';

type PageMeta = { title: string; description: string; noindex?: boolean };

const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'Как бросить курить без силы воли — ALIVE, метод разбора никотиновых автоматизмов',
    description:
      'Бросить курить мешает не никотин сам по себе, а связка «момент → состояние → сигарета». ALIVE помогает заметить эту связку и подобрать другой ответ под конкретный момент.',
  },
  '/knowledge': {
    title: 'Факты и мифы о курении — с источниками и границами | ALIVE',
    description:
      '19 проверенных утверждений и 19 разобранных убеждений о курении, вейпе и кальяне. У каждого — уровень доказательности, границы применимости и источник.',
  },
  '/links': {
    title: 'Почему тянет курить в одни и те же моменты — карта связок | ALIVE',
    description:
      '28 пусковых моментов — кофе, конец еды, напряжение, дорога, компания — разобранных до потребности, и ответы, которые закрывают её без никотина.',
  },
  '/meanings': {
    title: 'Ради чего бросать курить — библиотека смыслов | ALIVE',
    description:
      'Цели, ценности и направления, ради которых стоит менять привычку. У каждой карточки есть вопрос: на него отвечать интереснее, чем соглашаться с лозунгом.',
  },
  '/experiment': {
    title: 'Как устроен метод ALIVE — методология и приватность',
    description:
      'На чём стоит метод, что именно измеряется, как хранятся личные записи и почему часть популярных утверждений сознательно не публикуется.',
  },
  '/login': {
    title: 'Вход в ALIVE',
    description: 'Аккаунт нужен только для того, чтобы было где хранить твою личную карту.',
    noindex: true,
  },
};

const PRIVATE_PAGES = ['/profile', '/health', '/path', '/together'];

export function metaFor(path: string): PageMeta {
  const known = PAGES[path];
  if (known) return known;
  if (PRIVATE_PAGES.includes(path)) {
    return { title: 'ALIVE', description: 'Личный раздел ALIVE.', noindex: true };
  }
  return PAGES['/'];
}

function setTag(selector: string, create: () => HTMLElement, value: string) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  if (el.tagName === 'META') el.setAttribute('content', value);
  else el.setAttribute('href', value);
}

export function applyMeta(path: string): void {
  if (typeof document === 'undefined') return;
  const meta = metaFor(path);
  document.title = meta.title;
  setTag(
    'meta[name="description"]',
    () => Object.assign(document.createElement('meta'), { name: 'description' }),
    meta.description,
  );
  setTag(
    'meta[property="og:title"]',
    () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:title');
      return m;
    },
    meta.title,
  );
  setTag(
    'meta[property="og:description"]',
    () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:description');
      return m;
    },
    meta.description,
  );
  setTag(
    'meta[property="og:url"]',
    () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:url');
      return m;
    },
    ORIGIN + path,
  );
  setTag(
    'link[rel="canonical"]',
    () => {
      const l = document.createElement('link');
      l.rel = 'canonical';
      return l;
    },
    ORIGIN + path,
  );
  setTag(
    'meta[name="robots"]',
    () => Object.assign(document.createElement('meta'), { name: 'robots' }),
    meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1',
  );
}
