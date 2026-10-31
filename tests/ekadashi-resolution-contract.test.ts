/**
 * ekadashi-resolution-contract.test.ts
 *
 * Cross-catalog contract test for Ekadashi resolution in Native:
 * 1. Confirms all 24 named Ekadashis resolve to their specific named identity, never generic Ekadashi.
 * 2. Enforces editorial gating: unapproved (pending_source) fields remain withheld and underReview is flagged.
 * 3. Confirms generic Ekadashi continues to resolve to recurring guide.
 * 4. Protects against broad alias swallowing: unknown Ekadashi names do not resolve to generic Ekadashi.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { lookupVratData, resolveVratSlug, getVratData } from '../lib/vrat-data';

const CANONICAL_NAMED_EKADASHIS = [
  'pausha-putrada-ekadashi',
  'shattila-ekadashi',
  'jaya-ekadashi',
  'vijaya-ekadashi',
  'amalaki-ekadashi',
  'papmochani-ekadashi',
  'kamada-ekadashi',
  'varuthini-ekadashi',
  'mohini-ekadashi',
  'apara-ekadashi',
  'yogini-ekadashi',
  'devshayani-ekadashi',
  'kamika-ekadashi',
  'shravana-putrada-ekadashi',
  'aja-ekadashi',
  'parivartini-ekadashi',
  'indira-ekadashi',
  'papankusha-ekadashi',
  'rama-ekadashi',
  'devutthana-ekadashi',
  'utpanna-ekadashi',
  'saphala-ekadashi',
  'nirjala-ekadashi',
  'vaikunta-ekadashi',
] as const;

describe('Ekadashi Cross-Catalog Contract & Editorial Gating', () => {
  it('1. all 24 named Ekadashis resolve to distinct named identities, never generic Ekadashi', () => {
    assert.equal(CANONICAL_NAMED_EKADASHIS.length, 24);

    for (const slug of CANONICAL_NAMED_EKADASHIS) {
      const data = lookupVratData(slug);
      assert.ok(data, `Expected lookupVratData("${slug}") to return data`);
      assert.equal(data.id, slug, `Expected id to be "${slug}", got "${data.id}"`);
      assert.notEqual(data.name, 'Ekadashi', `Named Ekadashi "${slug}" collapsed to generic "Ekadashi"`);
      assert.ok(data.name.length > 0, `Named Ekadashi "${slug}" has empty name`);
      assert.ok(data.nameLocal && data.nameLocal.length > 0, `Named Ekadashi "${slug}" missing Hindi name`);
      assert.equal(data.fastingType, 'nirjala', `Expected fastingType nirjala for "${slug}"`);
      assert.ok(data.breakFastTime, `Expected breakFastTime for "${slug}"`);
    }
  });

  it('2. editorial guard: unapproved (pending_source) narrative fields remain strictly withheld', () => {
    // Rama Ekadashi has pending_source in the catalog: narrative prose must remain empty
    const rama = lookupVratData('rama-ekadashi');
    assert.ok(rama);
    assert.equal(rama.id, 'rama-ekadashi');
    assert.equal(rama.name, 'Rama Ekadashi');
    assert.equal(rama.underReview, true, 'Expected underReview: true when fields are pending_source');
    assert.equal(rama.significance, '', 'Unapproved significance must be withheld (empty)');
    assert.equal(rama.significanceLocal, '', 'Unapproved significanceLocal must be withheld (empty)');
    assert.equal(rama.practice, '', 'Unapproved practice must be withheld (empty)');
    assert.equal(rama.mantra, '', 'Unapproved mantra must be withheld (empty)');
  });

  it('3. generic Ekadashi continues to resolve to the full recurring guide', () => {
    const generic = lookupVratData('ekadashi');
    assert.ok(generic);
    assert.equal(generic.id, 'ekadashi');
    assert.equal(generic.name, 'Ekadashi');
    assert.equal(generic.nameLocal, 'एकादशी');
    assert.ok(generic.significance.length > 50, 'Generic Ekadashi must have full recurring significance');
    assert.ok(generic.practice.length > 20, 'Generic Ekadashi must have full recurring practice');
    assert.ok(generic.dos && generic.dos.length > 0, 'Generic Ekadashi must have dos list');
    assert.ok(generic.donts && generic.donts.length > 0, 'Generic Ekadashi must have donts list');
  });

  it('4. textual alias resolution: natural language labels resolve to canonical named slugs', () => {
    assert.equal(resolveVratSlug('Rama Ekadashi'), 'rama-ekadashi');
    assert.equal(resolveVratSlug('rama-ekadashi'), 'rama-ekadashi');
    assert.equal(resolveVratSlug('Nirjala Ekadashi'), 'nirjala-ekadashi');
    assert.equal(resolveVratSlug('nirjala ekadashi'), 'nirjala-ekadashi');
    assert.equal(resolveVratSlug('Ekadashi'), 'ekadashi');
    assert.equal(resolveVratSlug('ekadashi'), 'ekadashi');
    assert.equal(resolveVratSlug('ekadasi'), 'ekadashi');
    assert.equal(resolveVratSlug('ekadashi vrat'), 'ekadashi');
  });

  it('5. unknown slugs and broad substring queries are NOT swallowed by generic Ekadashi', () => {
    assert.equal(lookupVratData('unknown-ekadashi'), null);
    assert.equal(lookupVratData('fake-ekadashi-vrat'), null);
    assert.equal(resolveVratSlug('unknown-ekadashi'), null);
    assert.equal(resolveVratSlug('special-ekadashi-festival'), null);

    // Fallback safe rendering for unknown slug
    const fallback = getVratData('unknown-ekadashi');
    assert.ok(fallback);
    assert.equal(fallback.id, 'unknown-ekadashi');
    assert.equal(fallback.name, 'Unknown-Ekadashi');
  });
});
