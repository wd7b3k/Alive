import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Пререндер проверяется на собранном каталоге, запрошенном по HTTP.
 *
 * Остальные тесты вокруг пререндера работают с чистыми функциями и потому доказывают
 * только то, что функция подставляет строку. 30.08.2026 они все были зелёными, а
 * снаружи пять адресов из шести отдавали 2240 знаков одного и того же текста: плагин
 * звал функцию так, что тело бралось от главной. Проверка «функция умеет» и проверка
 * «сборка отдаёт» — разные проверки, и разошлись они молча.
 *
 * Поэтому здесь настоящая сборка и настоящий HTTP-запрос. Раздача повторяет правило
 * боевого Caddy (`infra/caddy/Caddyfile`): сначала файл по пути, потом `index.html` в
 * каталоге, иначе `404.html` с кодом 404. Это делает тест ещё и проверкой того, что
 * несуществующий адрес отдаёт человекочитаемое тело, а не пустоту.
 *
 * Сборка занимает секунды, и это осознанная цена: без неё пререндер тихо разваливается
 * при первой правке роутера — что уже случилось однажды.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));

let outDir: string;
let server: Server;
let origin: string;

function serveFrom(dir: string): Promise<{ server: Server; origin: string }> {
  const created = createServer((request, response) => {
    const path = decodeURIComponent((request.url ?? '/').split('?')[0]);
    const direct = join(dir, path);
    let file: string;
    let status = 200;
    if (existsSync(direct) && statSync(direct).isFile()) {
      file = direct;
    } else if (existsSync(join(dir, path, 'index.html'))) {
      file = join(dir, path, 'index.html');
    } else {
      file = join(dir, '404.html');
      status = 404;
    }
    readFile(file)
      .then((content) => {
        response.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
        response.end(content);
      })
      .catch(() => {
        response.writeHead(500).end();
      });
  });
  return new Promise((resolve) => {
    created.listen(0, '127.0.0.1', () => {
      const address = created.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server: created, origin: `http://127.0.0.1:${port}` });
    });
  });
}

/** Видимый текст статического слепка — без разметки, как его прочтёт краулер. */
function visibleText(html: string): string {
  const body = html.match(/<main class="r-prerender">([\s\S]*?)<\/main>/);
  if (!body) return '';
  return body[1]
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function heading(html: string): string {
  return (html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? '').replace(/\s+/g, ' ').trim();
}

function internalLinks(html: string): string[] {
  return [...html.matchAll(/<a[^>]*href="(\/[^"]*)"/g)].map((m) => m[1]);
}

/** Насколько два текста совпадают. Свой, а не библиотечный: зависимости ради теста лишние. */
function overlap(a: string, b: string): number {
  const left = new Set(a.split(' ').filter((word) => word.length > 3));
  const right = new Set(b.split(' ').filter((word) => word.length > 3));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of right) if (left.has(word)) shared += 1;
  return shared / Math.max(left.size, right.size);
}

const PUBLIC_ROUTES = ['/', '/knowledge', '/links', '/meanings', '/experiment', '/releases'];
const pages = new Map<string, { status: number; html: string }>();

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'habitoff-dist-'));
  await build({
    root,
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
  });
  const started = await serveFrom(outDir);
  server = started.server;
  origin = started.origin;
  for (const route of [...PUBLIC_ROUTES, '/такой-страницы-нет']) {
    const response = await fetch(`${origin}${route}`);
    pages.set(route, { status: response.status, html: await response.text() });
  }
}, 180_000);

