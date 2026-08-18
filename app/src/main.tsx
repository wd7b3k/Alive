import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppRouter } from './router/AppRouter';
import { initGlobalErrorMonitoring } from './services/error-monitoring';
import './styles.css';
import './redesign.css';

const root = document.getElementById('root');
if (!root) throw new Error('Не найден корневой элемент ALIVE');

initGlobalErrorMonitoring();

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  </StrictMode>,
);
