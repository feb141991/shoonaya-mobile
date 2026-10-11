import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_QUIET_END_HOUR,
  DEFAULT_QUIET_START_HOUR,
  clockToMinutes,
  formatClock12,
  fromClockParts,
  isClockWithin,
  isNightClock,
  isValidClock,
  minuteOptions,
  toClockParts,
} from '../lib/reminderTime';

describe('reminder time (12-hour picker over 24-hour storage)', () => {
  it('shows stored 24-hour values on a 12-hour clock', () => {
    assert.equal(formatClock12('01:00'), '1:00 AM');
    assert.equal(formatClock12('13:00'), '1:00 PM');
    assert.equal(formatClock12('17:00'), '5:00 PM');
    assert.equal(formatClock12('00:05'), '12:05 AM');
    assert.equal(formatClock12('12:30'), '12:30 PM');
    assert.equal(formatClock12('23:59'), '11:59 PM');
  });

  it('round-trips every minute of the day through hour/minute/AM-PM', () => {
    for (let total = 0; total < 24 * 60; total += 1) {
      const clock = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      const parts = toClockParts(clock);
      assert.ok(parts, clock);
      assert.equal(fromClockParts(parts), clock);
    }
  });

  it('maps 12 AM to midnight and 12 PM to noon', () => {
    assert.equal(fromClockParts({ hour12: 12, minute: 0, meridiem: 'AM' }), '00:00');
    assert.equal(fromClockParts({ hour12: 12, minute: 0, meridiem: 'PM' }), '12:00');
    assert.equal(fromClockParts({ hour12: 5, minute: 0, meridiem: 'PM' }), '17:00');
    assert.equal(fromClockParts({ hour12: 1, minute: 0, meridiem: 'AM' }), '01:00');
  });

  it('rejects anything that is not a strict HH:MM clock', () => {
    for (const bad of ['1:00', '24:00', '07:60', '7am', '', '07:00:00']) {
      assert.equal(isValidClock(bad), false, bad);
      assert.equal(clockToMinutes(bad), null, bad);
      assert.equal(toClockParts(bad), null, bad);
    }
    assert.equal(formatClock12('garbage'), 'garbage');
  });

  it('labels the default 22:00-06:00 night window the backend applies', () => {
    assert.equal(DEFAULT_QUIET_START_HOUR, 22);
    assert.equal(DEFAULT_QUIET_END_HOUR, 6);
    assert.equal(isNightClock('01:00'), true);
    assert.equal(isNightClock('22:00'), true);
    assert.equal(isNightClock('05:59'), true);
    assert.equal(isNightClock('06:00'), false);
    assert.equal(isNightClock('21:59'), false);
    assert.equal(isNightClock('17:00'), false);
  });

  it('enforces the server windows for quiz and family remembrance inclusively', () => {
    assert.equal(isClockWithin('07:00', '07:00', '15:00'), true);
    assert.equal(isClockWithin('15:00', '07:00', '15:00'), true);
    assert.equal(isClockWithin('15:15', '07:00', '15:00'), false);
    assert.equal(isClockWithin('06:45', '07:00', '15:00'), false);
    assert.equal(isClockWithin('21:45', '08:00', '21:59'), true);
    assert.equal(isClockWithin('22:00', '08:00', '21:59'), false);
    assert.equal(isClockWithin('01:00'), true);
  });

  it('keeps an existing off-quarter minute selectable instead of snapping it', () => {
    assert.deepEqual(minuteOptions(0), [0, 15, 30, 45]);
    assert.deepEqual(minuteOptions(10), [0, 10, 15, 30, 45]);
  });
});
