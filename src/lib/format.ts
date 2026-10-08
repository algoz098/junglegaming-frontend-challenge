import Decimal from 'decimal.js';

const ETH = new Decimal(1);

export function formatEth(value: Decimal | string | number, fractionDigits = 3): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (d.isNaN()) return '—';
  return `${d.toFixed(fractionDigits, Decimal.ROUND_HALF_UP)} ETH`;
}

export function formatEthValue(value: Decimal | string | number, fractionDigits = 3): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (d.isNaN()) return '—';
  return d.toFixed(fractionDigits, Decimal.ROUND_HALF_UP);
}

export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (!address || address.length <= head + tail + 2) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatDate(iso: string, locale = 'pt-BR'): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string, locale = 'pt-BR'): string {
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const ETH_SYMBOL = ETH;