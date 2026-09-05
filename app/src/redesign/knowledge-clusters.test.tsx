import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { KnowledgeClusters } from './knowledge';
import registry from '../../../content/knowledge/clusters.json';

/**
 * Из приложения в разборы обязан быть путь, а не только из статического слепка.
 *
 * 05.09.2026 кластеры выложили, и снаружи всё выглядело правильно: список кластеров стоял
 * в предрендере `/knowledge`, робот его видел, `sitemap.xml` знал все девятнадцать
 * адресов. А участник, открывший тот же `/knowledge` в браузере, не видел ничего: React
 * заменяет статический слепок собой при монтировании, и ссылок в нём не было.
 *
 * Проверку снаружи это не ловило — она смотрела на отданный HTML, где ссылки есть. Ловит
 * только то, что смотрит на отрисованное React.
 */
const markup = renderToStaticMarkup(<KnowledgeClusters />);

describe('переход из приложения в разборы', () => {
  it('на каждый кластер реестра есть ссылка', () => {
    expect(registry.clusters.length).toBeGreaterThan(0);
    for (const cluster of registry.clusters) {
      expect(markup, cluster.slug).toContain(`href="/knowledge/${cluster.slug}"`);
      expect(markup, cluster.slug).toContain(cluster.title);
    }
  });

  it('страница метода тоже достижима', () => {
    expect(markup).toContain('href="/knowledge/method"');
  });

  /**
   * Страница статьи — отдельный документ без React. `AppLink` перехватывает обычный левый
   * клик и отдаёт его роутеру, у которого такого экрана нет, — человек остался бы на
   * прежней странице. Поэтому здесь именно `<a>`.
   */
  it('ссылки ведут полной загрузкой, а не через роутер', () => {
    const source = readFileSync(fileURLToPath(new URL('./knowledge.tsx', import.meta.url)), 'utf8');
    const component = source.slice(source.indexOf('export function KnowledgeClusters'));
    expect(component).not.toContain('AppLink');
  });

  it('оба экрана раздела показывают этот блок', () => {
    // Экранов два: до входа (`PublicKnowledge`) и после (`KnowledgePage`). Ссылки,
    // поставленные на один из них, — половина починки, и заметить это некому.
    const app = readFileSync(fileURLToPath(new URL('../RedesignApp.tsx', import.meta.url)), 'utf8');
    expect(app.match(/<KnowledgeClusters \/>/g) ?? []).toHaveLength(2);
  });
});
