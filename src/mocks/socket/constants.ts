export const SOCKET_URL = '/socket.io';

export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
  priceChanged: 'price.changed',
  subscribeNft: 'subscribe.nft',
  unsubscribeNft: 'unsubscribe.nft',
  subscribeOrder: 'subscribe.order',
  unsubscribeOrder: 'unsubscribe.order',
} as const;

export const SOCKET_TRANSPORT_NOTE =
  'Mocked via @mswjs/socket.io-binding on the client. The socket.io-client connects to a virtual server handled by MSW; payloads are validated against the contracts in src/types/socket.ts.';