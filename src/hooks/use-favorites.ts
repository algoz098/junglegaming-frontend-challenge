import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { getSessionToken } from '@/api/client';
import type { FavoriteEntry } from '@/types';

export function useFavorites() {
  return useQuery({
    queryKey: queryKeys.favorites(),
    queryFn: () => favoritesApi.list(),
    enabled: Boolean(getSessionToken()),
    staleTime: 30_000,
  });
}

export type ToggleFavoriteInput = {
  nftId: string;
  action: 'add' | 'remove';
};

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nftId, action }: ToggleFavoriteInput) => {
      if (action === 'remove') {
        await favoritesApi.remove(nftId);
        return { nftId, action: 'removed' as const };
      }
      const entry = await favoritesApi.add(nftId);
      return { nftId, action: 'added' as const, entry };
    },
    onMutate: async ({ nftId, action }) => {
      await qc.cancelQueries({ queryKey: queryKeys.favorites() });
      const previous = qc.getQueryData<FavoriteEntry[]>(queryKeys.favorites()) ?? [];
      const optimistic =
        action === 'remove'
          ? previous.filter((f) => f.nftId !== nftId)
          : [...previous, { nftId, addedAt: new Date().toISOString() }];
      qc.setQueryData<FavoriteEntry[]>(queryKeys.favorites(), optimistic);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.favorites(), ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites() });
    },
  });
}