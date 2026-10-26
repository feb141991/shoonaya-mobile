import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildOnboardingProfilePayload, DEFAULT_NOTIFICATION_CATEGORY_CHOICES } from '../lib/onboarding-contract';
import { InvalidDateInputError } from '../lib/date-input';
import { describeSaveError } from '../lib/save-error';
import { KUNDALI_MIN_BIRTH_DATE } from '../lib/kundali-contract';
import { parseDateOnly } from '../lib/dateOnly';

const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');

const base = {
  displayName: 'Meera',
  tradition: 'none' as const,
  language: 'en' as const,
  gender: 'female' as const,
  lifeStage: null,
  rashi: '',
  nakshatra: '',
  gotra: '',
  calendarProfile: '' as const,
  calendarScope: '' as const,
  goals: [],
  notificationCategories: DEFAULT_NOTIFICATION_CATEGORY_CHOICES,
  religiousDataConsent: false,
  consentRecordedAt: '2026-10-16T08:00:00.000Z',
};

describe('the onboarding payload never carries raw date text', () => {
  it('a picked ISO date passes through unchanged', () => {
    assert.equal(buildOnboardingProfilePayload({ ...base, dateOfBirth: '1991-08-18' }).date_of_birth, '1991-08-18');
  });

  it('day-first text is normalised to ISO', () => {
    assert.equal(buildOnboardingProfilePayload({ ...base, dateOfBirth: '18/08/1991' }).date_of_birth, '1991-08-18');
  });

  it('the exact text that failed in production ("18081991", Postgres 22008) is read as a date, never sent as typed', () => {
    const p = buildOnboardingProfilePayload({ ...base, dateOfBirth: '18081991' });
    assert.equal(p.date_of_birth, '1991-08-18');
  });

  it('a date that does not exist, or a future one, is refused instead of sent', () => {
    for (const bad of ['31/02/1991', '2999-01-01', 'not a date', '1991-13-45']) {
      assert.throws(() => buildOnboardingProfilePayload({ ...base, dateOfBirth: bad }), InvalidDateInputError, bad);
    }
  });

  it('blank means unknown: null, not an error', () => {
    assert.equal(buildOnboardingProfilePayload({ ...base, dateOfBirth: '' }).date_of_birth, null);
    assert.equal(buildOnboardingProfilePayload({ ...base, dateOfBirth: '   ' }).date_of_birth, null);
  });
});

describe('a save failure says what to fix', () => {
  it('a Postgres bad-date error (a plain object, not an Error) is explained, with a reference, and never echoed', () => {
    const dbError = { code: '22008', message: 'date/time field value out of range: "18081991"', details: null };
    const shown = describeSaveError(dbError, 'en');
    assert.doesNotMatch(shown, /18081991|out of range|date\/time field/);
    assert.notEqual(shown, describeSaveError(new Error('x'), 'en'));
  });

  it('an unknown failure keeps the generic line, with no internal code and no provider text', () => {
    const text = describeSaveError({ code: 'XX000', message: 'secret table detail' }, 'en');
    assert.equal(text, 'Unable to save onboarding. Please try again.');
    assert.doesNotMatch(text, /XX000|secret/);
  });

  it('the onboarding screen shows it instead of "error instanceof Error ? error.message"', () => {
    const screen = read('app/(auth)/onboarding.tsx');
    assert.match(screen, /setSaveError\(describeSaveError\(error, isHindi \? 'hi' : 'en'\)\)/);
    assert.doesNotMatch(screen, /setSaveError\(error instanceof Error \? error\.message/);
  });
});

describe('Kundali accepts the dates the server accepts', () => {
  it('the picker bound is 1800, a real date, and the screen uses it', () => {
    assert.equal(KUNDALI_MIN_BIRTH_DATE, '1800-01-01');
    assert.ok(parseDateOnly(KUNDALI_MIN_BIRTH_DATE));
    const screen = read('app/kundali.tsx');
    assert.match(screen, /minDate=\{KUNDALI_MIN_BIRTH_DATE\}/);
    assert.doesNotMatch(screen, /minDate="1920-01-01"/);
  });
});
