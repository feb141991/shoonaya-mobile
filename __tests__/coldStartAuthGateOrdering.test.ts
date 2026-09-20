import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { markAuthReady, waitForAuthReady, __resetAuthReadyGateForTests } from '../lib/authReadyGate';

// Reproduction and regression test for F02
// (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md): confirmed by direct
// source trace of app/_layout.tsx before this fix --
//
//   1. Cold start's prepare() awaits routeForSession(session) before
//      calling markAuthReady() (was: lines 678-681).
//   2. routeForSession's missing-profile repair path (line 494) awaits
//      apiFetch('/api/native/profile/bootstrap', ...) -- a real, reachable
//      path for any account whose profile row is missing (the documented
//      OAuth-trigger-failure recovery case, not a hypothetical one).
//   3. apiFetch (lib/api.ts) awaits waitForAuthReady() before firing any
//      request.
//   4. waitForAuthReady() cannot resolve until markAuthReady() is called --
//      which is the very call routeForSession's own completion was gating.
//
// This is a genuine deadlock for exactly the accounts the repair path
// exists to help, broken only by the 6-second emergency fallback timer --
// meaning every affected cold start pays the full 6 seconds before its own
// repair request can even be sent.
//
// authReadyGate.ts has zero react-native/apiFetch imports, so its real
// exported functions are used directly here (not a hand-rolled fake) to
// reproduce the actual control-flow shape read out of app/_layout.tsx,
// rather than executing app/_layout.tsx itself (not importable under this
// project's plain tsx --test runner -- see other startup tests in this
// suite for the same constraint).

test('F02 reproduction: markAuthReady gated behind routeForSession deadlocks a profile-bootstrap apiFetch call inside it', async () => {
  __resetAuthReadyGateForTests();
  let bootstrapResolved = false;

  const simulatedApiFetch = async () => {
    await waitForAuthReady();
    bootstrapResolved = true;
  };

  // Mirrors routeForSession's real shape: awaits the profile-bootstrap
  // apiFetch call internally, as part of its own resolution.
  const simulatedRouteForSession = async () => {
    await simulatedApiFetch();
  };

  // Mirrors the buggy ordering exactly as it existed in app/_layout.tsx:
  // routeForSession is awaited to completion BEFORE markAuthReady() runs.
  const prepare = simulatedRouteForSession().then(() => {
    markAuthReady();
  });

  // Let the pending chain settle across several macrotasks with no
  // external intervention -- this is not a timing flake to tune, the
  // promise genuinely never resolves under this ordering.
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(
    bootstrapResolved,
    false,
    'the bootstrap apiFetch call is stuck: it needs markAuthReady(), which needs routeForSession to finish, which needs the apiFetch call to finish -- a real cycle, not a slow but eventually-resolving chain'
  );

  // Only the emergency fallback (a markAuthReady() call from outside this
  // chain entirely) breaks it -- matching app/_layout.tsx's 6-second timer.
  markAuthReady();
  await prepare;
  assert.equal(bootstrapResolved, true);
});

test('fix: calling markAuthReady as soon as the session is known (not after routeForSession) avoids the deadlock', async () => {
  __resetAuthReadyGateForTests();
  let bootstrapResolved = false;

  const simulatedApiFetch = async () => {
    await waitForAuthReady();
    bootstrapResolved = true;
  };

  const simulatedRouteForSession = async () => {
    await simulatedApiFetch();
  };

  // The fixed ordering: markAuthReady() fires immediately once the session
  // token is known, decoupled from routeForSession's own completion --
  // matching app/_layout.tsx's actual fix (markAuthReady() called before
  // `await routeForSession(session)`, not after).
  markAuthReady();
  await simulatedRouteForSession();

  assert.equal(bootstrapResolved, true, 'no external emergency intervention needed once markAuthReady is decoupled from routeForSession completion');
});

test('app/_layout.tsx calls markAuthReady before awaiting routeForSession in cold start, not after (F02 regression)', () => {
  const root = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

  // The buggy pattern this fix removes: markAuthReady() only reachable
  // after `await routeForSession(session)` returns, with nothing calling
  // it earlier in the same cold-start path.
  assert.doesNotMatch(
    root,
    /await routeForSession\(session\);\s*\n\s*setAuthReady\(true\);\s*\n\s*markAuthReady\(\);/,
    'markAuthReady() must not be reachable only after routeForSession resolves -- that is the F02 deadlock ordering'
  );

  // The fix: markAuthReady() called on the session-resolution path before
  // routeForSession is awaited.
  assert.match(
    root,
    /markAuthReady\(\);\s*\n\s*\n?\s*await routeForSession\(session\);/,
    'markAuthReady() should fire as soon as the session is known, decoupled from routeForSession completion'
  );
});
