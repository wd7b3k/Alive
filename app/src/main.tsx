import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './visual-polish.css';
import './visual-hardening.css';

const root = document.getElementById('root');
if (!root) throw new Error('ALIVE root element is missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
