import { createCacheStorageBarrier } from './cacheStorageBarrier';

import { spiritualDate } from '@/lib/spiritualDate';

const JAPA_CONTEXT_CACHE_KEY = 'shoonaya.japa.context.v1';

export type JapaContext = {
  tradition: string;
  timezone: string;
  activeSymbolId: string | null;
  spiritualDate: string;
  japaDone: boolean;
  streak: number;
  lifetime: {
    totalBeads: number;
    totalRounds: number;
    lastPracticed: string | null;
  };
};

type CachedJapaContext = {
  schemaVersion: 1;
  userId: string;
  cachedAt: string;
  context: JapaContext;
};

const cacheStorage = createCacheStorageBarrier((key) => key === JAPA_CONTEXT_CACHE_KEY);

export function normalizeJapaContext(value: unknown): JapaContext | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const lifetime = row.lifetime as Record<string, unknown> | null;
  if (
    typeof row.tradition !== 'string' ||
    typeof row.timezone !== 'string' ||
    typeof row.spiritualDate !== 'string' ||
    typeof row.japaDone !== 'boolean' ||
    typeof row.streak !== 'number' ||
    !lifetime ||
    typeof lifetime.totalBeads !== 'number' ||
    typeof lifetime.totalRounds !== 'number'
  ) return null;

  return {
    tradition: row.tradition,
    timezone: row.timezone,
    activeSymbolId: typeof row.activeSymbolId === 'string' ? row.activeSymbolId : null,
    spiritualDate: row.spiritualDate,
    japaDone: row.japaDone,
    streak: row.streak,
    lifetime: {
      totalBeads: lifetime.totalBeads,
      totalRounds: lifetime.totalRounds,
      lastPracticed: typeof lifetime.lastPracticed === 'string' ? lifetime.lastPracticed : null,
    },
  };
}

export async function readJapaContextCache(userId: string): Promise<JapaContext | null> {
  try {
    const stored = await cacheStorage.read(JAPA_CONTEXT_CACHE_KEY);
    if (!stored) return null;
    const raw = stored.value;
    const cached = JSON.parse(raw) as CachedJapaContext;
    if (cached.schemaVersion !== 1 || cached.userId !== userId) return null;
    const context = normalizeJapaContext(cached.context);
    if (!context || context.spiritualDate !== spiritualDate(context.timezone)) return null;
    return context;
  } catch {
    return null;
  }
}

export async function writeJapaContextCache(userId: string, context: JapaContext): Promise<void> {
  const payload: CachedJapaContext = {
    schemaVersion: 1,
    userId,
    cachedAt: new Date().toISOString(),
    context,
  };
  await cacheStorage.setItem(JAPA_CONTEXT_CACHE_KEY, JSON.stringify(payload));
}

export async function clearJapaContextCache(): Promise<void> {
  await cacheStorage.removeItem(JAPA_CONTEXT_CACHE_KEY);
}
