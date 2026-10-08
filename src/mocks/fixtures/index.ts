import { faker } from '@faker-js/faker';
import Decimal from 'decimal.js';
import type {
  CouponResult,
  Nft,
  NftAttribute,
  NftCollection,
  NftEdition,
  NftRarity,
  PriceSnapshot,
  User,
  Wallet,
  WalletNetwork,
  WalletOption,
  WalletProvider,
} from '@/types';

faker.seed(44);

const NFT_NAMES = [
  'Emerald Ape',
  'Sage Nomad',
  'Neon Vessel',
  'Ivory Baron',
  'Golden Beat',
  'Cosmic Bison',
  'Violet Nomad',
  'Golden Signal',
  'Crimson Drift',
  'Amber Wave',
  'Steel Mantis',
  'Lunar Pulse',
  'Prism Crow',
  'Velvet Fox',
  'Iron Lark',
  'Static Tide',
  'Polar Cub',
  'Neon Rook',
  'Citrus Lynx',
  'Cobalt Yeti',
  'Solar Glitch',
  'Forest Otter',
  'Velour Wraith',
  'Brass Mantis',
  'Polar Sphinx',
  'Quartz Hawk',
  'Indigo Panthere',
  'Smoke Otter',
  'Coral Lynx',
  'Titan Crow',
];

const COLLECTIONS = [
  { id: 'col-kurio-apes', slug: 'kurio-apes', name: 'Kurio Apes', category: 'Arte digital', count: 33 },
  { id: 'col-pixel-punks', slug: 'pixel-punks', name: 'Pixel Punks', category: 'Arte digital', count: 12 },
  { id: 'col-mystic-loops', slug: 'mystic-loops', name: 'Mystic Loops', category: 'Música', count: 65 },
  { id: 'col-art3d', slug: 'art-3d', name: 'Arte 3D', category: 'Arte 3D', count: 39 },
  { id: 'col-collectors', slug: 'collectors', name: 'Collectors Edition', category: 'Colecionáveis', count: 23 },
  { id: 'col-generative', slug: 'generative', name: 'Generative', category: 'Generativa', count: 17 },
  { id: 'col-joga', slug: 'joga', name: 'Joga Bonito', category: 'Jogos', count: 19 },
  { id: 'col-assinaturas', slug: 'assinaturas', name: 'Assinaturas', category: 'Assinaturas', count: 13 },
  { id: 'col-utilidade', slug: 'utilidade', name: 'Utilidade', category: 'Utilidade', count: 18 },
] as const satisfies readonly NftCollection[];

const RARITY_BY_TIER: Record<number, NftRarity> = {
  1: 'lendario',
  2: 'epico',
  3: 'raro',
  4: 'comum',
};

const TRAIT_POOL = [
  'Óculos',
  'Esmeralda',
  'Raro',
  'Chapéu',
  'Hoodie',
  'Headphone',
  'Terno',
  'Gema',
  'Capa',
  'Antena',
  'Cicatriz',
  'Dourado',
  'Bronze',
  'Safira',
  'Rubi',
];

function pickRarity(tier: number): NftRarity {
  if (tier <= 0) return RARITY_BY_TIER[1];
  return RARITY_BY_TIER[tier % 4 + 1];
}

function makeAttributes(): NftAttribute[] {
  const count = faker.number.int({ min: 2, max: 4 });
  const shuffled = faker.helpers.shuffle([...TRAIT_POOL]);
  return shuffled.slice(0, count).map((trait) => ({
    trait,
    value: faker.helpers.arrayElement(['Sim', trait, faker.color.human(), 'Raro', 'Padrão']),
    rarity: faker.number.float({ min: 0.02, max: 0.4, fractionDigits: 2 }),
  }));
}

function makeEdition(_index: number, rarity: NftRarity): NftEdition {
  const total = rarity === 'lendario' ? 10 : rarity === 'epico' ? 50 : 100;
  const remaining = faker.number.int({ min: 0, max: Math.floor(total * 0.6) });
  const number = faker.number.int({ min: 1, max: remaining || 1 });
  const status = remaining === 0 ? 'esgotada' : faker.helpers.arrayElement<NftEdition['status']>(['aberta', 'aberta', 'aberta', 'fechada']);
  return { number, total, status };
}

