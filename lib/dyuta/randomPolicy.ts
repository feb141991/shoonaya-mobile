import type { DieValue } from './engine';

/** Rejection sampling avoids the modulo bias that `byte % 6` alone introduces. */
export function mapRandomByteToDie(byte: number): DieValue | null {
  if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
    throw new RangeError('A random byte must be an integer from 0 to 255.');
  }
  if (byte >= 252) return null;
  return ((byte % 6) + 1) as DieValue;
}
