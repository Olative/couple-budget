import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { watchTheme } from './theme';
import { watchEdges } from './edges';
import { watchViewport } from './viewport';
import { getLang, onLangChange } from './i18n';

watchTheme();
watchEdges();
watchViewport();

// Switching the language remounts the app so every screen re-renders its texts.
function Root() {
  const [lang, setLangState] = useState(getLang);
  useEffect(() => onLangChange(setLangState), []);
  return <App key={lang} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
