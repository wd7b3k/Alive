import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import V31App from './V31App';
import './styles.css';
import './redesign.css';
import './v31.css';

const root = document.getElementById('root');
if (!root) throw new Error('ALIVE root element is missing');

createRoot(root).render(
  <StrictMode>
    <V31App />
  </StrictMode>,
);
