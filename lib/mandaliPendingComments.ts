import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCacheStorageBarrier } from './cacheStorageBarrier';
import type { CommentRow } from './mandali';

const PREFIX = 'shoonaya_mandali_pending_comment_v1_user_';
const storage = createCacheStorageBarrier((key) => key.startsWith(PREFIX));

export type PendingMandaliComment = {
  userId: string;
  localId: string;
  postId: string;
  body: string;
  parentId: string | null;
  clientOperationId: string;
  createdAt: string;
  displayName: string;
  baseCommentCount: number;
};

function keyFor(record: Pick<PendingMandaliComment, 'userId' | 'clientOperationId'>) {
  return `${PREFIX}${record.userId}_${record.clientOperationId}`;
}

export async function savePendingMandaliComment(record: PendingMandaliComment): Promise<void> {
  await storage.setItem(keyFor(record), JSON.stringify(record));
}

export async function removePendingMandaliComment(record: Pick<PendingMandaliComment, 'userId' | 'clientOperationId'>): Promise<void> {
  await storage.removeItem(keyFor(record));
}

export async function readPendingMandaliComments(userId: string): Promise<PendingMandaliComment[]> {
  const prefix = `${PREFIX}${userId}_`;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
  const rows = await Promise.all(keys.map(async (key) => {
    const read = await storage.read(key);
    if (!read) return null;
    try {
      const value: unknown = JSON.parse(read.value);
      if (!value || typeof value !== 'object') throw new Error('Invalid pending comment');
      const record = value as Partial<PendingMandaliComment>;
      if (record.userId !== userId || typeof record.clientOperationId !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(record.clientOperationId) ||
        key !== keyFor({ userId, clientOperationId: record.clientOperationId }) ||
        record.localId !== `pending-${record.clientOperationId}` ||
        typeof record.postId !== 'string' || !record.postId ||
        typeof record.body !== 'string' || !record.body.trim() ||
        (record.parentId !== null && typeof record.parentId !== 'string') ||
        typeof record.createdAt !== 'string' || typeof record.displayName !== 'string' ||
        !Number.isSafeInteger(record.baseCommentCount) ||
        typeof record.baseCommentCount !== 'number' || record.baseCommentCount < 0) {
        throw new Error('Invalid pending comment');
      }
      return record as PendingMandaliComment;
    } catch {
      await read.discard();
      return null;
    }
  }));
  return rows.filter((row): row is PendingMandaliComment => row !== null);
}

export function renderPendingMandaliComment(record: PendingMandaliComment): CommentRow {
  return {
    id: record.localId,
    post_id: record.postId,
    author_id: record.userId,
    body: record.body,
    parent_id: record.parentId,
    created_at: record.createdAt,
    updated_at: null,
    deleted_at: null,
    upvotes: 0,
    is_highlighted: false,
    profiles: { full_name: record.displayName, username: record.displayName, avatar_url: null },
    pendingStatus: 'failed',
    clientOperationId: record.clientOperationId,
    baseCommentCount: record.baseCommentCount,
  };
}

/** Preserve active local sends across a feed/cache refresh without duplicating rows. */
export function mergePendingMandaliComments(server: CommentRow[], pending: CommentRow[]): CommentRow[] {
  const seen = new Set(server.map((comment) => comment.id));
  return [...server, ...pending.filter((comment) => {
    if (!comment.pendingStatus || seen.has(comment.id)) return false;
    seen.add(comment.id);
    return true;
  })];
}

/** A realtime or refreshed server row may arrive before the POST response. */
export function confirmPendingMandaliComment(current: CommentRow[], localId: string, serverId: string): CommentRow[] {
  const alreadyPresent = current.some((comment) => comment.id === serverId);
  return current.flatMap((comment) => {
    if (comment.id !== localId) return [comment];
    return alreadyPresent ? [] : [{ ...comment, id: serverId, pendingStatus: undefined, clientOperationId: undefined }];
  });
}

export async function clearAllPendingMandaliComments(): Promise<void> {
  await storage.clearAll();
}

export async function clearPendingMandaliCommentsForUser(userId: string): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(`${PREFIX}${userId}_`));
  await Promise.all(keys.map((key) => storage.removeItem(key)));
}
