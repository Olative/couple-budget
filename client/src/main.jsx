import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { watchTheme } from './theme';
import { watchEdges } from './edges';

watchTheme();
watchEdges();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
