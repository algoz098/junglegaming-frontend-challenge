import { http, HttpResponse, delay } from 'msw';
import { adjustNftPrice, emitRawOrderUpdate, forceRejectOrder, resetState } from '../state';

let nextNftsDelayMs = 0;

export const debugHandlers = [
  http.post('/api/_debug/nft-price', async ({ request }) => {
    const body = (await request.json()) as { nftId: string; factor: number };
    adjustNftPrice(body.nftId, body.factor);
    return new Response(null, { status: 204 });
  }),

  http.post('/api/_debug/order-reject', async ({ request }) => {
    const body = (await request.json()) as { orderId: string; reason?: string };
    forceRejectOrder(body.orderId, body.reason);
    return new Response(null, { status: 204 });
  }),

  http.post('/api/_debug/order-emit', async ({ request }) => {
    const body = (await request.json()) as {
      orderId: string;
      status?: 'pending' | 'confirmed' | 'rejected';
      version?: number;
      failureReason?: string;
    };
    emitRawOrderUpdate({
      orderId: body.orderId,
      status: body.status ?? 'pending',
      version: body.version ?? 0,
      failureReason: body.failureReason,
      emittedAt: new Date().toISOString(),
    });
    return new Response(null, { status: 204 });
  }),

  http.post('/api/_debug/nfts-delay-next', async ({ request }) => {
    const body = (await request.json()) as { delayMs?: number };
    nextNftsDelayMs = body.delayMs ?? 3000;
    return new Response(null, { status: 204 });
  }),

  http.get('/api/_debug/reset', () => {
    nextNftsDelayMs = 0;
    return HttpResponse.json({ ok: true });
  }),

  http.post('/api/_debug/reset', async () => {
    resetState();
    nextNftsDelayMs = 0;
    await delay(100);
    return new Response(null, { status: 204 });
  }),

  http.post('/api/_debug/slow-network', () => new Response(null, { status: 204 })),
];

export function shouldDelayNftsResponse(): number {
  if (nextNftsDelayMs > 0) {
    const d = nextNftsDelayMs;
    nextNftsDelayMs = 0;
    return d;
  }
  return 0;
}