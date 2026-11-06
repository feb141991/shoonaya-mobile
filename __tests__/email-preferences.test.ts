import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  EMAIL_WORDING_VERSIONS,
  STRICTEST_EMAIL_WORDING,
  emailWordingCopy,
  normaliseEmailWording,
} from '../lib/emailConsentCopy';
import {
  buildEmailConsentBody,
  emailPreferencesPath,
  normaliseRegionCode,
  parseEmailPolicyOnly,
  parseEmailPreferences,
  parseEmailPreferencesChange,
  regionFromLocale,
} from '../lib/emailPreferences';
import { backendUnavailable, recordOnboardingEmailOptInWith } from '../lib/emailOnboardingConsent';
import { ApiRequestError } from '../lib/user-facing-error';

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('wording by region', () => {
  it('knows exactly the two versions, and shows the strictest for anything it does not know', () => {
    assert.deepEqual([...EMAIL_WORDING_VERSIONS].sort(), ['eu-uk-v1', 'global-v1']);
    assert.equal(STRICTEST_EMAIL_WORDING, 'eu-uk-v1');
    for (const unknown of [undefined, null, '', 'global-v2', 'EU-UK-V1', 7, {}]) {
      assert.equal(normaliseEmailWording(unknown), 'eu-uk-v1', String(unknown));
    }
    assert.equal(normaliseEmailWording('global-v1'), 'global-v1');
  });

  it('every version has complete text in both languages', () => {
    for (const version of EMAIL_WORDING_VERSIONS) {
      for (const language of ['en', 'hi'] as const) {
        const copy = emailWordingCopy(version, language);
        for (const text of [copy.newsletter.label, copy.newsletter.help, copy.festivals.label, copy.festivals.help, copy.note]) {
          assert.ok(text.trim().length > 10, `${version}/${language}`);
        }
        if (language === 'hi') for (const text of [copy.newsletter.help, copy.festivals.help, copy.note]) assert.match(text, /[ऀ-ॿ]/, `${version}/hi is Devanagari`);
      }
    }
  });

  it('a language with no text of its own (Punjabi) reads the English text, never a missing string', () => {
    assert.deepEqual(emailWordingCopy('global-v1', 'pa' as never), emailWordingCopy('global-v1', 'en'));
  });

  it('the strict wording says nothing is sent unless the switch is on and where to turn it off; the global one keeps its original text', () => {
    const strict = emailWordingCopy('eu-uk-v1', 'en');
    for (const text of [strict.newsletter.help, strict.festivals.help]) {
      assert.match(text, /we email you only if you turn this on/);
      assert.match(text, /Settings, then Email/);
      assert.match(text, /link in every email/);
    }
    assert.equal(emailWordingCopy('global-v1', 'en').newsletter.help, 'New features, festival guides and a weekly newsletter. Optional, and you can unsubscribe at any time.');
    assert.match(strict.note, /sign-in alerts/);
  });

  it('unknown versions resolve to the strict text in the copy table', () => {
    assert.deepEqual(emailWordingCopy('made-up', 'en'), emailWordingCopy('eu-uk-v1', 'en'));
  });
});

