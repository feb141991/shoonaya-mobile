/**
 * Pure contract for the read-only Mandali feed (backend GET /api/mandali/public-feed). No imports, so it can be tested directly.
 * The answer carries no account id, no Mandali id and no names of people who reacted.
 */

export type PublicMandaliPost = {
  id: string;
  createdAt: string;
  type: string;
  content: string;
  reactionCount: number;
  commentCount: number;
  eventDate: string | null;
  eventLocation: string | null;
  author: { name: string; avatarUrl: string | null; isOfficial: boolean };
  mandali: { name: string; city: string | null } | null;
};

export type PublicMandaliFeedPage = { posts: PublicMandaliPost[]; nextCursor: string | null };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function parsePost(value: unknown): PublicMandaliPost | null {
  if (!isRecord(value) || !isRecord(value.author)) return null;
  const { author } = value;
  const mandali = value.mandali;
  if (
    !isString(value.id) || !isString(value.createdAt) || !isString(value.type) || !isString(value.content) ||
    !isCount(value.reactionCount) || !isCount(value.commentCount) ||
    !isNullableString(value.eventDate) || !isNullableString(value.eventLocation) ||
    !isString(author.name) || !isNullableString(author.avatarUrl) || typeof author.isOfficial !== 'boolean'
  ) return null;
  let parsedMandali: PublicMandaliPost['mandali'] = null;
  if (mandali !== null && mandali !== undefined) {
    if (!isRecord(mandali) || !isString(mandali.name) || !isNullableString(mandali.city)) return null;
    parsedMandali = { name: mandali.name, city: mandali.city };
  }
  return {
    id: value.id, createdAt: value.createdAt, type: value.type, content: value.content,
    reactionCount: value.reactionCount, commentCount: value.commentCount,
    eventDate: value.eventDate, eventLocation: value.eventLocation,
    author: { name: author.name, avatarUrl: author.avatarUrl, isOfficial: author.isOfficial },
    mandali: parsedMandali,
  };
}

/** Accepts only a well-formed page. A page with any malformed post is refused whole, so a half-understood answer is never shown. */
export function parsePublicFeedPage(payload: unknown): PublicMandaliFeedPage | null {
  if (!isRecord(payload) || payload.schemaVersion !== 1 || !Array.isArray(payload.posts) || !isNullableString(payload.nextCursor)) return null;
  const posts: PublicMandaliPost[] = [];
  for (const raw of payload.posts) {
    const post = parsePost(raw);
    if (!post) return null;
    posts.push(post);
  }
  return { posts, nextCursor: payload.nextCursor };
}
