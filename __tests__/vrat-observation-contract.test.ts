import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface VratObservationPayload {
  occurrence_id: string;
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
  selectedOccurrence?: {
    date: string;
    observance?: {
      id?: string | null;
      status?: string;
    };
  } | null;
  todayDateStr: string;
}): boolean {
  if (!params.selectedVratId) return false;
  if (params.selectedOccurrence?.observance?.id && params.selectedOccurrence?.date) {
    return (
      params.selectedOccurrence.date === params.todayDateStr &&
      params.selectedOccurrence.observance.status !== 'unresolved'
    );
  }
  return false;
}

export function buildVratObservationPayload(params: {
  occurrenceId?: string | null;
}): VratObservationPayload {
  const occId = params.occurrenceId?.trim();
  if (!occId || !UUID_REGEX.test(occId)) {
    throw new Error('Valid canonical occurrence_id UUID is required');
  }

  return {
    occurrence_id: occId,
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

describe('Vrat Observation Contract & Occurrence-Qualified Ledger Suite', () => {
  it('builds canonical observation payload with occurrence_id only (non-forgeable)', () => {
    const payload = buildVratObservationPayload({
      occurrenceId: '12345678-1234-1234-1234-123456789abc',
    });

    assert.equal(payload.occurrence_id, '12345678-1234-1234-1234-123456789abc');
    assert.equal(Object.keys(payload).length, 1);
  });

  it('rejects missing, null, or malformed occurrence UUIDs', () => {
    assert.throws(() => {
      buildVratObservationPayload({ occurrenceId: '' });
    }, /Valid canonical occurrence_id UUID is required/);

    assert.throws(() => {
      buildVratObservationPayload({ occurrenceId: 'not-a-uuid' });
    }, /Valid canonical occurrence_id UUID is required/);

    assert.throws(() => {
      buildVratObservationPayload({ occurrenceId: null });
    }, /Valid canonical occurrence_id UUID is required/);
  });

  it('evaluates observation eligibility strictly by resolved canonical occurrence id today', () => {
    const validOccId = '12345678-1234-1234-1234-123456789abc';

    // 1. Browsing arbitrary library item with no occurrence -> false
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'chaturthi',
      selectedOccurrence: null,
      todayDateStr: '2026-08-23',
    }), false);

    // 2. Browsing occurrence without canonical id -> false
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'ekadashi',
      selectedOccurrence: {
        date: '2026-08-23',
        observance: { id: null, status: 'resolved' },
      },
      todayDateStr: '2026-08-23',
    }), false);

    // 3. Browsing occurrence with future date -> false
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'ekadashi',
      selectedOccurrence: {
        date: '2026-08-30',
        observance: { id: validOccId, status: 'resolved' },
      },
      todayDateStr: '2026-08-23',
    }), false);

    // 4. Browsing unresolved placeholder -> false
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'ekadashi',
      selectedOccurrence: {
        date: '2026-08-23',
        observance: { id: validOccId, status: 'unresolved' },
      },
      todayDateStr: '2026-08-23',
    }), false);

    // 5. Browsing valid resolved occurrence today -> true
    assert.equal(isEligibleToObserveToday({
      selectedVratId: 'ekadashi',
      selectedOccurrence: {
        date: '2026-08-23',
        observance: { id: validOccId, status: 'resolved' },
      },
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
