import React from 'react';
import ReactDOM from 'react-dom/client';
import ruRU from 'antd/locale/ru_RU';
import 'antd/dist/reset.css';

import { applyAccessibilityPrefs, readAccessibilityPrefs } from './app/accessibility';
import { readTheme, writeTheme } from './app/theme';
import { AppRouter } from './router/AppRouter';

writeTheme(readTheme());
applyAccessibilityPrefs(readAccessibilityPrefs());

const style = document.createElement('style');
style.innerHTML = `
html[data-large-text] { font-size: 18px; }
html[data-high-contrast] body { filter: contrast(1.2) saturate(0.9); }
html[data-reduced-motion] *, html[data-reduced-motion] *::before, html[data-reduced-motion] *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
`;
document.head.appendChild(style);

// keep locale side-effect import in bundle
void ruRU;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
