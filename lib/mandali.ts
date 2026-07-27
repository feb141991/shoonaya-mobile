/**
 * Shoonaya — Mandali data layer
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Direct-Supabase data functions for the Mandali (local sacred circle)
 * feature, ported to match PWA's real implementation byte-for-byte in
 * behavior (src/lib/api/mandali.ts, src/app/(main)/mandali/MandaliClient.tsx
 * NoMandaliPrompt, src/app/(main)/mandali/SeekersNearYou.tsx). PWA calls
 * Supabase directly from the client for every one of these operations (no
 * REST route exists for most of them) — this file mirrors that exactly,
 * same precedent as notifications/dharm-veer/shloka this session. The one
 * exception is `joinExistingMandali`, which PWA itself routes through
 * `POST /api/mandali/join` (it runs a server-side ban check via an admin
 * client before writing) — native calls that same route rather than
 * reinventing the ban check client-side.
 *
 * Safety (block/report) is backed by real tables — user_blocked_profiles,
 * user_muted_profiles, content_reports — matching PWA's src/lib/user-safety.ts,
 * not device-local storage. Blocks and reports made on one device are
 * therefore visible on another, same as web.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

// Fires-and-forgets a request to the PWA's push bridge
// (POST /api/native/mandali/notify-push) for a notification_key one of the
// DB triggers below may have just written into public.notifications. The
// bridge itself decides whether anything actually gets pushed (the row
// only exists if the trigger's own gating -- preference, block-state,
// self-action -- passed), so this call is safe to make unconditionally
// after every write that has a matching trigger, without duplicating any
// of that gating here. Best-effort: push is a nice-to-have on top of the
// in-app notification row that already landed, not something worth
// blocking or erroring the calling action over.
function triggerPush(notificationKey: string): void {
  void apiFetch('/api/native/mandali/notify-push', {
    method: 'POST',
    body: JSON.stringify({ notificationKey }),
  }).catch(() => {});
}

export type MandaliPostType = 'update' | 'event' | 'question' | 'announcement';
export type RsvpStatus = 'going' | 'interested' | 'not_going';

// Devotional reaction set replacing the single upvote heart — deliberately
// no negative/"dislike" option (tonally wrong for a feed people share vrat
// updates, losses, and scripture questions on).
export type ReactionType = 'pranam' | 'love' | 'insightful';

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

export type ConnectionRequestRow = {
  id: string;
  requester_id: string;
  created_at: string;
  requester: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export type PostAuthor = {
  full_name: string;
  username: string;
  avatar_url: string | null;
  sampradaya: string | null;
  spiritual_level: string | null;
};

export type PostRow = {
  id: string;
  created_at: string;
  author_id: string;
  mandali_id: string | null;
  content: string;
  type: MandaliPostType;
  upvotes: number;
  comment_count: number;
  event_date: string | null;
  event_location: string | null;
  profiles?: PostAuthor | null;
};

export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  profiles?: { full_name: string; username: string; avatar_url: string | null } | null;
};

export type RsvpRow = {
  id: string;
  post_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
};

export type MemberRow = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  sampradaya: string | null;
  ishta_devata: string | null;
  spiritual_level: string | null;
  city: string | null;
  country: string | null;
  seva_score: number;
};

export type NearbyMandali = {
  id: string;
  name: string | null;
  city: string;
  country: string;
  member_count: number;
  latitude: number | null;
  longitude: number | null;
  distanceKm?: number;
};

export type NearbySeeker = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number;
};

// Same blend threshold as PWA's mandali page.tsx / lib/api/mandali.ts —
// once a local Mandali has fewer than this many members, blend in
// Sangam-wide (any-mandali) posts so the feed doesn't feel empty.
export const BLEND_THRESHOLD = 5;
// Same radius/degree conversions PWA's SeekersNearYou.tsx and
// NoMandaliPrompt's nearby-mandalis lookup use.
const SEEKERS_RADIUS_KM = 80;
const NEARBY_MANDALI_RADIUS_KM = 120;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string } | null> {
  // Reuses web's existing proxy (server-side User-Agent + timeout,
  // required by Nominatim's usage policy) rather than calling the
  // OpenStreetMap API directly from the device.
  const res = await apiFetch(`/api/mandali/reverse-geocode?lat=${lat}&lon=${lon}`);
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.city) return null;
  return { city: json.city as string, country: (json.country as string) ?? '' };
}

// Forward geocode a free-text "city, country" query into approximate
// coordinates — reuses the existing /api/tirtha/geocode proxy (Geoapify
// primary, Nominatim fallback; same route Tirtha's temple search already
// depends on) rather than standing up a second geocoding route. Used by
// JoinMandaliPrompt's manual-city fallback so a user who types their city
// instead of using GPS still ends up with real latitude/longitude on their
// profile, instead of it staying permanently null (which previously left
// "Seekers Near You" and any other distance-based Mandali feature broken
// for anyone who ever used the manual path). Returns null on a 404 ("could
// not find that place") or network failure — callers should proceed with
// just city/country in that case, exactly as before this existed.
export async function forwardGeocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await apiFetch(`/api/tirtha/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (typeof json.lat !== 'number' || typeof json.lon !== 'number') return null;
    return { lat: json.lat, lon: json.lon };
  } catch {
    return null;
  }
}

function parseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export async function fetchNearbyMandalis(lat: number, lon: number): Promise<NearbyMandali[]> {
  const LAT_DELTA = NEARBY_MANDALI_RADIUS_KM / 111;
  const LON_DELTA = NEARBY_MANDALI_RADIUS_KM / 85;
  const { data } = await supabase
    .from('mandalis')
    .select('id, name, city, country, member_count, latitude, longitude')
    .gte('latitude', lat - LAT_DELTA)
    .lte('latitude', lat + LAT_DELTA)
    .gte('longitude', lon - LON_DELTA)
    .lte('longitude', lon + LON_DELTA)
    .limit(20);

  return ((data ?? []) as NearbyMandali[])
    .map((m) => (m.latitude != null && m.longitude != null ? { ...m, distanceKm: haversineKm(lat, lon, m.latitude, m.longitude) } : m))
    .filter((m) => (m.distanceKm ?? 0) <= NEARBY_MANDALI_RADIUS_KM)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

export async function fetchNearbySeekers(userId: string, city: string | null, lat: number | null, lon: number | null): Promise<NearbySeeker[]> {
  if (lat != null && lon != null) {
    const LAT_DELTA = SEEKERS_RADIUS_KM / 111;
    const LON_DELTA = SEEKERS_RADIUS_KM / 85;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, city, latitude, longitude')
      .gte('latitude', lat - LAT_DELTA)
      .lte('latitude', lat + LAT_DELTA)
      .gte('longitude', lon - LON_DELTA)
      .lte('longitude', lon + LON_DELTA)
      .neq('id', userId)
      .limit(40);

    if (!error && data) {
      return (data as NearbySeeker[])
        .map((p) => (p.latitude != null && p.longitude != null ? { ...p, distanceKm: haversineKm(lat, lon, p.latitude, p.longitude) } : { ...p, distanceKm: SEEKERS_RADIUS_KM }))
        .filter((p) => (p.distanceKm ?? 0) <= SEEKERS_RADIUS_KM)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
        .slice(0, 12);
    }
    return [];
  }

  if (city) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, city')
      .ilike('city', `%${city.trim()}%`)
      .neq('id', userId)
      .limit(12);
    return (data ?? []) as NearbySeeker[];
  }

  return [];
}

// Direct RPC — same call PWA's joinMandaliForLocation makes. The RPC itself
// (find_or_create_mandali) is SECURITY DEFINER but revoked from anon/public
// and granted only to authenticated (supabase/migrations/20260612000000_
// mandali_slice0b_radius_fallback.sql) — safe for a direct client call.
export async function joinMandaliForLocation(userId: string, city: string, country: string, lat?: number, lon?: number): Promise<string> {
  const { data: mandaliId, error: rpcError } = await supabase.rpc('find_or_create_mandali', {
    p_city: city.trim(),
    p_country: country.trim(),
    p_lat: lat ?? null,
    p_lon: lon ?? null,
  });
  if (rpcError) throw rpcError;

  const { error } = await supabase
    .from('profiles')
    .update({ city: city.trim(), country: country.trim(), mandali_id: mandaliId })
    .eq('id', userId);
  if (error) throw error;

  return mandaliId as string;
}

// PWA routes join-by-id through its own API route because that route runs
// a server-side ban check (assertNotBanned via an admin client) before the
// write — native reuses the same route rather than duplicating that check
// client-side without admin access.
export async function joinExistingMandali(
  mandaliId: string,
  location?: { city?: string; country?: string; lat?: number; lon?: number } | null
): Promise<void> {
  const res = await apiFetch('/api/mandali/join', {
    method: 'POST',
    body: JSON.stringify({
      mandali_id: mandaliId,
      city: location?.city,
      country: location?.country,
      latitude: location?.lat,
      longitude: location?.lon,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(parseErrorMessage(json.error, 'Join failed'));
  }
}

export async function leaveMandali(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ mandali_id: null }).eq('id', userId);
  if (error) throw error;
}

// Returns the new row's id so the caller can patch it into local state
// directly (a single targeted re-fetch with the profile join) instead of
// reloading the entire screen for one new comment.
export async function createMandaliComment(payload: { postId: string; userId: string; body: string; parentId?: string | null }): Promise<string> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: payload.postId,
      author_id: payload.userId,
      body: payload.body.trim(),
      parent_id: payload.parentId ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateMandaliRsvp(payload: { postId: string; userId: string; status: RsvpStatus }): Promise<void> {
  const { error } = await supabase
    .from('event_rsvps')
    .upsert({ post_id: payload.postId, user_id: payload.userId, status: payload.status }, { onConflict: 'post_id,user_id' });
  if (error) throw error;
}

// Note: none of these three throw on failure previously — the caller's
// `.then(() => Alert.alert('Reported'/'Blocked', ...))` chains in
// app/(tabs)/mandali.tsx always fired regardless of whether the insert
// actually succeeded, so a network failure or RLS rejection silently
// showed a false "success" message. Now surfaces the real error so the
// screen can show a genuine failure alert instead.
export async function reportMandaliPost(reportedBy: string, post: PostRow, reason: string): Promise<void> {
  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reported_by: reportedBy,
      content_author_id: post.author_id,
      content_type: 'mandali_post',
      content_id: post.id,
      reason,
      metadata: { source: 'native_mandali' },
    })
    .select('id')
    .single();
  if (error) throw error;
  triggerPush(`content_reported:${data.id}`);
}

export async function reportMandaliMember(reportedBy: string, memberId: string): Promise<void> {
  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reported_by: reportedBy,
      content_type: 'user_profile',
      content_id: memberId,
      reason: 'inappropriate_behaviour',
    })
    .select('id')
    .single();
  if (error) throw error;
  triggerPush(`content_reported:${data.id}`);
}

// Matches PWA's ContentSafetyMenu.tsx exactly: upsert with
// ignoreDuplicates rather than a plain insert, since
// user_blocked_profiles has a UNIQUE(blocker_id, blocked_user_id)
// constraint — re-blocking (double-tap, or blocking the same author from
// two different posts) previously threw an uncaught unique-violation that
// this function silently swallowed (no error check), which also fed into
// the false-success-alert bug above.
export async function blockUser(blockerId: string, blockedUserId: string): Promise<void> {
  const { data, error } = await supabase
    .from('user_blocked_profiles')
    .upsert({ blocker_id: blockerId, blocked_user_id: blockedUserId }, { onConflict: 'blocker_id,blocked_user_id', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();
  if (error) throw error;
  // ignoreDuplicates means an already-existing block returns no row here --
  // nothing new happened, so no fresh notification/push to trigger.
  if (data) triggerPush(`user_blocked:${data.id}`);
}

// ── Safety state (matches PWA's src/lib/user-safety.ts getUserSafetyState) ──
// Native previously tracked blocks/reports in AsyncStorage only (device-
// local). This reads the same real tables PWA reads, so a block made on
// web is respected on native and vice versa. AsyncStorage is kept as a
// fast local cache layered on top, not the source of truth.
export type SafetyState = {
  excludedAuthorIds: Set<string>;
  hiddenContentKeys: Set<string>;
};

export function getHiddenContentKey(contentType: 'mandali_post', contentId: string): string {
  return `${contentType}:${contentId}`;
}

export async function fetchSafetyState(userId: string): Promise<SafetyState> {
  const [{ data: blockRows }, { data: muteRows }, { data: hiddenRows }] = await Promise.all([
    supabase.from('user_blocked_profiles').select('blocker_id, blocked_user_id'),
    supabase.from('user_muted_profiles').select('muter_id, muted_user_id').eq('muter_id', userId),
    supabase.from('user_hidden_content').select('content_type, content_id').eq('user_id', userId),
  ]);

  const excludedAuthorIds = new Set<string>();
  (blockRows ?? []).forEach((row: { blocker_id: string; blocked_user_id: string }) => {
    if (row.blocker_id === userId) excludedAuthorIds.add(row.blocked_user_id);
    if (row.blocked_user_id === userId) excludedAuthorIds.add(row.blocker_id);
  });
  (muteRows ?? []).forEach((row: { muted_user_id: string }) => excludedAuthorIds.add(row.muted_user_id));

  const hiddenContentKeys = new Set(
    (hiddenRows ?? []).map((row: { content_type: string; content_id: string }) => `${row.content_type}:${row.content_id}`)
  );

  return { excludedAuthorIds, hiddenContentKeys };
}

export function filterAuthoredPosts(posts: PostRow[], state: SafetyState): PostRow[] {
  return posts.filter((post) => !state.excludedAuthorIds.has(post.author_id) && !state.hiddenContentKeys.has(getHiddenContentKey('mandali_post', post.id)));
}

export function filterMemberRows(members: MemberRow[], state: SafetyState): MemberRow[] {
  return members.filter((member) => !state.excludedAuthorIds.has(member.id));
}

// ── Connections (request / accept / reject between two seekers) ────────────
// App-wide, not scoped to a single Mandali — Seekers Near You already
// crosses Mandali boundaries, so connections do too. Backed by
// mandali_connections; every state change is logged server-side
// (user_activity_log) and notified via DB trigger, not from here.

export async function fetchConnectionStatus(userId: string, otherId: string): Promise<ConnectionStatus> {
  const { data } = await supabase
    .from('mandali_connections')
    .select('requester_id, status')
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${userId})`)
    .maybeSingle();
  if (!data || data.status === 'rejected') return 'none';
  if (data.status === 'accepted') return 'connected';
  return data.requester_id === userId ? 'pending_sent' : 'pending_received';
}

// Plain insert, falling back to reopening an existing row (most likely a
// previously rejected request — the unique (requester_id, recipient_id)
// constraint means a fresh insert can't coexist with it) rather than
// failing outright. Note: reopening this way doesn't re-fire the "wants to
// connect" notification (the trigger only notifies on a genuinely new
// INSERT or a transition to accepted/rejected) — an accepted gap for now.
export async function sendConnectionRequest(requesterId: string, recipientId: string): Promise<void> {
  const { data, error } = await supabase
    .from('mandali_connections')
    .insert({ requester_id: requesterId, recipient_id: recipientId })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      const { error: reopenError } = await supabase
        .from('mandali_connections')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('requester_id', requesterId)
        .eq('recipient_id', recipientId);
      if (reopenError) throw reopenError;
      return;
    }
    throw error;
  }
  triggerPush(`connection_request:${data.id}`);
}

export async function cancelConnectionRequest(requesterId: string, recipientId: string): Promise<void> {
  const { data, error } = await supabase
    .from('mandali_connections')
    .delete()
    .eq('requester_id', requesterId)
    .eq('recipient_id', recipientId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (data) triggerPush(`connection_cancelled:${data.id}`);
}

export async function respondToConnectionRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<void> {
  const { error } = await supabase.from('mandali_connections').update({ status }).eq('id', requestId);
  if (error) throw error;
  triggerPush(`connection_${status}:${requestId}`);
}

export async function fetchPendingConnectionRequests(userId: string): Promise<ConnectionRequestRow[]> {
  const { data } = await supabase
    .from('mandali_connections')
    .select('id, requester_id, created_at, requester:profiles!mandali_connections_requester_id_fkey(full_name, username, avatar_url)')
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    requester: Array.isArray(row.requester) ? row.requester[0] ?? null : row.requester ?? null,
  })) as ConnectionRequestRow[];
}

// ── Reactions (devotional set replacing the single upvote heart) ───────────
// post_upvotes has PRIMARY KEY (post_id, user_id) — one row per user per
// post, so switching reactions updates the existing row's reaction_type
// rather than inserting a second one.

export async function setPostReaction(postId: string, userId: string, reaction: ReactionType): Promise<void> {
  const { error } = await supabase
    .from('post_upvotes')
    .upsert({ post_id: postId, user_id: userId, reaction_type: reaction }, { onConflict: 'post_id,user_id' });
  if (error) throw error;
  // Deterministic key, no row id needed. Only resolves to an actual push
  // if this was a genuinely new reaction (see log_post_reaction()'s trigger
  // registration -- AFTER INSERT OR DELETE only, not UPDATE -- so switching
  // an existing reaction never creates a second notifications row here;
  // the bridge finds nothing to claim and no-ops).
  triggerPush(`post_reaction:${postId}:${userId}`);
}

export async function removePostReaction(postId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('post_upvotes').delete().match({ post_id: postId, user_id: userId });
  if (error) throw error;
}
