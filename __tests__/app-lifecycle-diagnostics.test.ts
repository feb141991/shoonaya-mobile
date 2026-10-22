import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBackgroundTransitionTracker,
  shouldScheduleTelemetryFlush,
  TELEMETRY_UPLOAD_SETTLE_MS,
} from '../lib/appLifecycleDiagnostics';

test('marks requests that span a real background transition, including after foreground resume', () => {
  const tracker = createBackgroundTransitionTracker('active');
  const requestStart = tracker.capture();

  tracker.observe('inactive');
  tracker.observe('active');
  assert.equal(tracker.crossedSince(requestStart), false, 'brief iOS inactive interruptions are not background suspension');

  tracker.observe('background');
  tracker.observe('active');
  assert.equal(tracker.crossedSince(requestStart), true, 'the transition remains observable after the app resumes');
});

test('does not mark a request that starts after the app already entered background', () => {
  const tracker = createBackgroundTransitionTracker('active');
  tracker.observe('background');
  const requestStart = tracker.capture();
  tracker.observe('active');
  assert.equal(tracker.crossedSince(requestStart), false);
});

test('only schedules the initial foreground flush or a real background-to-active resume', () => {
  assert.equal(TELEMETRY_UPLOAD_SETTLE_MS, 2_500);
  assert.equal(shouldScheduleTelemetryFlush('active', 'active', false), true);
  assert.equal(shouldScheduleTelemetryFlush('background', 'active', true), true);
  assert.equal(shouldScheduleTelemetryFlush('inactive', 'active', true, true), true, 'resume a settle timer cancelled by an iOS interruption');
  assert.equal(shouldScheduleTelemetryFlush('inactive', 'active', true), false);
  assert.equal(shouldScheduleTelemetryFlush('active', 'background', false), false);
});

test('root layout delays diagnostic sends until ready foreground and cancels on backgrounding', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../app/_layout.tsx', import.meta.url), 'utf8');
  const api = await readFile(new URL('../lib/api.ts', import.meta.url), 'utf8');
  const supabase = await readFile(new URL('../lib/supabase.ts', import.meta.url), 'utf8');
  const start = source.indexOf('Flush durable diagnostics only after the app is stable in foreground');
  const end = source.indexOf('Deferred Update Checks', start);
  const effect = source.slice(start, end);
  assert.notEqual(start, -1);
  assert.match(effect, /readyToRender && AppState\.currentState === 'active'/);
  assert.match(effect, /setTimeout\([\s\S]*?TELEMETRY_UPLOAD_SETTLE_MS/);
  assert.match(effect, /if \(state !== 'active'\) \{\s*cancelScheduledFlush\(\);/);
  assert.match(effect, /shouldScheduleTelemetryFlush\(previous, state/);
  assert.match(api, /backgroundTransitionAtStart\s*=\s*appBackgroundTransitionTracker\.capture\(\)/);
  assert.match(api, /crossedBackground:\s*appBackgroundTransitionTracker\.crossedSince\(backgroundTransitionAtStart\)/);
  assert.match(supabase, /crossedBackground:\s*appBackgroundTransitionTracker\.crossedSince\(backgroundTransitionAtStart\)/);
});
