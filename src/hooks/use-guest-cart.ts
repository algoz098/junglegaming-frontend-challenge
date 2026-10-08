import { useCallback, useEffect, useState } from 'react';
import type { Cart, CartItem, PriceSnapshot } from '@/types';
import { nftApi } from '@/api/endpoints';
import { getSessionToken } from '@/api/client';
import { clearGuestCart, readGuestCart, writeGuestCart } from '@/lib/guest-cart';

function emptyTotals() {
  return {
    subtotal: '0.000',
    discount: '0.000',
    networkFee: '0.000',
    total: '0.000',
    version: 1,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

function freshGuestCart(): Cart {
  const now = new Date().toISOString();
  return {
    id: `guest-${Math.random().toString(36).slice(2, 10)}`,
    items: [],
    totals: emptyTotals(),
    updatedAt: now,
  };
}

function recompute(items: CartItem[]) {
  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.priceSnapshot.amount) * item.quantity,
    0,
  );
  const networkFee = subtotal * 0.001;
  const total = Math.max(0, subtotal + networkFee);
  return {
    subtotal: subtotal.toFixed(3),
    discount: '0.000',
    networkFee: networkFee.toFixed(3),
    total: total.toFixed(3),
    version: 1,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

const priceCache = new Map<string, PriceSnapshot>();

async function fetchPriceSnapshot(nftId: string): Promise<PriceSnapshot | null> {
  const cached = priceCache.get(nftId);
  if (cached) return cached;
  try {
    const nft = await nftApi.detail(nftId);
    const snap: PriceSnapshot = { ...nft.price };
    priceCache.set(nftId, snap);
    return snap;
  } catch {
    return null;
  }
}

export function useGuestCart() {
  const [cart, setCart] = useState<Cart>(() => {
    if (typeof window === 'undefined') return freshGuestCart();
    return readGuestCart() ?? freshGuestCart();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (cart.items.length === 0) {
      clearGuestCart();
    } else {
      writeGuestCart(cart);
    }
  }, [cart]);

  const addItem = useCallback(async (nftId: string, quantity: number) => {
    const price = await fetchPriceSnapshot(nftId);
    if (!price) return;
    setCart((prev) => {
      const existing = prev.items.find((i) => i.nftId === nftId);
      let nextItems: CartItem[];
      if (existing) {
        nextItems = prev.items.map((i) =>
          i.nftId === nftId ? { ...i, quantity: i.quantity + quantity } : i,
        );
      } else {
        nextItems = [
          ...prev.items,
          { nftId, quantity, priceSnapshot: price, addedAt: new Date().toISOString() },
        ];
      }
      return {
        ...prev,
        items: nextItems,
        totals: { ...recompute(nextItems), appliedCoupon: prev.totals.appliedCoupon },
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const removeItem = useCallback((nftId: string) => {
    setCart((prev) => {
      const nextItems = prev.items.filter((i) => i.nftId !== nftId);
      return {
        ...prev,
        items: nextItems,
        totals: { ...recompute(nextItems), appliedCoupon: prev.totals.appliedCoupon },
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const clear = useCallback(() => {
    setCart(freshGuestCart());
    clearGuestCart();
  }, []);

  return { cart, items: cart.items, totals: cart.totals, addItem, removeItem, clear };
}

export function consumeGuestCart(): Cart | null {
  const guest = readGuestCart();
  if (!guest || guest.items.length === 0) return null;
  clearGuestCart();
  return guest;
}

export function shouldUseGuestCart(): boolean {
  return !getSessionToken() && Boolean(readGuestCart());
}