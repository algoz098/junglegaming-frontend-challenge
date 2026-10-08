export const queryKeys = {
  session: () => ['session'] as const,
  nfts: {
    all: () => ['nfts'] as const,
    list: (params: Record<string, unknown>) => ['nfts', 'list', params] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    related: (id: string) => ['nfts', 'related', id] as const,
    collections: () => ['nfts', 'collections'] as const,
    categories: () => ['nfts', 'categories'] as const,
  },
  favorites: () => ['favorites'] as const,
  cart: () => ['cart'] as const,
  orders: {
    all: () => ['orders'] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  profile: () => ['profile'] as const,
  wallets: () => ['wallets'] as const,
} as const;