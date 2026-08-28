import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import RedesignApp from '../RedesignApp';
import { registerNavigator } from '../services/navigation';
import { initCounters, trackPageView } from '../services/counters';
import { applyMeta } from '../services/seo';
import { touchVisitor } from '../services/visitor';
import { trackAnonEvent } from '../services/analytics';
import { publicEnv } from '../env';

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
    // Отметить визит и разобрать источник. Один раз за загрузку документа: реферер и
    // метки в адресе после первого перехода уже не восстановить.
    touchVisitor(publicEnv.yandexMetrikaId);
  }, []);

  useEffect(() => {
    applyMeta(pathname);
    trackPageView(pathname);
    // Своя запись просмотра рядом со счётчиком. Блокировщики режут счётчик у заметной
    // доли посетителей в России, и без своей записи воронка теряет как раз тех, кто
    // осторожнее прочих — а это ровно наша аудитория.
    trackAnonEvent({ event_type: 'page_view', surface: pathname.slice(0, 64) });
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
