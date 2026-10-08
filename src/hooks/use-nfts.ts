import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { nftApi } from '@/api/endpoints';
import type { Nft } from '@/types';

export function useNftList(query: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.nfts.list(query),
    queryFn: () => nftApi.list(query as Parameters<typeof nftApi.list>[0]),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

export function useNftDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(id ?? ''),
    queryFn: () => nftApi.detail(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useRelatedNfts(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nfts.related(id ?? ''),
    queryFn: () => nftApi.related(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useNftCollections() {
  return useQuery({
    queryKey: queryKeys.nfts.collections(),
    queryFn: () => nftApi.collections(),
    staleTime: 5 * 60_000,
  });
}

export function useNftCategories() {
  return useQuery({
    queryKey: queryKeys.nfts.categories(),
    queryFn: () => nftApi.categories(),
    staleTime: 5 * 60_000,
  });
}

export function usePrefetchNft(id: string) {
  const qc = useQueryClient();
  return () => qc.prefetchQuery({ queryKey: queryKeys.nfts.detail(id), queryFn: () => nftApi.detail(id) });
}

export function useNftCachePatcher(id: string) {
  const qc = useQueryClient();
  return (patcher: (nft: Nft) => Nft) => {
    qc.setQueryData(queryKeys.nfts.detail(id), (current: Nft | undefined) =>
      current ? patcher(current) : current,
    );
  };
}