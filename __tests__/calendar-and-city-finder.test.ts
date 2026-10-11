import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CITY_CATALOG } from '@/lib/cityCatalog';
import { searchCities } from '@/lib/citySearch';

describe('City Catalog & City Finder Engine', () => {
  it('contains comprehensive pilgrimage hubs and global metros with valid coordinates', () => {
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
});
