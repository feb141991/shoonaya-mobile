import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PANCHANG_INFO_TEXT } from '../lib/panchangInfoText';
import { resolveNativeRoute } from '../lib/routes';
import { buildSolarDay, type SolarDay } from '../lib/solarDay';
import { SOLAR_DAY_REFERENCE, resolveSolarDayLocation } from '../lib/solarDayLocation';
import { compassWord, describeSolarMoment, solarEventInfo } from '../lib/solarDayText';
import { dayMessage, parseSolarSceneMessage, sceneInjection } from '../lib/solarSceneMessage';

function ujjain(): SolarDay {
  const r = buildSolarDay({ civilDate: '2026-11-26', lat: 23.1765, lon: 75.7885, timezone: 'Asia/Kolkata' });
  assert.ok(r.ok);
  return r.day;
}

describe('where the Solar Day is calculated', () => {
  const row = { latitude: 28.61, longitude: 77.21, timezone: 'Asia/Kolkata', city: 'Delhi', neighbourhood: null };

  it('uses a complete saved place', () => {
    assert.deepEqual(resolveSolarDayLocation({ data: row, error: null }), {
      lat: 28.61, lon: 77.21, timezone: 'Asia/Kolkata', city: 'Delhi', source: 'saved',
    });
  });

  it('throws on a failed read instead of treating it as "no saved place"', () => {
    const error = { code: '57014', message: 'canceling statement due to statement timeout' };
    assert.throws(() => resolveSolarDayLocation({ data: null, error }), (e) => e === error);
  });

  it('falls back to the labelled Ujjain reference for a missing or partial place, never half of one', () => {
    for (const data of [
      null,
      { ...row, latitude: null },
      { ...row, longitude: undefined },
      { ...row, timezone: null },
      { ...row, timezone: '   ' },
      { ...row, timezone: 'Mars/Olympus' },
      { ...row, latitude: 91 },
      { ...row, longitude: Number.NaN },
    ]) {
      assert.deepEqual(resolveSolarDayLocation({ data, error: null }), SOLAR_DAY_REFERENCE, JSON.stringify(data));
    }
    assert.equal(SOLAR_DAY_REFERENCE.source, 'reference');
  });
});

describe('what the screen says', () => {
  const day = ujjain();
  const abhijit = day.windows.find((w) => w.id === 'abhijit')!;

  it('names the open window and the next event with its time', () => {
    const text = describeSolarMoment(abhijit.start + 5, day);
    assert.equal(text.now, 'Now: Abhijit Muhurat');
    assert.match(text.height, /^Daytime · about \d+° above the horizon$/);
    assert.match(text.next ?? '', /^Next: Rahu Kaal at \d{1,2}:\d{2} PM, in .+\.$/);
  });

  it('does not state a time for an event that is only reached tomorrow', () => {
    const text = describeSolarMoment(day.sunset + 30, day);
    assert.equal(text.next, 'Next: Brahma Muhurta, tomorrow.');
    assert.match(text.height, /^(Twilight|Night) · about \d+° below the horizon$/);
  });

  it('gives screen readers the time, height and direction', () => {
    assert.match(describeSolarMoment(day.sunrise + 60, day).spoken, /^\d{1,2}:\d{2} AM\. The Sun is about \d+ degrees above the horizon, in the (east|south-east)\.$/);
    assert.doesNotMatch(describeSolarMoment(0, day).spoken, /, in the /);
  });

  it('reuses Panchang\'s explanations word for word', () => {
    assert.equal(solarEventInfo('rahu'), PANCHANG_INFO_TEXT['Rahu Kaal']);
    assert.equal(solarEventInfo('abhijit'), PANCHANG_INFO_TEXT['Abhijit Muhurat']);
    assert.equal(solarEventInfo('brahma'), PANCHANG_INFO_TEXT['Brahma Muhurta']);
    assert.equal(solarEventInfo('sunrise'), PANCHANG_INFO_TEXT.Sunrise);
  });

  it('turns bearings into compass words', () => {
    assert.equal(compassWord(0), 'north');
    assert.equal(compassWord(Math.PI / 2), 'east');
    assert.equal(compassWord(Math.PI), 'south');
    assert.equal(compassWord(2 * Math.PI - 0.01), 'north');
  });
});

describe('messages between the screen and the sky picture', () => {
  it('accepts only the three known shapes from the page', () => {
    assert.deepEqual(parseSolarSceneMessage('{"type":"ready"}'), { type: 'ready' });
    assert.deepEqual(parseSolarSceneMessage('{"type":"unsupported"}'), { type: 'unsupported' });
    assert.deepEqual(parseSolarSceneMessage('{"type":"drag","deltaMinutes":-12.5}'), { type: 'drag', deltaMinutes: -12.5 });
    for (const bad of ['', '  ', 'nope', 'null', '{"type":"navigate","url":"https://x"}', '{"type":"drag"}', '{"type":"drag","deltaMinutes":"5"}',
      '{"type":"drag","deltaMinutes":1e999}', '{"type":"drag","deltaMinutes":5000}', `{"type":"ready","pad":"${'x'.repeat(600)}"}`]) {
      assert.equal(parseSolarSceneMessage(bad), null, bad.slice(0, 40));
    }
    assert.equal(parseSolarSceneMessage(42), null);
  });

  it('sends the sky arcs for the daytime windows only, in the given colours', () => {
    const message = dayMessage(ujjain(), { brahma: 'a', abhijit: 'b', rahu: 'c' });
    assert.equal(message.type, 'day');
    if (message.type !== 'day') return;
    assert.deepEqual(message.windows.map((w) => w.color), ['b', 'c']);
    assert.match(sceneInjection({ type: 'time', minutes: 600 }), /^window\.solarScene&&window\.solarScene\.receive\(\{"type":"time","minutes":600\}\);true;$/);
  });
});

describe('wiring', () => {
  it('opens from a link', () => {
    assert.equal(String(resolveNativeRoute('/solar-day', '/home' as never)), '/solar-day');
  });
});
