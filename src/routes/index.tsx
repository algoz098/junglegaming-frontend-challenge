import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CatalogFilters,
  CatalogPagination,
  CatalogToolbar,
} from '@/components/catalog/catalog-filters';
import { NftCard } from '@/components/nft/nft-card';
import { NftArt } from '@/components/nft/nft-art';
import { useNftList } from '@/hooks/use-nfts';
import { buildListQuery, catalogSearchSchema } from '@/api/search-params';
import { Link as RouterLink } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: HomePage,
});

function HomePage() {
  const search = Route.useSearch();
  const listQuery = buildListQuery(search);
  const { data, isLoading, isError, isFetching } = useNftList(listQuery);

  return (
    <>
      <section className="container grid gap-8 py-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Bem-vindo à Kurio</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold uppercase leading-tight text-balance md:text-5xl">
            Seja dono do futuro
            <br />da arte digital
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara,
            apoie artistas e tenha sua parte da cultura do internet.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                const el = document.getElementById('catalog');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explorar
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button asChild variant="ghost" size="lg">
              <RouterLink to="/cart">Ver carrinho</RouterLink>
            </Button>
          </div>
          <div className="mt-10 flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full ${i === 0 ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}
              />
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-card">
            <NftArt seed="Emerald Ape #042 feature" variant="feature" className="h-full w-full" />
          </div>
        </div>
      </section>

      <section id="catalog" className="container pb-12">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <CatalogFilters search={search} />

          <div>
            <CatalogToolbar search={search} />

            {isLoading && <CatalogSkeleton />}

            {isError && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center"
              >
                <p className="font-display text-lg">Não foi possível carregar o catálogo.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Verifique sua conexão e tente novamente.
                </p>
              </div>
            )}

            {data && data.data.length === 0 && !isLoading && (
              <div className="rounded-2xl border border-border bg-card/40 p-12 text-center">
                <p className="font-display text-lg">Nenhum NFT encontrado.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ajuste os filtros ou explore outras coleções.
                </p>
              </div>
            )}

            {data && data.data.length > 0 && (
              <>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {data.data.map((nft) => (
                      <NftCard key={nft.id} nft={nft} />
                    ))}
                  </div>
                  <CatalogPagination
                    search={search}
                    total={data.meta.total}
                    pageSize={data.meta.pageSize}
                  />
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Mostrando {data.data.length} de {data.meta.total} NFTs
                    {isFetching && !isLoading && ' · atualizando…'}
                  </p>
                </>
              )}
          </div>
        </div>
      </section>

      <section className="container pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-extrabold uppercase">NFT em destaque</h2>
          <p className="text-sm uppercase tracking-widest text-primary">Oferta limitada</p>
        </div>
        <FeaturedRow />
      </section>
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card/80">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturedRow() {
  const { data, isLoading } = useNftList({ sort: 'trending', pageSize: 4 });
  if (isLoading || !data) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {data.data.map((nft) => (
        <NftCard key={nft.id} nft={nft} compact />
      ))}
    </div>
  );
}