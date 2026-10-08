export type ID = string;

export interface User {
  id: ID;
  displayName: string;
  username: string;
  email: string;
  ensName?: string;
  avatarUrl?: string;
  createdAt: string;
  walletId?: ID;
}

export type WalletNetwork = 'ethereum' | 'polygon' | 'solana';

export interface Wallet {
  id: ID;
  label: string;
  address: string;
  ens?: string;
  network: WalletNetwork;
  type: WalletProvider;
  isPrimary: boolean;
}

export type WalletProvider =
  | 'metamask'
  | 'walletconnect'
  | 'coinbase'
  | 'multichain'
  | 'nova'
  | 'custom';

export interface WalletOption {
  id: string;
  provider: WalletProvider;
  displayName: string;
  network: WalletNetwork | 'multi';
}

export type NftRarity = 'comum' | 'raro' | 'epico' | 'lendario';

export type EditionStatus = 'aberta' | 'fechada' | 'esgotada';

export interface NftAttribute {
  trait: string;
  value: string;
  rarity?: number;
}

export interface NftEdition {
  number: number;
  total: number;
  status: EditionStatus;
}

export interface NftCollection {
  id: ID;
  slug: string;
  name: string;
  category: string;
  count: number;
}

export type Currency = 'ETH';

export interface PriceSnapshot {
  amount: string;
  currency: Currency;
  updatedAt: string;
  version: number;
}

export interface Nft {
  id: ID;
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  collectionId: ID;
  collectionName: string;
  creator: { id: ID; displayName: string; avatarUrl?: string };
  owner?: { id: ID; displayName: string };
  edition: NftEdition;
  attributes: NftAttribute[];
  rarity: NftRarity;
  rating?: { average: number; count: number };
  price: PriceSnapshot;
  network: WalletNetwork;
}

export interface CartItem {
  nftId: ID;
  quantity: number;
  priceSnapshot: PriceSnapshot;
  addedAt: string;
}

export interface CouponResult {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  description?: string;
}

export interface CartTotals {
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
  appliedCoupon?: CouponResult;
  version: number;
  expiresAt: string;
}

export interface Cart {
  id: ID;
  items: CartItem[];
  totals: CartTotals;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected';

export interface OrderItemSnapshot {
  nftId: ID;
  name: string;
  imageUrl: string;
  tokenId: string;
  edition: number;
  unitPrice: string;
  quantity: number;
  subtotal: string;
}

export interface OrderTransaction {
  hash: string;
  network: WalletNetwork;
  walletAddress: string;
  explorerUrl: string;
}

export interface Order {
  id: ID;
  status: OrderStatus;
  userId: ID;
  items: OrderItemSnapshot[];
  totals: CartTotals;
  collector: OrderCollectorInfo;
  transaction?: OrderTransaction;
  failureReason?: string;
  createdAt: string;
  confirmedAt?: string;
  rejectedAt?: string;
}

export interface OrderCollectorInfo {
  displayName: string;
  username: string;
  network: WalletNetwork;
  walletAddress: string;
  ensName?: string;
  email: string;
  note?: string;
}

export interface OrderCreationPayload {
  items: Array<{ nftId: ID; quantity: number }>;
  couponCode?: string;
  collector: OrderCollectorInfo;
  walletProvider: WalletProvider;
  idempotencyKey: string;
  expectedTotalsVersion: number;
}

export type PaginatedMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export interface Page<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface NftListQuery {
  q?: string;
  collection?: string;
  category?: string;
  network?: WalletNetwork;
  rarity?: NftRarity;
  minPrice?: string;
  maxPrice?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'rating' | 'trending';
  page?: number;
  pageSize?: number;
}

export interface FavoriteEntry {
  nftId: ID;
  addedAt: string;
}

export type ApiErrorCode =
  | 'validation_failed'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'coupon_invalid'
  | 'coupon_expired'
  | 'edition_unavailable'
  | 'price_changed'
  | 'idempotency_conflict'
  | 'transient';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  fields?: Record<string, string>;
  details?: Record<string, unknown>;
}

export type ApiEnvelope<T> = { data: T } | { error: ApiError };

export interface SessionInfo {
  user: User;
  expiresAt: string;
  token?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

export interface ProfileUpdatePayload {
  displayName?: string;
  username?: string;
  email?: string;
  ensName?: string;
  avatarUrl?: string;
}

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}

export interface WalletUpsertPayload {
  id?: ID;
  label: string;
  nickname: string;
  address: string;
  ens?: string;
  network: WalletNetwork;
  type: WalletProvider;
  isPrimary?: boolean;
  referralCode?: string;
  email?: string;
}