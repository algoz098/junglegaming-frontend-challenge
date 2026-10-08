import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { startSocketInterceptor } from './socket/binding';

export const worker = setupWorker(...handlers);

export async function startMockWorker() {
  if (!import.meta.env.VITE_ENABLE_MOCKS) return;
  startSocketInterceptor();
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
    quiet: false,
  });
}