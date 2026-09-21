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
        assert.match(track.audioUrl, /\.mp3(\?.*)?$/i, `Sound ${track.id} must use cross-platform MP3 for iOS & Android playback`);
      }
    }
  });

  it('guarantees all devotional starter tracks use cross-platform MP3 streams', async () => {
    const { DEVOTIONAL_STARTER_TRACKS } = await import('../lib/devotional-audio');
    assert.ok(DEVOTIONAL_STARTER_TRACKS.length >= 4, 'Must contain canonical devotional starter tracks');
    for (const track of DEVOTIONAL_STARTER_TRACKS) {
      assert.ok(track.audioUrl, `Track ${track.id} must have an audio URL`);
      assert.match(track.audioUrl, /\.mp3(\?.*)?$/i, `Track ${track.id} must use cross-platform MP3 format`);
    }
  });

  it('verifies authentic human MP3 recordings on Sikh and Jain lineage nodes', async () => {
    const { SACRED_LINEAGES } = await import('../lib/lineage-data');
    const sikh = SACRED_LINEAGES['sikh-gurus'];
    const guruNanak = sikh.nodes.find((n) => n.id === 'guru-nanak');
    assert.ok(guruNanak?.stotraOrChant?.audioUrl, 'Guru Nanak must have authentic audio');
    assert.match(guruNanak.stotraOrChant.audioUrl, /\.mp3(\?.*)?$/i, 'Guru Nanak audio must be MP3');

    const guruGranth = sikh.nodes.find((n) => n.id === 'guru-granth-sahib');
    assert.ok(guruGranth?.stotraOrChant?.audioUrl, 'Guru Granth Sahib must have authentic audio');
    assert.match(guruGranth.stotraOrChant.audioUrl, /\.mp3(\?.*)?$/i, 'Guru Granth Sahib audio must be MP3');

    const jain = SACRED_LINEAGES['jain-tirthankaras'];
    const mahavira = jain.nodes.find((n) => n.id === 'mahavira');
    assert.ok(mahavira?.stotraOrChant?.audioUrl, 'Mahavira must have authentic Navkar Mantra audio');
    assert.match(mahavira.stotraOrChant.audioUrl, /\.mp3(\?.*)?$/i, 'Mahavira audio must be MP3');

    // Rishabhanatha's card names Bhaktamara Stotra (Adinatha Stuti) specifically --
    // no correctly-matching, reasonably-licensed recording of that text was found
    // (searched Wikimedia Commons and Archive.org), so it intentionally has no
    // audioUrl and falls back to /api/tts reciting the description text instead of
    // an unrelated Navkar Mantra track.
    const rishabha = jain.nodes.find((n) => n.id === 'rishabhanatha');
    assert.ok(!rishabha?.stotraOrChant?.audioUrl, 'Rishabhanatha must not link an unrelated audio track');
  });

  it('verifies Virtual Sanctum cornerstone temples specify valid MP3 stotras', async () => {
    const { SACRED_YATRA_CIRCUITS } = await import('../lib/yatra-data');
    const jyotirlingas = SACRED_YATRA_CIRCUITS['12-jyotirlingas'];
    // Somnath's card names the Dvadasha Jyotirlinga Stotram specifically -- no
    // correctly-matching, reasonably-licensed recording of that text was found
    // (searched Wikimedia Commons and Archive.org), so it intentionally has no
    // audioUrl and falls back to /api/tts reciting the description text instead
    // of an unrelated stotra.
    const somnath = jyotirlingas.temples.find((t) => t.id === 'somnath');
    assert.ok(!somnath?.stotraOrChant?.audioUrl, 'Somnath must not link an unrelated stotra audio track');

    const charDham = SACRED_YATRA_CIRCUITS['char-dham'];
    const puri = charDham.temples.find((t) => t.id === 'puri-jagannath');
    assert.ok(puri?.stotraOrChant?.audioUrl, 'Puri must have Jagannathashtakam audio URL');
    assert.match(puri.stotraOrChant.audioUrl, /\.mp3(\?.*)?$/i, 'Puri stotra audio must be MP3');
  });

  it('resolves each canonical Tanpura drone key with bundled assets and pure acoustic drone guarantee', () => {
    const droneKeys = [
      { id: 'tanpura-a', key: 'A', file: 'tanpura-a.mp3' },
      { id: 'tanpura-c', key: 'C', file: 'tanpura-c.mp3' },
      { id: 'tanpura-d', key: 'D', file: 'tanpura-d.mp3' },
      { id: 'tanpura-g', key: 'G', file: 'tanpura-g.mp3' },
    ] as const;

    for (const { id, key, file } of droneKeys) {
      const drone = getJapaSoundById(id);
      assert.strictEqual(drone.id, id);
      assert.strictEqual(drone.keyNote, key);
      assert.ok(drone.audioSource, `Drone ${id} must have a bundled audioSource`);
      assert.strictEqual(drone.audioUrl, `https://cdn.shoonaya.com/audio/tanpura/${file}`);
      assert.strictEqual(drone.sourceName, 'Shoonaya Acoustic Tanpura Master');
      assert.match(drone.attributionText, /pure 4-string acoustic tanpura drone loop/i);
      assert.match(drone.attributionText, /zero vocals/i);
    }
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
