const STORAGE_KEY = 'kurio.mock.state.v1';

interface PersistedSession {
  tokenByEmail: Record<string, string>;
  tokenToUserId: Record<string, string>;
}

interface PersistedShape {
  session: PersistedSession;
  carts: Array<[string, { cart: unknown }]>;
  orders: { byId: Array<[string, unknown]>; byKey: Array<[string, string]> };
}

function safeGet<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function loadPersistedSession(): PersistedSession {
  const data = safeGet<PersistedShape | null>(null);
  if (!data?.session) return { tokenByEmail: {}, tokenToUserId: {} };
  return {
    tokenByEmail: data.session.tokenByEmail ?? {},
    tokenToUserId: data.session.tokenToUserId ?? {},
  };
}

export function loadPersistedCarts(): Array<[string, { cart: unknown }]> {
  const data = safeGet<PersistedShape | null>(null);
  return data?.carts ?? [];
}

export function loadPersistedOrders(): {
  byId: Array<[string, unknown]>;
  byKey: Array<[string, string]>;
} {
  const data = safeGet<PersistedShape | null>(null);
  return {
    byId: data?.orders?.byId ?? [],
    byKey: data?.orders?.byKey ?? [],
  };
}

export function savePersisted(snapshot: PersistedShape): void {
  safeSet(snapshot);
}

export function clearPersisted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
