import { z } from 'zod';

export const SORT_OPTIONS = [
  'recent',
  'price_asc',
  'price_desc',
  'rating',
  'trending',
] as const;

export const RARITIES = ['comum', 'raro', 'epico', 'lendario'] as const;
export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

const decimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Use apenas números positivos')
  .optional();

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(120).optional().catch(''),
  collection: z.string().trim().max(120).optional().catch(''),
  category: z.string().trim().max(120).optional().catch(''),
  network: z.enum(NETWORKS).optional().catch(undefined),
  rarity: z.enum(RARITIES).optional().catch(undefined),
  minPrice: decimalString,
  maxPrice: decimalString,
  sort: z.enum(SORT_OPTIONS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: z.coerce.number().int().min(1).max(48).optional().catch(undefined),
  view: z.enum(['grid', 'list']).optional().catch(undefined),
  featured: z.coerce.boolean().optional().catch(undefined),
});

export type CatalogSearchParams = z.infer<typeof catalogSearchSchema>;

export const DEFAULT_PAGE_SIZE = 12;

export function buildListQuery(params: CatalogSearchParams) {
  const result: Record<string, string | number> = {
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    page: params.page ?? 1,
  };
  if (params.q) result.q = params.q;
  if (params.collection) result.collection = params.collection;
  if (params.category) result.category = params.category;
  if (params.network) result.network = params.network;
  if (params.rarity) result.rarity = params.rarity;
  if (params.minPrice) result.minPrice = params.minPrice;
  if (params.maxPrice) result.maxPrice = params.maxPrice;
  if (params.sort) result.sort = params.sort;
  return result;
}

export const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Preço: menor primeiro',
  price_desc: 'Preço: maior primeiro',
  rating: 'Mais bem avaliados',
  trending: 'Em alta',
};

export const RARITY_LABELS: Record<(typeof RARITIES)[number], string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};

export const NETWORK_LABELS: Record<(typeof NETWORKS)[number], string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
};