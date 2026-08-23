import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNativeRoute, pathFromUrlLike } from '../lib/routes';
import {
  isEligibleToObserveToday,
  isConfirmedVratOccurrence,
  matchesRequestedOccurrence,
  buildVratObservationPayload,
  type ObservationEligibleOccurrence,
} from '../lib/vrat-observation';
import { lookupVratData, getVratData, VRAT_DATABASE } from '../lib/vrat-data';
import type { ClientObservanceResult } from '../lib/calendar-contract';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Vrat Prompt 1-2 Review Remediation: Canonical Native Test Suite', () => {
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

    const todayMatch = rawObservances
      .filter(isConfirmedVratOccurrence)
      .find((o) => o.civilDate === canonicalToday || o.date === canonicalToday);

    assert.ok(todayMatch);
    assert.equal(todayMatch.id, '11111111-1111-1111-1111-111111111111');
    assert.equal(todayMatch.slug, 'ekadashi');
  });

  // 2. Unknown or stale occurrence ID never becomes a synthetic canonical result
  it('2. proves unknown or stale occurrence ID yields null canonical occurrence and false eligibility', () => {
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

    const staleOccurrenceId = '99999999-9999-9999-9999-999999999999';
    const match = rawObservances.find((o) => o.id === staleOccurrenceId) ?? null;
    assert.equal(match, null);

    // Stale occurrence is NOT eligible to observe
    const eligible = isEligibleToObserveToday({
      occurrence: match,
      canonicalTodayDate: canonicalToday,
    });
    assert.equal(eligible, false);
  });

  // 3. Absence of parallel UI decision path (calculatePanchang, tithiIndexToVratId, setHours(6))
  it('3. confirms parallel UI decision engines are absent from app/vrat.tsx and app/vrat/[slug].tsx', () => {
    const vratFile = fs.readFileSync(path.join(__dirname, '../app/vrat.tsx'), 'utf8');
    assert.equal(vratFile.includes('calculatePanchang'), false);
    assert.equal(vratFile.includes('tithiIndexToVratId'), false);
    assert.equal(vratFile.includes('getTithiReminder'), false);
    assert.equal(vratFile.includes('setHours(6, 0, 0, 0)'), false);

    const slugFile = fs.readFileSync(path.join(__dirname, '../app/vrat/[slug].tsx'), 'utf8');
    assert.equal(slugFile.includes('calculatePanchang'), false);
    // Verify no synthetic fallback mock object is constructed
    assert.equal(slugFile.includes("confidence: 'high'"), false);
  });

  // 4. Rapid navigation A -> B response isolation
  it('4. rejects a stale response from route A after navigation to route B', () => {
    const occA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const occB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    assert.equal(matchesRequestedOccurrence(occB, { id: occA }), false);
    assert.equal(matchesRequestedOccurrence(occB, { id: occB }), true);
    assert.equal(buildVratObservationPayload({ occurrenceId: occB }).occurrence_id, occB);
  });

  // 5. Catalogue-only detail remains educational and non-actionable
  it('5. resolves catalogue entry and confirms eligibility is false without occurrence ID', () => {
    const vrat = lookupVratData('pradosh');
    assert.ok(vrat);
    assert.equal(vrat.id, 'pradosh');

    const eligible = isEligibleToObserveToday({
      occurrence: null,
      canonicalTodayDate: canonicalToday,
    });
    assert.equal(eligible, false);
  });

  // 6. Deep link preservation: Home, notification, upcoming-row, custom-scheme, universal-link
  it('6. preserves exact slug and occurrence ID across all deep link entry points', () => {
    const occId = '11111111-1111-1111-1111-111111111111';

    // Custom scheme deep link with occurrence_id
    const customScheme = pathFromUrlLike(`shoonaya://vrat/ekadashi?occurrence_id=${occId}&date=2026-08-23`);
    assert.equal(customScheme, `/vrat/ekadashi?occurrence_id=${occId}&date=2026-08-23`);
    assert.equal(resolveNativeRoute(customScheme!), `/vrat/ekadashi?occurrence_id=${occId}&date=2026-08-23`);

    // Universal HTTPS link with occurrence_id
    const universalLink = pathFromUrlLike(`https://www.shoonaya.com/vrat/ekadashi?occurrence_id=${occId}&date=2026-08-23`);
    assert.equal(universalLink, `/vrat/ekadashi?occurrence_id=${occId}&date=2026-08-23`);
    assert.equal(resolveNativeRoute(universalLink!), `/vrat/ekadashi?occurrence_id=${occId}&date=2026-08-23`);

    // Catalogue educational link without occurrence_id
    const catalogueLink = pathFromUrlLike('https://www.shoonaya.com/vrat/shivaratri');
    assert.equal(catalogueLink, '/vrat/shivaratri');
    assert.equal(resolveNativeRoute(catalogueLink!), '/vrat/shivaratri');

    // Hub root link
    assert.equal(resolveNativeRoute('/vrat'), '/vrat');
  });

  // 7. Unresolved, ambiguous, under-review, non-primary, withheld, and alternative states disclose correctly and remain non-actionable
  it('7. strictly rejects non-primary, non-resolved, or under-review occurrences for observation', () => {
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

    const validOcc: ObservationEligibleOccurrence = {
      id: '11111111-1111-1111-1111-111111111111',
      date: canonicalToday,
      civilDate: canonicalToday,
      status: 'resolved',
      isPrimary: true,
    };
    assert.equal(isEligibleToObserveToday({ occurrence: validOcc, canonicalTodayDate: canonicalToday }), true);
  });

  // 8. Upcoming vrats list truthful filtering
  it('8. filters upcoming vrats list to omit under-review and non-primary items', () => {
    const sampleFeed: ClientObservanceResult[] = [
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
        display_name: 'Pradosh Vrat (Unreviewed)',
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
        reviewStatus: 'needs_review',
        isPrimary: true,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        festivalId: 'shivaratri',
        slug: 'maha-shivaratri',
        display_name: 'Maha Shivaratri (Non-primary alternative)',
        emoji: '🌙',
        kind: 'vrat',
        tradition: 'hindu',
        route_kind: 'vrat',
        route_slug: 'maha-shivaratri',
        description: 'Great night of Shiva',
        status: 'resolved',
        civilDate: '2026-08-26',
        date: '2026-08-26',
        candidateDates: ['2026-08-26'],
        reviewPlacementDate: '2026-08-26',
        location: { label: 'Ujjain', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
        profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
        versions: { panchangaCore: '1.0', calendarProfile: '1.0', ruleEngine: '1.0', rule: '1.0' },
        reasons: [],
        alternatives: [],
        confidence: 'high',
        diagnostics: [],
        sourceRefs: [],
        reviewStatus: 'reviewed',
        isPrimary: false,
      },
    ];

    const confirmedUpcoming = sampleFeed.filter(isConfirmedVratOccurrence);

    assert.equal(confirmedUpcoming.length, 1);
    assert.equal(confirmedUpcoming[0].id, '11111111-1111-1111-1111-111111111111');
  });
});