describe('device region and request building', () => {
  it('reads the region from a locale tag, and never guesses one from the language alone', () => {
    assert.equal(regionFromLocale('en-IN'), 'IN');
    assert.equal(regionFromLocale('hi_IN'), 'IN');
    assert.equal(regionFromLocale('zh-Hant-TW'), 'TW');
    assert.equal(regionFromLocale('en-US-u-ca-gregory'), 'US');
    for (const none of ['hi', 'en', 'en-Latn', 'en-XX', '', 'not a locale', null, undefined, 7]) {
      assert.equal(regionFromLocale(none), null, String(none));
    }
  });

  it('normalises a country code to two uppercase letters or null', () => {
    assert.equal(normaliseRegionCode(' de '), 'DE');
    for (const bad of ['', 'XX', 'xx', 'IND', 'I', '1N', null, undefined, 3]) assert.equal(normaliseRegionCode(bad), null, String(bad));
  });

  it('builds the preferences path with only a valid region and the exact policyOnly flag', () => {
    assert.equal(emailPreferencesPath(), '/api/native/email-preferences');
    assert.equal(emailPreferencesPath({ deviceRegion: 'in' }), '/api/native/email-preferences?deviceRegion=IN');
    assert.equal(emailPreferencesPath({ policyOnly: true, deviceRegion: 'DE' }), '/api/native/email-preferences?policyOnly=1&deviceRegion=DE');
    assert.equal(emailPreferencesPath({ deviceRegion: 'junk&x=1' }), '/api/native/email-preferences');
    assert.equal(emailPreferencesPath({ deviceRegion: null }), '/api/native/email-preferences');
  });

  it('builds a change body with only what the server accepts, never an account id', () => {
    const body = JSON.parse(buildEmailConsentBody({ category: 'festivals', granted: true, source: 'settings', wordingVersion: 'global-v1', deviceRegion: 'in' }));
    assert.deepEqual(body, { category: 'festivals', granted: true, source: 'settings', wordingVersion: 'global-v1', deviceRegion: 'IN' });
    for (const key of Object.keys(body)) assert.equal(/user/i.test(key), false, key);
    assert.deepEqual(JSON.parse(buildEmailConsentBody({ category: 'newsletter', granted: false, source: 'onboarding', wordingVersion: 'eu-uk-v1' })), {
      category: 'newsletter', granted: false, source: 'onboarding', wordingVersion: 'eu-uk-v1',
    });
  });

  it('refuses to build a body for a category, source or value the server would refuse', () => {
    const ok = { category: 'newsletter', granted: true, source: 'settings', wordingVersion: 'global-v1' } as const;
    assert.throws(() => buildEmailConsentBody({ ...ok, category: 'all' as never }), /invalid_email_category/);
    assert.throws(() => buildEmailConsentBody({ ...ok, category: 'sms' as never }), /invalid_email_category/);
    assert.throws(() => buildEmailConsentBody({ ...ok, granted: 'true' as never }), /invalid_email_granted/);
    assert.throws(() => buildEmailConsentBody({ ...ok, source: 'one_click' as never }), /invalid_email_source/);
  });

  it('sends the strictest wording when asked to send a version it does not know', () => {
    const body = JSON.parse(buildEmailConsentBody({ category: 'newsletter', granted: true, source: 'settings', wordingVersion: 'made-up' as never }));
    assert.equal(body.wordingVersion, 'eu-uk-v1');
  });
});

describe('strict response parsing: a malformed answer is an error, never "everything off"', () => {
  const policy = { region: 'IN', regionSource: 'ip_header', wordingVersion: 'global-v1' };
  const good = { newsletter: true, festivals: false, lastChangedAt: '2026-11-06T01:00:00.000Z', policy };

  it('accepts exactly the shape the server sends', () => {
    assert.deepEqual(parseEmailPreferences(good), good);
    assert.deepEqual(parseEmailPreferences({ ...good, lastChangedAt: null, policy: { region: null, regionSource: null, wordingVersion: 'eu-uk-v1' } })?.policy,
      { region: null, regionSource: null, wordingVersion: 'eu-uk-v1' });
    assert.deepEqual(parseEmailPolicyOnly({ policy }), policy);
    assert.deepEqual(parseEmailPreferencesChange({ ok: true, newsletter: false, festivals: true, lastChangedAt: null }), { newsletter: false, festivals: true, lastChangedAt: null });
  });

  it('an unknown wording version in a valid answer becomes the strictest text, not an error', () => {
    assert.equal(parseEmailPreferences({ ...good, policy: { ...policy, wordingVersion: 'future-v9' } })?.policy.wordingVersion, 'eu-uk-v1');
  });

  it('rejects every malformed answer', () => {
    for (const bad of [
      null, undefined, [], 'ok', 5, {},
      { ...good, newsletter: 'true' }, { ...good, festivals: 1 }, { ...good, newsletter: undefined },
      { ...good, lastChangedAt: 5 }, { ...good, policy: null }, { ...good, policy: [] },
      { ...good, policy: { ...policy, region: 'india' } }, { ...good, policy: { ...policy, regionSource: 'gps' } },
    ]) assert.equal(parseEmailPreferences(bad), null, JSON.stringify(bad));
    for (const bad of [null, {}, { policy: null }, { policy: { region: 'in', regionSource: null, wordingVersion: 'global-v1' } }]) {
      assert.equal(parseEmailPolicyOnly(bad), null, JSON.stringify(bad));
    }
    for (const bad of [null, {}, { ok: false, newsletter: true, festivals: true, lastChangedAt: null }, { ok: true, newsletter: 'x', festivals: true, lastChangedAt: null }, { ok: true, newsletter: true, festivals: true, lastChangedAt: 3 }]) {
      assert.equal(parseEmailPreferencesChange(bad), null, JSON.stringify(bad));
    }
  });
});

