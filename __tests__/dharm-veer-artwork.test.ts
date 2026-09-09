import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDharmVeerArtworkSource, hasDharmVeerArtwork } from '../lib/dharm-veer-artwork';

describe('Dharm Veer Artwork Registry', () => {
  it('resolves bundled high-resolution artwork for supported cornerstone heroes', () => {
    assert.strictEqual(hasDharmVeerArtwork('sri-krishna'), true);
    assert.strictEqual(hasDharmVeerArtwork('sri-rama'), true);
    assert.strictEqual(hasDharmVeerArtwork('arjuna'), true);
    assert.strictEqual(hasDharmVeerArtwork('chanakya'), true);

    const krishnaSource = getDharmVeerArtworkSource('sri-krishna');
    assert.ok(krishnaSource !== null, 'Sri Krishna artwork source must be defined');

    const ramaSource = getDharmVeerArtworkSource('sri-rama');
    assert.ok(ramaSource !== null, 'Sri Rama artwork source must be defined');

    const arjunaSource = getDharmVeerArtworkSource('arjuna');
    assert.ok(arjunaSource !== null, 'Arjuna artwork source must be defined');

    const chanakyaSource = getDharmVeerArtworkSource('chanakya');
    assert.ok(chanakyaSource !== null, 'Chanakya artwork source must be defined');
  });

  it('handles case-insensitivity and whitespace gracefully', () => {
    assert.strictEqual(hasDharmVeerArtwork(' Sri-Krishna  '), true);
    assert.strictEqual(hasDharmVeerArtwork('SRI-RAMA'), true);
    assert.ok(getDharmVeerArtworkSource('  chanakya ') !== null);
  });

  it('safely returns null for heroes without local artwork to allow graceful UI fallback', () => {
    assert.strictEqual(hasDharmVeerArtwork('unknown-hero-id'), false);
    assert.strictEqual(getDharmVeerArtworkSource('unknown-hero-id'), null);
    assert.strictEqual(getDharmVeerArtworkSource(''), null);
  });
});
