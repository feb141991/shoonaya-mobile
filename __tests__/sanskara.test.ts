import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SANSKARA_REMINDERS_LIVE,
  SANSKARA_SCHEMA_VERSION,
  SanskaraError,
  buildSanskaraPayload,
  guardSanskaraRead,
  guardSanskaraWrite,
  isSanskaraRecord,
  isSanskaraTimeline,
  isSanskaraDependent,
  isSanskaraSharedRecord,
  isSanskaraOverview,
} from '../lib/sanskaraContract';

const VALID_UUID_1 = '11111111-1111-4111-8111-111111111111';
const VALID_UUID_2 = '22222222-2222-4222-8222-222222222222';
const VALID_UUID_3 = '33333333-3333-4333-8333-333333333333';
const VALID_TOKEN_64 = 'a'.repeat(64);

test('Sanskara configuration flags', () => {
  // Reminders must remain un-promoted until background producer is active
  assert.equal(SANSKARA_REMINDERS_LIVE, false);
  assert.equal(SANSKARA_SCHEMA_VERSION, 1);
});

test('buildSanskaraPayload rejects invalid requestIds and unallowed fields', () => {
  assert.throws(() => {
    buildSanskaraPayload('create-record', { subjectId: VALID_UUID_1, riteKey: 'custom', customTitle: 'Test' }, 'not-a-uuid');
  }, /SanskaraError/);

  assert.throws(() => {
    buildSanskaraPayload('create-record', { subjectId: VALID_UUID_1, riteKey: 'custom', customTitle: 'Test', hackerField: 'bad' } as any, VALID_UUID_2);
  }, /SanskaraError/);
});

test('buildSanskaraPayload validates typed dates and rejects malformed inputs', () => {
  const badDates = ['18081991', '2026-02-30', '2026/02/03', 'invalid', '2025-13-01', ''];

  for (const bad of badDates) {
    assert.throws(() => {
      buildSanskaraPayload('create-record', {
        subjectId: VALID_UUID_1,
        riteKey: 'custom',
        customTitle: 'Annaprashana',
        plannedDate: bad,
      }, VALID_UUID_2);
    }, /SanskaraError/, `Expected date rejection for: ${bad}`);
  }

  // Valid date passes
  const valid = buildSanskaraPayload('create-record', {
    subjectId: VALID_UUID_1,
    riteKey: 'custom',
    customTitle: 'Annaprashana',
    plannedDate: '2026-05-15',
  }, VALID_UUID_2);
  assert.equal(valid.plannedDate, '2026-05-15');
});

test('buildSanskaraPayload enforces child dependent birthdate bounds (minor and >=2000)', () => {
  const now = new Date('2026-11-01T00:00:00Z');

  // Over 18 years old: born 2005
  assert.throws(() => {
    buildSanskaraPayload('create-dependent', {
      name: 'Aditi',
      birthDate: '2005-01-01',
    }, VALID_UUID_2, now);
  }, /SanskaraError/);

  // Before 2000
  assert.throws(() => {
    buildSanskaraPayload('create-dependent', {
      name: 'Arjun',
      birthDate: '1999-12-31',
    }, VALID_UUID_2, now);
  }, /SanskaraError/);

  // Future date
  assert.throws(() => {
    buildSanskaraPayload('create-dependent', {
      name: 'Aarav',
      birthDate: '2027-01-01',
    }, VALID_UUID_2, now);
  }, /SanskaraError/);

  // Valid minor born 2020
  const valid = buildSanskaraPayload('create-dependent', {
    name: 'Aarav',
    birthDate: '2020-05-10',
    kulFamilyMemberId: VALID_UUID_1,
  }, VALID_UUID_2, now);
  assert.equal(valid.name, 'Aarav');
  assert.equal(valid.birthDate, '2020-05-10');
  assert.equal(valid.kulFamilyMemberId, VALID_UUID_1);
});

test('buildSanskaraPayload supports optimistic versioning and completion toggles', () => {
  // Update record with expected version
  const updatePayload = buildSanskaraPayload('update-record', {
    recordId: VALID_UUID_1,
    customTitle: 'Upanayana Samskara',
    plannedDate: '2027-02-14',
    expectedVersion: 3,
  }, VALID_UUID_2);
  assert.equal(updatePayload.expectedVersion, 3);
  assert.equal(updatePayload.customTitle, 'Upanayana Samskara');

  // Completion toggle: mark completed
  const completedPayload = buildSanskaraPayload('set-completion', {
    recordId: VALID_UUID_1,
    completedDate: '2026-10-25',
    expectedVersion: 1,
  }, VALID_UUID_2);
  assert.equal(completedPayload.completedDate, '2026-10-25');

  // Completion toggle: reopen (null completedDate)
  const reopenPayload = buildSanskaraPayload('set-completion', {
    recordId: VALID_UUID_1,
    completedDate: null,
    expectedVersion: 2,
  }, VALID_UUID_2);
  assert.equal(reopenPayload.completedDate, null);
});

test('runtime guards validate read responses strictly', () => {
  const validRecord = {
    id: VALID_UUID_1,
    rite_key: 'custom',
    custom_title: 'Keshanta',
    sensitivity: 'A',
    planned_date: '2026-12-01',
    completed_date: null,
    version: 1,
    private: {
      notes: 'Family gathering in Haridwar',
      location: 'Haridwar',
      performed_by: 'Acharya Shastri',
      expected_due_date: null,
      version: 1,
    },
  };
  assert.equal(isSanskaraRecord(validRecord), true);

  const validTimeline = {
    subject_id: VALID_UUID_2,
    records: [validRecord],
  };
  assert.equal(isSanskaraTimeline(validTimeline), true);
  assert.equal(guardSanskaraRead('timeline', validTimeline), true);

  // Rejects corrupted timeline
  assert.equal(guardSanskaraRead('timeline', { subject_id: 'bad', records: [] }), false);
  assert.equal(guardSanskaraRead('timeline', { subject_id: VALID_UUID_2, records: [{ ...validRecord, version: 0 }] }), false);
});

test('runtime guards validate write responses including replayed responses', () => {
  assert.equal(guardSanskaraWrite('create-record', { id: VALID_UUID_1, version: 1 }), true);
  assert.equal(guardSanskaraWrite('create-record', { id: VALID_UUID_1, version: 1, replayed: true }), true);
  assert.equal(guardSanskaraWrite('save-private', { id: VALID_UUID_1, private_version: 2 }), true);
  assert.equal(guardSanskaraWrite('set-completion', { id: VALID_UUID_1, version: 2 }), true);
  assert.equal(guardSanskaraWrite('delete-record', { id: VALID_UUID_1, deleted: true }), true);

  // Claim acceptance
  assert.equal(guardSanskaraWrite('accept-claim', { moved: 5, dropped_as_duplicates: 1 }), true);
  // Rejects invalid write
  assert.equal(guardSanskaraWrite('create-record', { version: 1 }), false);
});
