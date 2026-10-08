import Decimal from 'decimal.js';

Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_UP });

export type DecimalLike = Decimal | string | number;

export function D(value: DecimalLike): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export const ZERO = new Decimal(0);

export function toDecimal(value: DecimalLike): Decimal {
  return D(value);
}

export function add(...values: DecimalLike[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(D(v)), ZERO);
}

export function subtract(a: DecimalLike, b: DecimalLike): Decimal {
  return D(a).minus(D(b));
}

export function multiply(a: DecimalLike, b: DecimalLike): Decimal {
  return D(a).times(D(b));
}

export function divide(a: DecimalLike, b: DecimalLike): Decimal {
  if (D(b).isZero()) {
    return ZERO;
  }
  return D(a).div(D(b));
}

export function isPositive(value: DecimalLike): boolean {
  return D(value).gt(0);
}

export function eq(a: DecimalLike, b: DecimalLike): boolean {
  return D(a).eq(D(b));
}

export function lt(a: DecimalLike, b: DecimalLike): boolean {
  return D(a).lt(D(b));
}

export function gt(a: DecimalLike, b: DecimalLike): boolean {
  return D(a).gt(D(b));
}