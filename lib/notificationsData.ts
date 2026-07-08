import { supabase } from '@/lib/supabase';

// Native's in-app notification data layer — ported to match the web app's
// own contract exactly (confirmed by direct read of
// src/lib/api/notifications.ts, src/hooks/useNotifications.ts, and
// src/app/(main)/home/HomeDashboard.tsx in the web repo). There is no
// GET/PATCH REST route for this on web either — the panel there reads and
// writes `public.notifications` directly via the anon-key Supabase client
// under RLS ("Users read own notifications" / "Users update own
// notifications"), so native does the same rather than inventing a new API
// contract. Inserts are service-role only (crons + the two
// /api/notifications/{test,milestone} routes) — native never inserts rows.

export const NOTIFICATIONS_LIMIT = 20;

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  emoji: string | null;
  type: string;
  read: boolean;
  action_url: string | null;
  notification_key: string | null;
  local_date: string | null;
  sent_timezone: string | null;
  created_at: string;
};

const SELECT_COLUMNS =
  'id, user_id, title, body, emoji, type, read, action_url, notification_key, local_date, sent_timezone, created_at';

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

// Matches web's own limitation: unread count is derived from the same
// capped 20-row fetch, not a true unbounded server aggregate
// (src/app/(main)/home/HomeDashboard.tsx:312) — kept consistent rather than
// "fixing" it into a different, disagreeing number between platforms.
export async function fetchUnreadCount(userId: string): Promise<number> {
  const rows = await fetchNotifications(userId);
  return rows.filter((row) => !row.read).length;
}

// Home's bell badge calls this instead of touching supabase.from directly —
// keeps app/(tabs)/index.tsx free of direct table access (matching the
// no-direct-Supabase constraint the Home rebuild was built under), while
// still getting a real unread count without a home-summary API shape
// change. Best-effort by design: returns 0 (no badge) rather than throwing,
// since a missing badge is a minor cosmetic gap, not worth failing Home's
// load over.
export async function getMyUnreadNotificationCount(): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    return await fetchUnreadCount(user.id);
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids);
  if (error) throw error;
}

// Realtime subscription for live inbox updates while the notifications
// screen is open — matches web's `notifications_feed:${userId}` channel
// name and INSERT-only filter (src/hooks/useNotifications.ts:25-55).
// Deliberately scoped to the notifications screen's own lifecycle, not
// mounted globally/persistently from Home — a single short-lived
// subscription while the user is actually looking at the list, rather than
// a background channel competing with the rest of the app for the
// connection. Returns an unsubscribe function.
export function subscribeToNotifications(userId: string, onInsert: () => void): () => void {
  const channel = supabase
    .channel(`notifications_feed:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => onInsert()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// Notification *preferences* (wants_festival_reminders / wants_shloka_reminders
// / wants_nitya_reminders / wants_community_notifications /
// wants_family_notifications) are NOT duplicated here — app/settings.tsx
// already reads and writes those `profiles` columns directly (its own
// `loadSettings`/`persistSettings`), fully wired end to end. This file only
// owns the notification *list* (read/mark-read/realtime), which had no
// native equivalent anywhere before this change.
