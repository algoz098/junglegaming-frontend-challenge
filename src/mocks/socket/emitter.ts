import type { NftUpdatedPayload, OrderUpdatedPayload } from '@/types';
import { SOCKET_EVENTS } from './constants';
import { emitToClients } from './binding';

export function emitNftUpdate(payload: NftUpdatedPayload) {
  emitToClients(SOCKET_EVENTS.nftUpdated, payload);
}

export function emitOrderUpdate(payload: OrderUpdatedPayload) {
  emitToClients(SOCKET_EVENTS.orderUpdated, payload);
}

export const mockSocketInfo = {
  url: SOCKET_EVENTS.subscribeNft === 'subscribe.nft' ? '/socket.io' : '/socket.io',
  transports: ['websocket'] as const,
};