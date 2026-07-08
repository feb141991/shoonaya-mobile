import { apiFetch } from '@/lib/api';

// Data layer for the native Live Darshan screen (app/live-darshan.tsx).
//
// This intentionally does NOT duplicate the web repo's ~150-entry static
// stream catalog (src/lib/live-streams.ts) or its DB-merge/health-check
// logic (resolveActiveLiveStreams). Instead it calls the new
// GET /api/native/live-darshan route, which returns that same function's
// output directly — so native always shows exactly the same
// stability-filtered set web does, with a single source of truth server
// side. See that route's own header comment for the full rationale.

export type LiveStreamCategory = 'mandir' | 'katha' | 'satsang';

export type AartiSchedule = {
  morning?: string;
  evening?: string;
};

export type LiveStream = {
  id: string;
  title: string;
  location: string;
  schedule: string;
  category: LiveStreamCategory;
  tradition: string;
  youtubeVideoId: string;
  ishtaDevata?: string;
  state?: string;
  collections?: string[];
  thumbnailUrl?: string;
  aartis?: AartiSchedule;
  /**
   * true/undefined — treated as healthy, "Live" badge shown.
   * false — suspect/degraded; still shown (server already excludes
   * offline streams entirely) but without the Live badge.
   */
  isHealthy?: boolean;
};

export function youtubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export async function fetchLiveDarshanStreams(): Promise<LiveStream[]> {
  const response = await apiFetch('/api/native/live-darshan');
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  const payload = (await response.json()) as { streams?: LiveStream[] };
  return payload.streams ?? [];
}
