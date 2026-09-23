import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// app/(tabs)/mandali.tsx imports react-native, so this is a structural
// check (same convention as the other mandali-*.test.ts files in this
// directory), verified non-vacuous by diffing against `git show HEAD`
// before the fix.
//
// Bug this guards against: Supabase's delete().eq(...) returns
// { data: null, error: null } both when a row is genuinely deleted AND
// when RLS silently excluded it (0 rows matched "Authors can delete own
// posts") -- the two are indistinguishable without .select() to see what
// actually came back. Before this fix, deletePost treated both cases as
// success: it optimistically removed the post from local state
// regardless, so an RLS-blocked delete (e.g. from a stale identity) made
// the post vanish from the screen and then reappear on the next
// fetch/refresh, since the underlying row was never actually removed.
test('deletePost verifies the delete actually affected a row before removing the post from local state', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/mandali.tsx'), 'utf8');

  const startIndex = src.indexOf('const deletePost = useCallback(async (post: PostRow) => {');
  assert.ok(startIndex > -1, 'expected to find deletePost');
  const endIndex = src.indexOf('}, []);', startIndex);
  const deletePostBody = src.slice(startIndex, endIndex);

  assert.match(
    deletePostBody, /\.delete\(\)\.eq\('id', post\.id\)\.select\('id'\)/,
    'the delete call must select back the affected row(s) to distinguish a real delete from an RLS-silenced no-op'
  );

  // The optimistic local-state removal (setPosts/setBlendedPosts filtering
  // the post out) must be reachable only after confirming at least one row
  // came back -- not unconditionally once .delete() merely fails to throw.
  const setPostsIndex = deletePostBody.indexOf('setPosts((current)');
  assert.ok(setPostsIndex > -1, 'expected the optimistic local-state removal');
  const beforeSetPosts = deletePostBody.slice(0, setPostsIndex);
  assert.match(
    beforeSetPosts, /data\.length === 0/,
    'expected an explicit empty-result check to precede the optimistic local-state removal'
  );
});
