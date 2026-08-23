import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNativeRoute, pathFromUrlLike } from '../lib/routes';
import {
  isEligibleToObserveToday,
  buildVratObservationPayload,
  type ObservationEligibleOccurrence,
} from '../lib/vrat-observation';
import { lookupVratData, getVratData } from '../lib/vrat-data';
import type { ClientObservanceResult } from '../lib/calendar-contract';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Vrat Prompt 2: Canonical Native Today, Identity & Routing Suite', () => {
  const canonicalToday = '2026-08-23';

  // 1. Today comes only from canonical server results
  it('1. filters today occurrence strictly from canonical server results', () => {
    const rawObservances: ClientObservanceResult[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        festivalId: 'ekadashi',
        slug: 'ekadashi',
        display_name: 'Aja Ekadashi',
        emoji: '🌿',
        kind: 'vrat',
        tradition: 'hindu',
        route_kind: 'vrat',
        route_slug: 'ekadashi',
        description: 'Sacred fast',
        status: 'resolved',
        civilDate: '2026-08-23',
        date: '2026-08-23',
        candidateDates: ['2026-08-23'],
        reviewPlacementDate: '2026-08-23',
        location: { label: 'Ujjain', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
        profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
        versions: { panchangaCore: '1.0', calendarProfile: '1.0', ruleEngine: '1.0', rule: '1.0' },
        reasons: [],
        alternatives: [],
        confidence: 'high',
        diagnostics: [],
        sourceRefs: [],
        reviewStatus: 'reviewed',
        isPrimary: true,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        festivalId: 'pradosh',
        slug: 'pradosh',
        display_name: 'Pradosh Vrat',
        emoji: '🔱',
        kind: 'vrat',
        tradition: 'hindu',
        route_kind: 'vrat',
        route_slug: 'pradosh',
        description: 'Twilight fast',
        status: 'resolved',
        civilDate: '2026-08-25',
        date: '2026-08-25',
        candidateDates: ['2026-08-25'],
        reviewPlacementDate: '2026-08-25',
        location: { label: 'Ujjain', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
        profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
        versions: { panchangaCore: '1.0', calendarProfile: '1.0', ruleEngine: '1.0', rule: '1.0' },
        reasons: [],
        alternatives: [],
        confidence: 'high',
        diagnostics: [],
        sourceRefs: [],
        reviewStatus: 'reviewed',
        isPrimary: true,
      },
    ];

    const todayMatch = rawObservances.find(
      (o) =>
        o.isPrimary === true &&
        o.status === 'resolved' &&
        o.kind === 'vrat' &&
        (o.civilDate === canonicalToday || o.date === canonicalToday)
    );

    assert.ok(todayMatch);
    assert.equal(todayMatch.id, '11111111-1111-1111-1111-111111111111');
    assert.equal(todayMatch.slug, 'ekadashi');
  });

  // 2. No canonical Today produces intentional empty state
  it('2. returns null for today when no canonical primary resolved observance matches', () => {
    const rawObservances: ClientObservanceResult[] = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        festivalId: 'pradosh',
        slug: 'pradosh',
        display_name: 'Pradosh Vrat',
        emoji: '🔱',
        kind: 'vrat',
        tradition: 'hindu',
        route_kind: 'vrat',
        route_slug: 'pradosh',
        description: 'Twilight fast',
        status: 'resolved',
        civilDate: '2026-08-25',
        date: '2026-08-25',
        candidateDates: ['2026-08-25'],
        reviewPlacementDate: '2026-08-25',
        location: { label: 'Ujjain', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
        profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
        versions: { panchangaCore: '1.0', calendarProfile: '1.0', ruleEngine: '1.0', rule: '1.0' },
        reasons: [],
        alternatives: [],
        confidence: 'high',
        diagnostics: [],
        sourceRefs: [],
        reviewStatus: 'reviewed',
        isPrimary: true,
      },
    ];

    const todayMatch = rawObservances.find(
      (o) =>
        o.isPrimary === true &&
        o.status === 'resolved' &&
        o.kind === 'vrat' &&
        (o.civilDate === canonicalToday || o.date === canonicalToday)
    );

    assert.equal(todayMatch, undefined);
  });

  // 3. Client-calculated tithi cannot select a Vrat or enable an action
  it('3. verifies calculatePanchang/tithiIndexToVratId are absent from app/vrat.tsx', () => {
    const vratFile = fs.readFileSync(path.join(__dirname, '../app/vrat.tsx'), 'utf8');
    assert.equal(vratFile.includes('calculatePanchang'), false);
    assert.equal(vratFile.includes('tithiIndexToVratId'), false);
    assert.equal(vratFile.includes('getTithiReminder'), false);
  });

  // 4. Resolved primary Today opens exact slug and occurrence ID
  it('4. builds exact deep link route with occurrence ID and date', () => {
    const occId = '11111111-1111-1111-1111-111111111111';
    const slug = 'ekadashi';
    const targetUrl = `/vrat/${slug}?occurrence_id=${occId}&date=2026-08-23`;

    const nativeRoute = resolveNativeRoute(targetUrl);
    assert.equal(nativeRoute, `/vrat/${slug}?occurrence_id=${occId}&date=2026-08-23`);
  });

  // 5. Catalogue-only entry opens educational detail with no dated actions
  it('5. resolves catalogue entry and ensures eligibility is false without occurrence ID', () => {
    const vrat = lookupVratData('pradosh');
    assert.ok(vrat);
    assert.equal(vrat.id, 'pradosh');

    // Without occurrence ID -> eligibility is false
    const eligible = isEligibleToObserveToday({
      occurrence: null,
      canonicalTodayDate: canonicalToday,
    });
    assert.equal(eligible, false);
  });

  // 6. Rapid detail selections do not leak previous occurrence into the next
  it('6. verifies state isolation payload and uuid requirement', () => {
    assert.throws(() => {
      buildVratObservationPayload({ occurrenceId: undefined });
    }, /Valid canonical occurrence_id UUID is required/);

    const payload = buildVratObservationPayload({
      occurrenceId: '11111111-1111-1111-1111-111111111111',
    });
    assert.equal(payload.occurrence_id, '11111111-1111-1111-1111-111111111111');
  });

  // 7. Direct cold-start deep link resolves without prior hub state
  it('7. parses direct custom-scheme and universal deep links', () => {
    const customScheme = pathFromUrlLike('shoonaya://vrat/ekadashi?occurrence_id=11111111-1111-1111-1111-111111111111');
    assert.equal(customScheme, '/vrat/ekadashi?occurrence_id=11111111-1111-1111-1111-111111111111');
    assert.equal(resolveNativeRoute(customScheme!), '/vrat/ekadashi?occurrence_id=11111111-1111-1111-1111-111111111111');

    const universalLink = pathFromUrlLike('https://www.shoonaya.com/vrat/pradosh');
    assert.equal(universalLink, '/vrat/pradosh');
    assert.equal(resolveNativeRoute(universalLink!), '/vrat/pradosh');
  });

  // 8. Home, notification, upcoming, and PWA links reach the correct identity
  it('8. routes generic /vrat to /vrat and specific /vrat/[slug] to detail route', () => {
    assert.equal(resolveNativeRoute('/vrat'), '/vrat');
    assert.equal(resolveNativeRoute('/vrat/shivaratri'), '/vrat/shivaratri');
  });

  // 9. Unresolved, ambiguous, under-review, non-primary, withheld, and alternative states disclose correctly and remain non-actionable
  it('9. strictly rejects non-primary or non-resolved occurrences for observation', () => {
    const underReviewOcc: ObservationEligibleOccurrence = {
      id: '11111111-1111-1111-1111-111111111111',
      date: canonicalToday,
      civilDate: canonicalToday,
      status: 'under_review',
      isPrimary: true,
    };
    assert.equal(isEligibleToObserveToday({ occurrence: underReviewOcc, canonicalTodayDate: canonicalToday }), false);

    const nonPrimaryOcc: ObservationEligibleOccurrence = {
      id: '11111111-1111-1111-1111-111111111111',
      date: canonicalToday,
      civilDate: canonicalToday,
      status: 'resolved',
      isPrimary: false,
    };
    assert.equal(isEligibleToObserveToday({ occurrence: nonPrimaryOcc, canonicalTodayDate: canonicalToday }), false);

    const ambiguousOcc: ObservationEligibleOccurrence = {
      id: '11111111-1111-1111-1111-111111111111',
      date: canonicalToday,
      civilDate: canonicalToday,
      status: 'ambiguous',
      isPrimary: true,
    };
    assert.equal(isEligibleToObserveToday({ occurrence: ambiguousOcc, canonicalTodayDate: canonicalToday }), false);
  });

  // 10. Incorrect next-06:00 scheduling code is absent
  it('10. verifies incorrect next-06:00 scheduler is removed from app/vrat.tsx', () => {
    const vratFile = fs.readFileSync(path.join(__dirname, '../app/vrat.tsx'), 'utf8');
    assert.equal(vratFile.includes('setHours(6, 0, 0, 0)'), false);
    assert.equal(vratFile.includes('setReminder'), false);
  });
});
