import { http, HttpResponse, delay } from 'msw';
import type { OrderCollectorInfo, WalletProvider } from '@/types';
import { ApiErrorMock, createError, createOrder, requireUser, state } from '../state';

export const orderHandlers = [
  http.post('/api/orders', async ({ request }) => {
    await delay(220);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');

    const idemKey = request.headers.get('Idempotency-Key');
    if (!idemKey) {
      return createError(400, 'validation_failed', 'Cabeçalho Idempotency-Key ausente.');
    }
    const body = (await request.json()) as {
      items: Array<{ nftId: string; quantity: number }>;
      couponCode?: string;
      collector: OrderCollectorInfo;
      walletProvider: WalletProvider;
      expectedTotalsVersion?: number;
    };

    try {
      const order = createOrder(
        {
          items: body.items,
          couponCode: body.couponCode,
          collector: body.collector,
          walletProvider: body.walletProvider,
          idempotencyKey: idemKey,
          expectedTotalsVersion: body.expectedTotalsVersion ?? 0,
        },
        user,
      );
      return HttpResponse.json({ data: order });
    } catch (err) {
      if (err instanceof ApiErrorMock) {
        return createError(err.status, err.code, err.message, err.fields);
      }
      throw err;
    }
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    await delay(150);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const order = state.orders.byId[String(params.id)];
    if (!order || order.userId !== user.id) {
      return createError(404, 'not_found', 'Pedido não encontrado.');
    }
    return HttpResponse.json({ data: order });
  }),

  http.get('/api/orders', async ({ request }) => {
    await delay(120);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const list = Object.values(state.orders.byId).filter((o) => o.userId === user.id);
    return HttpResponse.json({ data: list });
  }),
];