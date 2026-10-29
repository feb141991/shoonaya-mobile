import { parseDateOnly } from './dateOnly';

/** A link carries a civil day, never a UTC instant or a day to derive again at tap time. */
export function notificationDate(value: string | string[] | undefined): Date | null {
  return typeof value === 'string' ? parseDateOnly(value) : null;
}

export type MandaliNotificationTarget =
  | { kind: 'post'; id: string; commentId?: string }
  | { kind: 'request'; id: string }
  | { kind: 'invalid' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function mandaliNotificationTarget(params: {
  postId?: string | string[];
  commentId?: string | string[];
  requestId?: string | string[];
}): MandaliNotificationTarget | null {
  const { postId, requestId, commentId } = params;
  if (postId === undefined && requestId === undefined && commentId === undefined) return null;
  if (postId !== undefined && requestId !== undefined) return { kind: 'invalid' };
  if (typeof requestId === 'string' && UUID.test(requestId) && commentId === undefined) {
    return { kind: 'request', id: requestId };
  }
  if (typeof postId === 'string' && UUID.test(postId) &&
      (commentId === undefined || (typeof commentId === 'string' && UUID.test(commentId)))) {
    return { kind: 'post', id: postId, ...(commentId ? { commentId } : {}) };
  }
  return { kind: 'invalid' };
}
