import type {
  Cart,
  CartTotals,
  CouponResult,
  FavoriteEntry,
  LoginPayload,
  Nft,
  NftCollection,
  NftListQuery,
  Order,
  OrderCreationPayload,
  Page,
  PasswordChangePayload,
  ProfileUpdatePayload,
  RegisterPayload,
  SessionInfo,
  User,
  Wallet,
  WalletOption,
  WalletUpsertPayload,
} from '@/types';
import { api } from './client';

export const sessionApi = {
  login: async (payload: LoginPayload): Promise<SessionInfo> =>
    (await api.post<{ data: SessionInfo }>('/session/login', payload)).data.data,
  register: async (payload: RegisterPayload): Promise<SessionInfo> =>
    (await api.post<{ data: SessionInfo }>('/session/register', payload)).data.data,
  me: async (): Promise<SessionInfo> =>
    (await api.get<{ data: SessionInfo }>('/session')).data.data,
  logout: async (): Promise<void> => {
    await api.post('/session/logout');
  },
};

export const nftApi = {
  list: async (query: NftListQuery): Promise<Page<Nft>> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    return (
      await api.get<{ data: Page<Nft> }>(`/nfts?${params.toString()}`)
    ).data.data;
  },
  detail: async (id: string): Promise<Nft> =>
    (await api.get<{ data: Nft }>(`/nfts/${id}`)).data.data,
  related: async (id: string): Promise<Nft[]> =>
    (await api.get<{ data: Nft[] }>(`/nfts/${id}/related`)).data.data,
  collections: async (): Promise<NftCollection[]> =>
    (await api.get<{ data: NftCollection[] }>('/nfts/collections')).data.data,
  categories: async (): Promise<string[]> =>
    (await api.get<{ data: string[] }>('/nfts/categories')).data.data,
};

export const favoritesApi = {
  list: async (): Promise<FavoriteEntry[]> =>
    (await api.get<{ data: FavoriteEntry[] }>('/favorites')).data.data,
  add: async (nftId: string): Promise<FavoriteEntry> =>
    (await api.post<{ data: FavoriteEntry }>(`/favorites/${nftId}`)).data.data,
  remove: async (nftId: string): Promise<void> => {
    await api.delete(`/favorites/${nftId}`);
  },
};

export const cartApi = {
  get: async (): Promise<Cart> =>
    (await api.get<{ data: Cart }>('/cart')).data.data,
  add: async (payload: { nftId: string; quantity: number }): Promise<Cart> =>
    (await api.post<{ data: Cart }>('/cart/items', payload)).data.data,
  update: async (nftId: string, quantity: number): Promise<Cart> =>
    (await api.put<{ data: Cart }>(`/cart/items/${nftId}`, { quantity })).data.data,
  remove: async (nftId: string): Promise<Cart> =>
    (await api.delete<{ data: Cart }>(`/cart/items/${nftId}`)).data.data,
  applyCoupon: async (code: string): Promise<{ cart: Cart; coupon: CouponResult }> =>
    (
      await api.post<{ data: { cart: Cart; coupon: CouponResult } }>('/cart/coupon', {
        code,
      })
    ).data.data,
  removeCoupon: async (): Promise<Cart> =>
    (await api.delete<{ data: Cart }>('/cart/coupon')).data.data,
  quote: async (): Promise<CartTotals> =>
    (await api.get<{ data: CartTotals }>('/cart/quote')).data.data,
};

export const ordersApi = {
  create: async (payload: OrderCreationPayload): Promise<Order> =>
    (
      await api.post<{ data: Order }>('/orders', payload, {
        headers: { 'Idempotency-Key': payload.idempotencyKey },
      })
    ).data.data,
  detail: async (id: string): Promise<Order> =>
    (await api.get<{ data: Order }>(`/orders/${id}`)).data.data,
};

export const profileApi = {
  me: async (): Promise<User> =>
    (await api.get<{ data: User }>('/profile')).data.data,
  update: async (payload: ProfileUpdatePayload): Promise<User> =>
    (await api.patch<{ data: User }>('/profile', payload)).data.data,
  changePassword: async (payload: PasswordChangePayload): Promise<void> => {
    await api.post('/profile/password', payload);
  },
  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('avatar', file);
    return (
      await api.post<{ data: { url: string } }>('/profile/avatar', form, {
        headers: { 'content-type': 'multipart/form-data' },
      })
    ).data.data;
  },
};

export const walletsApi = {
  list: async (): Promise<Wallet[]> =>
    (await api.get<{ data: Wallet[] }>('/wallets')).data.data,
  providers: async (): Promise<WalletOption[]> =>
    (await api.get<{ data: WalletOption[] }>('/wallets/providers')).data.data,
  upsert: async (payload: WalletUpsertPayload): Promise<Wallet> =>
    (await api.post<{ data: Wallet }>('/wallets', payload)).data.data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/wallets/${id}`);
  },
};