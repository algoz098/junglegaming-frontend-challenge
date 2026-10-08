import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { queryKeys } from '@/api/queryKeys';
import { getSessionToken } from '@/api/client';
import { applyNftUpdate } from '@/types';
import type { Cart, Nft, NftUpdatedPayload, Order, OrderUpdatedPayload } from '@/types';
import { SOCKET_EVENTS } from '@/mocks/socket/constants';

const MOCKS_ENABLED = Boolean(import.meta.env.VITE_ENABLE_MOCKS);

type NftListener = (payload: NftUpdatedPayload) => void;
type OrderListener = (payload: OrderUpdatedPayload) => void;

let socket: Socket | null = null;
let socketInitPromise: Promise<Socket | null> | null = null;

const nftListeners = new Set<NftListener>();
const orderListeners = new Set<OrderListener>();

export async function ensureSocketConnection(): Promise<Socket | null> {
  if (!MOCKS_ENABLED) return null;
  if (socket) return socket;
  if (socketInitPromise) return socketInitPromise;

  if (typeof window !== 'undefined') {
    const flag = (window as unknown as { __KURIO_SOCKET_READY__?: boolean }).__KURIO_SOCKET_READY__;
    if (!flag) {
      console.warn('[socket.io] WebSocketInterceptor não está ativo; abortando conexão.');
      return null;
    }
  }

  socketInitPromise = (async () => {
    const { io } = await import('socket.io-client');

    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = import.meta.env.VITE_SOCKET_URL ?? '/socket.io';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    const s = io(fullUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      auth: { token: getSessionToken() ?? '' },
    });

    s.on('connect', () => {
      if (import.meta.env.DEV) {
        console.debug('[socket.io] connected', s.id);
      }
    });

    s.on(SOCKET_EVENTS.nftUpdated, (payload: NftUpdatedPayload) => {
      for (const l of nftListeners) l(payload);
    });

    s.on('connect', () => {
      if (import.meta.env.DEV) {
        console.debug('[socket.io] connected', s.id);
      }
    });

    s.on(SOCKET_EVENTS.orderUpdated, (payload: OrderUpdatedPayload) => {
      for (const l of orderListeners) l(payload);
    });

    s.on('disconnect', (reason) => {
      if (import.meta.env.DEV) {
        console.debug('[socket.io] disconnected', reason);
      }
    });

    s.on('connect_error', (err) => {
      if (import.meta.env.DEV) {
        console.warn('[socket.io] connect_error', err.message);
      }
    });

    socket = s;
    return s;
  })();

  return socketInitPromise;
}

export function emitNftUpdated(payload: NftUpdatedPayload) {
  socket?.emit(SOCKET_EVENTS.subscribeNft, payload.nftId);
  for (const l of nftListeners) l(payload);
}

export function emitOrderUpdated(payload: OrderUpdatedPayload) {
  socket?.emit(SOCKET_EVENTS.subscribeOrder, payload.orderId);
  for (const l of orderListeners) l(payload);
}

export function useSocketConnection() {
  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    void ensureSocketConnection();
  }, []);
}

export function useNftGlobalSocket() {
  const qc = useQueryClient();
  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    const handler = (payload: NftUpdatedPayload) => {
      qc.invalidateQueries({ queryKey: ['nfts', 'list'], exact: false });
      qc.invalidateQueries({ queryKey: queryKeys.cart(), exact: false });
      if (payload.price) {
        qc.setQueryData<Cart | undefined>(queryKeys.cart(), (old) => {
          if (!old) return old;
          let touched = false;
          const items = old.items.map((item) => {
            if (item.nftId !== payload.nftId) return item;
            touched = true;
            return { ...item, priceSnapshot: payload.price! };
          });
          if (!touched) return old;
          return {
            ...old,
            items,
            totals: { ...old.totals, version: old.totals.version + 1 },
          };
        });
      }
    };
    nftListeners.add(handler);
    return () => {
      nftListeners.delete(handler);
    };
  }, [qc]);
}

export function useOrderGlobalSocket() {
  const qc = useQueryClient();
  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    const handler = (_payload: OrderUpdatedPayload) => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all(), exact: false });
    };
    orderListeners.add(handler);
    return () => {
      orderListeners.delete(handler);
    };
  }, [qc]);
}

export function disconnectSocket(): void {
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch {
      /* ignore */
    }
    socket = null;
  }
  socketInitPromise = null;
  nftListeners.clear();
  orderListeners.clear();
}

export function useOrderSocket(orderId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!MOCKS_ENABLED || !orderId) return;
    let cancelled = false;
    void ensureSocketConnection().then((s) => {
      if (!cancelled) s?.emit(SOCKET_EVENTS.subscribeOrder, orderId);
    });
    const handler = (payload: OrderUpdatedPayload) => {
      if (payload.orderId !== orderId) return;
      qc.setQueryData(queryKeys.orders.detail(orderId), (current: Order | undefined) => {
        if (!current) return current;
        // Rejeita eventos com versão menor ou igual à cacheada (anti-regressão).
        if (payload.version <= current.totals.version) {
          return current;
        }
        return {
          ...current,
          status: payload.status,
          transaction: payload.transaction ?? current.transaction,
          failureReason: payload.failureReason ?? current.failureReason,
          totals: { ...current.totals, version: payload.version },
          confirmedAt:
            payload.status === 'confirmed' && !current.confirmedAt
              ? new Date().toISOString()
              : current.confirmedAt,
          rejectedAt:
            payload.status === 'rejected' && !current.rejectedAt
              ? new Date().toISOString()
              : current.rejectedAt,
        };
      });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
    };
    orderListeners.add(handler);
    return () => {
      cancelled = true;
      orderListeners.delete(handler);
      socket?.emit(SOCKET_EVENTS.unsubscribeOrder, orderId);
    };
  }, [orderId, qc]);
}

export function useNftSocket(nftId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!MOCKS_ENABLED || !nftId) return;
    let cancelled = false;
    void ensureSocketConnection().then((s) => {
      if (!cancelled) s?.emit(SOCKET_EVENTS.subscribeNft, nftId);
    });
    const handler = (payload: NftUpdatedPayload) => {
      if (payload.nftId !== nftId) return;
      qc.setQueryData(queryKeys.nfts.detail(nftId), (current: Nft | undefined) =>
        current ? applyNftUpdate(current, payload) : current,
      );
      qc.invalidateQueries({ queryKey: ['nfts', 'list'], exact: false });
      qc.invalidateQueries({ queryKey: queryKeys.cart(), exact: false });
    };
    nftListeners.add(handler);
    return () => {
      cancelled = true;
      nftListeners.delete(handler);
      socket?.emit(SOCKET_EVENTS.unsubscribeNft, nftId);
    };
  }, [nftId, qc]);
}