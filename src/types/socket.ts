import type { Nft, Order, OrderStatus, PriceSnapshot } from './domain';

export interface NftUpdatedPayload {
  nftId: string;
  price?: PriceSnapshot;
  availableQuantity?: number;
  editionStatus?: 'aberta' | 'fechada' | 'esgotada';
  version: number;
  emittedAt: string;
}

export interface OrderUpdatedPayload {
  orderId: string;
  status: OrderStatus;
  transaction?: Order['transaction'];
  failureReason?: string;
  version: number;
  emittedAt: string;
}

export interface PriceChangedPayload {
  nftId: string;
  oldPrice: string;
  newPrice: string;
  version: number;
}

export type ServerToClientEvents = {
  'nft.updated': (payload: NftUpdatedPayload) => void;
  'order.updated': (payload: OrderUpdatedPayload) => void;
  'price.changed': (payload: PriceChangedPayload) => void;
};

export type ClientToServerEvents = {
  'subscribe.nft': (nftId: string) => void;
  'unsubscribe.nft': (nftId: string) => void;
  'subscribe.order': (orderId: string) => void;
  'unsubscribe.order': (orderId: string) => void;
};

export type SocketEventName = keyof ServerToClientEvents;

export type SocketPayload<T extends SocketEventName> = Parameters<ServerToClientEvents[T]>[0];

export type NftUpdateEnvelope = {
  type: 'nft.updated';
  payload: NftUpdatedPayload;
};

export type OrderUpdateEnvelope = {
  type: 'order.updated';
  payload: OrderUpdatedPayload;
};

export type SocketMessage = NftUpdateEnvelope | OrderUpdateEnvelope;

export function applyNftUpdate(nft: Nft, payload: NftUpdatedPayload): Nft {
  if (payload.version < nft.price.version) {
    return nft;
  }
  return {
    ...nft,
    price: payload.price ?? nft.price,
    edition: payload.editionStatus
      ? { ...nft.edition, status: payload.editionStatus }
      : nft.edition,
  };
}