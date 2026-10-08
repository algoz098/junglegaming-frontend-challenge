import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { getSessionToken } from '@/api/client';
import type { WalletUpsertPayload } from '@/types';

export function useWallets() {
  return useQuery({
    queryKey: queryKeys.wallets(),
    queryFn: () => walletsApi.list(),
    enabled: Boolean(getSessionToken()),
    staleTime: 30_000,
  });
}

export function useWalletProviders() {
  return useQuery({
    queryKey: ['wallets', 'providers'] as const,
    queryFn: () => walletsApi.providers(),
    staleTime: 5 * 60_000,
  });
}

export function useUpsertWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WalletUpsertPayload) => walletsApi.upsert(payload),
    onSuccess: (wallet) => {
      qc.setQueryData<Awaited<ReturnType<typeof walletsApi.list>>>(queryKeys.wallets(), (old) => {
        if (!old) return [wallet];
        const idx = old.findIndex((w) => w.id === wallet.id);
        if (idx >= 0) {
          const copy = old.slice();
          copy[idx] = wallet;
          return copy;
        }
        return [...old, wallet];
      });
    },
  });
}

export function useDeleteWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => walletsApi.remove(id),
    onSuccess: (_void, id) => {
      qc.setQueryData<Awaited<ReturnType<typeof walletsApi.list>>>(queryKeys.wallets(), (old) =>
        old ? old.filter((w) => w.id !== id) : old,
      );
    },
  });
}