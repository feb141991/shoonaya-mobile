import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  RELIGIOUS_DATA_CONSENT_COPY,
  canLeavePreferences,
  planConsentChange,
  planTraditionTap,
  storableTradition,
  traditionNeedsReligiousDataConsent,
} from '../lib/religious-data-consent';
import { buildOnboardingProfilePayload, type TraditionKey } from '../lib/onboarding-contract';
import { OnboardingDraftStore, getDraftStorageKey, type OnboardingDraftData, type StorageAdapter } from '../lib/onboardingDraft';

const NOW = '2026-10-15T08:00:00.000Z';
const FAITH: TraditionKey[] = ['hindu', 'sikh', 'buddhist', 'jain'];

const base = {
  displayName: 'Meera',
  language: 'en' as const,
  dateOfBirth: '1990-01-01',
  gender: 'female' as const,
  lifeStage: 'grihastha' as const,
  rashi: 'karka',
  nakshatra: 'pushya',
  gotra: 'Kashyap',
  calendarProfile: 'north_indian_purnimanta' as const,
  calendarScope: 'all_observances' as const,
  goals: ['peace'],
  notificationsEnabled: true,
  consentRecordedAt: NOW,
};

describe('which choices carry religious information', () => {
  it('every faith tradition needs agreement; the neutral choice and no choice do not', () => {
    for (const t of FAITH) assert.equal(traditionNeedsReligiousDataConsent(t), true, t);
    assert.equal(traditionNeedsReligiousDataConsent('none'), false);
    assert.equal(traditionNeedsReligiousDataConsent(null), false);
  });

  it('a faith tradition is storable only with agreement; otherwise the neutral choice', () => {
    for (const t of FAITH) {
      assert.equal(storableTradition(t, true), t);
      assert.equal(storableTradition(t, false), 'none');
    }
    assert.equal(storableTradition('none', false), 'none');
    assert.equal(storableTradition(null, true), 'none');
  });
});

describe('leaving the first step', () => {
  it('a faith tradition cannot continue until the switch is on', () => {
    for (const t of FAITH) {
      assert.equal(canLeavePreferences({ tradition: t, language: 'en', religiousDataConsent: false }), false, t);
      assert.equal(canLeavePreferences({ tradition: t, language: 'en', religiousDataConsent: true }), true, t);
    }
  });

  it('the neutral choice continues without any agreement, and language is still required', () => {
    assert.equal(canLeavePreferences({ tradition: 'none', language: 'hi', religiousDataConsent: false }), true);
    assert.equal(canLeavePreferences({ tradition: 'none', language: null, religiousDataConsent: false }), false);
    assert.equal(canLeavePreferences({ tradition: null, language: 'en', religiousDataConsent: true }), false);
    assert.equal(canLeavePreferences({ tradition: 'hindu', language: null, religiousDataConsent: true }), false);
  });
});

describe('what is saved to the account the moment a tradition is tapped', () => {
  it('a faith tradition tapped before agreeing is saved nowhere on the account', () => {
    for (const t of FAITH) assert.equal(planTraditionTap({ tradition: t, hadConsent: false, now: NOW }), null, t);
  });

  it('a faith tradition tapped after agreeing is saved, and does not re-stamp the agreement', () => {
    assert.deepEqual(planTraditionTap({ tradition: 'sikh', hadConsent: true, now: NOW }), { tradition: 'sikh' });
  });

  it('the neutral choice is saved; if the person had agreed a moment ago it also records the withdrawal', () => {
    assert.deepEqual(planTraditionTap({ tradition: 'none', hadConsent: false, now: NOW }), { tradition: 'none' });
    assert.deepEqual(planTraditionTap({ tradition: 'none', hadConsent: true, now: NOW }), {
      tradition: 'none',
      consent_religious_data: false,
      consent_updated_at: NOW,
    });
  });
});

describe('turning the switch on or off', () => {
  it('on: saves the tradition together with the agreement and its time', () => {
    assert.deepEqual(planConsentChange({ tradition: 'jain', agreed: true, now: NOW }), {
      tradition: 'jain',
      consent_religious_data: true,
      consent_updated_at: NOW,
    });
  });

  it('off: removes the tradition that was saved because of the agreement, and records the withdrawal', () => {
    assert.deepEqual(planConsentChange({ tradition: 'jain', agreed: false, now: NOW }), {
      tradition: 'none',
      consent_religious_data: false,
      consent_updated_at: NOW,
    });
  });

  it('there is nothing to save when no faith tradition is selected', () => {
    assert.equal(planConsentChange({ tradition: 'none', agreed: true, now: NOW }), null);
    assert.equal(planConsentChange({ tradition: null, agreed: true, now: NOW }), null);
  });
});

