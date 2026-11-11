import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_NOTIFICATION_CATEGORY_CHOICES, getNotificationPersistencePayload } from '../lib/onboarding-contract';

// Founder decision 2026-11-12: every reminder is ON for a new profile except Brahma Muhurta, which stays an
// opt-in. Onboarding shows each as its own pre-selected choice (AGENTS.md rule 19); Settings must agree when a
// profile value is missing, or it would show Brahma Muhurta as ON while the database says OFF.
describe('notification default tier', () => {
  it('onboarding starts every category on except Brahma Muhurta', () => {
    assert.deepEqual(DEFAULT_NOTIFICATION_CATEGORY_CHOICES, {
      festivalsAndVrats: true, dailySadhana: true, dailyQuiz: true, communityAndFamily: true, brahmaMuhurta: false,
    });
    const payload = getNotificationPersistencePayload(DEFAULT_NOTIFICATION_CATEGORY_CHOICES) as Record<string, unknown>;
    const off = Object.entries(payload).filter(([k, v]) => typeof v === 'boolean' && v === false).map(([k]) => k);
    assert.deepEqual(off, ['wants_brahma_muhurta_reminders']);
  });

  it('writes the older Nitya column equal to the one the dispatcher reads', () => {
    for (const dailySadhana of [true, false]) {
      const p = getNotificationPersistencePayload({ ...DEFAULT_NOTIFICATION_CATEGORY_CHOICES, dailySadhana }) as Record<string, unknown>;
      assert.equal(p.nitya_reminder_enabled, dailySadhana);
      assert.equal(p.nitya_reminder_enabled, p.wants_nitya_reminders);
    }
  });

  it('Settings falls back to the same tier when a profile value is missing', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'settings', 'detail-screen.tsx'), 'utf8');
    const block = src.slice(src.indexOf('const INITIAL_SETTINGS'), src.indexOf('app_language:', src.indexOf('const INITIAL_SETTINGS')));
    const flags = [...block.matchAll(/^\s*((?:wants_\w+|\w+_reminder_enabled)):\s*(true|false),/gm)].map((m) => [m[1], m[2]]);
    assert.ok(flags.length === 17, 'all 17 reminder flags Native shows are listed');
    for (const [key, value] of flags) {
      assert.equal(value, key === 'wants_brahma_muhurta_reminders' ? 'false' : 'true', `${key} fallback`);
    }
  });
});
