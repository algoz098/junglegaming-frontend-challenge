import { Badge } from '@/components/ui/badge';
import type { Nft, NftRarity, WalletNetwork } from '@/types';

const RARITY_LABEL: Record<NftRarity, string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};

const RARITY_BADGE: Record<NftRarity, 'default' | 'rarity'> = {
  comum: 'default',
  raro: 'rarity',
  epico: 'rarity',
  lendario: 'rarity',
};

const NETWORK_LABEL: Record<WalletNetwork, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
};

export function RarityBadge({ rarity }: { rarity: NftRarity }) {
  return <Badge variant={RARITY_BADGE[rarity]}>{RARITY_LABEL[rarity]}</Badge>;
}

export function NetworkBadge({ network }: { network: WalletNetwork }) {
  return <Badge variant="network">{NETWORK_LABEL[network]}</Badge>;
}

export function RarityOrFeaturedBadge({ nft }: { nft: Nft }) {
  if (nft.rarity !== 'comum') return <RarityBadge rarity={nft.rarity} />;
  if (nft.rating && nft.rating.count > 50) return <Badge variant="rarity">Em alta</Badge>;
  return null;
}