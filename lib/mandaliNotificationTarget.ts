import type { CommentRow, PostRow } from './mandali';
import type { MandaliNotificationTarget } from './notificationDestination';

export type MandaliTargetContent =
  | { kind: 'post'; post: PostRow; comment: CommentRow | null }
  | { kind: 'request'; request: {
    id: string;
    requester_id: string;
    recipient_id: string;
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
    created_at: string;
    /** The other person in the request, whichever side the viewer is on (public username only). */
    counterparty: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
  } };

type FetchTarget = (url: string, options: { expectedUserId: string }) => Promise<{
  status: number;
  ok: boolean;
  json(): Promise<unknown>;
}>;

/** Always asks the authenticated API again; a cached feed never authorizes opening private content. */
export async function loadMandaliNotificationTarget(
  target: MandaliNotificationTarget,
  userId: string,
  fetchTarget: FetchTarget,
): Promise<MandaliTargetContent | null> {
  if (target.kind === 'invalid') return null;
  const query = target.kind === 'post'
    ? `postId=${encodeURIComponent(target.id)}${target.commentId ? `&commentId=${encodeURIComponent(target.commentId)}` : ''}`
    : `requestId=${encodeURIComponent(target.id)}`;
  const response = await fetchTarget(`/api/mandali/notification-target?${query}`, { expectedUserId: userId });
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error('Mandali target unavailable');
  const payload = await response.json() as MandaliTargetContent;
  if (target.kind === 'post' && payload?.kind === 'post' && payload.post?.id === target.id &&
      typeof payload.post.content === 'string' &&
      (!target.commentId || payload.comment?.id === target.commentId)) return payload;
  if (target.kind === 'request' && payload?.kind === 'request' && payload.request?.id === target.id &&
      [payload.request.requester_id, payload.request.recipient_id].includes(userId) &&
      ['pending', 'accepted', 'rejected', 'cancelled'].includes(payload.request.status)) return payload;
  throw new Error('Invalid Mandali target response');
}
