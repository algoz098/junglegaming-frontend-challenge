import { toSocketIo } from '@mswjs/socket.io-binding';
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket';

const clients = new Set<ReturnType<typeof toSocketIo>>();

let interceptor: WebSocketInterceptor | null = null;

function bindConnection(connection: Parameters<typeof toSocketIo>[0]) {
  const io = toSocketIo(connection as unknown as Parameters<typeof toSocketIo>[0]);
  clients.add(io);

  io.client.on('subscribe.nft', (_event: MessageEvent, ...args: unknown[]) => {
    const nftId = args[0];
    if (typeof nftId === 'string') {
      io.server.emit('nft.subscribed', { nftId });
    }
  });
  io.client.on('subscribe.order', (_event: MessageEvent, ...args: unknown[]) => {
    const orderId = args[0];
    if (typeof orderId === 'string') {
      io.server.emit('order.subscribed', { orderId });
    }
  });

  const cleanup = () => clients.delete(io);
  try {
    connection.client.addEventListener('close', cleanup);
  } catch {
    /* ignore */
  }
}

/**
 * Cria e aplica um `WebSocketInterceptor` que envolve cada conexão em
 * `toSocketIo(connection)`. Como o service worker do MSW não intercepta
 * WebSockets, registramos o interceptor no escopo da página (browser
 * global). O cliente `socket.io-client` continua exercitado e os
 * eventos trafegam pelo protocolo Socket.IO binário oficial.
 */
export function startSocketInterceptor(): void {
  if (typeof window === 'undefined') return;
  if (interceptor) return;
  interceptor = new WebSocketInterceptor();
  interceptor.on('connection', (connection) => {
    bindConnection(connection as unknown as Parameters<typeof toSocketIo>[0]);
  });
  interceptor.apply();
  (globalThis as Record<string, unknown>).__KURIO_SOCKET_READY__ = true;
  if (import.meta.env.DEV) {
    console.info('[socket.io] WebSocketInterceptor ativo.');
  }
}

export function stopSocketInterceptor(): void {
  if (interceptor) {
    interceptor.dispose();
    interceptor = null;
  }
  clients.clear();
}

export function emitToClients(event: string, payload: unknown): void {
  for (const io of clients) {
    try {
      io.server.emit(event, payload);
    } catch {
      /* ignore */
    }
  }
}

export function getClientCount(): number {
  return clients.size;
}