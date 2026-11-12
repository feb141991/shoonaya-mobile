import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { parsePublicFeedPage } from '../lib/mandaliPublicFeedContract';

// Founder decision 2026-11-12: a signed-out person may READ Mandali posts in the app. Reacting, commenting, sharing, opening a profile and the
// post menu ask them to sign in; nothing they see carries an account id. Origin: the privacy audit found the whole feed readable by anyone
// holding the public key, and the app showing guests only a "Sign in to join" wall.

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const post = (over: Record<string, unknown> = {}) => ({
  id: 'p1', createdAt: '2026-11-12T10:00:00Z', type: 'update', content: 'Namaste', reactionCount: 3, commentCount: 1,
  eventDate: null, eventLocation: null, author: { name: 'asha', avatarUrl: null, isOfficial: false }, mandali: { name: 'Pune Mandali', city: 'Pune' }, ...over,
});
const page = (posts: unknown[] = [post()], over: Record<string, unknown> = {}) => ({ schemaVersion: 1, posts, nextCursor: null, ...over });

describe('the public feed contract', () => {
  it('accepts a well-formed page', () => {
    const parsed = parsePublicFeedPage(page([post(), post({ id: 'p2', mandali: null, eventDate: '2026-11-20T10:00:00Z', eventLocation: 'Temple' })], { nextCursor: 'abc' }));
    assert.equal(parsed?.posts.length, 2);
    assert.equal(parsed?.nextCursor, 'abc');
    assert.equal(parsed?.posts[1].mandali, null);
  });

  for (const [name, bad] of [
    ['an unknown schema version', page([post()], { schemaVersion: 2 })],
    ['a missing posts list', { schemaVersion: 1, nextCursor: null }],
    ['a post without an author', page([{ ...post(), author: undefined }])],
    ['a negative count', page([post({ reactionCount: -1 })])],
    ['a count that is not a number', page([post({ commentCount: '2' })])],
    ['a non-string content', page([post({ content: 5 })])],
    ['an official flag that is not boolean', page([post({ author: { name: 'a', avatarUrl: null, isOfficial: 'yes' } })])],
    ['a Mandali with no name', page([post({ mandali: { city: 'Pune' } })])],
    ['null', null],
    ['text', 'nope'],
  ] as Array<[string, unknown]>) {
    it(`refuses ${name}`, () => assert.equal(parsePublicFeedPage(bad), null));
  }

  it('refuses a whole page when one post is malformed, so a half-understood answer is never shown', () => {
    assert.equal(parsePublicFeedPage(page([post(), { id: 'broken' }])), null);
  });

  it('does not carry through fields the contract does not name (an account id slipping in is dropped)', () => {
    const parsed = parsePublicFeedPage(page([post({ author_id: 'secret-account', mandali_id: 'secret-mandali' })]));
    assert.ok(parsed);
    assert.doesNotMatch(JSON.stringify(parsed), /secret-account|secret-mandali|author_id|mandali_id/);
  });
});

describe('the guest feed is read-only and holds nothing', () => {
  const component = read('components/mandali/GuestMandaliFeed.tsx');
  const client = read('lib/mandaliPublicFeed.ts');

  it('fetches as a guest from the public route only, and keeps no copy on the device', () => {
    assert.match(client, /\/api\/mandali\/public-feed\?/);
    assert.match(client, /expectedGuest: true/);
    for (const source of [component, client]) {
      assert.doesNotMatch(source, /AsyncStorage|userScopedStorage|writeUserScoped|SecureStore/, 'nothing is persisted');
      assert.doesNotMatch(source, /@\/lib\/supabase|from\('(posts|post_upvotes|post_comments|event_rsvps|comment_upvotes)'\)/, 'no direct table access');
      assert.doesNotMatch(source, /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/, 'no write request');
    }
  });

  it('every action that needs an account shows a sign-in prompt, not an action', () => {
    for (const action of ['react', 'comment', 'share', 'more', 'author']) {
      assert.match(component, new RegExp(`${action}: '[^']*[Ss]ign in`), `${action} has a sign-in message`);
    }
    assert.match(component, /onAction\('author'\)/);
    assert.match(component, /action\('react'/);
    assert.match(component, /action\('comment'/);
    assert.match(component, /action\('more'/);
    assert.match(component, /onPress=\{\(\) => \{ setPrompt\(null\); onSignIn\(\); \}\}/, 'the prompt leads to the login');
    // The prompt covers the screen the person is looking at. It must not live in the list header, which scrolls out of view.
    assert.match(component, /<Modal transparent visible=\{prompt !== null\}/);
    assert.match(component, /accessibilityLabel="Not now"/);
    assert.match(component, /You are reading Mandali as a guest/);
    assert.doesNotMatch(component, /: 'You are reading Mandali as a guest/, 'the header text is fixed, it does not swap in the prompt');
  });

  it('actions are real 44pt buttons with a label that names what signing in is for', () => {
    assert.match(component, /minHeight: MIN_TOUCH_TARGET/);
    assert.match(component, /accessibilityLabel=\{`\$\{label\}\. \$\{GUEST_ACTION_COPY\[kind\]\}`\}/);
  });

  it('shows loading, error with retry, and empty states, and cannot show an old response over a newer one', () => {
    assert.match(component, /ActivityIndicator/);
    assert.match(component, /ctaLabel=\{refreshing \? 'Retrying…' : 'Retry'\}/);
    assert.match(component, /No posts yet/);
    assert.match(component, /request !== requestRef\.current/);
    assert.match(component, /describeFailure\(failure,/);
  });

  it('keeps the sign-in path available while the public route returns 404', () => {
    assert.match(component, /failure instanceof ApiRequestError && failure\.status === 404[\s\S]*?setFeedUnavailable\(true\)/);
    assert.match(component, /if \(feedUnavailable\)[\s\S]*?title="Join Mandali"[\s\S]*?onCta=\{onSignIn\}/);
  });

  it('the Mandali screen shows the guest feed to a signed-out person, not the old sign-in wall', () => {
    const screen = read('app/(tabs)/mandali.tsx');
    assert.match(screen, /if \(isGuest\) \{[\s\S]*?<GuestMandaliFeed/);
    assert.doesNotMatch(screen, /Mandali is a sacred community space for registered seekers/);
    assert.match(screen, /onSignIn=\{async \(\) => \{\s*await setGuestMode\(false\);\s*router\.replace\('\/\(auth\)\/login'\);/);
  });
});
