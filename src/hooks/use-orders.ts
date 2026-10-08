import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: () => ordersApi.detail(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending') return 2000;
      return false;
    },
  });
}