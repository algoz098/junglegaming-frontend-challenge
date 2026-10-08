import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { getSessionToken } from '@/api/client';

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart(),
    queryFn: () => cartApi.get(),
    enabled: Boolean(getSessionToken()),
    staleTime: 30_000,
    throwOnError: false,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { nftId: string; quantity: number }) => cartApi.add(payload),
    onSuccess: (cart) => {
      qc.setQueryData(queryKeys.cart(), cart);
    },
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nftId, quantity }: { nftId: string; quantity: number }) =>
      cartApi.update(nftId, quantity),
    onSuccess: (cart) => {
      qc.setQueryData(queryKeys.cart(), cart);
    },
  });
}

export function useRemoveFromCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nftId: string) => cartApi.remove(nftId),
    onSuccess: (cart) => {
      qc.setQueryData(queryKeys.cart(), cart);
    },
  });
}

export function useApplyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: ({ cart }) => {
      qc.setQueryData(queryKeys.cart(), cart);
    },
  });
}

export function useRemoveCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (cart) => {
      qc.setQueryData(queryKeys.cart(), cart);
    },
  });
}