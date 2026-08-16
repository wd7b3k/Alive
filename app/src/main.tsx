import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RedesignApp from './RedesignApp';
import './styles.css';
import './redesign.css';
import './preview.css';

const root = document.getElementById('root');
if (!root) throw new Error('ALIVE root element is missing');

const isPagesPreview = window.location.hostname.endsWith('.alive-aw2.pages.dev') && window.location.hostname !== 'alive-aw2.pages.dev';

createRoot(root).render(
  <StrictMode>
    {isPagesPreview ? <div className="v31-preview-badge">Preview v3.1 · base UI restored</div> : null}
    <RedesignApp />
  </StrictMode>,
);
