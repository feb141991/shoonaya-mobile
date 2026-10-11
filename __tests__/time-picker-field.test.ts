import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeToHoursAndMinutes,
  formatTime24,
  formatTime12Display,
  HOURS_12,
  HOURS_24,
  MINUTES,
  MINUTE_PRESETS,
} from '../lib/timePicker';

describe('TimePickerField utilities and formatting', () => {
  describe('parseTimeToHoursAndMinutes', () => {
    it('defaults to 12:00 for null, empty or undefined input', () => {
      assert.deepEqual(parseTimeToHoursAndMinutes(null), { hour: 12, minute: 0 });
      assert.deepEqual(parseTimeToHoursAndMinutes(''), { hour: 12, minute: 0 });
      assert.deepEqual(parseTimeToHoursAndMinutes(undefined), { hour: 12, minute: 0 });
    });

    it('correctly parses standard 24-hour time strings', () => {
      assert.deepEqual(parseTimeToHoursAndMinutes('14:35'), { hour: 14, minute: 35 });
      assert.deepEqual(parseTimeToHoursAndMinutes('00:00'), { hour: 0, minute: 0 });
      assert.deepEqual(parseTimeToHoursAndMinutes('23:59'), { hour: 23, minute: 59 });
      assert.deepEqual(parseTimeToHoursAndMinutes('08:05'), { hour: 8, minute: 5 });
    });

    it('handles malformed or out-of-range strings gracefully', () => {
      assert.deepEqual(parseTimeToHoursAndMinutes('invalid'), { hour: 12, minute: 0 });
      assert.deepEqual(parseTimeToHoursAndMinutes('25:99'), { hour: 12, minute: 0 });
      assert.deepEqual(parseTimeToHoursAndMinutes('-5:10'), { hour: 12, minute: 10 });
    });
  });

  describe('formatTime24', () => {
    it('formats hours and minutes into standard 2-digit 24h format', () => {
      assert.equal(formatTime24(14, 35), '14:35');
      assert.equal(formatTime24(0, 5), '00:05');
      assert.equal(formatTime24(23, 59), '23:59');
      assert.equal(formatTime24(9, 0), '09:00');
    });

    it('clamps values out of range', () => {
      assert.equal(formatTime24(30, 75), '23:59');
      assert.equal(formatTime24(-5, -10), '00:00');
    });
  });

  describe('formatTime12Display', () => {
    it('returns null for empty or non-colon time inputs', () => {
      assert.equal(formatTime12Display(null), null);
      assert.equal(formatTime12Display(''), null);
      assert.equal(formatTime12Display('unknown'), null);
    });

    it('formats midnight and noon accurately', () => {
      assert.equal(formatTime12Display('00:00'), '12:00 AM');
      assert.equal(formatTime12Display('12:00'), '12:00 PM');
    });

    it('formats morning and evening hours accurately', () => {
      assert.equal(formatTime12Display('09:15'), '09:15 AM');
      assert.equal(formatTime12Display('14:35'), '02:35 PM');
      assert.equal(formatTime12Display('21:45'), '09:45 PM');
      assert.equal(formatTime12Display('23:59'), '11:59 PM');
    });
  });

  describe('hours and minutes constants', () => {
    it('contains all 24 hours for 24h mode and 12 hours for 12h mode', () => {
      assert.equal(HOURS_24.length, 24);
      assert.equal(HOURS_24[0], 0);
      assert.equal(HOURS_24[23], 23);

      assert.equal(HOURS_12.length, 12);
      assert.equal(HOURS_12[0], 12); // 12 comes first on traditional clocks
      assert.equal(HOURS_12[1], 1);
    });

    it('contains 60 minutes and quick presets', () => {
      assert.equal(MINUTES.length, 60);
      assert.deepEqual(MINUTE_PRESETS, [0, 15, 30, 45]);
    });
  });
});
