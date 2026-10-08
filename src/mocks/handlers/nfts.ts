import { http, HttpResponse, delay } from 'msw';
import { nftCategoryFixtures, nftCollectionFixtures, nftFixtures } from '../fixtures';
import { getNft } from '../state';
import { shouldDelayNftsResponse } from './debug';

export const nftHandlers = [
  http.get('/api/nfts', async ({ request }) => {
    const testDelay = shouldDelayNftsResponse();
    await delay(120 + Math.random() * 80 + testDelay);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase().trim();
    const collection = url.searchParams.get('collection') ?? '';
    const category = url.searchParams.get('category') ?? '';
    const network = url.searchParams.get('network') ?? '';
    const rarity = url.searchParams.get('rarity') ?? '';
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const sort = url.searchParams.get('sort') ?? 'recent';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '12');

    let filtered = nftFixtures.slice();

    if (q) {
      filtered = filtered.filter(
        (n) => n.name.toLowerCase().includes(q) || n.collectionName.toLowerCase().includes(q),
      );
    }
    if (collection) {
      filtered = filtered.filter((n) => n.collectionId === collection);
    }
    if (category) {
      filtered = filtered.filter((n) => n.collectionName === category);
    }
    if (network) {
      filtered = filtered.filter((n) => n.network === network);
    }
    if (rarity) {
      filtered = filtered.filter((n) => n.rarity === rarity);
    }
    if (minPrice) {
      filtered = filtered.filter((n) => Number(n.price.amount) >= Number(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter((n) => Number(n.price.amount) <= Number(maxPrice));
    }

    if (sort === 'price_asc') {
      filtered.sort((a, b) => Number(a.price.amount) - Number(b.price.amount));
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => Number(b.price.amount) - Number(a.price.amount));
    } else if (sort === 'rating') {
      filtered.sort((a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0));
    } else if (sort === 'trending') {
      filtered.sort((a, b) => (b.rating?.count ?? 0) - (a.rating?.count ?? 0));
    } else {
      filtered.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const data = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    return HttpResponse.json({
      data: { data, meta: { total, page: safePage, pageSize, totalPages } },
    });
  }),

  http.get('/api/nfts/collections', async () => {
    await delay(80);
    return HttpResponse.json({ data: nftCollectionFixtures });
  }),

  http.get('/api/nfts/categories', async () => {
    await delay(60);
    return HttpResponse.json({ data: nftCategoryFixtures });
  }),

  http.get('/api/nfts/:id', async ({ params }) => {
    await delay(140);
    const nft = getNft(String(params.id));
    if (!nft) {
      return HttpResponse.json({ error: { code: 'not_found', message: 'NFT não encontrado.' } }, { status: 404 });
    }
    return HttpResponse.json({ data: nft });
  }),

  http.get('/api/nfts/:id/related', async ({ params }) => {
    await delay(120);
    const nft = getNft(String(params.id));
    if (!nft) {
      return HttpResponse.json({ data: [] });
    }
    const related = nftFixtures
      .filter((n) => n.id !== nft.id && n.collectionId === nft.collectionId)
      .slice(0, 6);
    if (related.length < 6) {
      const others = nftFixtures
        .filter((n) => n.id !== nft.id && !related.includes(n))
        .slice(0, 6 - related.length);
      related.push(...others);
    }
    return HttpResponse.json({ data: related });
  }),
];