import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  HANDOVER_APPROACH_DAYS,
  adultOn,
  canStartHandover,
  handoverStage,
  utcToday,
  windowEndsOn,
} from '@/lib/sanskaraHandover';

// Produced by Postgres (2026-11-03, scratch database):
//   select b, (b + interval '18 years')::date, ((b + interval '18 years')::date + interval '12 months')::date
// These are the dates sanskara_can and sanskara_start_claim use. If the server's arithmetic ever changes, these vectors must be
// regenerated from it, never edited by hand to make this file pass.
const POSTGRES_VECTORS: Array<[string, string, string]> = [
  ['2000-02-29', '2018-02-28', '2019-02-28'],
  ['2004-02-29', '2022-02-28', '2023-02-28'],
  ['2007-10-30', '2025-10-30', '2026-10-30'],
  ['2008-02-28', '2026-02-28', '2027-02-28'],
  ['2008-02-29', '2026-02-28', '2027-02-28'],
  ['2008-03-01', '2026-03-01', '2027-03-01'],
  ['2009-02-28', '2027-02-28', '2028-02-28'],
  ['2009-03-01', '2027-03-01', '2028-03-01'],
  ['2009-08-31', '2027-08-31', '2028-08-31'],
  ['2010-07-15', '2028-07-15', '2029-07-15'],
  ['2010-12-31', '2028-12-31', '2029-12-31'],
  ['2011-02-28', '2029-02-28', '2030-02-28'],
  ['2012-01-31', '2030-01-31', '2031-01-31'],
  ['2012-02-29', '2030-02-28', '2031-02-28'],
  ['2013-05-01', '2031-05-01', '2032-05-01'],
  ['2016-02-29', '2034-02-28', '2035-02-28'],
];

function shift(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

describe('hand-over dates match Postgres', () => {
  for (const [birth, adult, end] of POSTGRES_VECTORS) {
    it(`${birth}: 18th birthday ${adult}, window ends ${end}`, () => {
      assert.equal(adultOn(birth), adult);
      assert.equal(windowEndsOn(birth), end);
    });
  }

  it('turns a 29 February birth into 28 February, as the server does, never 1 March', () => {
    assert.equal(adultOn('2008-02-29'), '2026-02-28');
  });
});

describe('hand-over stage', () => {
  const birth = '2010-07-15'; // adult 2028-07-15, window ends 2029-07-15

  it('is "minor" until 90 days before the 18th birthday', () => {
    assert.deepEqual(handoverStage(birth, shift('2028-07-15', -(HANDOVER_APPROACH_DAYS + 1))), { stage: 'minor' });
  });

  it('is "approaching" from 90 days before, with the days left', () => {
    assert.deepEqual(handoverStage(birth, shift('2028-07-15', -HANDOVER_APPROACH_DAYS)), { stage: 'approaching', adultOn: '2028-07-15', daysToAdult: 90 });
    assert.deepEqual(handoverStage(birth, '2028-07-14'), { stage: 'approaching', adultOn: '2028-07-15', daysToAdult: 1 });
  });

  it('is "open" on the 18th birthday itself, with 365 days left', () => {
    assert.deepEqual(handoverStage(birth, '2028-07-15'), {
      stage: 'open', adultOn: '2028-07-15', windowEndsOn: '2029-07-15', daysLeft: 365, urgency: 'normal',
    });
  });

  it('draws the urgency lines exactly: >30 normal, 30..8 closing, 7..1 last week', () => {
    const at = (daysLeft: number) => handoverStage(birth, shift('2029-07-15', -daysLeft)) as { stage: string; urgency: string; daysLeft: number };
    assert.equal(at(31).urgency, 'normal');
    assert.equal(at(30).urgency, 'closing');
    assert.equal(at(8).urgency, 'closing');
    assert.equal(at(7).urgency, 'last_week');
    assert.equal(at(1).urgency, 'last_week');
    assert.equal(at(1).daysLeft, 1);
  });

  it('is "ended" on the day the window ends and after (the server stops listing the child)', () => {
    assert.deepEqual(handoverStage(birth, '2029-07-15'), { stage: 'ended' });
    assert.deepEqual(handoverStage(birth, '2031-01-01'), { stage: 'ended' });
  });

  it('agrees with the server on every boundary of every vector, one day either side', () => {
    for (const [birthDate, adult, end] of POSTGRES_VECTORS) {
      assert.equal(handoverStage(birthDate, shift(adult, -1)).stage, 'approaching', `${birthDate} day before 18`);
      assert.equal(handoverStage(birthDate, adult).stage, 'open', `${birthDate} on 18`);
      assert.equal(handoverStage(birthDate, shift(end, -1)).stage, 'open', `${birthDate} last day of the window`);
      assert.equal(handoverStage(birthDate, end).stage, 'ended', `${birthDate} first day after the window`);
    }
  });

  it('is "unknown" (and never open) for a birth date or a day that does not exist', () => {
    for (const bad of ['', 'x', '2010-02-30', '2010-13-01', '15/07/2010', '2010-7-5']) {
      assert.deepEqual(handoverStage(bad, '2028-07-15'), { stage: 'unknown' }, bad);
    }
    assert.deepEqual(handoverStage(birth, '2028-02-30'), { stage: 'unknown' });
    assert.deepEqual(handoverStage(birth, 'today'), { stage: 'unknown' });
  });
});

describe('canStartHandover', () => {
  const birth = '2010-07-15';
  it('is false for a minor, and for a manager in the 90 days before 18 (the server refuses start_claim until 18)', () => {
    assert.equal(canStartHandover(birth, '2020-01-01'), false);
    assert.equal(canStartHandover(birth, '2028-07-14'), false);
  });
  it('is true from the 18th birthday to the last day of the window', () => {
    assert.equal(canStartHandover(birth, '2028-07-15'), true);
    assert.equal(canStartHandover(birth, '2029-07-14'), true);
  });
  it('is false once the window has ended and for bad input', () => {
    assert.equal(canStartHandover(birth, '2029-07-15'), false);
    assert.equal(canStartHandover('nope', '2028-07-15'), false);
  });
});

describe('utcToday', () => {
  it('is the UTC civil date, not the device date', () => {
    assert.equal(utcToday(new Date('2028-07-14T23:59:59.999Z')), '2028-07-14');
    assert.equal(utcToday(new Date('2028-07-15T00:00:00.000Z')), '2028-07-15');
  });
});
