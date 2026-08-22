import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GENDERS, genderContext, type GenderKey } from '../lib/profile-constants';

/**
 * Pure helper mirroring the payload composition in app/settings/personal-details.tsx
 */
export function buildPersonalDetailsPatchPayload({
  dateOfBirth,
  city,
  country,
  selectedGender,
  lifeStage,
}: {
  dateOfBirth: string;
  city: string;
  country: string;
  selectedGender: GenderKey | null;
  lifeStage: string | null;
}) {
  return {
    date_of_birth: dateOfBirth || null,
    city: city || null,
    country: country || null,
    gender_context: selectedGender === 'female' ? 'female' : selectedGender ? 'general' : null,
    life_stage: lifeStage,
  };
}

describe('Personal Details Gender Context & Backend Vocabulary Contract', () => {
  const BACKEND_VALID_VOCABULARY = new Set(['female', 'general', null]);

  it('maps all UI gender options to the canonical database / backend vocabulary (female | general)', () => {
    assert.equal(genderContext('female'), 'female');
    assert.equal(genderContext('male'), 'general');
    assert.equal(genderContext('prefer_not'), 'general');

    for (const { key } of GENDERS) {
      const mapped = genderContext(key);
      assert.equal(
        BACKEND_VALID_VOCABULARY.has(mapped),
        true,
        `Mapped value ${mapped} for ${key} must belong to backend vocabulary`
      );
    }
  });

  it('builds Personal Details PATCH payload with valid gender_context values', () => {
    // Female selected
    const femalePayload = buildPersonalDetailsPatchPayload({
      dateOfBirth: '1995-06-15',
      city: 'Varanasi',
      country: 'India',
      selectedGender: 'female',
      lifeStage: 'grihastha',
    });
    assert.equal(femalePayload.gender_context, 'female');
    assert.equal(BACKEND_VALID_VOCABULARY.has(femalePayload.gender_context), true);

    // Male selected -> maps to 'general' practice path
    const malePayload = buildPersonalDetailsPatchPayload({
      dateOfBirth: '1990-01-01',
      city: 'Delhi',
      country: 'India',
      selectedGender: 'male',
      lifeStage: 'grihastha',
    });
    assert.equal(malePayload.gender_context, 'general');
    assert.equal(BACKEND_VALID_VOCABULARY.has(malePayload.gender_context), true);

    // Prefer not to say selected -> maps to 'general' practice path
    const preferNotPayload = buildPersonalDetailsPatchPayload({
      dateOfBirth: '1988-04-10',
      city: 'Mumbai',
      country: 'India',
      selectedGender: 'prefer_not',
      lifeStage: 'vanaprastha',
    });
    assert.equal(preferNotPayload.gender_context, 'general');
    assert.equal(BACKEND_VALID_VOCABULARY.has(preferNotPayload.gender_context), true);

    // Unset gender -> persists null
    const unsetPayload = buildPersonalDetailsPatchPayload({
      dateOfBirth: '',
      city: '',
      country: '',
      selectedGender: null,
      lifeStage: null,
    });
    assert.equal(unsetPayload.gender_context, null);
    assert.equal(BACKEND_VALID_VOCABULARY.has(unsetPayload.gender_context), true);
  });

  it('guarantees arbitrary strings or raw male/prefer_not are never sent directly to backend', () => {
    const rawOptions: (GenderKey | null)[] = ['male', 'female', 'prefer_not', null];
    for (const opt of rawOptions) {
      const payload = buildPersonalDetailsPatchPayload({
        dateOfBirth: '',
        city: '',
        country: '',
        selectedGender: opt,
        lifeStage: null,
      });
      assert.notEqual(payload.gender_context, 'male', 'Raw "male" must never be sent');
      assert.notEqual(payload.gender_context, 'prefer_not', 'Raw "prefer_not" must never be sent');
      assert.equal(BACKEND_VALID_VOCABULARY.has(payload.gender_context), true);
    }
  });
});
