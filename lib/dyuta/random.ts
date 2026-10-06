import * as Crypto from 'expo-crypto';

import type { DicePair, DieValue } from './engine';
import { mapRandomByteToDie } from './randomPolicy';

export async function rollDie(): Promise<DieValue> {
  for (;;) {
    const bytes = await Crypto.getRandomBytesAsync(8);
    for (const byte of bytes) {
      const value = mapRandomByteToDie(byte);
      if (value !== null) return value;
    }
  }
}

export async function rollDicePair(): Promise<DicePair> {
  const first = await rollDie();
  const second = await rollDie();
  return [first, second];
}
