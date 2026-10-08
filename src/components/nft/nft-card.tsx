import { Link } from '@tanstack/react-router';
import { Heart, Star } from 'lucide-react';
import { useToggleFavorite, useFavorites } from '@/hooks/use-favorites';
import { NftArt } from '@/components/nft/nft-art';
import { RarityOrFeaturedBadge, NetworkBadge } from '@/components/nft/badges';
import { formatEthValue } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Nft } from '@/types';

interface NftCardProps {
  nft: Nft;
  compact?: boolean;
  className?: string;
}

export function NftCard({ nft, compact, className }: NftCardProps) {
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const isFav = favorites.data?.some((f) => f.nftId === nft.id) ?? false;

  const onFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle.mutate({ nftId: nft.id, action: isFav ? 'remove' : 'add' });
  };

  return (
    <Link
      to="/nft/$id"
      params={{ id: nft.id }}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border border-border bg-card/80 transition-colors hover:border-primary/60',
        className,
      )}
      aria-label={`${nft.name}, ${formatEthValue(nft.price.amount)} ETH`}
    >
      <div className={cn('relative overflow-hidden', compact ? 'aspect-[5/6]' : 'aspect-square')}>
        <NftArt seed={nft.name} className="absolute inset-0 h-full w-full" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <RarityOrFeaturedBadge nft={nft} />
          <NetworkBadge network={nft.network} />
        </div>
        <button
          type="button"
          aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={isFav}
          onClick={onFav}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/80 text-foreground/80 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Heart className={cn('h-4 w-4', isFav && 'fill-primary text-primary')} />
        </button>
        {nft.rating && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-card/80 px-2 py-1 text-[11px] font-semibold text-foreground">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {nft.rating.average.toFixed(1)}
            <span className="text-muted-foreground">({nft.rating.count})</span>
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="truncate text-sm font-semibold text-foreground">{nft.name}</p>
        <p className="font-mono text-sm font-bold text-primary">{formatEthValue(nft.price.amount)} ETH</p>
      </div>
    </Link>
  );
}