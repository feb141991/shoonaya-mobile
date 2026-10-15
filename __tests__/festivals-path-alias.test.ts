import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNativeRoute } from '../lib/routes';

/**
 * The backend writes festival and vrat notification links two ways: `/festival/<slug>` (the screen's real path)
 * and `/festivals/<slug>` (the sankranti, series and pradosha candidate producers and the observance
 * notification source). The app only had a route for the singular one, so tapping any notification built with the
 * plural fell through to the fallback and opened Home instead of the festival.
 */
describe('festival notification paths', () => {
  const HOME = '/(tabs)/home';
  const resolve = (path: string) => String(resolveNativeRoute(path, HOME as never));

  it('the singular path still opens the festival screen', () => {
    assert.equal(resolve('/festival/makar-sankranti'), '/festival/makar-sankranti');
  });

  it('the plural path opens the same festival screen, not the fallback', () => {
    assert.equal(resolve('/festivals/makar-sankranti'), '/festival/makar-sankranti');
    assert.equal(resolve('/festivals/pradosh-vrat'), '/festival/pradosh-vrat');
  });

  it('a series day keeps its slug exactly', () => {
    assert.equal(resolve('/festivals/navratri-day-3'), '/festival/navratri-day-3');
  });

  it('the query string travels with it', () => {
    assert.equal(resolve('/festivals/makar-sankranti?from=push&day=2'), '/festival/makar-sankranti?from=push&day=2');
  });

  it('a slug with characters that need encoding is not mangled', () => {
    assert.equal(resolve('/festivals/holi%20dahan'), '/festival/holi%20dahan');
  });

  it('a bare /festivals (no slug) is not turned into a broken festival link: it takes the fallback', () => {
    assert.equal(resolve('/festivals'), HOME);
    assert.equal(resolve('/festivals/'), HOME);
  });

  it('a path that merely starts with the word does not match: /festivalsx/anything', () => {
    assert.equal(resolve('/festivalsx/anything'), HOME);
  });

  it('existing neighbours are unchanged', () => {
    assert.equal(resolve('/vrat/ekadashi'), '/vrat/ekadashi');
    assert.equal(resolve('/panchang'), '/panchang');
    assert.equal(resolve('/festival-quiz/some-quiz'), '/festival-quiz/some-quiz');
  });
});