describe('the final onboarding save', () => {
  it('with agreement: keeps the tradition and the Hindu-only details, and records the agreement', () => {
    const p = buildOnboardingProfilePayload({ ...base, tradition: 'hindu', religiousDataConsent: true });
    assert.equal(p.tradition, 'hindu');
    assert.equal(p.consent_religious_data, true);
    assert.equal((p as { consent_updated_at?: string }).consent_updated_at, NOW);
    assert.equal(p.rashi, 'karka');
    assert.equal(p.nakshatra, 'pushya');
    assert.equal(p.gotra, 'Kashyap');
    assert.equal(p.calendar_profile, 'north_indian_purnimanta');
  });

  it('without agreement the faith tradition and every detail that goes with it are dropped, whatever the screen held', () => {
    for (const t of FAITH) {
      const p = buildOnboardingProfilePayload({ ...base, tradition: t, religiousDataConsent: false });
      assert.equal(p.tradition, 'none', t);
      assert.equal(p.consent_religious_data, false, t);
      assert.equal(p.rashi, null, t);
      assert.equal(p.nakshatra, null, t);
      assert.equal(p.gotra, null, t);
      assert.equal(p.calendar_profile, null, t);
      assert.equal(p.calendar_scope, null, t);
    }
  });

  it('the neutral choice saves no tradition, records no agreement, and leaves an earlier stamp alone', () => {
    const p = buildOnboardingProfilePayload({ ...base, tradition: 'none', religiousDataConsent: true });
    assert.equal(p.tradition, 'none');
    assert.equal(p.consent_religious_data, false, 'a stray true must not survive the neutral choice');
    assert.equal('consent_updated_at' in p, false);
  });

  it('details that are not religious (name, date of birth, language) are saved either way', () => {
    const p = buildOnboardingProfilePayload({ ...base, tradition: 'hindu', religiousDataConsent: false });
    assert.equal(p.full_name, 'Meera');
    assert.equal(p.date_of_birth, '1990-01-01');
    assert.equal(p.app_language, 'en');
  });
});

describe('a resumed draft', () => {
  class MemoryStorage implements StorageAdapter {
    map = new Map<string, string>();
    async getItem(k: string) { return this.map.get(k) ?? null; }
    async setItem(k: string, v: string) { this.map.set(k, v); }
    async removeItem(k: string) { this.map.delete(k); }
    async getAllKeys() { return [...this.map.keys()]; }
    async multiRemove(keys: readonly string[]) { for (const k of keys) this.map.delete(k); }
  }
  const draft = (extra: Partial<OnboardingDraftData> = {}): OnboardingDraftData => ({
    step: 'personal', tradition: 'hindu', language: 'en', dateOfBirth: '', gender: 'prefer_not', lifeStage: null,
    isManualLifeStage: false, rashi: '', nakshatra: '', gotra: '', calendarProfile: '', calendarScope: '', goals: [], name: '', ...extra,
  });

  it('remembers an agreement that was given', async () => {
    const store = new OnboardingDraftStore(new MemoryStorage(), { now: () => 1_000_000 });
    await store.saveDraft('u1', draft({ religiousDataConsent: true }));
    assert.equal((await store.readDraft('u1'))?.religiousDataConsent, true);
  });

  it('a draft written before the switch existed reads as not agreed, so the person is asked again', async () => {
    const storage = new MemoryStorage();
    const store = new OnboardingDraftStore(storage, { now: () => 1_000_000 });
    await store.saveDraft('u1', draft());
    const restored = await store.readDraft('u1');
    assert.notEqual(restored?.religiousDataConsent, true);
    assert.ok(storage.map.has(getDraftStorageKey('u1')));
  });
});

describe('the wording', () => {
  it('exists in both languages with every part, and the switch is described as off by default', () => {
    for (const lang of ['en', 'hi'] as const) {
      const c = RELIGIOUS_DATA_CONSENT_COPY[lang];
      for (const key of ['title', 'body', 'switchLabel', 'switchHint', 'needed', 'footer'] as const) {
        assert.ok(c[key].length > 10, `${lang}.${key}`);
      }
    }
    assert.match(RELIGIOUS_DATA_CONSENT_COPY.en.switchHint, /off by default/i);
  });

  it('names the data it covers and points to the real places to change it', () => {
    const en = RELIGIOUS_DATA_CONSENT_COPY.en;
    for (const word of ['tradition', 'date of birth', 'nakshatra', 'rashi', 'gotra']) assert.match(en.body, new RegExp(word, 'i'), word);
    assert.match(en.footer, /Settings/);
    assert.match(en.footer, /Privacy & Data/);
    assert.match(en.footer, /Universal \/ Exploring/);
  });
});

// The screen is wired to the rules above. These read the source because the screen cannot be mounted here; they
// guard the wiring that makes the rules apply, not the rules themselves.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('onboarding screen wiring', () => {
  const screen = readFileSync(join(process.cwd(), 'app/(auth)/onboarding.tsx'), 'utf8');

  it('never saves a tradition straight from a tap: every tradition write goes through the consent plan', () => {
    assert.doesNotMatch(screen, /persistPreferenceEarly\(\{\s*tradition/);
    assert.match(screen, /planTraditionTap\(\{ tradition: t\.key, hadConsent, now:/);
    assert.match(screen, /planConsentChange\(\{ tradition, agreed,/);
  });

  it('the first step cannot be left, and the account is not told the tradition, without agreement', () => {
    assert.match(screen, /primaryDisabled=\{[\s\S]*?step === 'preferences' && !canLeavePreferences\(\{ tradition, language, religiousDataConsent \}\)/);
    assert.match(screen, /if \(!tradition \|\| !language \|\| !canLeavePreferences\(/);
  });

  it('shows the switch only for a faith tradition, off until turned on, and keeps it in the resumable draft', () => {
    assert.match(screen, /const \[religiousDataConsent, setReligiousDataConsent\] = useState\(false\)/);
    assert.match(screen, /traditionNeedsReligiousDataConsent\(tradition\) \? \(\s*<ReligiousDataConsentCard/);
    assert.match(screen, /setReligiousDataConsent\(draft\.religiousDataConsent === true\)/);
    assert.match(screen, /religiousDataConsent,\s*\n\s*\.\.\.overrides/);
  });

  it('the final save carries the choice and when it was made', () => {
    assert.match(screen, /religiousDataConsent,\s*\n\s*consentRecordedAt: new Date\(\)\.toISOString\(\)/);
  });
});
