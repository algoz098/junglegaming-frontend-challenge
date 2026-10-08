import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Heart, ShoppingCart, Share2, Star, Search, Plus, Minus, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NftArt } from '@/components/nft/nft-art';
import { RarityBadge, NetworkBadge } from '@/components/nft/badges';
import { NftCard } from '@/components/nft/nft-card';
import { useNftDetail, useRelatedNfts } from '@/hooks/use-nfts';
import { useToggleFavorite, useFavorites } from '@/hooks/use-favorites';
import { useAddToCart } from '@/hooks/use-cart';
import { useGuestCart } from '@/hooks/use-guest-cart';
import { useAuth } from '@/hooks/use-auth';
import { useNftSocket } from '@/hooks/use-socket';
import { formatDate } from '@/lib/format';
import { lineTotal } from '@/lib/line-total';
import { cn } from '@/lib/utils';
import type { Nft } from '@/types';

export const Route = createFileRoute('/nft/$id')({
  parseParams: (params) => ({ id: params.id }),
  stringifyParams: ({ id }) => ({ id: id ?? '' }),
  component: NftDetailPage,
});

const TABS = ['Detalhes do NFT', 'Avaliações de colecionadores'] as const;

function NftDetailPage() {
  const { id } = Route.useParams();
  const { data: nft, isLoading, isError } = useNftDetail(id);
  const { data: related } = useRelatedNfts(id);
  useNftSocket(id);
  const { isAuthenticated } = useAuth();
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const addToCart = useAddToCart();
  const guest = useGuestCart();
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [adding, setAdding] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !nft) {
    return (
      <section className="container py-16">
        <div className="rounded-2xl border border-border bg-card/80 p-12 text-center">
          <p className="text-sm uppercase tracking-widest text-primary">404</p>
          <h1 className="mt-2 font-display text-3xl font-bold">NFT não encontrado</h1>
          <p className="mt-4 text-muted-foreground">
            O identificador {id} não existe ou foi removido da coleção.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao catálogo</Link>
          </Button>
        </div>
      </section>
    );
  }

  const isFav = favorites.data?.some((f) => f.nftId === nft.id) ?? false;
  const maxQuantity = Math.min(nft.edition.total - nft.edition.number + 1, nft.edition.total);

  return (
    <>
      <section className="container py-8">
        <nav aria-label="Trilha" className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/" className="hover:text-primary">Mercado</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{nft.collectionName}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary">{nft.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <Gallery nft={nft} />
          <InfoPanel
            nft={nft}
            quantity={quantity}
            setQuantity={setQuantity}
            isFav={isFav}
            onToggleFav={() => {
              if (!isAuthenticated) {
                toast.error('Entre na sua conta para favoritar NFTs.');
                return;
              }
              toggle.mutate({ nftId: nft.id, action: isFav ? 'remove' : 'add' });
            }}
            onBuy={async () => {
              if (nft.edition.status === 'esgotada') {
                toast.error('Edição esgotada.');
                return;
              }
              setAdding(true);
              try {
                if (isAuthenticated) {
                  await addToCart.mutateAsync({ nftId: nft.id, quantity });
                  toast.success(`${nft.name} adicionado ao carrinho.`);
                } else {
                  await guest.addItem(nft.id, quantity);
                  toast.success(`${nft.name} salvo no carrinho. Faça login para finalizar.`);
                }
              } catch (err: unknown) {
                toast.error((err as { message?: string })?.message ?? 'Falha ao adicionar.');
              } finally {
                setAdding(false);
              }
            }}
            maxQuantity={maxQuantity}
            adding={adding || addToCart.isPending}
          />
        </div>

        <div className="mt-12">
          <div className="flex gap-8 border-b border-border" role="tablist">
            {TABS.map((label) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={tab === label}
                onClick={() => setTab(label)}
                className={cn(
                  'relative pb-3 text-sm font-medium transition-colors',
                  tab === label ? 'text-primary' : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {label}
                {tab === label && (
                  <span className="absolute -bottom-px left-0 h-[2px] w-full bg-primary" />
                )}
              </button>
            ))}
          </div>
          <div className="prose prose-invert mt-6 max-w-none text-sm leading-relaxed text-muted-foreground">
            {tab === TABS[0] ? <DetailsTab nft={nft} /> : <ReviewsTab nft={nft} />}
          </div>
        </div>
      </section>

      <section className="container pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-extrabold uppercase">Mais desta coleção</h2>
          <Link to="/" className="text-sm text-primary hover:underline">
            Ver tudo
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {(related ?? []).slice(0, 5).map((item) => (
            <NftCard key={item.id} nft={item} compact />
          ))}
        </div>
      </section>

      <BottomFeatureBar />
    </>
  );
}

function Gallery({ nft }: { nft: Nft }) {
  const [active, setActive] = useState(0);
  const thumbs = [0, 1, 2, 3].map((i) => `${nft.id}-${i}`);
  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      <div className="flex flex-row gap-3 md:flex-col" aria-label="Galeria de imagens">
        {thumbs.map((seed, i) => (
          <button
            key={seed}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Imagem ${i + 1}`}
            aria-current={i === active}
            className={cn(
              'relative aspect-square w-20 overflow-hidden rounded-lg border-2 transition-colors',
              i === active ? 'border-primary' : 'border-border hover:border-primary/50',
            )}
          >
            <NftArt seed={seed} className="absolute inset-0 h-full w-full" />
          </button>
        ))}
      </div>
      <div className="relative flex-1 overflow-hidden rounded-3xl border border-border bg-card">
        <NftArt seed={`${nft.name}-${active}`} variant="feature" className="aspect-square h-full w-full" />
        <button
          type="button"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/80 text-foreground/70 hover:border-primary hover:text-primary"
          aria-label="Buscar na imagem"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface InfoPanelProps {
  nft: Nft;
  quantity: number;
  setQuantity: (q: number) => void;
  isFav: boolean;
  onToggleFav: () => void;
  onBuy: () => void;
  maxQuantity: number;
  adding: boolean;
}

function InfoPanel({
  nft,
  quantity,
  setQuantity,
  isFav,
  onToggleFav,
  onBuy,
  maxQuantity,
  adding,
}: InfoPanelProps) {
  const isEsgotada = nft.edition.status === 'esgotada';
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-extrabold">{nft.name}</h1>
          <RarityBadge rarity={nft.rarity} />
        </div>
        <div className="mt-2 flex items-center gap-3 font-mono text-2xl font-bold text-primary">
          {nft.price.amount} ETH
          {nft.rating && (
            <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <Star className="h-4 w-4 fill-primary text-primary" />
              {nft.rating.average.toFixed(1)}
              <span className="text-xs">({nft.rating.count} avaliações)</span>
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Sobre este NFT</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{nft.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Edição</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold">
              {nft.edition.number} / {nft.edition.total}
            </span>
            <Badge variant={isEsgotada ? 'danger' : 'success'}>
              {isEsgotada ? 'Esgotada' : nft.edition.status.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">ID do token</p>
          <p className="mt-1 font-mono font-semibold">#{nft.tokenId}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Coleção</p>
          <p className="mt-1">{nft.collectionName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Rede</p>
          <div className="mt-1">
            <NetworkBadge network={nft.network} />
          </div>
        </div>
        <div className="col-span-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Atributos</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {nft.attributes.map((attr) => (
              <Badge key={attr.trait} variant="default">
                {attr.trait}: {attr.value}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Compartilhar</p>
        <div className="mt-2 flex gap-2">
          <Button variant="ghost" size="sm" aria-label="Compartilhar no Twitter">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Compartilhar no Facebook">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Quantidade</span>
            <div className="flex items-center rounded-md border border-border">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                className="h-10 w-10 text-foreground/80 hover:bg-secondary disabled:opacity-50"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="mx-auto h-4 w-4" />
              </button>
              <span aria-live="polite" className="w-10 text-center font-mono text-sm font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                className="h-10 w-10 text-foreground/80 hover:bg-secondary disabled:opacity-50"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
              >
                <Plus className="mx-auto h-4 w-4" />
              </button>
            </div>
          </div>
          <span className="font-mono text-2xl font-bold text-primary">
            {lineTotal(nft.price.amount, quantity)} ETH
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={isEsgotada || adding}
            onClick={onBuy}
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart className="h-4 w-4" />
            {isEsgotada ? 'Esgotado' : adding ? 'Adicionando…' : 'Comprar NFT'}
          </Button>
          <Button
            variant={isFav ? 'primary' : 'outline'}
            size="lg"
            onClick={onToggleFav}
            aria-pressed={isFav}
            aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
            {isFav ? 'Favoritado' : 'Favoritar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailsTab({ nft }: { nft: Nft }) {
  return (
    <article className="space-y-4">
      <p>
        <strong className="text-foreground">{nft.name}</strong> é uma obra digital 1/{nft.edition.total} finalizada
        à mão da coleção {nft.collectionName}. Cada atributo foi armazenado nos metadados do token e verificado na
        Ethereum. A propriedade inclui todos os direitos de exibição e transferência registrados na rede.
      </p>
      <p>
        A propriedade inclui o arte e os efeitos de resolução. Lançamentos exclusivos para colecionadores e ao
        registro permanente de procedência registrada na rede. Nova foto recebe 5% de direitos autorais nas vendas
        secundárias, apoiando novos trabalhos e lançamentos do colecionador.
      </p>
      <h3 className="font-display text-sm uppercase tracking-wider text-primary">Rede</h3>
      <p>Contrato na {nft.network === 'ethereum' ? 'Ethereum' : nft.network === 'polygon' ? 'Polygon' : 'Solana'} com procedência imutável e estatísticas semanais em IPFS.</p>
      <h3 className="font-display text-sm uppercase tracking-wider text-primary">Contrato</h3>
      <p>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
      <h3 className="font-display text-sm uppercase tracking-wider text-primary">Diretoria autoral</h3>
      <p>0x7A82…90B5 · Contrato inteligente ERC-721 verificado.</p>
    </article>
  );
}

function ReviewsTab({ nft }: { nft: Nft }) {
  const items = [
    { name: 'Marina V.', rating: 5, text: 'Acabamento impecável. As cores batem com a foto.', date: '2025-08-12' },
    { name: 'Igor T.', rating: 4, text: 'Edição rara, feliz de ter conseguido.', date: '2025-09-03' },
    { name: 'Patrícia S.', rating: 5, text: 'Coleção favorita da rede. Colecionador recomendou.', date: '2025-09-21' },
  ];
  return (
    <div className="space-y-4">
      <p>
        {nft.rating?.average.toFixed(1)} de 5 com base em {nft.rating?.count ?? 0} avaliações de colecionadores.
      </p>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="rounded-lg border border-border bg-card/40 p-4">
            <header className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">{it.name}</span>
              <span className="flex items-center gap-1 text-primary">
                {Array.from({ length: it.rating }).map((_, idx) => (
                  <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                ))}
              </span>
            </header>
            <p className="mt-2 text-sm">{it.text}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDate(it.date)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <section className="container py-12">
      <Skeleton className="mb-6 h-4 w-48" />
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </section>
  );
}

function BottomFeatureBar() {
  return (
    <section className="border-t border-border bg-card/40 py-10">
      <div className="container grid gap-6 md:grid-cols-3">
        {[
          {
            icon: <ShieldCheck className="h-5 w-5" />,
            title: 'Segurança da carteira',
            text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
          },
          {
            icon: <Star className="h-5 w-5" />,
            title: 'Criadores em destaque',
            text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
          },
          {
            icon: <Heart className="h-5 w-5" />,
            title: 'Alertas de lançamentos',
            text: 'Receba calendários de castings, novidades de listas de espera e análises do mercado.',
          },
        ].map((f) => (
          <div key={f.title} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary">
              {f.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}