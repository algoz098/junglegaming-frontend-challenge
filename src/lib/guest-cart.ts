import type { Cart } from '@/types';

const GUEST_CART_KEY = 'kurio.guest.cart.v1';

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function readGuestCart(): Cart | null {
  return safeGet<Cart | null>(GUEST_CART_KEY, null);
}

export function writeGuestCart(cart: Cart | null): void {
  if (cart === null) {
    window.localStorage.removeItem(GUEST_CART_KEY);
    return;
  }
  safeSet(GUEST_CART_KEY, cart);
}

export function clearGuestCart(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    /* ignore */
  }
}