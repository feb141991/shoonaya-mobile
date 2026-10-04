import assert from "node:assert/strict";
import test from "node:test";

import { isKulSnapshot } from "../lib/kulSnapshotContract";

const baseSnapshot = () => ({
  userId: "user-1",
  today: "2026-10-03",
  kul: {
    id: "kul-1",
    name: "Sharma Family",
    avatarEmoji: "🏡",
    createdAt: "2026-10-01T00:00:00.000Z",
    inviteCode: "ABC123ABC123",
    lineage: {
      gotra: null,
      pravara: null,
      kuldeviName: null,
      kuldevtaName: null,
      kuldeviPlaceId: null,
      kuldevtaPlaceId: null,
      ancestralOrigin: null,
      kulacharaNotes: null,
    },
    calendarReference: {
      label: "Ujjain reference",
      timezone: "Asia/Kolkata",
      monthSystem: "amanta",
      latitude: 23.1765,
      longitude: 75.7885,
    },
  },
  role: "guardian",
  members: [{
    id: "member-1",
    userId: "user-1",
    role: "guardian",
    joinedAt: "2026-10-01T00:00:00.000Z",
    profile: null,
  }],
  tasks: [],
  messages: [],
  familyMembers: [],
  events: [] as unknown[],
  tirthaWishes: [] as unknown[],
});

test("KUL snapshot accepts complete private family response and empty membership response", () => {
  assert.equal(isKulSnapshot(baseSnapshot()), true);
  assert.equal(isKulSnapshot({
    userId: "user-1", today: "2026-10-03", kul: null, role: null,
    members: [], tasks: [], messages: [], familyMembers: [], events: [], tirthaWishes: [],
  }), true);
});

test("KUL snapshot rejects invalid dates, inconsistent membership, and malformed feature rows", () => {
  const invalidToday = baseSnapshot();
  invalidToday.today = "2026-02-31";
  assert.equal(isKulSnapshot(invalidToday), false);

  const inconsistentMember = baseSnapshot();
  inconsistentMember.members = [];
  assert.equal(isKulSnapshot(inconsistentMember), false);

  const invalidTirtha = baseSnapshot();
  invalidTirtha.tirthaWishes = [{
    id: "wish-1", placeId: "curated:temple", name: "Temple", tradition: "hindu",
    deity: null, address: null, latitude: 23, longitude: 77, status: "visited",
    visitedAt: "2026-02-31", notes: null, createdAt: "2026-10-01T00:00:00.000Z",
  }];
  assert.equal(isKulSnapshot(invalidTirtha), false);

  const invalidMembership = JSON.parse(JSON.stringify(baseSnapshot())) as Record<string, unknown>;
  (invalidMembership.members as Array<Record<string, unknown>>)[0].profile = {
    id: "different-user", full_name: "Other", username: null, avatar_url: null, tradition: null, sampradaya: null,
  };
  assert.equal(isKulSnapshot(invalidMembership), false);

  const invalidCalendar = baseSnapshot();
  invalidCalendar.kul.calendarReference.timezone = "Not/A_Zone";
  assert.equal(isKulSnapshot(invalidCalendar), false);
});

test("KUL snapshot validates tithi fields and rejects impossible civil resolutions", () => {
  const valid = baseSnapshot();
  const validEvent = {
    id: "event-1", title: "Smriti", event_type: "death_anniversary",
    event_date: "2026-10-03", resolved_civil_date: "2026-10-03", date_system: "tithi",
    masa: 7, paksha: "krishna", tithi: 15, month_system: "amanta", masa_is_adhika: false,
    tithi_resolution: "sunrise", tithi_label: "Ashvina Krishna Amavasya",
    calculation_location: "Ujjain reference", recurring: true, description: null, member_id: null,
  };
  valid.events = [validEvent];
  assert.equal(isKulSnapshot(valid), true);

  const invalid = baseSnapshot();
  invalid.events = [{ ...validEvent, resolved_civil_date: "2026-02-31" }];
  assert.equal(isKulSnapshot(invalid), false);
});