describe('recording the onboarding opt-in', () => {
  const api = (status: number, code: string | null = null) => new ApiRequestError(status, code);

  it('uses the backend when it answers, and writes nothing directly', async () => {
    const calls: string[] = [];
    const outcome = await recordOnboardingEmailOptInWith({ record: async () => { calls.push('record'); }, writeDirect: async () => { calls.push('direct'); } });
    assert.equal(outcome, 'recorded');
    assert.deepEqual(calls, ['record']);
  });

  it('retries once on an outage, then succeeds through the backend', async () => {
    let n = 0;
    const calls: string[] = [];
    const outcome = await recordOnboardingEmailOptInWith({
      record: async () => { n += 1; calls.push('record'); if (n === 1) throw api(503); },
      writeDirect: async () => { calls.push('direct'); },
    });
    assert.equal(outcome, 'recorded');
    assert.deepEqual(calls, ['record', 'record']);
  });

  for (const [name, error] of [
    ['a 500', api(500)], ['a 503', api(503)], ['a 502', api(502)],
    ['a route that is not deployed yet (404 with no app code)', api(404)],
    ['no network (a TypeError)', new TypeError('Network request failed')],
    ['an aborted request', Object.assign(new Error('x'), { name: 'AbortError' })],
  ] as const) {
    it(`falls back to the old direct write after two attempts when the backend is unavailable: ${name}`, async () => {
      const calls: string[] = [];
      const outcome = await recordOnboardingEmailOptInWith({
        record: async () => { calls.push('record'); throw error; },
        writeDirect: async () => { calls.push('direct'); },
      });
      assert.equal(outcome, 'written_directly');
      assert.deepEqual(calls, ['record', 'record', 'direct']);
    });
  }

  for (const [name, error] of [
    ['400', api(400, 'INVALID_REQUEST')], ['401', api(401)], ['403', api(403)], ['409 (account being deleted)', api(409, 'ACCOUNT_DELETING')],
    ['429', api(429)], ['404 profile not found', api(404, 'PROFILE_NOT_FOUND')],
  ] as const) {
    it(`never works around a refusal: ${name}`, async () => {
      const calls: string[] = [];
      const outcome = await recordOnboardingEmailOptInWith({
        record: async () => { calls.push('record'); throw error; },
        writeDirect: async () => { calls.push('direct'); },
      });
      assert.equal(outcome, 'not_recorded');
      assert.deepEqual(calls, ['record'], 'one attempt, no retry, no direct write');
    });
  }

  it('reports not_recorded, and throws nothing, when neither path works', async () => {
    const outcome = await recordOnboardingEmailOptInWith({
      record: async () => { throw api(503); },
      writeDirect: async () => { throw new Error('rls'); },
    });
    assert.equal(outcome, 'not_recorded');
  });

  it('classifies outages versus answers', () => {
    assert.equal(backendUnavailable(api(502)), true);
    assert.equal(backendUnavailable(api(404)), true);
    assert.equal(backendUnavailable(api(404, 'PROFILE_NOT_FOUND')), false);
    assert.equal(backendUnavailable(api(409, 'ACCOUNT_DELETING')), false);
    assert.equal(backendUnavailable(new Error('boom')), true);
  });
});

