import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { getSessionToken } from '@/api/client';

export function useSession(options?: { enabled?: boolean }) {
  const hasToken = Boolean(getSessionToken());
  return useQuery({
    queryKey: queryKeys.session(),
    queryFn: () => sessionApi.me(),
    enabled: hasToken && (options?.enabled ?? true),
    retry: false,
    staleTime: 60_000,
    throwOnError: false,
  });
}