import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Guards the fix for: (1) other users' post reactions being invisible (no
// breakdown, no reactors sheet), and (2) a realtime double-count bug where
// a reaction SWITCH (an UPDATE, since setPostReaction upserts onConflict:
// 'post_id,user_id') was misread as a brand-new reaction (+1) by every
// other viewer watching the post in realtime.

test('fetchPostReactors queries post_upvotes for ALL reactors on a post, not scoped to one user', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'lib/mandali.ts'), 'utf8');
  const startIndex = src.indexOf('export async function fetchPostReactors(');
  assert.ok(startIndex > -1, 'expected fetchPostReactors to exist');
  const endIndex = src.indexOf('\nexport async function updateMandaliRsvp', startIndex);
  const body = src.slice(startIndex, endIndex);

  assert.match(body, /\.from\('post_upvotes'\)/);
  assert.match(body, /\.eq\('post_id', postId\)/);
  // Must NOT filter by the current viewer's own user_id -- that would
  // reproduce the exact bug being fixed (only ever seeing your own reaction).
  assert.doesNotMatch(body, /\.eq\('user_id',/);
});

test('PostReactionButton exposes onViewReactors as a tap target separate from the emoji picker', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'components/mandali/PostReactionButton.tsx'), 'utf8');
  assert.match(src, /onViewReactors:\s*\(\) => void;/, 'expected onViewReactors in the props type');
  // The count's own PressableSurface must call onViewReactors (or retry),
  // never openPicker -- that was the original bug: tapping the count did
  // nothing, and there was no way to see who reacted.
  const countBlockStart = src.indexOf("accessibilityLabel={failed ? 'Retry syncing this reaction'");
  assert.ok(countBlockStart > -1, 'expected the count PressableSurface block');
  const countBlock = src.slice(countBlockStart, countBlockStart + 300);
  assert.match(countBlock, /onPress=\{failed \? onRetry : onViewReactors\}/);
});

test('mandali.tsx wires PostReactorsSheet and passes onViewReactors through to MandaliPostCard', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/mandali.tsx'), 'utf8');
  assert.match(src, /import \{ PostReactorsSheet \} from '@\/components\/mandali\/PostReactorsSheet';/);
  assert.match(src, /const \[reactorsPostId, setReactorsPostId\] = useState<string \| null>\(null\);/);
  assert.match(src, /onViewReactors=\{setReactorsPostId\}/);
  assert.match(src, /onViewReactors=\{\(\) => onViewReactors\(post\.id\)\}/);
  assert.match(
    src,
    /<PostReactorsSheet\s+visible=\{!!reactorsPostId\}\s+postId=\{reactorsPostId\}/,
  );
});

test('handleUpvoteRealtimeChange no longer counts a reaction switch (UPDATE) as a new reaction', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/mandali.tsx'), 'utf8');
  const startIndex = src.indexOf('const handleUpvoteRealtimeChange = useCallback(');
  assert.ok(startIndex > -1, 'expected handleUpvoteRealtimeChange to exist');
  const endIndex = src.indexOf('}, [patchPostUpvotes, profile?.userId]);', startIndex);
  const body = src.slice(startIndex, endIndex);

  assert.match(
    body,
    /if \(payload\.eventType === 'UPDATE'\) return;/,
    'an UPDATE event (a reaction switch) must not patch the total count',
  );
  // The guard must come BEFORE the patch call, not after (or it does nothing).
  const guardIndex = body.indexOf("if (payload.eventType === 'UPDATE') return;");
  const patchIndex = body.indexOf('patchPostUpvotes(postId,');
  assert.ok(guardIndex > -1 && patchIndex > -1 && guardIndex < patchIndex);
});
