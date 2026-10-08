import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app';
import '@/index.css';
import { startSocketInterceptor } from '@/mocks/socket/binding';

if (import.meta.env.VITE_ENABLE_MOCKS) {
  startSocketInterceptor();
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
