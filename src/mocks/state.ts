import type {
  ApiError,
  Cart,
  CartItem,
  CartTotals,
  CouponResult,
  Nft,
  Order,
  OrderCreationPayload,
  PriceSnapshot,
  User,
  Wallet,
  WalletUpsertPayload,
} from '@/types';
import Decimal from 'decimal.js';
import {
  couponFixtures,
  credentialsFixtures,
  expiredCouponFixtures,
  nftFixtures,
  userFixtures,
  walletFixtures,
  walletProviderFixtures,
} from './fixtures';
import { emitNftUpdate, emitOrderUpdate } from './socket/emitter';
import {
  clearPersisted,
  loadPersistedCarts,
  loadPersistedOrders,
  loadPersistedSession,
  savePersisted,
} from './persistence';

const persistedSession = loadPersistedSession();
const persistedCarts = loadPersistedCarts();
const persistedOrders = loadPersistedOrders();

const initialSession = {
  tokenByEmail: persistedSession.tokenByEmail,
  userByToken: Object.fromEntries(
    Object.entries(persistedSession.tokenToUserId).flatMap(([token, userId]) => {
      const user = userFixtures.find((u) => u.id === userId);
      return user ? [[token, user] as const] : [];
    }),
  ),
};

const initialCarts = new Map<string, CartState>(
  persistedCarts
    .map(([userId, entry]) => {
      const cart = entry.cart as Cart;
      return [userId, { cart }] as const;
    })
    .filter((entry): entry is readonly [string, CartState] => Boolean(entry[1]?.cart)),
);

const initialOrders = {
  byId: Object.fromEntries(persistedOrders.byId) as Record<string, Order>,
  byKey: Object.fromEntries(persistedOrders.byKey) as Record<string, string>,
};

function persistSnapshot() {
  if (typeof window === 'undefined') return;
  savePersisted({
    session: {
      tokenByEmail: state.session.tokenByEmail,
      tokenToUserId: Object.fromEntries(
        Object.entries(state.session.userByToken).map(([token, user]) => [token, user.id]),
      ),
    },
    carts: Array.from(state.carts.entries()).map(([userId, entry]) => [userId, { cart: entry.cart }]),
    orders: {
      byId: Object.entries(state.orders.byId),
      byKey: Object.entries(state.orders.byKey),
    },
  });
}

export function refreshCartPrices(cart: Cart): Cart {
  let touched = false;
  const items = cart.items.map((item) => {
    const nft = getNft(item.nftId);
    if (!nft) return item;
    if (item.priceSnapshot.version >= nft.price.version) return item;
    touched = true;
    return { ...item, priceSnapshot: { ...nft.price } };
  });
  if (!touched) return cart;
  return { ...cart, items, updatedAt: new Date().toISOString() };
}

interface CartState {
  cart: Cart;
}

interface WalletsState {
  byUserId: Record<string, Wallet[]>;
}

const TOKEN_TTL_MS = 1000 * 60 * 60;
const SESSION_EXPIRED_TOKEN = '__expired__';

export const state = {
  carts: initialCarts,
  orders: initialOrders,
  wallets: { byUserId: deepClone(walletFixtures) } satisfies WalletsState as WalletsState,
  session: initialSession,
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function token(userId: string): string {
  return `tok_${userId}_${Date.now().toString(36)}`;
}

export function userIdFromToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const t = authHeader.replace(/^Bearer\s+/i, '');
  const found = state.session.userByToken[t];
  if (t === SESSION_EXPIRED_TOKEN) return null;
  return found?.id ?? null;
}

export function requireUser(request: Request): User | null {
  const auth = request.headers.get('authorization') ?? undefined;
  const id = userIdFromToken(auth);
  if (!id) return null;
  return userFixtures.find((u) => u.id === id) ?? null;
}

