import { useEffect, useState } from 'react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { AppProviders } from '@/app/providers';
import { routeTree } from '@/routeTree.gen';
import { ensureSocketConnection } from '@/hooks/use-socket';
import { createQueryClient } from '@/lib/query-client';
import { setQueryClient } from '@/lib/query-client-bridge';

const queryClient = createQueryClient();
setQueryClient(queryClient);

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const [mockReady, setMockReady] = useState(!import.meta.env.VITE_ENABLE_MOCKS);

  useEffect(() => {
    if (!import.meta.env.VITE_ENABLE_MOCKS) return;
    let cancelled = false;
    import('@/mocks/browser').then(async ({ startMockWorker }) => {
      await startMockWorker();
      if (!cancelled) {
        ensureSocketConnection();
        setMockReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mockReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="font-display text-3xl font-extrabold tracking-[0.18em] text-primary">KURIO</span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Iniciando mocks…</span>
        </div>
      </div>
    );
  }

  return (
    <AppProviders client={queryClient}>
      <RouterProvider router={router} />
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </AppProviders>
  );
}