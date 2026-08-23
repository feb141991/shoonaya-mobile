import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVratObservationPayload,
  isEligibleToObserveToday,
  type ObservationEligibleOccurrence,
} from '../lib/vrat-observation';

export interface VratObservationResult {
  success: boolean;
  already_observed: boolean;
  karma_earned: number;
  today?: string;
  occurrence_date?: string;
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

describe('Vrat Observation Contract & Production Helpers Suite', () => {
  it('builds canonical observation payload with occurrence_id strictly', () => {
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
      buildVratObservationPayload({ occurrenceId: 'bad-uuid-format' });
    }, /Valid canonical occurrence_id UUID is required/);

    assert.throws(() => {
      buildVratObservationPayload({ occurrenceId: null });
    }, /Valid canonical occurrence_id UUID is required/);
  });

  it('evaluates observation eligibility strictly using production isEligibleToObserveToday helper', () => {
    const validOccId = '12345678-1234-1234-1234-123456789abc';
    const canonicalToday = '2026-08-23';

    // 1. Null occurrence -> false
    assert.equal(isEligibleToObserveToday({
      occurrence: null,
      canonicalTodayDate: canonicalToday,
    }), false);

    // 2. Occurrence with missing ID -> false
    assert.equal(isEligibleToObserveToday({
      occurrence: { id: null, date: '2026-08-23', status: 'resolved' },
      canonicalTodayDate: canonicalToday,
    }), false);

    // 3. Occurrence with mismatched/future date -> false
    assert.equal(isEligibleToObserveToday({
      occurrence: { id: validOccId, date: '2026-08-30', status: 'resolved' },
      canonicalTodayDate: canonicalToday,
    }), false);

    // 4. Occurrence marked unresolved or under_review -> false
    assert.equal(isEligibleToObserveToday({
      occurrence: { id: validOccId, date: '2026-08-23', status: 'unresolved' },
      canonicalTodayDate: canonicalToday,
    }), false);
    assert.equal(isEligibleToObserveToday({
      occurrence: { id: validOccId, date: '2026-08-23', status: 'under_review' },
      canonicalTodayDate: canonicalToday,
    }), false);

    // 5. Missing canonical today string -> false
    assert.equal(isEligibleToObserveToday({
      occurrence: { id: validOccId, date: '2026-08-23', status: 'resolved' },
      canonicalTodayDate: null,
    }), false);

    // 6. Valid resolved occurrence with matching date -> true
    assert.equal(isEligibleToObserveToday({
      occurrence: { id: validOccId, date: '2026-08-23', civilDate: '2026-08-23', status: 'resolved' },
      canonicalTodayDate: canonicalToday,
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
