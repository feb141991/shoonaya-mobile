import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { formatRelativeTime } from '../lib/formatRelativeTime';

const mandaliScreen = readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8');
const postComments = readFileSync(new URL('../components/mandali/PostComments.tsx', import.meta.url), 'utf8');

describe('Mandali post card layout & timestamp formatting', () => {
  it('formats relative times matching PWA conventions', () => {
    const now = new Date('2026-09-13T22:00:00.000Z');

    // Just now (< 1m)
    assert.equal(formatRelativeTime('2026-09-13T21:59:30.000Z', now), 'just now');

    // Future date due to client clock skew -> falls back safely to 'just now'
    assert.equal(formatRelativeTime('2026-09-13T22:05:00.000Z', now), 'just now');

    // Minutes ago (< 60m)
    assert.equal(formatRelativeTime('2026-09-13T21:45:00.000Z', now), '15m ago');

    // Hours ago (< 24h)
    assert.equal(formatRelativeTime('2026-09-13T19:00:00.000Z', now), '3h ago');

    // Days ago (< 7d)
    assert.equal(formatRelativeTime('2026-09-10T22:00:00.000Z', now), '3d ago');

    // Beyond 7 days -> day + month short (e.g. 1 Sep)
    const formattedOld = formatRelativeTime('2026-09-01T12:00:00.000Z', now);
    assert.ok(formattedOld.includes('Sep') || formattedOld.includes('1'), `Expected date string, got ${formattedOld}`);
  });

  it('keeps post card header stable without flexWrap height collapse or text overriding', () => {
    // Prohibit flexWrap: 'wrap' in the post header row which caused Yoga height collapse
    assert.doesNotMatch(
      mandaliScreen,
      /<View style=\{\{\s*flexDirection:\s*'row',\s*alignItems:\s*'center',\s*flexWrap:\s*'wrap'/,
      'Post header row must not use flexWrap: wrap',
    );

    // Uses formatRelativeTime for compact display
    assert.match(mandaliScreen, /formatRelativeTime\(post\.created_at\)/);

    // Truncates long author names cleanly on row 1
    assert.match(mandaliScreen, /numberOfLines=\{1\}/);
    assert.match(mandaliScreen, /ellipsizeMode="tail"/);
  });

  it('avoids duplicate collapsed comment button in PostComments', () => {
    // PostComments must return null when not expanded so a redundant "Comment v" button
    // is never displayed below the collapsed action bar
    assert.match(postComments, /if\s*\(!expanded\)\s*return null;/);
  });
});
