import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';
import './styles/layout.css';
import './features/analysis/styles.css';
import './features/consultant/styles.css';
import './features/customer-report/customer-report.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Required #root element is missing from index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
