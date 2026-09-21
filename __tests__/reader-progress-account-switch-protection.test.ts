import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// External review finding: reader/progress screens lacked complete
// account-switch protection -- a delayed response for a previous account
// could overwrite the next account's state, and old progress remained
// visible during loading. Source-regression only (both screens import
// react-native/expo-router and cannot be executed under this project's
// plain `tsx --test` runner -- matching the existing convention for
// _layout.tsx/profile.tsx/mandali.tsx regressions elsewhere in this suite).

describe('Karma Ledger account-switch protection (app/my-progress/ledger.tsx)', () => {
  const ledger = readFileSync(new URL('../app/my-progress/ledger.tsx', import.meta.url), 'utf8');

  it('captures an identity lease and binds the request to its owner', () => {
    assert.match(ledger, /import \{ useAppIdentity, captureAppIdentity \} from '@\/lib\/appIdentity';/);
    assert.match(ledger, /const \{ isCurrent \} = captureAppIdentity\(\);/);
    assert.match(ledger, /expectedUserId: appIdentity\.userId/);
  });

  it('guards every state update after an await with isCurrent()', () => {
    const guardCount = (ledger.match(/if \(!isCurrent\(\)\) return;/g) ?? []).length;
    assert.ok(guardCount >= 4, `expected at least 4 isCurrent() guards (guest branch, post-auth-check, post-fetch, post-response), found ${guardCount}`);
  });

  it('clears the previous identity ledger before the new identity load starts, instead of leaving stale data visible while loading', () => {
    assert.match(ledger, /setLedger\(\[\]\);\s*\n\s*setLoading\(true\);/);
  });

  it('does not clear loading for a superseded (stale) load attempt', () => {
    assert.match(ledger, /loadData\(\)\.finally\(\(\) => \{\s*\n\s*if \(isCurrent\(\)\) setLoading\(false\);/);
  });
});

describe('Pathshala lesson reader account-switch protection (app/pathshala/[pathId]/[lessonId].tsx)', () => {
  const lessonReader = readFileSync(new URL('../app/pathshala/[pathId]/[lessonId].tsx', import.meta.url), 'utf8');

  it('captures an identity lease and binds the progress request to its owner', () => {
    assert.match(lessonReader, /import \{ useAppIdentity, captureAppIdentity \} from '@\/lib\/appIdentity';/);
    assert.match(lessonReader, /const \{ isCurrent \} = captureAppIdentity\(\);/);
    assert.match(lessonReader, /expectedUserId: appIdentity\.userId/);
  });

  it('guards every state update after an await with isCurrent()', () => {
    const guardCount = (lessonReader.match(/if \(!isCurrent\(\)\) return;/g) ?? []).length;
    assert.ok(guardCount >= 3, `expected at least 3 isCurrent() guards (guest branch, post-auth-check, post-fetch), found ${guardCount}`);
  });

  it('clears the previous account completedLessons before the new account fetch, instead of leaving stale progress visible while loading', () => {
    assert.match(lessonReader, /setUserId\(appIdentity\.userId\);\s*\n\s*\/\/ Clear the previous account's progress[\s\S]*?setCompletedLessons\(\[\]\);/);
  });

  it('does not clear loading state for a superseded (stale) load attempt', () => {
    assert.match(lessonReader, /if \(isCurrent\(\)\) setLoadingState\(false\);/);
  });
});
