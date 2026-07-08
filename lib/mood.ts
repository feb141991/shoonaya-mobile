import { apiFetch } from './api';

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
    console.error('Failed to fetch mood status', err);
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
  try {
    const res = await apiFetch('/api/mood/checkin', {
      method: 'POST',
      body: JSON.stringify({
        before_mood: mood,
        context_time: time,
        context_need: need,
        context_type: type,
        dismissed,
        source_surface: 'native-app',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.checkin_id;
  } catch (err) {
    console.error('Failed to start mood checkin', err);
    return null;
  }
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
    console.error('Failed to fetch recommendations', err);
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
    console.error('Failed to track discover action', err);
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
    console.error('Failed to complete mood session', err);
    return false;
  }
}
