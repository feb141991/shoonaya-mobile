import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  JAPA_SOUND_OPTIONS,
  DEFAULT_JAPA_SOUND_ID,
  getJapaSoundById,
  getAllJapaSounds,
} from '../lib/japa-audio';

describe('Japa Ambient Audio & Tanpura Engine', () => {
  it('defines the default sound as silent (off)', () => {
    assert.strictEqual(DEFAULT_JAPA_SOUND_ID, 'off');
    const defaultSound = getJapaSoundById(DEFAULT_JAPA_SOUND_ID);
    assert.strictEqual(defaultSound.id, 'off');
    assert.strictEqual(defaultSound.audioUrl, null);
    assert.strictEqual(defaultSound.label, 'Silent Practice');
  });

  it('contains valid and complete metadata for all sound tracks', () => {
    const sounds = getAllJapaSounds();
    assert.ok(sounds.length >= 5, 'Should have at least 5 sound options (off + 4 drone keys)');

    const seenIds = new Set<string>();
    for (const track of sounds) {
      assert.ok(track.id, 'Sound must have an id');
      assert.ok(!seenIds.has(track.id), `Duplicate sound id: ${track.id}`);
      seenIds.add(track.id);

      assert.ok(track.label, 'Sound must have a label');
      assert.ok(track.sanskritLabel, 'Sound must have a Sanskrit label');
      assert.ok(track.subtitle, 'Sound must have a subtitle');
      assert.ok(track.sourceName, 'Sound must have a source name');
      assert.ok(track.creator, 'Sound must have a creator');
      assert.ok(track.licenseLabel, 'Sound must have a license label');
      assert.ok(track.attributionText, 'Sound must have attribution text');
      assert.strictEqual(track.approvalStatus, 'approved');

      if (track.id !== 'off') {
        assert.ok(track.keyNote, `Sound ${track.id} must have a root key note`);
        assert.ok(track.audioUrl, `Sound ${track.id} must have an audio URL`);
        assert.match(track.audioUrl, /^https?:\/\//, `Sound ${track.id} audio URL must be valid HTTP(S)`);
      }
    }
  });

  it('resolves each canonical Tanpura drone key', () => {
    const keyA = getJapaSoundById('tanpura-a');
    assert.strictEqual(keyA.id, 'tanpura-a');
    assert.strictEqual(keyA.keyNote, 'A');

    const keyC = getJapaSoundById('tanpura-c');
    assert.strictEqual(keyC.id, 'tanpura-c');
    assert.strictEqual(keyC.keyNote, 'C');

    const keyD = getJapaSoundById('tanpura-d');
    assert.strictEqual(keyD.id, 'tanpura-d');
    assert.strictEqual(keyD.keyNote, 'D');

    const keyG = getJapaSoundById('tanpura-g');
    assert.strictEqual(keyG.id, 'tanpura-g');
    assert.strictEqual(keyG.keyNote, 'G');
  });

  it('safely falls back to default silent mode for unknown, null, or undefined IDs', () => {
    const fromNull = getJapaSoundById(null);
    assert.strictEqual(fromNull.id, 'off');

    const fromUndefined = getJapaSoundById(undefined);
    assert.strictEqual(fromUndefined.id, 'off');

    const fromEmpty = getJapaSoundById('');
    assert.strictEqual(fromEmpty.id, 'off');

    const fromUnknown = getJapaSoundById('non-existent-drone');
    assert.strictEqual(fromUnknown.id, 'off');
  });
});

describe('10 Sacred Mala Skins Treasury', () => {
  it('contains exactly 10 canonical mala skins including Sphatik, Vaijayanti, and Navaratna', async () => {
    const { MALA_SKINS, getMalaSkin } = await import('../lib/mala-skins');
    const skinKeys = Object.keys(MALA_SKINS);
    assert.strictEqual(skinKeys.length, 10, 'Should have exactly 10 sacred mala skins');

    const expectedKeys = [
      'default',
      'sacred-mala',
      'krishna-flute',
      'tulsi-leaf',
      'brahma-lotus',
      'the-sage-halo',
      'bodhi-leaf',
      'sphatik-crystal',
      'vaijayanti-bead',
      'navaratna-gems',
    ];

    for (const key of expectedKeys) {
      assert.ok(MALA_SKINS[key], `Mala skin ${key} must exist`);
      const skin = MALA_SKINS[key];
      assert.ok(skin.label, `Mala ${key} must have a label`);
      assert.ok(skin.beadColor, `Mala ${key} must have beadColor`);
      assert.ok(skin.threadColor, `Mala ${key} must have threadColor`);
      assert.ok(skin.pendant, `Mala ${key} must have a pendant`);
    }

    // Verify Sphatik Crystal
    const sphatik = getMalaSkin('sphatik-crystal');
    assert.strictEqual(sphatik.label, 'Sphatik');
    assert.strictEqual(sphatik.pendant, 'moon');

    // Verify Vaijayanti
    const vaijayanti = getMalaSkin('vaijayanti-bead');
    assert.strictEqual(vaijayanti.label, 'Vaijayanti');
    assert.strictEqual(vaijayanti.pendant, 'peacock');

    // Verify Navaratna
    const navaratna = getMalaSkin('navaratna-gems');
    assert.strictEqual(navaratna.label, 'Navaratna');
    assert.strictEqual(navaratna.pendant, 'sun');

    // Fallback on null/undefined
    assert.strictEqual(getMalaSkin(null).label, 'Sandalwood');
    assert.strictEqual(getMalaSkin('unknown-skin').label, 'Sandalwood');
  });
});
