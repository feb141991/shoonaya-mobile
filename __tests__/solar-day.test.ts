import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePanchang } from '@sangam/panchang-engine';
import {
  activeWindows,
  altitudeWholeDegrees,
  buildSolarDay,
  formatClock,
  formatDuration,
  localNoonInstant,
  minutesNowIn,
  nextEvent,
  parseClockMinutes,
  parseClockRange,
  type SolarDay,
} from '../lib/solarDay';
import { solarPhase, sunAltitudeDeg, sunAzimuthRad, wrapMinutes } from '../lib/solarGeometry';

const UJJAIN = { lat: 23.1765, lon: 75.7885, timezone: 'Asia/Kolkata' };

function ujjainDay(civilDate = '2026-11-26'): SolarDay {
  const result = buildSolarDay({ civilDate, ...UJJAIN });
  assert.ok(result.ok, 'Ujjain has a sunrise and a sunset');
  return result.day;
}

describe('clock parsing', () => {
  it('reads the engine format', () => {
    assert.equal(parseClockMinutes('06:47 AM'), 407);
    assert.equal(parseClockMinutes('12:00 AM'), 0);
    assert.equal(parseClockMinutes('12:38 PM'), 758);
    assert.equal(parseClockMinutes('05:40 PM'), 1060);
    assert.deepEqual(parseClockRange('05:02 AM – 05:55 AM'), [302, 355]);
    assert.deepEqual(parseClockRange('11:15 PM - 12:03 AM'), [1395, 3]);
  });
  it('refuses malformed text instead of guessing', () => {
    for (const bad of ['', '   ', '6:47', '06:47', '13:00 PM', '00:30 AM', '06:60 AM', '06.47 AM', 'sunrise', null, undefined]) {
      assert.equal(parseClockMinutes(bad as string | null | undefined), null, String(bad));
    }
    for (const bad of ['05:02 AM', '05:02 AM – ', '05:02 AM – 05:55 AM – 06:00 AM', '']) {
      assert.equal(parseClockRange(bad), null, bad);
    }
  });
});

describe('buildSolarDay', () => {
  it('uses exactly the times Panchang shows for the same place and day', () => {
    const day = ujjainDay();
    const panchang = calculatePanchang(localNoonInstant('2026-11-26', UJJAIN.timezone), UJJAIN.lat, UJJAIN.lon, UJJAIN.timezone);
    assert.equal(formatClock(day.sunrise).padStart(8, '0'), panchang.sunrise);
    assert.equal(formatClock(day.sunset).padStart(8, '0'), panchang.sunset);
    assert.deepEqual(day.windows.map((w) => [w.id, w.label]), [
      ['brahma', panchang.brahmaMuhurta],
      ['abhijit', panchang.abhijitMuhurat],
      ['rahu', panchang.rahuKaal],
    ]);
  });

  it('builds the civil day in the place\'s own time zone, even far east of UTC', () => {
    const result = buildSolarDay({ civilDate: '2026-11-26', lat: -36.85, lon: 174.76, timezone: 'Pacific/Auckland' });
    assert.ok(result.ok);
    assert.equal(formatClock(result.day.sunrise), '5:57 AM');
    assert.equal(formatClock(result.day.sunset), '8:19 PM');
  });

  it('anchors the day at local noon in the place\'s time zone', () => {
    assert.equal(localNoonInstant('2026-11-26', 'Pacific/Auckland').toISOString(), '2026-11-25T23:00:00.000Z');
    assert.equal(localNoonInstant('2026-11-26', 'Asia/Kolkata').toISOString(), '2026-11-26T06:30:00.000Z');
    assert.equal(localNoonInstant('2026-07-01', 'America/Los_Angeles').toISOString(), '2026-07-01T19:00:00.000Z');
  });

  it('refuses a day with no sunset (midnight sun) instead of drawing a false one', () => {
    assert.deepEqual(buildSolarDay({ civilDate: '2026-06-21', lat: 69.65, lon: 18.96, timezone: 'Europe/Oslo' }), {
      ok: false,
      reason: 'no_sunrise_or_sunset',
    });
  });
});

describe('sun position', () => {
  const day = ujjainDay();

  it('sits on the horizon at the engine\'s sunrise and sunset (refraction allowance)', () => {
    for (const m of [day.sunrise, day.sunset]) {
      const alt = sunAltitudeDeg(m, day);
      assert.ok(alt > -1.5 && alt < 0.5, `altitude ${alt} at ${formatClock(m)}`);
    }
  });

  it('peaks at 90 minus latitude plus declination (late November, about 46 degrees at Ujjain)', () => {
    const peak = sunAltitudeDeg(day.noonMinutes, day);
    assert.ok(peak > 45 && peak < 47, String(peak));
    assert.equal(altitudeWholeDegrees(day.noonMinutes, day), Math.round(peak));
  });

  it('rises in the east and sets in the west, south at noon from the northern tropics in winter', () => {
    const am = sunAzimuthRad(day.sunrise + 60, day);
    const pm = sunAzimuthRad(day.sunset - 60, day);
    const noon = sunAzimuthRad(day.noonMinutes + 1, day);
    assert.ok(am > 0 && am < Math.PI, `morning ${am}`);
    assert.ok(pm > Math.PI && pm < 2 * Math.PI, `evening ${pm}`);
    assert.ok(Math.abs(noon - Math.PI) < 0.05, `noon ${noon}`);
  });

  it('names the phases at the civil-twilight boundaries', () => {
    assert.equal(solarPhase(0), 'day');
    assert.equal(solarPhase(-0.1), 'twilight');
    assert.equal(solarPhase(-6), 'twilight');
    assert.equal(solarPhase(-6.1), 'night');
  });
});

describe('timeline', () => {
  const day = ujjainDay();

  it('finds the window that contains a minute, including one crossing midnight', () => {
    assert.deepEqual(activeWindows(day.windows.find((w) => w.id === 'abhijit')!.start + 1, day).map((w) => w.id), ['abhijit']);
    assert.deepEqual(activeWindows(1000, day).map((w) => w.id), []);
    const crossing: SolarDay = { ...day, windows: [{ id: 'brahma', start: 1395, end: 3, label: 'x' }] };
    assert.deepEqual(activeWindows(1, crossing).map((w) => w.id), ['brahma']);
    assert.deepEqual(activeWindows(4, crossing).map((w) => w.id), []);
  });

  it('flags an event reached only past midnight, so its time is not stated as tomorrow\'s fact', () => {
    const later = nextEvent(day.sunrise - 1, day);
    assert.equal(later?.id, 'sunrise');
    assert.equal(later?.laterToday, true);
    const wrapped = nextEvent(day.sunset + 1, day);
    assert.equal(wrapped?.id, 'brahma');
    assert.equal(wrapped?.laterToday, false);
  });

  it('formats clock times and durations', () => {
    assert.equal(formatClock(0), '12:00 AM');
    assert.equal(formatClock(1439.6), '12:00 AM');
    assert.equal(formatClock(-30), '11:30 PM');
    assert.equal(formatDuration(0), '0 min');
    assert.equal(formatDuration(59.6), '1 h');
    assert.equal(formatDuration(158), '2 h 38 min');
    assert.equal(wrapMinutes(1500), 60);
  });

  it('reads the current minute in the place\'s time zone, not the device\'s', () => {
    const instant = new Date('2026-11-26T06:30:00Z');
    assert.equal(minutesNowIn('Asia/Kolkata', instant), 12 * 60);
    assert.equal(minutesNowIn('Pacific/Auckland', instant), 19 * 60 + 30);
  });
});
