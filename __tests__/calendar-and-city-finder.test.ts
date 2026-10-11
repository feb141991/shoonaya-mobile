import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CITY_CATALOG } from '@/lib/cityCatalog';
import { formatCoordinate, parseCitySuggestion, searchCities } from '@/lib/citySearch';
import { clampDateOnly, formatLocalDateOnly, parseDateOnly } from '@/lib/dateOnly';

describe('City Catalog & City Finder Engine', () => {
  it('contains curated pilgrimage hubs and global metros with valid coordinates', () => {
    assert.ok(CITY_CATALOG.length >= 100, `Expected >= 100 cities, got ${CITY_CATALOG.length}`);

    // Verify key spiritual centers exist
    const names = CITY_CATALOG.map(c => c.city.toLowerCase());
    assert.ok(names.includes('varanasi') || names.includes('kashi'), 'Varanasi/Kashi should exist');
    assert.ok(names.includes('ayodhya'), 'Ayodhya should exist');
    assert.ok(names.includes('mathura'), 'Mathura should exist');
    assert.ok(names.includes('vrindavan'), 'Vrindavan should exist');
    assert.ok(names.includes('haridwar'), 'Haridwar should exist');
    assert.ok(names.includes('rishikesh'), 'Rishikesh should exist');
    assert.ok(names.includes('ujjain'), 'Ujjain should exist');
    assert.ok(names.includes('tirupati'), 'Tirupati should exist');
    assert.ok(names.includes('dwarka'), 'Dwarka should exist');
    assert.ok(names.includes('puri'), 'Puri should exist');
    assert.ok(names.includes('rameshwaram') || names.includes('rameswaram'), 'Rameshwaram should exist');

    // Verify diaspora centers exist
    assert.ok(names.includes('london'), 'London should exist');
    assert.ok(names.includes('new york'), 'New York should exist');
    assert.ok(names.includes('toronto'), 'Toronto should exist');
    assert.ok(names.includes('dubai'), 'Dubai should exist');
    assert.ok(names.includes('singapore'), 'Singapore should exist');

    // Invariant: every city entry must have valid latitude, longitude, and timezone
    for (const city of CITY_CATALOG) {
      assert.ok(typeof city.lat === 'number' && !isNaN(city.lat), `Invalid lat for ${city.city}`);
      assert.ok(typeof city.lng === 'number' && !isNaN(city.lng), `Invalid lng for ${city.city}`);
      assert.ok(city.lat >= -90 && city.lat <= 90, `Lat out of range for ${city.city}: ${city.lat}`);
      assert.ok(city.lng >= -180 && city.lng <= 180, `Lng out of range for ${city.city}: ${city.lng}`);
      assert.ok(city.timezone.length > 0, `Missing timezone for ${city.city}`);
      assert.ok(city.country.length > 0, `Missing country for ${city.city}`);
      assert.doesNotThrow(() => new Intl.DateTimeFormat('en', { timeZone: city.timezone }), `Invalid timezone for ${city.city}`);
    }
  });

  it('searches cities with prefix match and ranks exact/starts-with matches first', async () => {
    const results = await searchCities('vara', 5);
    assert.ok(results.length > 0, 'Should find results for "vara"');
    assert.strictEqual(results[0].city, 'Varanasi');
    assert.strictEqual(results[0].timezone, 'Asia/Kolkata');
    assert.ok(typeof results[0].lat === 'number');
    assert.ok(typeof results[0].lng === 'number');
  });

  it('matches spiritual aliases (e.g. Kashi -> Varanasi, Prayag -> Prayagraj)', async () => {
    const kashiResults = await searchCities('kashi', 5);
    assert.ok(kashiResults.length > 0);
    assert.ok(
      kashiResults.some(r => r.city.toLowerCase().includes('varanasi') || r.label.toLowerCase().includes('kashi')),
      'Should resolve Kashi to Varanasi'
    );

    const prayagResults = await searchCities('prayag', 5);
    assert.ok(prayagResults.length > 0);
    assert.strictEqual(prayagResults[0].city, 'Prayagraj');

    assert.strictEqual((await searchCities('Bombay', 5))[0]?.city, 'Mumbai');
    assert.strictEqual((await searchCities('Madras', 5))[0]?.city, 'Chennai');
    assert.strictEqual((await searchCities('Bangalore', 5))[0]?.city, 'Bengaluru');
  });

  it('matches Jalandhar via exact name, prefix, alias (Jullundur), and typo tolerance (jaladnahr)', async () => {
    const exact = await searchCities('jalandhar', 5);
    assert.ok(exact.length > 0, 'Should find Jalandhar');
    assert.strictEqual(exact[0].city, 'Jalandhar');
    assert.strictEqual(exact[0].timezone, 'Asia/Kolkata');
    assert.strictEqual(exact[0].country, 'India');

    const prefix = await searchCities('jalan', 5);
    assert.ok(prefix.length > 0);
    assert.strictEqual(prefix[0].city, 'Jalandhar');

    const alias = await searchCities('jullundur', 5);
    assert.ok(alias.length > 0);
    assert.strictEqual(alias[0].city, 'Jalandhar');

    const typo = await searchCities('jaladnahr', 5);
    assert.ok(typo.length > 0, 'Should match typo jaladnahr to Jalandhar');
    assert.strictEqual(typo[0].city, 'Jalandhar');
  });

  it('resolves diaspora cities with local timezone (e.g. London -> Europe/London)', async () => {
    const londonResults = await searchCities('london', 5);
    assert.ok(londonResults.length > 0);
    assert.strictEqual(londonResults[0].city, 'London');
    assert.strictEqual(londonResults[0].timezone, 'Europe/London');
    assert.strictEqual(londonResults[0].country, 'United Kingdom');
  });

  it('safely handles empty queries or short strings without crashing', async () => {
    const emptyResults = await searchCities('', 5);
    assert.deepStrictEqual(emptyResults, []);

    const singleCharResults = await searchCities('a', 5);
    assert.deepStrictEqual(singleCharResults, []);
  });

  it('accepts accurate geocoder suggestions and rejects missing or invalid timezones', () => {
    assert.deepStrictEqual(parseCitySuggestion({
      city: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London',
    }), {
      city: 'London', label: 'London, United Kingdom', country: 'United Kingdom',
      lat: 51.5074, lng: -0.1278, timezone: 'Europe/London',
    });
    assert.strictEqual(parseCitySuggestion({
      city: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, timezone: 'Not/AZone',
    }), null);
    assert.strictEqual(parseCitySuggestion({
      city: 'Nowhere', country: 'Nowhere', lat: 91, lng: 0, timezone: 'UTC',
    }), null);
  });

  it('formats coordinates with the correct hemisphere', () => {
    assert.strictEqual(formatCoordinate(-33.8688, 'N', 'S'), '33.869°S');
    assert.strictEqual(formatCoordinate(-151.2093, 'E', 'W'), '151.209°W');
    assert.strictEqual(formatCoordinate(51.5074, 'N', 'S'), '51.507°N');
  });

  it('parses civil dates strictly and formats local calendar dates without UTC shifting', () => {
    assert.strictEqual(parseDateOnly('2024-02-29')?.getDate(), 29);
    assert.strictEqual(parseDateOnly('2024-02-30'), null);
    assert.strictEqual(parseDateOnly('2024-13-01'), null);
    assert.strictEqual(formatLocalDateOnly(new Date(2026, 9, 11, 0, 15)), '2026-10-11');
    assert.strictEqual(clampDateOnly('2026-10-12', undefined, '2026-10-11'), '2026-10-11');
    assert.strictEqual(clampDateOnly('1919-12-31', '1920-01-01', undefined), '1920-01-01');
  });
});
