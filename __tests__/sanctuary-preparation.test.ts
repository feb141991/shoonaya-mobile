import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beginSanctuaryPreparation, clearSanctuaryPreparation, getSanctuaryPreparation, prepareSanctuaryHome, sanctuaryFirstName } from '../lib/sanctuaryPreparation';
import { captureAppIdentity, setAppIdentity } from '../lib/appIdentity';

const summary = {
  profile: { tradition: 'sikh', name: 'Amrit Singh' }, hero: {}, sacredText: {}, practices: [],
  date: { iso: '2026-10-28', timezone: 'Europe/London' }, panchang: { calendarStatus: 'pending' },
};
const response = (value: unknown = summary, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(value), { status, headers });

describe('post-onboarding sanctuary preparation', () => {
  it('warms one sanitized Home snapshot without claiming the pending calendar is ready', async () => {
    let calls = 0;
    const cached: any[] = [];
    const result = await prepareSanctuaryHome({
      fetchSummary: async () => { calls++; return response(); },
      cacheHome: async payload => { cached.push(payload); },
      isCurrent: () => true, signal: new AbortController().signal,
    });
    assert.equal(result, 'ready');
    assert.equal(calls, 1);
    assert.equal(cached.length, 1);
    assert.equal(cached[0].profile.tradition, 'sikh');
    assert.equal(cached[0].date.timezone, 'Europe/London');
    assert.equal(cached[0].panchang.calendarStatus, 'pending');
  });

  for (const failure of ['503', 'degraded-profile', 'invalid-json', 'missing-date', 'missing-timezone', 'missing-tradition', 'network']) {
    it(`continues without seeding fabricated defaults on ${failure}`, async () => {
      let writes = 0;
      const result = await prepareSanctuaryHome({
        fetchSummary: async () => {
          if (failure === 'network') throw new Error('transport');
          if (failure === '503') return response({}, 503);
          if (failure === 'degraded-profile') return response(summary, 200, { 'X-Shoonaya-Degraded-Sections': 'profile' });
          if (failure === 'invalid-json') return new Response('not json');
          if (failure === 'missing-tradition') return response({ ...summary, profile: {} });
          return response({ ...summary, date: failure === 'missing-date' ? {} : { iso: summary.date.iso } });
        },
        cacheHome: async () => { writes++; }, isCurrent: () => true, signal: new AbortController().signal,
      });
      assert.equal(result, 'deferred');
      assert.equal(writes, 0);
    });
  }

  it('bounds an unresponsive network call and aborts it, with no retry loop', async () => {
    let signal: AbortSignal | undefined;
    const result = await prepareSanctuaryHome({
      fetchSummary: value => { signal = value; return new Promise<Response>(() => {}); },
      cacheHome: async () => assert.fail('no snapshot exists'),
      isCurrent: () => true, signal: new AbortController().signal, timeoutMs: 10,
    });
    assert.equal(result, 'deferred');
    assert.equal(signal?.aborted, true);
  });

  it('Continue cancels immediately and a late response cannot write', async () => {
    const controller = new AbortController();
    let resolve!: (response: Response) => void;
    let writes = 0;
    const pending = prepareSanctuaryHome({
      fetchSummary: () => new Promise<Response>(done => { resolve = done; }),
      cacheHome: async () => { writes++; }, isCurrent: () => true, signal: controller.signal,
    });
    controller.abort();
    assert.equal(await pending, 'cancelled');
    resolve(response());
    await new Promise(done => setTimeout(done, 0));
    assert.equal(writes, 0);
  });

  it('rejects stale-identity responses, including an expired A-to-B-to-A lease', async () => {
    setAppIdentity({ kind: 'authenticated', userId: 'a' });
    const lease = captureAppIdentity();
    const result = await prepareSanctuaryHome({
      fetchSummary: async () => {
        setAppIdentity({ kind: 'authenticated', userId: 'b' });
        setAppIdentity({ kind: 'authenticated', userId: 'a' });
        return response();
      },
      cacheHome: async () => assert.fail('stale response'), isCurrent: lease.isCurrent,
      signal: new AbortController().signal,
    });
    assert.equal(result, 'cancelled');
  });

  it('does not block entry on a failed cache write', async () => {
    const result = await prepareSanctuaryHome({
      fetchSummary: async () => response(), cacheHome: async () => { throw new Error('storage unavailable'); },
      isCurrent: () => true, signal: new AbortController().signal,
    });
    assert.equal(result, 'deferred');
  });

  it('bounds storage preparation too, not just HTTP time', async () => {
    const result = await prepareSanctuaryHome({
      fetchSummary: async () => response(), cacheHome: () => new Promise<void>(() => {}),
      isCurrent: () => true, signal: new AbortController().signal, timeoutMs: 10,
    });
    assert.equal(result, 'deferred');
  });

  it('does no network work for a previously cancelled transition', async () => {
    const controller = new AbortController();
    controller.abort();
    assert.equal(await prepareSanctuaryHome({
      fetchSummary: async () => assert.fail('already cancelled'), cacheHome: async () => {},
      isCurrent: () => true, signal: controller.signal,
    }), 'cancelled');
  });

  it('clears only its own ephemeral handoff and preserves a newer one', () => {
    const first = { userId: 'a', displayName: 'A', tradition: 'sikh' as const, language: 'en' as const, destination: '/(tabs)' as const, isCurrent: () => true };
    const second = { ...first, userId: 'b' };
    beginSanctuaryPreparation(first);
    beginSanctuaryPreparation(second);
    clearSanctuaryPreparation(first);
    assert.equal(getSanctuaryPreparation(), second);
    clearSanctuaryPreparation(second);
    assert.equal(getSanctuaryPreparation(), null);
  });

  it('uses the first name and localized empty-name fallback', () => {
    assert.equal(sanctuaryFirstName('  Amrit  Singh ', 'en'), 'Amrit');
    assert.equal(sanctuaryFirstName('प्रिया शर्मा', 'hi'), 'प्रिया');
    assert.equal(sanctuaryFirstName(' ', 'hi'), 'साधक');
  });

  it('keeps the save gate, selected destination, reduced motion and escape routes connected', () => {
    const onboarding = readFileSync(new URL('../app/(auth)/onboarding.tsx', import.meta.url), 'utf8');
    const scene = readFileSync(new URL('../components/onboarding/SanctuaryPreparationScene.tsx', import.meta.url), 'utf8');
    const route = readFileSync(new URL('../app/sanctuary-preparing.tsx', import.meta.url), 'utf8');
    const layout = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');
    assert.ok(onboarding.indexOf('beginSanctuaryPreparation({') > onboarding.indexOf('if (insertError) throw insertError'));
    assert.ok(onboarding.includes("router.replace('/sanctuary-preparing' as Href)"));
    assert.ok(scene.includes('useReducedMotion()'));
    assert.ok(scene.includes('onPress={onContinue}'));
    assert.ok(scene.includes('<ScrollView'));
    assert.ok(route.includes("BackHandler.addEventListener('hardwareBackPress'"));
    assert.ok(route.includes('context?.destination'));
    assert.ok(route.includes("payload.panchang.calendarStatus === 'ready' ? Date.now() : 0"));
    assert.ok(layout.includes("rootSegment !== 'sanctuary-preparing'"));
    assert.ok(!route.includes('ahimsa-hand.png'), 'do not reuse the mislabeled generic peace icon as a Jain symbol');
  });
});