describe('Settings, Email screen', () => {
  const screen = strip(read('app/settings/email.tsx'));

  it('is listed in Settings and reachable', () => {
    assert.match(read('app/settings.tsx'), /title: 'Email'[^}]*href: '\/settings\/email'/);
  });

  it('reads and writes only through the two API calls, and keeps nothing on the device', () => {
    assert.match(screen, /fetchEmailPreferences\(userId\)/);
    assert.match(screen, /setEmailPreference\(userId, \{ category, granted, source: 'settings', wordingVersion: prefs\.policy\.wordingVersion \}\)/);
    assert.equal(/AsyncStorage|SecureStore|writeUserScoped|readUserScoped|localStorage/.test(screen), false, 'no persistence (AGENTS 26)');
    assert.equal(/supabase/.test(screen), false, 'no direct database access from the screen');
  });

  it('follows the signed-in account: clears on an identity change and drops late answers', () => {
    assert.match(screen, /setPrefs\(null\);[\s\S]*?\}, \[userId\]\)/);
    assert.ok((screen.match(/lease\.isCurrent\(\)/g) ?? []).length >= 6, 'every await is followed by an identity check');
    assert.match(screen, /captureAppIdentity\(\)/);
    assert.match(screen, /useFocusEffect/);
  });

  it('a switch only moves after the server has recorded the change, and one change runs at a time', () => {
    assert.match(screen, /if \(!userId \|\| !prefs \|\| busy\) return;/);
    assert.match(screen, /setPrefs\(\(current\) => current && \{[\s\S]*?newsletter: result\.newsletter,[\s\S]*?festivals: result\.festivals/);
    assert.equal(/setPrefs\([^)]*!prefs|optimistic/i.test(screen), false);
  });

  it('a failed read is a retryable error state, never "everything off"; a failed refresh keeps what is shown', () => {
    assert.match(screen, /prefs === null \?[\s\S]*?ctaLabel="Retry"/);
    assert.match(screen, /if \(current === null\) setLoadError\(/);
  });

  it('shows only sanitised failures (AGENTS 12) with the deletion status as its own sentence', () => {
    assert.equal((screen.match(/describeFailure\(/g) ?? []).length, 2);
    assert.match(screen, /409: 'This account is being deleted/);
    assert.equal(/error\.message|\.message\b|String\(error\)/.test(screen), false);
  });

  it('keeps 44pt touch targets, tokens only, wrapped text, a bottom inset and accessible switches', () => {
    assert.match(screen, /minHeight: MIN_TOUCH_TARGET/);
    assert.match(screen, /insets\.bottom \+ NAV_BAR_CLEARANCE/);
    assert.match(screen, /accessibilityRole="switch"/);
    assert.match(screen, /accessibilityState=\{\{ checked: value, disabled, busy \}\}/);
    assert.match(screen, /accessibilityLiveRegion="polite"/);
    assert.equal(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(screen), false, 'no colour literals');
    // AGENTS 17: text beside a switch must be bounded.
    assert.match(screen, /<View style=\{\{ flex: 1 \}\}>/);
  });

  it('shows the wording for the region the server named, and says account mail is not affected', () => {
    assert.match(screen, /emailWordingCopy\(prefs\?\.policy\.wordingVersion, language\)/);
    assert.match(screen, /copy\.note/);
  });
});

describe('the app never writes the consent columns itself', () => {
  const ALLOWED = new Map<string, string>([
    ['lib/onboarding-contract.ts', 'getMarketingConsentPayload: the documented fallback write'],
  ]);
  function files(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (['node_modules', 'ios', 'android', '.git', 'graphify-out', '__tests__'].includes(name)) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) files(path, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(path);
    }
    return out;
  }

  it('only the documented fallback names a consent column as an object key', () => {
    const offenders: string[] = [];
    for (const path of [...files(join(ROOT, 'app')), ...files(join(ROOT, 'lib')), ...files(join(ROOT, 'components'))]) {
      const rel = relative(ROOT, path);
      if (ALLOWED.has(rel) || rel.startsWith('lib/database')) continue;
      strip(readFileSync(path, 'utf8')).split('\n').forEach((line, i) => {
        if (/(^|[^\w.])(marketing_consent|email_newsletter|email_festivals)\s*:/.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 90)}`);
      });
    }
    assert.deepEqual(offenders, []);
  });

  it('the fallback is the only user of getMarketingConsentPayload outside tests', () => {
    const users = [...files(join(ROOT, 'app')), ...files(join(ROOT, 'lib')), ...files(join(ROOT, 'components'))]
      .map((p) => relative(ROOT, p))
      .filter((rel) => readFileSync(join(ROOT, rel), 'utf8').includes('getMarketingConsentPayload'))
      .sort();
    assert.deepEqual(users, ['app/(auth)/onboarding.tsx', 'lib/onboarding-contract.ts']);
  });
});

describe('API wrapper', () => {
  const api = strip(read('lib/emailPreferencesApi.ts'));

  it('names the signed-in account on every call and never takes an account from the caller input', () => {
    assert.equal((api.match(/expectedUserId: userId/g) ?? []).length, 3);
    assert.equal(/user_id|userId:\s*input/.test(api), false);
  });

  it('turns every non-OK or malformed answer into an error, and stores nothing', () => {
    assert.equal((api.match(/throw await requestErrorFromResponse\(/g) ?? []).length, 3);
    assert.equal((api.match(/throw new ApiRequestError\(502, 'EMAIL_PREFERENCES_INVALID'\)/g) ?? []).length, 3);
    assert.equal(/AsyncStorage|writeUserScoped|cache/i.test(api), false);
  });
});
