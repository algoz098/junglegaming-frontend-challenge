import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEFAULT_PAGE_SIZE,
  NETWORK_LABELS,
  NETWORKS,
  RARITIES,
  RARITY_LABELS,
  SORT_LABELS,
  SORT_OPTIONS,
  buildListQuery,
  type CatalogSearchParams,
  type SortOption,
} from '@/api/search-params';
import type { NftCollection, WalletNetwork, NftRarity } from '@/types';
import { useNftCategories, useNftCollections } from '@/hooks/use-nfts';
import { Filter, X } from 'lucide-react';

export interface CatalogFiltersProps {
  search: CatalogSearchParams;
}

export function CatalogFilters({ search }: CatalogFiltersProps) {
  const navigate = useNavigate({ from: '/' });
  const collections = useNftCollections();
  const categories = useNftCategories();

  const update = useCallback(
    (patch: Partial<CatalogSearchParams>) => {
      navigate({
        search: (prev) => ({ ...prev, ...patch, page: 1 }),
        replace: true,
      });
    },
    [navigate],
  );

  const clear = useCallback(() => {
    navigate({ search: {}, replace: true });
  }, [navigate]);

  const hasFilters = Boolean(
    search.q ||
      search.collection ||
      search.category ||
      search.network ||
      search.rarity ||
      search.minPrice ||
      search.maxPrice,
  );

  return (
    <aside aria-label="Filtros do catálogo" className="space-y-6">
      <div className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Buscar</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get('q');
            update({ q: typeof value === 'string' ? value : undefined });
          }}
        >
          <Input
            name="q"
            defaultValue={search.q ?? ''}
            placeholder="Nome ou coleção"
            aria-label="Buscar NFTs"
          />
        </form>
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Categorias</h2>
        {categories.isLoading ? (
          <Skeleton className="h-20" />
        ) : (
          <ul className="space-y-2 text-sm">
            {(categories.data ?? []).map((cat) => (
              <li key={cat}>
                <FilterRow
                  label={cat}
                  active={search.category === cat}
                  onClick={() => update({ category: search.category === cat ? undefined : cat })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Coleções</h2>
        {collections.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <ul className="space-y-2 text-sm">
            {(collections.data ?? []).map((col: NftCollection) => (
              <li key={col.id}>
                <FilterRow
                  label={col.name}
                  count={col.count}
                  active={search.collection === col.slug}
                  onClick={() =>
                    update({ collection: search.collection === col.slug ? undefined : col.slug })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Raridade</h2>
        <Select
          value={search.rarity ?? '__all'}
          onValueChange={(value) =>
            update({ rarity: value === '__all' ? undefined : (value as NftRarity) })
          }
        >
          <SelectTrigger className="w-full" aria-label="Filtrar por raridade">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas</SelectItem>
            {RARITIES.map((r) => (
              <SelectItem key={r} value={r}>
                {RARITY_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Rede</h2>
        <Select
          value={search.network ?? '__all'}
          onValueChange={(value) =>
            update({ network: value === '__all' ? undefined : (value as WalletNetwork) })
          }
        >
          <SelectTrigger className="w-full" aria-label="Filtrar por rede">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas</SelectItem>
            {NETWORKS.map((n) => (
              <SelectItem key={n} value={n}>
                {NETWORK_LABELS[n]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Faixa de preço</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Mínimo" htmlFor="minPrice">
            <Input
              id="minPrice"
              name="minPrice"
              type="text"
              inputMode="decimal"
              defaultValue={search.minPrice ?? ''}
              placeholder="0.00"
              prefix={<span className="text-xs">Ξ</span>}
              onBlur={(e) => update({ minPrice: e.target.value || undefined })}
            />
          </Field>
          <Field label="Máximo" htmlFor="maxPrice">
            <Input
              id="maxPrice"
              name="maxPrice"
              type="text"
              inputMode="decimal"
              defaultValue={search.maxPrice ?? ''}
              placeholder="10.00"
              prefix={<span className="text-xs">Ξ</span>}
              onBlur={(e) => update({ maxPrice: e.target.value || undefined })}
            />
          </Field>
        </div>
      </div>

      {hasFilters && (
        <Button variant="ghost" className="w-full" onClick={clear}>
          <X className="h-4 w-4" />
          Limpar filtros
        </Button>
      )}

      <details className="card-surface p-5 text-xs text-muted-foreground">
        <summary className="flex cursor-pointer items-center gap-2 text-foreground">
          <Filter className="h-4 w-4" />
          Estado da URL
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-md bg-background/40 p-2 text-[10px] leading-snug">
          {JSON.stringify(buildListQuery(search), null, 2)}
        </pre>
        <p className="mt-2 leading-relaxed">
          Os filtros são serializados na URL. Recarregar, voltar ou compartilhar preserva o estado.
        </p>
      </details>
    </aside>
  );
}

function FilterRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors ${
        active ? 'bg-primary/15 text-primary' : 'text-foreground/80 hover:bg-secondary'
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

export function CatalogToolbar({ search }: CatalogFiltersProps) {
  const navigate = useNavigate({ from: '/' });
  const setSort = (sort: SortOption | undefined) =>
    navigate({ search: (prev) => ({ ...prev, sort, page: 1 }), replace: true });

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-6 border-b border-border">
        {[
          { id: 'all', label: 'Todos os NFTs' },
          { id: 'trending', label: 'Em alta' },
          { id: 'recent', label: 'Novos lançamentos' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() =>
              setSort(tab.id === 'recent' ? 'recent' : tab.id === 'trending' ? 'trending' : undefined)
            }
            className={`relative pb-3 text-sm font-medium transition-colors ${
              (tab.id === 'recent' && search.sort === 'recent') ||
              (tab.id === 'trending' && search.sort === 'trending') ||
              (tab.id === 'all' && !search.sort)
                ? 'text-primary'
                : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            {tab.label}
            {((tab.id === 'recent' && search.sort === 'recent') ||
              (tab.id === 'trending' && search.sort === 'trending') ||
              (tab.id === 'all' && !search.sort)) && (
              <span className="absolute -bottom-px left-0 h-[2px] w-full bg-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Ordenar por:</span>
        <Select
          value={search.sort ?? 'recent'}
          onValueChange={(v) => setSort(v as SortOption)}
        >
          <SelectTrigger aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {SORT_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function CatalogPagination({
  search,
  total,
  pageSize,
}: {
  search: CatalogSearchParams;
  total: number;
  pageSize?: number;
}) {
  const navigate = useNavigate({ from: '/' });
  const size = pageSize ?? search.pageSize ?? DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(totalPages, search.page ?? 1);
  const setPage = (page: number) =>
    navigate({ search: (prev) => ({ ...prev, page }), replace: true });

  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação do catálogo" className="mt-8 flex items-center justify-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={current <= 1}
        onClick={() => setPage(current - 1)}
        aria-label="Página anterior"
      >
        Anterior
      </Button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - current) <= 2)
        .map((p, i, arr) => (
          <span key={p} className="flex items-center gap-2">
            {i > 0 && arr[i - 1] !== p - 1 && (
              <span className="text-muted-foreground">…</span>
            )}
            <button
              type="button"
              onClick={() => setPage(p)}
              aria-current={p === current ? 'page' : undefined}
              className={`h-9 min-w-9 rounded-md px-3 text-sm font-semibold transition-colors ${
                p === current
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-foreground/80 hover:bg-secondary'
              }`}
            >
              {p}
            </button>
          </span>
        ))}
      <Button
        variant="ghost"
        size="sm"
        disabled={current >= totalPages}
        onClick={() => setPage(current + 1)}
        aria-label="Próxima página"
      >
        Próxima
      </Button>
    </nav>
  );
}

// Helper to keep types happy with Link when used elsewhere
export const _CatalogLink = Link;