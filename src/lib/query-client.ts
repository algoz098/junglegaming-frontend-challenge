import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (isUnauthorized(error)) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        networkMode: 'online',
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

function isUnauthorized(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.message.includes('401')) return true;
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as { status?: number }).status === 401;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: string }).code === 'unauthorized';
  }
  return false;
}

