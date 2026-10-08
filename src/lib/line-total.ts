import Decimal from 'decimal.js';

export function lineTotal(amount: string | number, quantity: number, fractionDigits = 3): string {
  const total = new Decimal(amount).times(quantity);
  return total.toFixed(fractionDigits, Decimal.ROUND_HALF_UP);
}