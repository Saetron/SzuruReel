import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SzuruProvider } from './context/SzuruContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SzuruProvider>
      <App />
    </SzuruProvider>
  </React.StrictMode>
);
