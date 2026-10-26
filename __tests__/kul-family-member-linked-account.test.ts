import assert from 'node:assert/strict';
import test from 'node:test';

import { isKulSnapshot } from '../lib/kulSnapshotContract';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const LINKED_USER_ID = '22222222-2222-2222-2222-222222222222';

function baseSnapshot(familyMember: Record<string, unknown>) {
  return {
    userId: USER_ID,
    today: '2026-10-26',
    kul: {
      id: 'kul-1',
      name: 'Test Family',
      avatarEmoji: '🧪',
      createdAt: '2026-01-01T00:00:00.000Z',
      inviteCode: null,
      lineage: {
        gotra: null, pravara: null, kuldeviName: null, kuldevtaName: null,
        kuldeviPlaceId: null, kuldevtaPlaceId: null, ancestralOrigin: null, kulacharaNotes: null,
      },
      calendarReference: {
        label: 'Ujjain reference', timezone: 'Asia/Kolkata', monthSystem: 'amanta',
        latitude: 23.1765, longitude: 75.7885,
      },
    },
    role: 'guardian',
    members: [
      { id: 'm1', userId: USER_ID, role: 'guardian', joinedAt: '2026-01-01T00:00:00.000Z', profile: null },
    ],
    tasks: [],
    messages: [],
    familyMembers: [familyMember],
    events: [],
    tirthaWishes: [],
  };
}

test('a family member with linked_user_id set to null validates', () => {
  const snapshot = baseSnapshot({
    id: 'fm1', name: 'Grandfather', role: 'Grandfather', generation: 1,
    parent_id: null, spouse_id: null, is_alive: false, linked_user_id: null,
  });
  assert.equal(isKulSnapshot(snapshot), true);
});

test('a family member linked to a real account validates', () => {
  const snapshot = baseSnapshot({
    id: 'fm1', name: 'Cousin', role: 'Cousin', generation: 1,
    parent_id: null, spouse_id: null, is_alive: true, linked_user_id: LINKED_USER_ID,
  });
  assert.equal(isKulSnapshot(snapshot), true);
});

test('a family member missing linked_user_id entirely still validates (backend/native deploy gap)', () => {
  const snapshot = baseSnapshot({
    id: 'fm1', name: 'Grandmother', role: 'Grandmother', generation: 1,
    parent_id: null, spouse_id: null, is_alive: false,
    // linked_user_id intentionally omitted -- simulates a backend response
    // from before this field shipped.
  });
  assert.equal(isKulSnapshot(snapshot), true);
});

test('a family member with a malformed linked_user_id is rejected', () => {
  const snapshot = baseSnapshot({
    id: 'fm1', name: 'Uncle', role: 'Uncle', generation: 1,
    parent_id: null, spouse_id: null, is_alive: true, linked_user_id: 12345,
  });
  assert.equal(isKulSnapshot(snapshot), false);
});
