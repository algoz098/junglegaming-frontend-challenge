import { http, HttpResponse, delay } from 'msw';
import { ApiErrorMock, createError, requireUser } from '../state';

interface FavoriteRecord {
  nftId: string;
  addedAt: string;
}

const FAV_STORAGE_KEY = 'kurio.mock.favorites.v1';

function loadFavorites(): Map<string, FavoriteRecord[]> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = window.localStorage.getItem(FAV_STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as Array<[string, FavoriteRecord[]]>);
  } catch {
    return new Map();
  }
}

function saveFavorites(map: Map<string, FavoriteRecord[]>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(Array.from(map.entries())));
  } catch {
    /* ignore */
  }
}

const favorites = loadFavorites();

export const favoriteHandlers = [
  http.get('/api/favorites', async ({ request }) => {
    await delay(100);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    return HttpResponse.json({ data: favorites.get(user.id) ?? [] });
  }),

  http.post('/api/favorites/:nftId', async ({ request, params }) => {
    await delay(120);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const existing = favorites.get(user.id);
    const list: FavoriteRecord[] = existing ? [...existing] : [];
    if (!list.some((f) => f.nftId === params.nftId)) {
      list.push({ nftId: String(params.nftId), addedAt: new Date().toISOString() });
      favorites.set(user.id, list);
    }
    saveFavorites(favorites);
    return HttpResponse.json({
      data: { nftId: String(params.nftId), addedAt: new Date().toISOString() },
    });
  }),

  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    await delay(100);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const list = (favorites.get(user.id) ?? []).filter((f) => f.nftId !== params.nftId);
    favorites.set(user.id, list);
    saveFavorites(favorites);
    if (Math.random() < 0.05) {
      throw new ApiErrorMock(500, 'transient', 'Falha transitória ao remover favorito.');
    }
    return new HttpResponse(null, { status: 204 });
  }),
];