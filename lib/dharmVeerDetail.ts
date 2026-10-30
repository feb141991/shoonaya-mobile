import type { DharmVeer } from './dharm-veer';
type Fetcher = (path: string, options: { expectedUserId: string }) => Promise<Response>;

/** Fetch one story; a 404 alone permits the old roster endpoint during rollout. */
export async function fetchDharmVeerDetail(id: string, userId: string, fetcher: Fetcher): Promise<DharmVeer | null> {
  let response = await fetcher(`/api/dharm-veer/detail?id=${encodeURIComponent(id)}`, { expectedUserId: userId });
  const legacy = response.status === 404;
  if (legacy) response = await fetcher('/api/dharm-veer/roster', { expectedUserId: userId });
  if (!response.ok) throw new Error('Story unavailable');
  const payload = await response.json();
  const hero = legacy ? (Array.isArray(payload.roster) ? payload.roster.find((item: { id?: string }) => item.id === id) : null) : payload.hero;
  if (hero == null) return null;
  if (hero.id !== id || typeof hero.journey !== 'string') throw new Error('Invalid story response');
  return hero as DharmVeer;
}

/** Preserve the reader's established preference for its longer bundled cornerstone. */
export function preferExpandedDharmVeer(remote: DharmVeer | null, offline: DharmVeer | null): DharmVeer | null {
  if (offline && (!remote || offline.journey.length > (remote.journey?.length || 0))) return { ...remote, ...offline };
  return remote ?? offline;
}
