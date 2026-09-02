import * as Crypto from 'expo-crypto';
import { apiFetch, isFetchCancelled } from './api';
import { attemptMoodCheckinWithRetry } from './moodCheckinRetry';
import { recordMutationRetryOutcome } from './telemetry';

export interface MoodStatus {
  hasCompletedToday: boolean;
  hasDismissedToday: boolean;
  openSession: {
    id: string;
    before_mood: string | null;
    clicked_action: string | null;
    created_at: string;
  } | null;
  lastCompletedMood: string | null;
  hasLoggedMoodToday: boolean;
  lastMood: string | null;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  href: string;
  type: string;
  duration?: string;
  tag?: string;
  imageUrl?: string;
}

type RecommendationsResponse =
  | Recommendation[]
  | {
      recommendations?: Recommendation[];
    };

export async function fetchMoodStatus(): Promise<MoodStatus | null> {
  try {
    const res = await apiFetch('/api/mood/checkin');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (!isFetchCancelled(err)) console.error('Failed to fetch mood status', err);
    return null;
  }
}

// Not a persisted/durable outbox: unlike Settings and Notifications,
// mood check-in has two genuinely different call shapes at its two call
// sites -- app/mood.tsx's wizard needs the checkin_id back synchronously
// to advance its own step (the user is actively waiting), while
// MoodPulseSheet.tsx already discards the return value entirely (fire-
// and-forget). A queue-and-resume-later outbox fits neither well: the
// first needs a real answer now, and the second has no UI left to surface
// a later "it finally synced" state to once the sheet is closed. What
// both benefit from equally is a bounded, safe retry (lib/moodCheckinRetry.ts)
// -- safe now that the backend accepts a client_operation_id and dedupes
// on it (see the migration adding that column), so retrying with the same
// id can never create a duplicate check-in row the way retrying blindly
// used to risk.
async function getTelemetryUserId(): Promise<string | null> {
  try {
    const { supabase } = await import('./supabase');
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function startMoodCheckin(
  mood: string,
  time?: string,
  need?: string,
  type?: string,
  dismissed?: boolean
): Promise<string | null> {
  const clientOperationId = Crypto.randomUUID();
  const body = JSON.stringify({
    before_mood: mood,
    context_time: time,
    context_need: need,
    context_type: type,
    dismissed,
    source_surface: 'native-app',
    client_operation_id: clientOperationId,
  });

  return attemptMoodCheckinWithRetry(apiFetch, body, (outcome, attempts) => {
    void getTelemetryUserId().then((uid) => {
      if (uid) recordMutationRetryOutcome({ kind: 'authenticated', userId: uid }, 'mood', outcome, attempts);
    });
  });
}

export async function fetchRecommendations(
  mood: string,
  time?: string,
  checkinId?: string
): Promise<Recommendation[]> {
  try {
    const params = new URLSearchParams();
    params.set('mood', mood);
    if (time) params.set('time', time);
    if (checkinId) params.set('checkin_id', checkinId);
    params.set('full', 'true');

    const res = await apiFetch(`/api/mood/recommendations?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as RecommendationsResponse;
    if (Array.isArray(data)) return data;
    return Array.isArray(data.recommendations) ? data.recommendations : [];
  } catch (err) {
    if (!isFetchCancelled(err)) console.error('Failed to fetch recommendations', err);
    return [];
  }
}

export async function trackDiscoverAction(
  checkinId: string,
  action: 'click' | 'skip',
  itemType: string
): Promise<boolean> {
  try {
    const res = await apiFetch('/api/mood/discover-track', {
      method: 'POST',
      body: JSON.stringify({ checkinId, action, itemType }),
    });
    return res.ok;
  } catch (err) {
    if (!isFetchCancelled(err)) console.error('Failed to track discover action', err);
    return false;
  }
}

export async function completeMoodSession(
  checkinId: string,
  completedAction?: string,
  afterMood?: string,
  reflectionNote?: string
): Promise<boolean> {
  try {
    const res = await apiFetch('/api/mood/complete', {
      method: 'POST',
      body: JSON.stringify({
        checkin_id: checkinId,
        completed_action: completedAction ?? 'mood_checkin',
        after_mood: afterMood,
        reflection_note: reflectionNote,
      }),
    });
    return res.ok;
  } catch (err) {
    if (!isFetchCancelled(err)) console.error('Failed to complete mood session', err);
    return false;
  }
}