afterAll(() => {
  server?.close();
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

describe('собранный dist, запрошенный по HTTP', () => {
  it('у каждого публичного адреса свой заголовок первого уровня', () => {
    const headings = PUBLIC_ROUTES.map((route) => heading(pages.get(route)!.html));
    for (const [index, route] of PUBLIC_ROUTES.entries()) {
      expect(headings[index], `${route}: пустой h1`).not.toBe('');
    }
    expect(new Set(headings).size, `повторяющиеся h1: ${headings.join(' | ')}`).toBe(
      PUBLIC_ROUTES.length,
    );
  });

  it('текст раздела не повторяет главную', () => {
    const home = visibleText(pages.get('/')!.html);
    expect(home.length).toBeGreaterThan(500);
    for (const route of PUBLIC_ROUTES.slice(1)) {
      const text = visibleText(pages.get(route)!.html);
      expect(text.length, `${route}: пустое тело`).toBeGreaterThan(300);
      // Порог приёмки: текст обязан отличаться от главной больше чем наполовину.
      expect(overlap(home, text), `${route} слишком похож на главную`).toBeLessThan(0.5);
    }
  });

  it('на каждой публичной странице есть внутренние ссылки', () => {
    for (const route of PUBLIC_ROUTES) {
      const links = internalLinks(pages.get(route)!.html);
      expect(links.length, `${route}: внутренних ссылок ${links.length}`).toBeGreaterThanOrEqual(4);
      // Ссылка на саму себя связности не добавляет.
      expect(links, `${route} ссылается сам на себя`).not.toContain(route);
    }
  });

  it('ссылки ведут на адреса, которые сборка действительно разложила', async () => {
    const targets = new Set(
      PUBLIC_ROUTES.flatMap((route) => internalLinks(pages.get(route)!.html)),
    );
    for (const target of targets) {
      const response = await fetch(`${origin}${target}`);
      expect(response.status, `внутренняя ссылка ${target} никуда не ведёт`).toBe(200);
    }
  });

  it('несуществующий адрес отдаёт 404 с человекочитаемым телом', () => {
    const page = pages.get('/такой-страницы-нет')!;
    expect(page.status).toBe(404);
    const text = visibleText(page.html);
    expect(text.length, 'тело 404 пустое').toBeGreaterThan(80);
    expect(heading(page.html)).not.toBe('');
    expect(internalLinks(page.html)).toContain('/');
    expect(internalLinks(page.html)).toContain('/knowledge');
    // Страница ошибки не должна проситься в индекс.
    expect(page.html).toContain('content="noindex, follow"');
  });

  it('FAQPage встречается ровно на одном адресе', () => {
    // До 31.08.2026 разметка копировалась целиком: шесть страниц несли один и тот же
    // набор из пяти вопросов, описывающих главную.
    const withFaq = PUBLIC_ROUTES.filter((route) => pages.get(route)!.html.includes('"FAQPage"'));
    expect(withFaq).toEqual(['/']);
    expect(pages.get('/такой-страницы-нет')!.html).not.toContain('"FAQPage"');
  });

  it('на внутренних адресах есть хлебные крошки и своя страница', () => {
    for (const route of PUBLIC_ROUTES.slice(1)) {
      const html = pages.get(route)!.html;
      expect(html, route).toContain('"BreadcrumbList"');
      expect(html, route).toContain(`"url": "https://habitoff.ru${route}"`);
    }
  });

  it('каждый вопрос в разметке присутствует на странице карточки', () => {
    // Правило задачи 05.09.2026: ни один элемент разметки не описывает того, чего нет в
    // видимом HTML. До этого дня `ItemList` на `/knowledge` объявлял шестнадцать
    // вопросов, и ноль из них были в тексте страницы.
    const hub = pages.get('/knowledge')!.html;
    const graph = JSON.parse(
      hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1],
    )['@graph'];
    const list = graph.find((node: Record<string, unknown>) => node['@type'] === 'ItemList');
    expect(list, 'на хабе нет ItemList').toBeTruthy();
    const text = visibleText(hub);
    for (const element of list.itemListElement) {
      expect(text, `${element.url}: заголовка нет в видимом тексте`).toContain(element.name);
      expect(hub, `${element.url}: нет ссылки`).toContain(
        `href="${new URL(element.url).pathname}"`,
      );
    }
  });

  it('страница карточки отдаётся статикой и несёт источник', async () => {
    const hub = pages.get('/knowledge')!.html;
    const first = internalLinks(hub).find((href) => href.startsWith('/knowledge/'));
    expect(first, 'на хабе нет ни одной ссылки на карточку').toBeTruthy();
    const response = await fetch(`${origin}${first}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    const text = visibleText(html);
    expect(heading(html)).not.toBe('');
    expect(text, 'нет уровня доказательности').toContain('Насколько это надёжно');
    expect(html, 'источник не ссылкой').toMatch(/<b>Источник:<\/b> <a href="https?:\/\//);
    expect(html).toContain(`<link rel="canonical" href="https://habitoff.ru${first}"`);
  });

  it('несуществующий код карточки отдаёт 404', async () => {
    const response = await fetch(`${origin}/knowledge/net-takogo-koda`);
    expect(response.status).toBe(404);
  });

  it('canonical у каждого адреса указывает на себя', () => {
    for (const route of PUBLIC_ROUTES) {
      const canonical = pages.get(route)!.html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
      expect(canonical, route).toBe(`https://habitoff.ru${route === '/' ? '/' : route}`);
    }
  });
});
