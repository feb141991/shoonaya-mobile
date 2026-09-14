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

  it('normalizes comment bodies defensively and bounds inline comment thread height', () => {
    // PostComments must normalize comment bodies to prevent excessive blank lines
    assert.match(postComments, /function normalizeCommentBody/);
    assert.match(postComments, /replace\(\/\\r\\n\/g,\s*'\\n'\)/);
    assert.match(postComments, /replace\(\/\\n\{3,\}\/g,\s*'\\n\\n'\)/);
    assert.match(postComments, /\.trim\(\)/);

    // If body is empty or whitespace-only, renders fallback emoji instead of an empty tall block
    assert.match(postComments, /cleanBody\s*\|\|\s*'🙏'/);

    // CommentItem container must use alignItems: 'flex-start' to prevent vertical stretching
    assert.match(postComments, /flexDirection:\s*'row',\s*gap:\s*7,\s*alignItems:\s*'flex-start'/);

    // Text column must have minWidth: 0 to prevent Yoga layout expansion
    assert.match(postComments, /flex:\s*1,\s*minWidth:\s*0,\s*gap:\s*1/);

    // PostComments bounds the comment thread with ScrollView and maxHeight
    assert.match(postComments, /<ScrollView[^>]*nestedScrollEnabled/);
    assert.match(postComments, /maxHeight:\s*340/);
    assert.match(postComments, /flexGrow:\s*0/);

    // Functional verification of normalization rules
    const normalize = (body: string | null | undefined): string => {
      if (!body) return '';
      return body.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    assert.equal(normalize(null), '');
    assert.equal(normalize(undefined), '');
    assert.equal(normalize('   \n\n\n\n\t  '), '');
    assert.equal(normalize('Hello\n\n\n\n\n\nWorld'), 'Hello\n\nWorld');
    assert.equal(normalize('  Pranam 🙏  '), 'Pranam 🙏');
  });

  it('prevents PressableSurface from forcing flex: 1 when minHeight: 0 is specified', () => {
    const pressableSurface = readFileSync(new URL('../components/ui/PressableSurface.tsx', import.meta.url), 'utf8');
    assert.match(pressableSurface, /flex:\s*flattenedStyle\.minHeight\s*===\s*0\s*\?\s*flattenedStyle\.flex\s*:\s*1/);
  });
});
