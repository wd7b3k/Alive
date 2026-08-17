import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RedesignApp from './RedesignApp';
import AdminDashboard from './AdminDashboard';
import './styles.css';
import './redesign.css';

const root = document.getElementById('root');
if (!root) throw new Error('Не найден корневой элемент ALIVE');

const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

createRoot(root).render(
  <StrictMode>
    {isAdminRoute ? <AdminDashboard /> : <RedesignApp />}
  </StrictMode>,
);
