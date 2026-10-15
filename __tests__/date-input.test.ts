import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  InvalidDateInputError,
  describeDateInputFailure,
  formatParsedDate,
  isoToDisplayDate,
  maskDateInput,
  parseDateInput,
  parseTimeOfDay,
} from '../lib/date-input';

const NOW = new Date(2026, 9, 9); // 9 Oct 2026, local

function iso(raw: string, options = {}) {
  const result = parseDateInput(raw, { now: NOW, ...options });
  return result.ok ? result.iso : `ERR:${result.reason}`;
}

describe('parseDateInput', () => {
  it('reads the exact text from the failed Android save, 18081991, as 18 Aug 1991', () => {
    assert.equal(iso('18081991'), '1991-08-18');
  });

  it('accepts day-first with any common separator, padded or not', () => {
    for (const raw of ['18/08/1991', '18-08-1991', '18.08.1991', '18/8/1991', '1/8/1991 ', ' 01-08-1991']) {
      assert.match(iso(raw), /^1991-08-\d\d$/, raw);
    }
    assert.equal(iso('1/8/1991'), '1991-08-01');
  });

  it('accepts ISO so stored values and pasted text still work', () => {
    assert.equal(iso('1991-08-18'), '1991-08-18');
    assert.equal(iso('1991/8/18'), '1991-08-18');
  });

  it('reads eight bare digits as DDMMYYYY or YYYYMMDD, whichever is a valid birth date', () => {
    assert.equal(iso('18081991'), '1991-08-18'); // DDMMYYYY
    assert.equal(iso('01011999'), '1999-01-01');
    assert.equal(iso('19910818'), '1991-08-18'); // read day-first the month would be 91, so YYYYMMDD
    assert.equal(iso('20001231'), '2000-12-31');
  });

  it('holds every reading to every check, so a real-but-implausible reading cannot hide a valid one', () => {
    // Day-first this is 19/01/1019 (a real date, but before 1900); year-first it is 1901-10-19.
    assert.equal(iso('19011019'), '1901-10-19');
    // Both readings fail: day-first is in the future, year-first has month 20.
    assert.equal(iso('01012030'), 'ERR:future');
    // A real date that is too old reports that, not "not a real date".
    assert.equal(iso('01011850'), 'ERR:too_old');
  });

  it('rejects dates that do not exist, instead of letting the database reject them', () => {
    for (const raw of ['31/02/2020', '29/02/2023', '00/01/2000', '15/13/2000', '32/01/2000', '31/04/2000']) {
      assert.equal(iso(raw), 'ERR:calendar', raw);
    }
  });

  it('accepts 29 February only in a leap year', () => {
    assert.equal(iso('29/02/2024'), '2024-02-29');
    assert.equal(iso('29/02/2100'), 'ERR:calendar'); // 2100 is not a leap year
    assert.equal(iso('29/02/2000'), '2000-02-29');
  });

  it('rejects text that is not a date at all', () => {
    for (const raw of ['abc', '1991', '18-8-91', '18/08', '1808199', '180819911', '18 August 1991', '']) {
      assert.match(iso(raw), /^ERR:(format|empty)$/, raw);
    }
    assert.equal(iso(''), 'ERR:empty');
    assert.equal(iso('   '), 'ERR:empty');
  });

  it('rejects a future birth date, accepts today, and honours allowFuture for events', () => {
    assert.equal(iso('09/10/2026'), '2026-10-09');
    assert.equal(iso('10/10/2026'), 'ERR:future');
    assert.equal(iso('10/10/2026', { allowFuture: true }), '2026-10-10');
  });

  it('rejects years before the minimum', () => {
    assert.equal(iso('01/01/1899'), 'ERR:too_old');
    assert.equal(iso('01/01/1900'), '1900-01-01');
    assert.equal(iso('01/01/1850', { minYear: 1800 }), '1850-01-01');
  });
});