export function createError(
  status: number,
  code: ApiError['code'],
  message: string,
  fields?: Record<string, string>,
  details?: Record<string, unknown>,
): Response {
  const body: { error: ApiError } = {
    error: { code, message, fields, details },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function getOrCreateCart(userId: string): CartState {
  let entry = state.carts.get(userId);
  if (!entry) {
    entry = { cart: emptyCart() };
    state.carts.set(userId, entry);
    persistSnapshot();
  }
  return entry;
}

export function emptyCart(): Cart {
  const now = new Date().toISOString();
  return {
    id: `cart-${Math.random().toString(36).slice(2, 10)}`,
    items: [],
    totals: zeroTotals(),
    updatedAt: now,
  };
}

export function zeroTotals(): CartTotals {
  return {
    subtotal: '0.000',
    discount: '0.000',
    networkFee: '0.000',
    total: '0.000',
    version: 1,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

export function recomputeTotals(cart: Cart, coupon?: CouponResult): CartTotals {
  const subtotal = cart.items.reduce(
    (acc, item) => acc.plus(new Decimal(item.priceSnapshot.amount).times(item.quantity)),
    new Decimal(0),
  );
  let discount = new Decimal(0);
  if (coupon) {
    if (coupon.discountType === 'percentage') {
      discount = subtotal.times(new Decimal(coupon.discountValue));
    } else {
      discount = new Decimal(coupon.discountValue);
    }
  }
  const networkFee = subtotal.times(new Decimal('0.001'));
  const total = Decimal.max(0, subtotal.minus(discount).plus(networkFee));
  const version = (cart.totals.version ?? 0) + 1;
  return {
    subtotal: subtotal.toFixed(3),
    discount: discount.toFixed(3),
    networkFee: networkFee.toFixed(3),
    total: total.toFixed(3),
    appliedCoupon: coupon,
    version,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

export function addToCart(userId: string, nftId: string, quantity: number): Cart {
  const entry = getOrCreateCart(userId);
  const nft = nftFixtures.find((n) => n.id === nftId);
  if (!nft) throw new Error('nft_not_found');
  const existing = entry.cart.items.find((i) => i.nftId === nftId);
  if (existing) {
    existing.quantity = Math.min(nft.edition.total, existing.quantity + quantity);
  } else {
    const item: CartItem = {
      nftId,
      quantity: Math.min(nft.edition.total, quantity),
      priceSnapshot: { ...nft.price },
      addedAt: new Date().toISOString(),
    };
    entry.cart.items.push(item);
  }
  entry.cart.totals = recomputeTotals(entry.cart, entry.cart.totals.appliedCoupon);
  entry.cart.updatedAt = new Date().toISOString();
  persistSnapshot();
  return entry.cart;
}

export function setCartCoupon(userId: string, code: string): Cart {
  const entry = getOrCreateCart(userId);
  if (expiredCouponFixtures.includes(code)) {
    throw new ApiErrorMock(400, 'coupon_expired', 'Cupom expirado.');
  }
  const coupon = couponFixtures[code];
  if (!coupon) {
    throw new ApiErrorMock(404, 'coupon_invalid', 'Cupom inválido.');
  }
  entry.cart.totals = recomputeTotals(entry.cart, coupon);
  entry.cart.updatedAt = new Date().toISOString();
  persistSnapshot();
  return entry.cart;
}

export class ApiErrorMock extends Error {
  status: number;
  code: ApiError['code'];
  fields?: Record<string, string>;
  details?: Record<string, unknown>;
  constructor(status: number, code: ApiError['code'], message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function findUserByCredentials(email: string, password: string): User | null {
  const creds = credentialsFixtures[email as keyof typeof credentialsFixtures];
  if (!creds || creds.password !== password) return null;
  return userFixtures.find((u) => u.id === creds.userId) ?? null;
}

export function newSessionFor(user: User): { user: User; token: string; expiresAt: string } {
  const t = token(user.id);
  state.session.tokenByEmail[user.email] = t;
  state.session.userByToken[t] = user;
  persistSnapshot();
  return { user, token: t, expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString() };
}

export function expireCurrentToken(): void {
  const t = Object.values(state.session.userByToken).length
    ? Object.keys(state.session.userByToken)[0]
    : null;
  if (t) {
    delete state.session.userByToken[t];
    state.session.userByToken[SESSION_EXPIRED_TOKEN] = userFixtures[0];
  }
  persistSnapshot();
}

export function getNft(id: string): Nft | undefined {
  return nftFixtures.find((n) => n.id === id);
}

export function upsertWallet(userId: string, payload: WalletUpsertPayload): Wallet {
  const list = state.wallets.byUserId[userId] ?? [];
  const byId = payload.id ? list.findIndex((w) => w.id === payload.id) : -1;
  const byLabel = byId >= 0 ? -1 : list.findIndex((w) => w.label === payload.label);
  const existingIndex = byId >= 0 ? byId : byLabel;
  const wallet: Wallet = {
    id: existingIndex >= 0 ? list[existingIndex].id : `wallet-${Math.random().toString(36).slice(2, 8)}`,
    label: payload.label,
    address: payload.address,
    ens: payload.ens,
    network: payload.network,
    type: payload.type,
    isPrimary: payload.isPrimary ?? list.length === 0,
  };
  if (existingIndex >= 0) {
    list[existingIndex] = wallet;
  } else {
    list.push(wallet);
  }
  state.wallets.byUserId[userId] = list;
  return wallet;
}

export function listWallets(userId: string): Wallet[] {
  return state.wallets.byUserId[userId] ?? [];
}

export function listWalletProviders() {
  return walletProviderFixtures;
}

export function createOrder(payload: OrderCreationPayload, user: User): Order {
  const key = state.orders.byKey[payload.idempotencyKey];
  if (key) {
    const existing = state.orders.byId[key];
    if (existing) {
      const samePayload =
        existing.items.length === payload.items.length &&
        existing.items.every(
          (item, i) =>
            item.nftId === payload.items[i].nftId && item.quantity === payload.items[i].quantity,
        );
      if (!samePayload) {
        throw new ApiErrorMock(409, 'idempotency_conflict', 'Chave de idempotência reutilizada com payload diferente.');
      }
      return existing;
    }
  }

  const items = payload.items.map((i) => {
    const nft = getNft(i.nftId);
    if (!nft) throw new ApiErrorMock(404, 'not_found', `NFT ${i.nftId} não encontrado.`);
    if (nft.edition.status === 'esgotada') {
      throw new ApiErrorMock(409, 'edition_unavailable', `${nft.name} esgotado.`);
    }
    if (nft.price.version > payload.expectedTotalsVersion) {
      throw new ApiErrorMock(409, 'price_changed', `Preço de ${nft.name} mudou.`);
    }
    const subtotal = new Decimal(nft.price.amount).times(i.quantity).toFixed(3);
    return {
      nftId: nft.id,
      name: nft.name,
      imageUrl: nft.imageUrl,
      tokenId: nft.tokenId,
      edition: i.quantity,
      unitPrice: nft.price.amount,
      quantity: i.quantity,
      subtotal,
    };
  });

  const totals: CartTotals = recomputeTotals(
    {
      id: 'preview',
      items: items.map((i) => ({
        nftId: i.nftId,
        quantity: i.quantity,
        priceSnapshot: {
          amount: i.unitPrice,
          currency: 'ETH',
          updatedAt: new Date().toISOString(),
          version: 1,
        } satisfies PriceSnapshot,
        addedAt: new Date().toISOString(),
      })),
      totals: zeroTotals(),
      updatedAt: new Date().toISOString(),
    } satisfies Cart,
    payload.couponCode ? couponFixtures[payload.couponCode] : undefined,
  );

  const orderId = `order-${Math.random().toString(36).slice(2, 8)}`;
  const order: Order = {
    id: orderId,
    status: 'pending',
    userId: user.id,
    items,
    totals,
    collector: payload.collector,
    createdAt: new Date().toISOString(),
  };

  state.orders.byId[orderId] = order;
  state.orders.byKey[payload.idempotencyKey] = orderId;
  persistSnapshot();

  const entry = getOrCreateCart(user.id);
  const purchased = new Map(payload.items.map((i) => [i.nftId, i.quantity]));
  entry.cart.items = entry.cart.items
    .map((item) => {
      const remaining = (purchased.get(item.nftId) ?? 0);
      if (remaining <= 0) return item;
      const qty = item.quantity - remaining;
      return qty >= 1 ? { ...item, quantity: qty } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  entry.cart.totals = recomputeTotals(entry.cart, entry.cart.totals.appliedCoupon);
  entry.cart.updatedAt = new Date().toISOString();
  persistSnapshot();

  simulateOrderLifecycle(order);

  return order;
}

function simulateOrderLifecycle(order: Order) {
  const accepted = Math.random() > 0.15;
  setTimeout(() => {
    const stored = state.orders.byId[order.id];
    if (!stored || stored.status !== 'pending') return;
    if (accepted) {
      const tx = {
        hash: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
        network: order.collector.network,
        walletAddress: order.collector.walletAddress,
        explorerUrl: `https://etherscan.io/tx/0x${Math.random().toString(16).slice(2, 10)}`,
      };
      stored.status = 'confirmed';
      stored.transaction = tx;
      stored.confirmedAt = new Date().toISOString();
      persistSnapshot();
      emitOrderUpdate({
        orderId: order.id,
        status: 'confirmed',
        transaction: tx,
        version: 2,
        emittedAt: new Date().toISOString(),
      });
    } else {
      stored.status = 'rejected';
      stored.failureReason = 'Saldo insuficiente na carteira.';
      stored.rejectedAt = new Date().toISOString();
      persistSnapshot();
      emitOrderUpdate({
        orderId: order.id,
        status: 'rejected',
        failureReason: stored.failureReason,
        version: 2,
        emittedAt: new Date().toISOString(),
      });
    }
  }, 3000);
}

export function forceRejectOrder(orderId: string, reason = 'Pagamento recusado pelo gateway.'): void {
  const order = state.orders.byId[orderId];
  if (!order) return;
  order.status = 'rejected';
  order.failureReason = reason;
  order.rejectedAt = new Date().toISOString();
  emitOrderUpdate({ orderId, status: 'rejected', failureReason: reason, version: order.totals.version, emittedAt: new Date().toISOString() });
}

export function emitRawOrderUpdate(payload: {
  orderId: string;
  status: 'pending' | 'confirmed' | 'rejected';
  version: number;
  failureReason?: string;
  transaction?: { hash: string; network: 'ethereum' | 'polygon' | 'solana'; walletAddress: string; explorerUrl: string };
  emittedAt: string;
}): void {
  emitOrderUpdate(payload);
}

export function adjustNftPrice(nftId: string, factor: number) {
  const nft = getNft(nftId);
  if (!nft) return;
  const newAmount = new Decimal(nft.price.amount).times(factor).toFixed(3);
  const version = nft.price.version + 1;
  nft.price = { ...nft.price, amount: newAmount, version, updatedAt: new Date().toISOString() };
  emitNftUpdate({
    nftId,
    price: nft.price,
    version,
    emittedAt: new Date().toISOString(),
  });
}

export function resetState(): void {
  state.carts.clear();
  state.orders = { byId: {}, byKey: {} };
  state.wallets = { byUserId: deepClone(walletFixtures) };
  state.session = { tokenByEmail: {}, userByToken: {} };
  clearPersisted();
}