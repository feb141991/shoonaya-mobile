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
import { dedupeNearbyMandalis } from '@/lib/mandaliLocation';

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

export const REACTION_META: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  pranam: { emoji: "🙏", label: "Pranam", color: "#C5A059" },
  love: { emoji: "❤️", label: "Love", color: "#E0684C" },
  insightful: { emoji: "💡", label: "Insightful", color: "#4C8BF5" },
};

export const REACTION_ORDER: ReactionType[] = ["pranam", "love", "insightful"];

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
  // Present only from the paginated /api/mandali/feed?cursor/limit path --
  // undefined on the legacy full-fidelity response.
  viewerReaction?: ReactionType | null;
  commentPreview?: CommentRow[];
};

export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  upvotes: number;
  myReaction?: ReactionType | null;
  profiles?: { full_name: string; username: string; avatar_url: string | null } | null;
};

export type CommentReactor = {
  userId: string;
  reactionType: ReactionType;
  createdAt: string;
  profile: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
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
  distanceLabel?: string;
};

// Same blend threshold as PWA's mandali page.tsx / lib/api/mandali.ts —
// once a local Mandali has fewer than this many members, blend in
// Sangam-wide (any-mandali) posts so the feed doesn't feel empty.
export const BLEND_THRESHOLD = 5;
// Same radius/degree conversions PWA's SeekersNearYou.tsx and
// NoMandaliPrompt's nearby-mandalis lookup use.
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

  const nearby = ((data ?? []) as NearbyMandali[])
    .map((m) => (m.latitude != null && m.longitude != null ? { ...m, distanceKm: haversineKm(lat, lon, m.latitude, m.longitude) } : m))
    .filter((m) => (m.distanceKm ?? 0) <= NEARBY_MANDALI_RADIUS_KM)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || b.member_count - a.member_count);

  // Historical rows can predate the Mandali canonicalization work. The app
  // must never present those as separate communities while the server-side
  // merge is being reviewed. Keep the nearest, most populated row per city.
  return dedupeNearbyMandalis(nearby);
}

