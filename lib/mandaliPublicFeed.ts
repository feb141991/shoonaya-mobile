import { apiFetch } from '@/lib/api';
import { parsePublicFeedPage, type PublicMandaliFeedPage } from '@/lib/mandaliPublicFeedContract';
import { requestErrorFromResponse } from '@/lib/user-facing-error';

export type { PublicMandaliFeedPage, PublicMandaliPost } from '@/lib/mandaliPublicFeedContract';

/**
 * Fetches the read-only Mandali feed for a signed-out person. Founder decision 2026-11-12: a guest may read posts; reacting, commenting,
 * voting, RSVPs and posting need an account. It is not stored on the device: nothing in it belongs to a person, and a stale copy would
 * keep showing a deleted post. `expectedGuest` makes the request fail if a session appears while it is being prepared.
 */

export async function fetchPublicMandaliFeed(cursor: string | null = null, limit = 20): Promise<PublicMandaliFeedPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const response = await apiFetch(`/api/mandali/public-feed?${params.toString()}`, { expectedGuest: true });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw await requestErrorFromResponse(response, { parsedBody: payload });
  const page = parsePublicFeedPage(payload);
  if (!page) throw new Error('The Mandali response was incomplete.');
  return page;
}
