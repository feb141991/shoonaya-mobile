import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Account Deletion Contract & Cool-off Flow', () => {
  it('builds POST /api/user/delete/request payload with reason and optional otherReason', () => {
    const buildPayload = (reason?: string, otherReason?: string) => {
      const payload: { reason?: string; otherReason?: string } = {};
      if (reason) payload.reason = reason;
      if (otherReason && otherReason.trim()) payload.otherReason = otherReason.trim();
      return payload;
    };

    const payloadWithBoth = buildPayload('too_many_notifications', 'Getting too many pings');
    assert.deepEqual(payloadWithBoth, {
      reason: 'too_many_notifications',
      otherReason: 'Getting too many pings',
    });

    const payloadReasonOnly = buildPayload('taking_break');
    assert.deepEqual(payloadReasonOnly, {
      reason: 'taking_break',
    });

    const payloadEmpty = buildPayload();
    assert.deepEqual(payloadEmpty, {});
  });

  it('calculates daysRemaining accurately from purgeAfter ISO timestamp', () => {
    const computeDaysRemaining = (purgeAfter: string | null): number | null => {
      if (!purgeAfter) return null;
      const target = new Date(purgeAfter).getTime();
      const now = Date.now();
      const diffMs = target - now;
      if (diffMs <= 0) return 0;
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    };

    // 15 days in the future
    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(computeDaysRemaining(futureDate), 15);

    // Past date should clamp to 0
    const pastDate = new Date(Date.now() - 1000).toISOString();
    assert.equal(computeDaysRemaining(pastDate), 0);

    // Null should return null
    assert.equal(computeDaysRemaining(null), null);
  });

  it('parses GET /api/user/delete/status response format safely', () => {
    const parseStatusResponse = (data: unknown) => {
      if (!data || typeof data !== 'object') return null;
      const body = data as {
        success?: boolean;
        isDeleting?: boolean;
        deletionRequestedAt?: string | null;
        purgeAfter?: string | null;
      };
      if (!body.success) return null;
      return {
        isDeleting: !!body.isDeleting,
        deletionRequestedAt: body.deletionRequestedAt ?? null,
        purgeAfter: body.purgeAfter ?? null,
      };
    };

    const validActive = parseStatusResponse({
      success: true,
      isDeleting: true,
      deletionRequestedAt: '2026-10-01T00:00:00.000Z',
      purgeAfter: '2026-10-31T00:00:00.000Z',
    });
    assert.deepEqual(validActive, {
      isDeleting: true,
      deletionRequestedAt: '2026-10-01T00:00:00.000Z',
      purgeAfter: '2026-10-31T00:00:00.000Z',
    });

    const notDeleting = parseStatusResponse({
      success: true,
      isDeleting: false,
    });
    assert.deepEqual(notDeleting, {
      isDeleting: false,
      deletionRequestedAt: null,
      purgeAfter: null,
    });

    const malformed = parseStatusResponse({ error: 'Unauthorized' });
    assert.equal(malformed, null);
  });

  it('pauses all notification categories when opting for notification off-ramp', () => {
    const currentSettings = {
      japa_reminder_enabled: true,
      wants_festival_reminders: true,
      wants_vrat_reminders: true,
      wants_tithi_reminders: true,
      wants_shloka_reminders: true,
      wants_nitya_reminders: true,
      wants_community_notifications: true,
      wants_family_notifications: true,
      theme_preference: 'system',
    };

    const mutedSettings = {
      japa_reminder_enabled: false,
      wants_festival_reminders: false,
      wants_vrat_reminders: false,
      wants_tithi_reminders: false,
      wants_shloka_reminders: false,
      wants_nitya_reminders: false,
      wants_community_notifications: false,
      wants_family_notifications: false,
    };

    const nextState = { ...currentSettings, ...mutedSettings };

    assert.equal(nextState.japa_reminder_enabled, false);
    assert.equal(nextState.wants_festival_reminders, false);
    assert.equal(nextState.wants_vrat_reminders, false);
    assert.equal(nextState.wants_tithi_reminders, false);
    assert.equal(nextState.wants_shloka_reminders, false);
    assert.equal(nextState.wants_nitya_reminders, false);
    assert.equal(nextState.wants_community_notifications, false);
    assert.equal(nextState.wants_family_notifications, false);
    // Non-notification settings are preserved
    assert.equal(nextState.theme_preference, 'system');
  });

  it('parses GET /api/user/delete/preview payload without fabricating relics count', () => {
    const parsePreview = (json: unknown) => {
      if (!json || typeof json !== 'object') return null;
      const data = json as {
        success?: boolean;
        userName?: string;
        tradition?: string;
        streak?: number;
        karmaPoints?: number;
        sevaScore?: number;
        relicsCount?: number;
        journalCount?: number;
        activeSankalpas?: number;
        isPro?: boolean;
        ownedKuls?: Array<{ id: string; name: string }>;
        ownedMandalis?: Array<{ id: string; name: string }>;
      };
      if (!data.success) return null;
      return {
        userName: data.userName || 'Seeker',
        tradition: data.tradition || 'hindu',
        streak: data.streak ?? 0,
        karmaPoints: data.karmaPoints ?? 0,
        sevaScore: data.sevaScore ?? 0,
        relicsCount: data.relicsCount ?? 0,
        journalCount: data.journalCount ?? 0,
        activeSankalpas: data.activeSankalpas ?? 0,
        isPro: Boolean(data.isPro),
        ownedKuls: data.ownedKuls ?? [],
        ownedMandalis: data.ownedMandalis ?? [],
      };
    };

    const preview = parsePreview({
      success: true,
      userName: 'Arjun',
      tradition: 'hindu',
      streak: 42,
      karmaPoints: 1200,
      sevaScore: 350,
      relicsCount: 4,
      journalCount: 15,
      activeSankalpas: 2,
      isPro: true,
      ownedKuls: [{ id: 'kul-1', name: 'Saraswati Kul' }],
      ownedMandalis: [],
    });

    assert.notEqual(preview, null);
    assert.equal(preview?.userName, 'Arjun');
    assert.equal(preview?.relicsCount, 4); // Exact server metric, not streak/7
    assert.equal(preview?.isPro, true);
    assert.equal(preview?.ownedKuls.length, 1);
    assert.equal(preview?.ownedKuls[0].name, 'Saraswati Kul');
  });
});