export async function fetchNearbySeekers(userId: string, city: string | null, lat: number | null, lon: number | null): Promise<NearbySeeker[]> {
  if (!userId || (lat == null && !city)) return [];
  const response = await apiFetch('/api/mandali/nearby');
  if (!response.ok) return [];
  const payload = await response.json() as { seekers: Array<{ id: string; username: string; avatar_url: string | null; distanceLabel: string }> };
  return payload.seekers.map((seeker) => ({
    ...seeker,
    full_name: seeker.username,
    city: null,
  }));
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

export async function createMandaliPost(payload: {
  content: string;
  postType: 'update' | 'event' | 'question' | 'announcement';
  eventDate?: string | null;
  eventLocation?: string | null;
}): Promise<void> {
  const response = await apiFetch('/api/mandali/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Could not create post');
}

export async function updateMandaliPost(payload: {
  postId: string;
  content: string;
  postType: 'update' | 'event' | 'question' | 'announcement';
  eventDate?: string | null;
  eventLocation?: string | null;
}): Promise<void> {
  const response = await apiFetch('/api/mandali/posts', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Could not update post');
}

// Returns the new row's id so the caller can patch it into local state
// directly (a single targeted re-fetch with the profile join) instead of
// reloading the entire screen for one new comment.
export async function createMandaliComment(payload: { postId: string; userId: string; body: string; parentId?: string | null }): Promise<string> {
  void payload.userId;
  const response = await apiFetch('/api/mandali/comments', {
    method: 'POST',
    body: JSON.stringify({ postId: payload.postId, body: payload.body, parentId: payload.parentId }),
  });
  if (!response.ok) throw new Error('Could not create comment');
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error('Comment response was incomplete');
  // notify_mandali_comment() writes the notifications row (recipient is the
  // parent comment's author for a reply, otherwise the post's author) keyed
  // deterministically off the new comment's own id -- matches every other
  // triggerPush call in this file, claiming that row for an actual push.
  triggerPush(`mandali_comment:${result.id}`);
  return result.id;
}

// Full comment thread (root + replies) for one post -- fetched lazily when
// a post's comment section is expanded, rather than upfront for every post
// in the feed. The feed response itself only carries a 2-comment preview
// per post (see MandaliFeedPost.commentPreview).
export async function fetchPostComments(postId: string): Promise<CommentRow[]> {
  const response = await apiFetch(`/api/mandali/comments?postId=${encodeURIComponent(postId)}`);
  if (!response.ok) throw new Error('Could not load comments');
  const result = await response.json() as { comments: CommentRow[] };
  return result.comments ?? [];
}

export async function updateMandaliComment(payload: { commentId: string; body: string }): Promise<void> {
  const response = await apiFetch('/api/mandali/comments', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Could not update comment');
}

export async function deleteMandaliComment(commentId: string): Promise<void> {
  const response = await apiFetch('/api/mandali/comments', {
    method: 'DELETE',
    body: JSON.stringify({ commentId }),
  });
  if (!response.ok) throw new Error('Could not delete comment');
}

// ── Comment reactions (3 devotional types: pranam, love, insightful) ──────
// comment_upvotes has PRIMARY KEY (comment_id, user_id), matching
// post_upvotes' one-row-per-user shape. Switching reaction types updates
// the existing row (upsert) rather than inserting a duplicate row.

export async function setCommentReaction(commentId: string, userId: string, reaction: ReactionType): Promise<void> {
  const { error } = await supabase
    .from('comment_upvotes')
    .upsert({ comment_id: commentId, user_id: userId, reaction_type: reaction }, { onConflict: 'comment_id,user_id' });
  if (error) throw error;
  triggerPush(`comment_reaction:${commentId}:${userId}`);
}

export async function removeCommentReaction(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('comment_upvotes').delete().match({ comment_id: commentId, user_id: userId });
  if (error) throw error;
}

export async function fetchCommentReactors(commentId: string, currentUserId?: string): Promise<CommentReactor[]> {
  const { data, error } = await supabase
    .from('comment_upvotes')
    .select('user_id, reaction_type, created_at')
    .eq('comment_id', commentId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rawRows = (data ?? []) as Array<{ user_id: string; reaction_type?: string; created_at: string }>;
  if (rawRows.length === 0) return [];

  const userIds = Array.from(new Set(rawRows.map((r) => r.user_id)));

  // Query public_profiles (client-readable under RLS, exposing id, username, avatar_url)
  const [{ data: profileRows }, safetyState] = await Promise.all([
    supabase.from('public_profiles').select('id, username, avatar_url').in('id', userIds),
    currentUserId ? fetchSafetyState(currentUserId).catch(() => null) : Promise.resolve(null),
  ]);

  const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

  const rows: CommentReactor[] = rawRows.map((row) => {
    const p = profileMap.get(row.user_id);
    return {
      userId: row.user_id,
      reactionType: (row.reaction_type ?? 'love') as ReactionType,
      createdAt: row.created_at,
      profile: p
        ? {
            id: p.id,
            fullName: p.username ?? 'A fellow seeker',
            username: p.username ?? null,
            avatarUrl: p.avatar_url ?? null,
          }
        : null,
    };
  });

  if (safetyState) {
    return rows.filter((r) => !safetyState.excludedAuthorIds.has(r.userId));
  }
  return rows;
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
  void reportedBy;
  const normalizedReason = reason.toLowerCase().includes('spam')
    ? 'spam'
    : reason.toLowerCase().includes('harassment')
      ? 'harassment'
      : 'other';
  const response = await apiFetch('/api/mandali/report', {
    method: 'POST',
    body: JSON.stringify({ targetType: 'post', targetId: post.id, reason: normalizedReason }),
  });
  if (!response.ok) throw new Error('Could not submit report');
  const result = await response.json() as { reportId?: string | null };
  if (result.reportId) triggerPush(`content_reported:${result.reportId}`);
}

export async function reportMandaliMember(reportedBy: string, memberId: string): Promise<void> {
  void reportedBy;
  const response = await apiFetch('/api/mandali/report', {
    method: 'POST',
    body: JSON.stringify({ targetType: 'user_profile', targetId: memberId, reason: 'other' }),
  });
  if (!response.ok) throw new Error('Could not submit report');
  const result = await response.json() as { reportId?: string | null };
  if (result.reportId) triggerPush(`content_reported:${result.reportId}`);
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

export async function fetchSafetyState(userId: string): Promise<SafetyState> {
  const [{ data: blockRows }, { data: muteRows }, { data: hiddenRows }] = await Promise.all([
    // Scoped to rows involving this user in either direction -- an
    // unfiltered select() here would read every block relationship in the
    // table (same bug fixed server-side in the backend repo's
    // user-safety.ts), and unlike that admin-client query, this one runs
    // under the client's own RLS-scoped role.
    supabase.from('user_blocked_profiles').select('blocker_id, blocked_user_id').or(`blocker_id.eq.${userId},blocked_user_id.eq.${userId}`),
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

// ── Connections (request / accept / reject between two seekers) ────────────
// App-wide, not scoped to a single Mandali — Seekers Near You already
// crosses Mandali boundaries, so connections do too. Backed by
// mandali_connections; every state change is logged server-side
// (user_activity_log) and notified via DB trigger, not from here.

// Shared by fetchConnectionStatus and sendConnectionRequest's conflict
// resolution below — both need the one row (if any) linking these two
// users, regardless of which direction it was created in. Since
// mandali_connections_unique_pair_symmetric guarantees at most one row can
// ever exist for a given pair, .maybeSingle() genuinely can't see more
// than one row going forward; a "multiple rows" error here would mean the
// DB constraint itself is missing, not a normal runtime condition, so it's
// left to throw and surface loudly rather than being papered over.
async function fetchConnectionRow(
  userId: string,
  otherId: string
): Promise<{ id: string; requester_id: string; recipient_id: string; status: 'pending' | 'accepted' | 'rejected' } | null> {
  const { data, error } = await supabase
    .from('mandali_connections')
    .select('id, requester_id, recipient_id, status')
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${userId})`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchConnectionStatus(userId: string, otherId: string): Promise<ConnectionStatus> {
  const row = await fetchConnectionRow(userId, otherId);
  if (!row || row.status === 'rejected') return 'none';
  if (row.status === 'accepted') return 'connected';
  return row.requester_id === userId ? 'pending_sent' : 'pending_received';
}

// Plain insert first (the common case: no row exists yet for this pair).
// On a unique-violation, the symmetric constraint means exactly one row
// already links these two users — in either direction — so look it up and
// decide what a "Connect" tap should do given its actual state, instead of
// blindly reopening (which only ever matched the exact same direction and
// silently no-op'd whenever the conflict was actually caused by the other
// direction's row):
//   - already accepted/pending in either direction → nothing to do, the
//     two are already connected or a request is already outstanding.
//   - the OTHER party already has a pending request in to this requester
//     → both people tried to connect at the same time; auto-accept theirs
//     rather than erroring or silently dropping the tap.
//   - previously rejected → reopen as a fresh pending request in the
//     *current* direction (requesterId/recipientId here), giving the
//     other party another chance to decide. Note: reopening this way
//     doesn't re-fire the "wants to connect" push (the trigger only
//     notifies on a genuinely new INSERT or a transition to
//     accepted/rejected) — an accepted gap for now.
export async function sendConnectionRequest(requesterId: string, recipientId: string): Promise<void> {
  const { data, error } = await supabase
    .from('mandali_connections')
    .insert({ requester_id: requesterId, recipient_id: recipientId })
    .select('id')
    .single();
  if (!error) {
    triggerPush(`connection_request:${data.id}`);
    return;
  }
  if (error.code !== '23505') throw error;

  const existing = await fetchConnectionRow(requesterId, recipientId);
  if (!existing) throw error; // conflict raced with a delete — surface the original error

  if (existing.status === 'accepted') return; // already connected, nothing to do

  if (existing.status === 'pending') {
    if (existing.requester_id === recipientId) {
      // The other party already asked to connect first — both sides want
      // this, so accept their request instead of leaving it hanging.
      await respondToConnectionRequest(existing.id, 'accepted');
    }
    // else: this requester's own request is already pending — nothing to do.
    return;
  }

  // existing.status === 'rejected' — reopen as a fresh pending request in
  // *this* direction, which may differ from the row's original direction
  // (e.g. the other party asked first and was rejected by this user; this
  // user now asking them back should read as a new request from them, not
  // a resurrection of the one they declined).
  const { error: reopenError } = await supabase
    .from('mandali_connections')
    .update({ requester_id: requesterId, recipient_id: recipientId, status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', existing.id);
  if (reopenError) throw reopenError;
}

export async function cancelConnectionRequest(requesterId: string, recipientId: string): Promise<void> {
  const { data, error } = await supabase
    .from('mandali_connections')
    .delete()
    .eq('requester_id', requesterId)
    .eq('recipient_id', recipientId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (data) triggerPush(`connection_cancelled:${data.id}`);
}

export async function respondToConnectionRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<void> {
  // Guarded on the row still being pending so a double-tap, or responding
  // to a request that was already accepted/rejected/cancelled elsewhere in
  // the meantime, can't silently flip an already-decided connection.
  const { data, error } = await supabase
    .from('mandali_connections')
    .update({ status })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (data) triggerPush(`connection_${status}:${requestId}`);
}

export async function fetchPendingConnectionRequests(userId: string): Promise<ConnectionRequestRow[]> {
  if (!userId) return [];
  const response = await apiFetch('/api/mandali/connections/pending');
  if (!response.ok) return [];
  const payload = await response.json() as { requests: ConnectionRequestRow[] };
  return payload.requests;
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