describe('maskDateInput', () => {
  it('formats digits as DD/MM/YYYY while typing', () => {
    assert.equal(maskDateInput('1'), '1');
    assert.equal(maskDateInput('18'), '18');
    assert.equal(maskDateInput('180'), '18/0');
    assert.equal(maskDateInput('1808'), '18/08');
    assert.equal(maskDateInput('18081'), '18/08/1');
    assert.equal(maskDateInput('18081991'), '18/08/1991');
  });

  it('keeps an already formatted value and trims extra digits', () => {
    assert.equal(maskDateInput('18/08/1991'), '18/08/1991');
    assert.equal(maskDateInput('180819911234'), '18/08/1991');
  });

  it('drops letters and symbols', () => {
    assert.equal(maskDateInput('1a8-0b8*1991'), '18/08/1991');
  });

  it('leaves text typed as ISO alone so it is not mangled', () => {
    assert.equal(maskDateInput('1991-'), '1991-');
    assert.equal(maskDateInput('1991-08-18'), '1991-08-18');
    assert.equal(maskDateInput('1991-08-18999'), '1991-08-18');
  });

  it('round-trips: whatever the mask produces for a valid date parses back to that date', () => {
    for (const digits of ['18081991', '01012000', '29022024', '31121999', '15082010']) {
      const masked = maskDateInput(digits);
      const parsed = parseDateInput(masked, { now: NOW });
      assert.equal(parsed.ok, true, `${digits} -> ${masked}`);
      if (parsed.ok) assert.equal(parsed.iso, `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`);
    }
  });
});

describe('isoToDisplayDate', () => {
  it('shows a stored ISO date day-first, and round-trips through the parser', () => {
    assert.equal(isoToDisplayDate('1991-08-18'), '18/08/1991');
    assert.equal(isoToDisplayDate('1991-08-18T00:00:00Z'), '18/08/1991');
    assert.equal(iso(isoToDisplayDate('2024-02-29')), '2024-02-29');
  });

  it('gives an empty string for nothing or garbage', () => {
    assert.equal(isoToDisplayDate(''), '');
    assert.equal(isoToDisplayDate(null), '');
    assert.equal(isoToDisplayDate(undefined), '');
    assert.equal(isoToDisplayDate('18081991'), '');
  });
});

describe('messages', () => {
  it('shows the reading back so a misread is visible', () => {
    assert.equal(formatParsedDate('1991-08-18'), '18 Aug 1991');
  });

  it('has a distinct, specific message for every failure, in English and Hindi', () => {
    const reasons = ['format', 'calendar', 'future', 'too_old'] as const;
    const english = new Set(reasons.map((r) => describeDateInputFailure(r, 'en')));
    const hindi = new Set(reasons.map((r) => describeDateInputFailure(r, 'hi')));
    assert.equal(english.size, reasons.length);
    assert.equal(hindi.size, reasons.length);
    assert.match(describeDateInputFailure('format', 'en'), /DD\/MM\/YYYY/);
    assert.match(describeDateInputFailure('format', 'en', 'event'), /Enter the date/);
  });

  it('InvalidDateInputError carries the field and reason', () => {
    const error = new InvalidDateInputError('date_of_birth', 'calendar');
    assert.equal(error instanceof Error, true);
    assert.equal(error.field, 'date_of_birth');
    assert.equal(error.reason, 'calendar');
  });
});

describe('parseTimeOfDay', () => {
  it('normalises common 24-hour entries to HH:MM', () => {
    for (const [raw, expected] of [['06:30', '06:30'], ['6:30', '06:30'], ['06.30', '06:30'], ['0630', '06:30'], ['23:59', '23:59'], ['00:00', '00:00'], [' 7:05 ', '07:05']]) {
      assert.deepEqual(parseTimeOfDay(raw), { ok: true, value: expected }, raw);
    }
  });

  it('rejects impossible and malformed times with a reason', () => {
    assert.deepEqual(parseTimeOfDay('24:00'), { ok: false, reason: 'range' });
    assert.deepEqual(parseTimeOfDay('12:60'), { ok: false, reason: 'range' });
    for (const raw of ['6', '6:3', 'noon', '6:30pm', '12:3x']) assert.deepEqual(parseTimeOfDay(raw), { ok: false, reason: 'format' }, raw);
    assert.deepEqual(parseTimeOfDay(''), { ok: false, reason: 'empty' });
  });
});
