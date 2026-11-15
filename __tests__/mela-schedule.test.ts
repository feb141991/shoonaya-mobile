import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MELA_SCHEDULE_SNAPSHOT } from '../lib/mela-schedule.generated';
import { civilDateIn, findMela, melaHref, melaList, melaText, publishedMelaDays, upcomingMelaObservances } from '../lib/melaSchedule';
import { resolveNativeRoute } from '../lib/routes';
import { buildSacredDaysDeck, HOME_SACRED_DAYS_WINDOW } from '../lib/sacred-days-deck';

// Instants are UTC; Kumbh dates are civil dates in IST (UTC+5:30).
const at = (iso: string) => new Date(iso);
const home = (now: Date, tradition: string | null = 'hindu') =>
  upcomingMelaObservances({ profileTradition: tradition, windowDays: HOME_SACRED_DAYS_WINDOW, now });

describe('Kumbh schedule on Home', () => {
  it('never publishes an unconfirmed day (Haridwar 15 March, Dev Doli)', () => {
    const haridwar = findMela('haridwar-kumbh-2027')!;
    assert.ok(haridwar.days.some((d) => d.date === '2027-03-15' && d.status === 'unconfirmed'));
    assert.ok(!publishedMelaDays(haridwar).some((d) => d.date === '2027-03-15'));
    // 9 March IST: the next listed day would be 15 March; it is skipped, and 7 April is outside the window.
    assert.deepEqual(home(at('2027-03-09T06:00:00Z')), []);
  });

  it('shows the next bathing day within the window, counted in IST', () => {
    const [entry, ...rest] = home(at('2027-01-05T06:00:00Z'));
    assert.equal(rest.length, 0);
    assert.equal(entry.routeKind, 'mela');
    assert.equal(entry.href, '/mela/haridwar-kumbh-2027');
    assert.equal(entry.daysLeft, 9);
    assert.equal(entry.name, 'Kumbh Snan');
    assert.equal(entry.description, 'Makar Sankranti, Har Ki Pauri, Haridwar');
  });

  it('uses the date at the mela, not the reader\'s: 00:30 IST on 14 January is the day itself', () => {
    assert.equal(civilDateIn('Asia/Kolkata', at('2027-01-13T19:00:00Z')), '2027-01-14');
    assert.equal(home(at('2027-01-13T19:00:00Z'))[0]?.daysLeft, 0);
    assert.equal(home(at('2027-01-13T18:00:00Z'))[0]?.daysLeft, 1);
  });

  it('marks Amrit Snan days and leaves ceremonies to the detail page', () => {
    const amrit = home(at('2027-03-01T06:00:00Z'));
    assert.equal(amrit[0].name, 'Kumbh Amrit Snan');
    assert.equal(amrit[0].daysLeft, 5);
    // 31 October 2026 (flag hoisting) is a ceremony, not a bathing day.
    assert.deepEqual(home(at('2026-10-25T06:00:00Z')), []);
    const nashik = home(at('2027-07-25T06:00:00Z'));
    assert.equal(nashik.length, 1);
    assert.equal(nashik[0].routeSlug, 'nashik-trimbakeshwar-simhastha-2027');
    assert.equal(nashik[0].daysLeft, 8); // 2 August, not the 29 July procession
  });

  it('is offered to Hindu profiles and guests, not to other traditions', () => {
    const now = at('2027-01-05T06:00:00Z');
    assert.equal(home(now, null).length, 1);
    assert.equal(home(now, 'all').length, 1);
    assert.equal(home(now, 'sikh').length, 0);
    assert.equal(home(now, 'jain').length, 0);
  });

  it('joins the Home deck beside a festival on the same day without either hiding the other', () => {
    const now = at('2027-03-01T06:00:00Z');
    const deck = buildSacredDaysDeck({
      observances: [
        { name: 'Maha Shivaratri', emoji: null, daysLeft: 5, routeKind: 'festival', routeSlug: 'maha-shivaratri', href: '/festival/maha-shivaratri', label: '' },
        ...home(now),
      ],
      series: [],
      spiritualDate: '2027-03-01',
      windowDays: HOME_SACRED_DAYS_WINDOW,
    });
    assert.deepEqual(deck.map((item) => item.type === 'observance' ? item.entry.routeSlug : null).sort(), ['haridwar-kumbh-2027', 'maha-shivaratri']);
  });

  it('shows every mela\'s cited text (scoped to its tradition), and nothing when a field is withheld', () => {
    for (const mela of MELA_SCHEDULE_SNAPSHOT.melas) {
      for (const lang of ['en', 'hi'] as const) {
        assert.ok(melaText(mela, mela.name, lang), `${mela.slug} name`);
        assert.ok(melaText(mela, mela.significance, lang), `${mela.slug} significance`);
        assert.ok(melaList(mela, mela.rituals, lang).length > 0, `${mela.slug} rituals`);
        assert.ok(melaList(mela, mela.places, lang).length > 0, `${mela.slug} places`);
      }
      // Hindi is pending review, so a Hindi reader gets the English text.
      assert.equal(melaText(mela, mela.significance, 'hi'), mela.significance.value.en);
      assert.equal(melaText(mela, { ...mela.significance, status: 'withheld' }, 'en'), '');
      assert.equal(melaText(mela, { ...mela.significance, sourceRefs: [] }, 'en'), '');
    }
  });

  it('opens its own screen from a link, and a bare /mela keeps the fallback', () => {
    for (const mela of MELA_SCHEDULE_SNAPSHOT.melas) {
      assert.equal(String(resolveNativeRoute(melaHref(mela.slug), '/notifications')), `/mela/${mela.slug}`);
    }
    assert.equal(String(resolveNativeRoute('/mela/', '/notifications')), '/notifications');
  });
});
