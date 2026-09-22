import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

/**
 * Home/calendar state audit (reviewed 2026-09-22, reliability plan item
 * 4): PanchangRetryController's onExhausted callback -- fired once every
 * attempt in the bounded 2s/5s/10s retry sequence still reports
 * calendarStatus: 'pending' or fails outright -- is documented (see the
 * class's own doc comment in lib/homeCoordinator.ts) to mean "the caller
 * should locally treat the pill as 'unavailable' rather than leaving a
 * skeleton rendered indefinitely."
 *
 * app/(tabs)/index.tsx's actual onExhausted implementation only honored
 * that contract when there was salvageable calendar content to fall back
 * to (transitioning to 'ready'); the no-content branch returned `prev`
 * unchanged, silently leaving calendarStatus stuck at 'pending' forever
 * once the retry sequence had already given up -- a permanent skeleton
 * for an authenticated user whose calendar genuinely could not be
 * resolved (backend outage, sustained offline, etc.), with no error UI
 * and no retry CTA ever appearing, contradicting the class's own
 * documented contract.
 *
 * Structural (source-text) test -- app/(tabs)/index.tsx imports
 * react-native and cannot be loaded by this project's tsx --test runner
 * (same constraint as this suite's other index.tsx/mandali.tsx tests).
 * lib/homeCoordinator.ts's own PanchangRetryController tests (in
 * __tests__/home-swr-and-sankalpa.test.ts) cover the class firing
 * onExhausted correctly; this file covers what index.tsx's specific
 * callback does with that signal, which the class's own tests -- using a
 * fake onExhausted -- cannot see.
 */

const indexScreen = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');

function extractOnExhausted(): string {
  const start = indexScreen.indexOf('onExhausted: () => {');
  assert.ok(start > -1, 'onExhausted callback not found');
  const end = indexScreen.indexOf('},', start);
  assert.ok(end > -1, 'onExhausted callback close not found');
  return indexScreen.slice(start, end);
}

describe('Home PanchangRetryController exhaustion: no-content case must not leave a permanent skeleton', () => {
  it('transitions to "unavailable" when there is no salvageable calendar content, not "prev" unchanged', () => {
    const body = extractOnExhausted();
    assert.match(
      body,
      /hasCalendarContent \? 'ready' : 'unavailable'/,
      'the no-content branch must resolve to \'unavailable\', matching what PanchangRetryController\'s own doc comment documents as the contract'
    );
    assert.doesNotMatch(
      body,
      /hasCalendarContent[\s\S]{0,80}:\s*prev\s*;/,
      'must not fall through to returning prev unchanged when there is no content -- that is the exact bug this test guards against'
    );
  });

  it('still guards against overwriting a status that already resolved out of "pending" (e.g. a concurrent successful fetch)', () => {
    const body = extractOnExhausted();
    assert.match(body, /if \(prev\.panchang\.calendarStatus !== 'pending'\) return prev;/);
  });

  it('is never written to the on-disk cache -- exhaustion is a per-session judgment, not an authoritative server verdict', () => {
    const start = indexScreen.indexOf('onExhausted: () => {');
    const end = indexScreen.indexOf('},', start);
    const withCommentAbove = indexScreen.slice(Math.max(0, start - 400), end);
    assert.match(withCommentAbove, /Deliberately NOT written to cache/);
    assert.doesNotMatch(extractOnExhausted(), /writeHomeCache/, 'onExhausted must not persist its own exhaustion verdict to cache');
  });
});
