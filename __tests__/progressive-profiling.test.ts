import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isPromptEligible,
  promptStorageKey,
  recordPromptDismissal,
  getPromptDismissedAt,
  clearPromptDismissal,
  buildProgressiveAnalyticsEvent,
  PROMPT_DISMISSAL_TTL_MS,
  type SimpleStorage,
  type PromptKey,
} from '../lib/progressiveProfiling';

class MemoryStorage implements SimpleStorage {
  private map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}

describe('Restrained Progressive Profiling & Dismissal TTL Invariants', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('evaluates panchang_rashi eligibility accurately for Hindu vs non-Hindu and presence of rashi', () => {
    // Hindu with missing rashi and not dismissed
    assert.equal(
      isPromptEligible({
        promptKey: 'panchang_rashi',
        tradition: 'hindu',
        profile: { rashi: null },
        dismissedAtMs: null,
      }),
      true
    );

    // Hindu with existing rashi
    assert.equal(
      isPromptEligible({
        promptKey: 'panchang_rashi',
        tradition: 'hindu',
        profile: { rashi: 'karka' },
        dismissedAtMs: null,
      }),
      false
    );

    // Non-Hindu (e.g. Sikh) even if rashi is null
    assert.equal(
      isPromptEligible({
        promptKey: 'panchang_rashi',
        tradition: 'sikh',
        profile: { rashi: null },
        dismissedAtMs: null,
      }),
      false
    );
  });

  it('enforces 30-day dismissal TTL strictly', () => {
    const now = 1_700_000_000_000;
    const twentyNineDaysAgo = now - 29 * 24 * 60 * 60 * 1000;
    const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000;

    // Dismissed 29 days ago -> must NOT be eligible (< 30 days)
    assert.equal(
      isPromptEligible({
        promptKey: 'sankalpa_gotra',
        tradition: 'hindu',
        profile: { gotra: null },
        dismissedAtMs: twentyNineDaysAgo,
        nowMs: now,
      }),
      false
    );

    // Dismissed 31 days ago -> eligible again (>= 30 days)
    assert.equal(
      isPromptEligible({
        promptKey: 'sankalpa_gotra',
        tradition: 'hindu',
        profile: { gotra: null },
        dismissedAtMs: thirtyOneDaysAgo,
        nowMs: now,
      }),
      true
    );
  });

  it('persists and isolates dismissals strictly per user ID', async () => {
    const userA = 'user-a';
    const userB = 'user-b';
    const now = 1_700_000_000_000;

    await recordPromptDismissal(userA, 'panchang_rashi', now, storage);

    const dismissedA = await getPromptDismissedAt(userA, 'panchang_rashi', storage);
    const dismissedB = await getPromptDismissedAt(userB, 'panchang_rashi', storage);

    assert.equal(dismissedA, now);
    assert.equal(dismissedB, null);
  });

  it('guarantees analytics events contain only prompt key and action, zero sensitive fields', () => {
    const event = buildProgressiveAnalyticsEvent('panchang_rashi', 'dismissed');

    assert.deepEqual(event, {
      event: 'progressive_profiling',
      prompt_key: 'panchang_rashi',
      action: 'dismissed',
    });

    const forbiddenKeys = ['dob', 'date_of_birth', 'rashi', 'nakshatra', 'gotra', 'location', 'city', 'country', 'name'];
    for (const key of forbiddenKeys) {
      assert.equal(key in event, false, `Analytics event must never contain ${key}`);
    }
  });
});
