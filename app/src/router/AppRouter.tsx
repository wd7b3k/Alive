import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import RedesignApp from '../RedesignApp';
import { registerNavigator } from '../services/navigation';
import { initCounters, trackPageView } from '../services/counters';
import { applyMeta } from '../services/seo';

function NavigationRegistrar() {
  const navigate = useNavigate();

  useEffect(() => registerNavigator(navigate), [navigate]);

  return null;
}

/**
 * Заголовок страницы и счётчик просмотра на каждом переходе.
 *
 * В одностраничном приложении переход между разделами не перезагружает документ: без
 * этого и поисковик, и счётчик знали бы только про первый открытый экран.
 */
function PageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    initCounters();
  }, []);

  useEffect(() => {
    applyMeta(pathname);
    trackPageView(pathname);
  }, [pathname]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <NavigationRegistrar />
      <PageMeta />
      <Routes>
        <Route path="*" element={<RedesignApp />} />
      </Routes>
    </BrowserRouter>
  );
}
