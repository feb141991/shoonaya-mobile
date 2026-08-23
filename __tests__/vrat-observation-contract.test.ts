import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface VratObservationPayload {
  vrat_id: string;
  vrat_name: string;
  occurrence_date?: string | null;
  occurrence_id?: string | null;
  calendar_profile?: string | null;
  tradition?: string | null;
}

export interface VratObservationResult {
  success: boolean;
  already_observed: boolean;
  karma_earned: number;
  today?: string;
  occurrence_date?: string;
}

export function isEligibleToObserveToday(params: {
  selectedVratId: string | null;
  selectedOccurrenceDate?: string | null;
  todayVratId?: string | null;
  todayDateStr: string;
}): boolean {
  if (!params.selectedVratId) return false;
  if (params.selectedOccurrenceDate) {
    return params.selectedOccurrenceDate === params.todayDateStr;
  }
  return params.selectedVratId === params.todayVratId;
}

export function buildVratObservationPayload(params: {
  vratId: string;
  vratName: string;
  occurrenceDate?: string | null;
  occurrenceId?: string | null;
  calendarProfile?: string | null;
  tradition?: string | null;
}): VratObservationPayload {
  if (!params.vratId || params.vratId.trim().length === 0) {
    throw new Error('vrat_id is required');
  }

  return {
    vrat_id: params.vratId.trim(),
    vrat_name: params.vratName || params.vratId.trim(),
    occurrence_date: params.occurrenceDate ?? null,
    occurrence_id: params.occurrenceId ?? null,
    calendar_profile: params.calendarProfile ?? null,
    tradition: params.tradition ?? null,
  };
}

export function handleObservationResponse(
  response: VratObservationResult,
  currentState: { observedCount: number; alreadyObserved: boolean }
): { observedToday: boolean; newCount: number; karmaMessage: string | null } {
  if (!response.success) {
    throw new Error('Observation request failed');
  }

  const isAlready = response.already_observed;
  const newCount = currentState.observedCount + (isAlready ? 0 : 1);
  const karmaMessage = !isAlready && response.karma_earned > 0
    ? `🙏 Vrat observed! +${response.karma_earned} karma`
    : 'Vrat observed';

  return {
    observedToday: true,
    newCount,
    karmaMessage,
  };
}

describe('Vrat Observation Contract & Idempotent Ledger Suite', () => {
  it('builds canonical observation payload with occurrence qualification', () => {
    const payload = buildVratObservationPayload({
      vratId: 'ekadashi',
      vratName: 'Nirjala Ekadashi',
      occurrenceDate: '2026-08-23',
      occurrenceId: 'occ-1234',
      calendarProfile: 'surya_siddhanta',
      tradition: 'hindu',
    });

    assert.equal(payload.vrat_id, 'ekadashi');
    assert.equal(payload.vrat_name, 'Nirjala Ekadashi');
    assert.equal(payload.occurrence_date, '2026-08-23');
    assert.equal(payload.occurrence_id, 'occ-1234');
    assert.equal(payload.calendar_profile, 'surya_siddhanta');
    assert.equal(payload.tradition, 'hindu');
  });

  it('rejects empty or whitespace-only vrat_id', () => {
    assert.throws(() => {
      buildVratObservationPayload({
        vratId: '',
        vratName: 'Test',
      });
    }, /vrat_id is required/);
  });

  it('evaluates observation eligibility strictly by occurrence date or today match', () => {
    // 1. Browsing arbitrary library item not occurring today -> false
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'chaturthi',
      todayVratId: 'ekadashi',
      todayDateStr: '2026-08-23',
    }), false);

    // 2. Browsing item that matches todayVratId -> true
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'ekadashi',
      todayVratId: 'ekadashi',
      todayDateStr: '2026-08-23',
    }), true);

    // 3. Browsing occurrence with future date -> false
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'ekadashi',
      selectedOccurrenceDate: '2026-08-30',
      todayDateStr: '2026-08-23',
    }), false);

    // 4. Browsing occurrence with today's date -> true
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'ekadashi',
      selectedOccurrenceDate: '2026-08-23',
      todayDateStr: '2026-08-23',
    }), true);
  });

  it('handles first-time observation and awards karma', () => {
    const response: VratObservationResult = {
      success: true,
      already_observed: false,
      karma_earned: 25,
      occurrence_date: '2026-08-23',
    };

    const nextState = handleObservationResponse(response, {
      observedCount: 2,
      alreadyObserved: false,
    });

    assert.equal(nextState.observedToday, true);
    assert.equal(nextState.newCount, 3);
    assert.equal(nextState.karmaMessage, '🙏 Vrat observed! +25 karma');
  });

  it('handles duplicate/idempotent observation without increasing karma', () => {
    const response: VratObservationResult = {
      success: true,
      already_observed: true,
      karma_earned: 0,
      occurrence_date: '2026-08-23',
    };

    const nextState = handleObservationResponse(response, {
      observedCount: 3,
      alreadyObserved: true,
    });

    assert.equal(nextState.observedToday, true);
    assert.equal(nextState.newCount, 3);
    assert.equal(nextState.karmaMessage, 'Vrat observed');
  });
});
