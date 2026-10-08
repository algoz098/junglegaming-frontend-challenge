import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { setSessionToken, getSessionToken, api } from '@/api/client';
import { useSession } from './use-session';
import { disconnectSocket, ensureSocketConnection } from './use-socket';
import type { Cart, LoginPayload, RegisterPayload } from '@/types';
import { readGuestCart } from '@/lib/guest-cart';

export function useAuth() {
  const session = useSession();
  const isAuthenticated = Boolean(getSessionToken()) && !session.isError && Boolean(session.data);
  return {
    user: session.data?.user,
    isAuthenticated,
    isLoading: session.isLoading,
    error: session.error,
  };
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const data = await sessionApi.login(payload);
      const token = data.token ?? deriveTokenFromSession(data.user.id);
      setSessionToken(token);
      const guest = readGuestCart();
      if (guest && guest.items.length > 0) {
        await mergeGuestCart(guest.items);
      }
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.session(), data);
      qc.invalidateQueries({ queryKey: queryKeys.cart() });
      qc.invalidateQueries({ queryKey: queryKeys.favorites() });
      void ensureSocketConnection();
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const data = await sessionApi.register(payload);
      const token = data.token ?? deriveTokenFromSession(data.user.id);
      setSessionToken(token);
      const guest = readGuestCart();
      if (guest && guest.items.length > 0) {
        await mergeGuestCart(guest.items);
      }
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.session(), data);
      qc.invalidateQueries({ queryKey: queryKeys.cart() });
      void ensureSocketConnection();
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await sessionApi.logout();
      setSessionToken(null);
      disconnectSocket();
    },
    onSettled: () => {
      qc.clear();
      window.localStorage.removeItem('kurio.guest.cart.v1');
      window.location.assign('/login');
    },
  });
}

async function mergeGuestCart(items: Cart['items']) {
  for (const item of items) {
    try {
      await api.post('/cart/items', { nftId: item.nftId, quantity: item.quantity });
    } catch {
      /* ignore individual failures; user will see the resulting cart */
    }
  }
  window.localStorage.removeItem('kurio.guest.cart.v1');
}

function deriveTokenFromSession(userId: string) {
  return `tok_${userId}_${Date.now().toString(36)}`;
}