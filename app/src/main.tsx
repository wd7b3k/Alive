import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RedesignApp from './RedesignApp';
import './redesign.css';

const root = document.getElementById('root');
if (!root) throw new Error('ALIVE root element is missing');

createRoot(root).render(
  <StrictMode>
    <RedesignApp />
  </StrictMode>,
);
