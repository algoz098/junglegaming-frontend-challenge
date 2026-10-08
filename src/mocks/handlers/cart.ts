import { http, HttpResponse, delay } from 'msw';
import {
  ApiErrorMock,
  addToCart,
  createError,
  getOrCreateCart,
  recomputeTotals,
  refreshCartPrices,
  requireUser,
  setCartCoupon,
  zeroTotals,
} from '../state';
import { couponFixtures } from '../fixtures';
import { savePersisted } from '../persistence';
import { state } from '../state';

function persist() {
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

function cartOf(userId: string) {
  const entry = getOrCreateCart(userId);
  const refreshed = refreshCartPrices(entry.cart);
  if (refreshed !== entry.cart) {
    entry.cart = refreshed;
  }
  return entry.cart;
}

export const cartHandlers = [
  http.get('/api/cart', async ({ request }) => {
    await delay(80);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    return HttpResponse.json({ data: cartOf(user.id) });
  }),

  http.post('/api/cart/items', async ({ request }) => {
    await delay(120);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const body = (await request.json()) as { nftId: string; quantity: number };
    if (!body.nftId || !body.quantity || body.quantity < 1) {
      return createError(400, 'validation_failed', 'Quantidade inválida.');
    }
    const cart = addToCart(user.id, body.nftId, body.quantity);
    return HttpResponse.json({ data: cart });
  }),

  http.put('/api/cart/items/:nftId', async ({ request, params }) => {
    await delay(100);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const body = (await request.json()) as { quantity: number };
    const entry = getOrCreateCart(user.id);
    const item = entry.cart.items.find((i) => i.nftId === params.nftId);
    if (!item) return createError(404, 'not_found', 'Item não está no carrinho.');
    item.quantity = Math.max(1, body.quantity);
    entry.cart.totals = recomputeTotals(entry.cart, entry.cart.totals.appliedCoupon);
    entry.cart.updatedAt = new Date().toISOString();
    persist();
    return HttpResponse.json({ data: entry.cart });
  }),

  http.delete('/api/cart/items/:nftId', async ({ request, params }) => {
    await delay(80);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const entry = getOrCreateCart(user.id);
    entry.cart.items = entry.cart.items.filter((i) => i.nftId !== params.nftId);
    entry.cart.totals = recomputeTotals(entry.cart, entry.cart.totals.appliedCoupon);
    entry.cart.updatedAt = new Date().toISOString();
    persist();
    return HttpResponse.json({ data: entry.cart });
  }),

  http.post('/api/cart/coupon', async ({ request }) => {
    await delay(120);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const body = (await request.json()) as { code: string };
    try {
      const cart = setCartCoupon(user.id, body.code);
      return HttpResponse.json({ data: { cart, coupon: couponFixtures[body.code] } });
    } catch (err) {
      if (err instanceof ApiErrorMock) {
        return createError(err.status, err.code, err.message, err.fields);
      }
      throw err;
    }
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    await delay(80);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const entry = getOrCreateCart(user.id);
    entry.cart.totals = recomputeTotals(entry.cart);
    entry.cart.updatedAt = new Date().toISOString();
    persist();
    return HttpResponse.json({ data: entry.cart });
  }),

  http.get('/api/cart/quote', async ({ request }) => {
    await delay(80);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const entry = getOrCreateCart(user.id);
    return HttpResponse.json({ data: entry.cart.totals });
  }),
];

export const guestCartHandlers = [
  http.post('/api/cart/quote-preview', async () => {
    await delay(60);
    return HttpResponse.json({ data: zeroTotals() });
  }),
];