function makeImage(seed: string): string {
  const palette = ['7c5c3a', 'a07750', 'd49a6a', 'c97b3f', '8a5a2b'];
  const base = palette[seed.charCodeAt(0) % palette.length];
  const accent = palette[(seed.charCodeAt(1) || 65) % palette.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>
    <defs>
      <radialGradient id='g' cx='50%' cy='40%' r='60%'>
        <stop offset='0%' stop-color='#${accent}'/>
        <stop offset='100%' stop-color='#${base}'/>
      </radialGradient>
    </defs>
    <rect width='400' height='400' fill='#1a1008'/>
    <circle cx='200' cy='180' r='110' fill='url(#g)'/>
    <circle cx='200' cy='180' r='70' fill='#0e0905' opacity='0.7'/>
    <circle cx='178' cy='170' r='8' fill='#fff'/>
    <circle cx='222' cy='170' r='8' fill='#fff'/>
    <path d='M170 220 Q200 245 230 220' stroke='#0e0905' stroke-width='4' fill='none'/>
    <text x='200' y='370' text-anchor='middle' font-family='monospace' font-size='14' fill='#${accent}'>#${seed}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makePrice(min: number, max: number): PriceSnapshot {
  const amount = new Decimal(faker.number.float({ min, max, fractionDigits: 3 })).toFixed(3);
  return {
    amount,
    currency: 'ETH',
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

function pickNetwork(): WalletNetwork {
  return faker.helpers.arrayElement<WalletNetwork>(['ethereum', 'polygon', 'solana']);
}

export function generateNfts(count = 32): Nft[] {
  return Array.from({ length: count }, (_, i) => {
    const name = NFT_NAMES[i % NFT_NAMES.length];
    const tokenId = String(42 + i).padStart(3, '0');
    const collection = COLLECTIONS[i % COLLECTIONS.length];
    const rarity = pickRarity(i);
    const edition = makeEdition(i, rarity);
    const network = pickNetwork();
    const seed = `${name}${tokenId}`;
    return {
      id: `nft-${tokenId}-${i}`,
      tokenId,
      name: `${name} #${tokenId}`,
      description: `Um colecionável digital 1/${edition.total} finalizado à mão da coleção ${collection.name}, verificado na Ethereum.`,
      imageUrl: makeImage(seed),
      collectionId: collection.id,
      collectionName: collection.name,
      creator: {
        id: `creator-${(i % 6) + 1}`,
        displayName: faker.person.fullName(),
        avatarUrl: makeImage(`avatar${(i % 6) + 1}`),
      },
      edition,
      attributes: makeAttributes(),
      rarity,
      rating: { average: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }), count: faker.number.int({ min: 1, max: 240 }) },
      price: makePrice(0.05, 5),
      network,
    };
  });
}

export const nftFixtures = generateNfts(48);

export const nftCollectionFixtures = [...COLLECTIONS];

export const nftCategoryFixtures = Array.from(
  new Set(nftCollectionFixtures.map((c) => c.category)),
);

export const couponFixtures: Record<string, CouponResult> = {
  KURIO10: { code: 'KURIO10', discountType: 'percentage', discountValue: '0.10', description: '10% off na estreia' },
  LAUNCH20: { code: 'LAUNCH20', discountType: 'percentage', discountValue: '0.20', description: '20% off lançamento' },
  VIP5: { code: 'VIP5', discountType: 'fixed', discountValue: '0.05', description: '0.05 ETH off' },
};

export const expiredCouponFixtures: string[] = ['EXPIRED1', 'OLDCODE'];

export const userFixtures: User[] = [
  {
    id: 'user-1',
    displayName: 'Sabrina Novaes',
    username: 'sabrina',
    email: 'contato@mail.com',
    ensName: 'nova.kurio.eth',
    createdAt: '2025-01-12T10:00:00.000Z',
    walletId: 'wallet-1',
  },
  {
    id: 'user-2',
    displayName: 'João Varella',
    username: 'joao',
    email: 'joao@mail.com',
    ensName: 'joao.kurio.eth',
    createdAt: '2025-02-04T08:30:00.000Z',
    walletId: 'wallet-3',
  },
];

export const walletFixtures: Record<string, Wallet[]> = {
  'user-1': [
    {
      id: 'wallet-1',
      label: 'Reserva',
      address: '0xA91F...E82C',
      ens: 'nova.kurio.eth',
      network: 'polygon',
      type: 'nova',
      isPrimary: true,
    },
    {
      id: 'wallet-2',
      label: 'Principal',
      address: '0xB742...11A0',
      network: 'ethereum',
      type: 'metamask',
      isPrimary: false,
    },
  ],
  'user-2': [
    {
      id: 'wallet-3',
      label: 'Principal',
      address: '0xC112...9F4D',
      network: 'ethereum',
      type: 'metamask',
      isPrimary: true,
    },
  ],
};

export const walletProviderFixtures: WalletOption[] = [
  { id: 'walletconnect', provider: 'walletconnect', displayName: 'WalletConnect', network: 'multi' },
  { id: 'multichain', provider: 'multichain', displayName: 'Multichain', network: 'multi' },
  { id: 'metamask', provider: 'metamask', displayName: 'MetaMask', network: 'ethereum' },
  { id: 'coinbase', provider: 'coinbase', displayName: 'Coinbase Wallet', network: 'ethereum' },
];

export const credentialsFixtures = {
  'contato@mail.com': { password: '123456', userId: 'user-1' },
  'joao@mail.com': { password: '123456', userId: 'user-2' },
} as const;

export type Provider = WalletProvider;