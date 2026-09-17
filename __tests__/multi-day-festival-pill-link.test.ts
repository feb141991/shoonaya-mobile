import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveSeriesChildSlug,
  resolveSeriesChildHref,
  getSeriesChildContent,
  getSeriesGroupContent,
} from '../lib/observance-series-content';
import { resolveNativeRoute } from '../lib/routes';

test('Multi-Day Festival Pill Link & Same Day Content Resolution', async (t) => {
  await t.test('1. Resolves Day 3 of Sharad Navratri to exact child slug, not Day 1', () => {
    const slug = resolveSeriesChildSlug({
      name: 'Navratri Day 3 — Chandraghanta',
      routeSlug: 'sharad-navratri',
    });
    assert.equal(slug, 'navratri-day-3-chandraghanta');
    assert.equal(
      resolveSeriesChildHref({
        name: 'Navratri Day 3 — Chandraghanta',
        routeSlug: 'sharad-navratri',
        href: '/festival/sharad-navratri',
      }),
      '/festival/navratri-day-3-chandraghanta',
    );
  });

  await t.test('2. Resolves each day of Sharad Navratri accurately', () => {
    const cases = [
      { name: 'Navratri Day 1 — Shailaputri', expected: 'navratri-day-1-shailaputri' },
      { name: 'Navratri Day 2 — Brahmacharini', expected: 'navratri-day-2-brahmacharini' },
      { name: 'Navratri Day 3 — Chandraghanta', expected: 'navratri-day-3-chandraghanta' },
      { name: 'Navratri Day 4 — Kushmanda', expected: 'navratri-day-4-kushmanda' },
      { name: 'Navratri Day 5 — Skandamata', expected: 'navratri-day-5-skandamata' },
      { name: 'Navratri Day 6 — Katyayani (Durga Sasthi)', expected: 'navratri-day-6-katyayani' },
      { name: 'Navratri Day 7 — Kalaratri (Maha Saptami)', expected: 'navratri-day-7-kalaratri' },
      { name: 'Durga Ashtami (Maha Ashtami)', expected: 'durga-ashtami' },
      { name: 'Maha Navami', expected: 'maha-navami' },
      { name: 'Vijayadashami / Dussehra', expected: 'dussehra' },
    ];

    for (const { name, expected } of cases) {
      const resolved = resolveSeriesChildSlug({ name, routeSlug: 'sharad-navratri' });
      assert.equal(resolved, expected, `Failed for ${name}`);
    }
  });

  await t.test('3. Resolves Ganeshotsav sub-days accurately', () => {
    const day2 = resolveSeriesChildSlug({ name: 'Ganeshotsav Day 2', routeSlug: 'ganesh-chaturthi' });
    assert.equal(day2, 'ganeshotsav-day-2');

    const day4 = resolveSeriesChildSlug({ name: 'Ganeshotsav Day 4', routeSlug: 'ganesh-chaturthi' });
    assert.equal(day4, 'ganeshotsav-day-4');

    const day1 = resolveSeriesChildSlug({ name: 'Ganesh Chaturthi', routeSlug: 'ganesh-chaturthi' });
    assert.equal(day1, 'ganesh-chaturthi');
  });

  await t.test('4. Resolves Chhath Puja sub-days (Kharna, Sandhya Arghya, etc.)', () => {
    const nahayKhay = resolveSeriesChildSlug({ name: 'Nahay Khay', routeSlug: 'chhath-puja' });
    assert.equal(nahayKhay, 'chhath-nahay-khay');

    const kharna = resolveSeriesChildSlug({ name: 'Chhath Day 2 · Kharna', routeSlug: 'chhath-puja' });
    assert.equal(kharna, 'chhath-kharna');

    const sandhya = resolveSeriesChildSlug({ name: 'Sandhya Arghya', routeSlug: 'chhath-puja' });
    assert.equal(sandhya, 'chhath-puja');

    const usha = resolveSeriesChildSlug({ name: 'Usha Arghya', routeSlug: 'chhath-puja' });
    assert.equal(usha, 'chhath-usha-arghya');
  });

  await t.test('5. Resolves Diwali 5-Day cycle sub-days', () => {
    const dhanteras = resolveSeriesChildSlug({ name: 'Dhanteras', routeSlug: 'diwali-five-days' });
    assert.equal(dhanteras, 'dhanteras');

    const naraka = resolveSeriesChildSlug({ name: 'Naraka Chaturdashi', routeSlug: 'diwali-five-days' });
    assert.equal(naraka, 'naraka-chaturdashi');

    const diwali = resolveSeriesChildSlug({ name: 'Diwali (Lakshmi Puja)', routeSlug: 'diwali-five-days' });
    assert.equal(diwali, 'diwali');

    const govardhan = resolveSeriesChildSlug({ name: 'Govardhan Puja', routeSlug: 'diwali-five-days' });
    assert.equal(govardhan, 'govardhan-puja');

    const bhaiDooj = resolveSeriesChildSlug({ name: 'Bhai Dooj', routeSlug: 'diwali-five-days' });
    assert.equal(bhaiDooj, 'bhai-dooj');
  });

  await t.test('6. Resolves from civilDate in dynamic seriesList', () => {
    const mockSeries = [
      {
        definitionKey: 'sharad-navratri',
        children: [
          { sequence: 1, slug: 'navratri-day-1-shailaputri', civilDate: '2026-10-12', title: 'Day 1' },
          { sequence: 2, slug: 'navratri-day-2-brahmacharini', civilDate: '2026-10-13', title: 'Day 2' },
          { sequence: 3, slug: 'navratri-day-3-chandraghanta', civilDate: '2026-10-14', title: 'Day 3' },
        ],
      },
    ];

    const slug = resolveSeriesChildSlug({
      date: '2026-10-14',
      routeSlug: 'sharad-navratri',
      seriesList: mockSeries,
    });
    assert.equal(slug, 'navratri-day-3-chandraghanta');
  });

  await t.test('7. Leaves non-series single-day festivals intact', () => {
    const standalone = resolveSeriesChildHref({
      name: 'Maha Shivaratri',
      routeSlug: 'maha-shivaratri',
      href: '/festival/maha-shivaratri',
    });
    assert.equal(standalone, '/festival/maha-shivaratri');
  });

  await t.test('8. resolveNativeRoute reroutes /vrat/ for multi-day series to /festival/', () => {
    assert.equal(
      resolveNativeRoute('/vrat/navratri-day-3-chandraghanta'),
      '/festival/navratri-day-3-chandraghanta',
    );
    assert.equal(
      resolveNativeRoute('/vrat/sharad-navratri'),
      '/festival/sharad-navratri',
    );
    assert.equal(
      resolveNativeRoute('/vrat/dhanteras'),
      '/festival/dhanteras',
    );
    // Standard standalone vrats stay on /vrat
    assert.equal(
      resolveNativeRoute('/vrat/ekadashi'),
      '/vrat/ekadashi',
    );
  });
});
