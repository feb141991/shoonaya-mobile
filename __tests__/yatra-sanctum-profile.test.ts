import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SACRED_YATRA_CIRCUITS } from '../lib/yatra-data';
import {
  NEUTRAL_SANCTUM_PROFILE,
  SANATAN_SANCTUM_PROFILE,
  SIKH_SANCTUM_PROFILE,
  sanctumProfileFor,
} from '../lib/yatra-sanctum-profile';

// The virtual sanctum was written for a Hindu mandir and showed its ritual set (Om, bell, diyas, flowers, "Sthala Purana") for every
// shrine, including the four Sikh Panj Takht gurdwaras. A shrine records no tradition, its circuit does, and the circuit's tradition
// picks a profile. These tests pin the profile table and which circuit gets which one. The screen that applies it is covered by
// __component_tests__/virtual-sanctum-modal.test.tsx and yatra-detail-screen.test.tsx. (AGENTS.md section 3 and section 40.)

describe('the sanctum profile of each tradition', () => {
  it('gives a Hindu circuit exactly what the sanctum and the circuit screen showed before profiles existed', () => {
    assert.deepEqual(sanctumProfileFor('sanatan'), {
      deityGlyph: '🕉️',
      showMandirRituals: true,
      showParikrama: true,
      historyTabLabel: 'Sthala Purana',
      historyHeading: 'STHALA PURANA & SACRED ORIGINS',
      circuitHint: 'Pinch to zoom and drag to explore pilgrimage routes. Tap any sacred temple for virtual darshan, diya lighting, and stotras.',
    });
  });

  it('gives a Sikh circuit the Khanda and withholds the mandir ritual set', () => {
    const profile = sanctumProfileFor('sikh');
    assert.equal(profile.deityGlyph, '☬');
    assert.equal(profile.showMandirRituals, false);
  });

  it('keeps the parikrama tally for a Sikh circuit only because the approved change did not hide it (a Sikh reviewer decides)', () => {
    assert.equal(sanctumProfileFor('sikh').showParikrama, true);
  });

  it('never gives a Sikh or an unknown circuit the Om, a Hindu ritual word or the Sthala Purana label', () => {
    for (const profile of [SIKH_SANCTUM_PROFILE, NEUTRAL_SANCTUM_PROFILE]) {
      assert.notEqual(profile.deityGlyph, '🕉️');
      for (const text of [profile.historyTabLabel, profile.historyHeading, profile.circuitHint]) {
        assert.doesNotMatch(text, /sthala|purana|diya|deepam|stotra|pushpam|mandir/i, text);
      }
    }
  });

  for (const value of ['jain', 'buddhist', 'SANATAN', 'Sikh', '', ' sanatan', undefined, null]) {
    it(`gives ${JSON.stringify(value)} the neutral profile: no ritual set, no tally, no symbol`, () => {
      const profile = sanctumProfileFor(value);
      assert.equal(profile, NEUTRAL_SANCTUM_PROFILE);
      assert.equal(profile.showMandirRituals, false);
      assert.equal(profile.showParikrama, false);
      assert.equal(profile.deityGlyph, null);
    });
  }

  it('is not the Hindu profile for anything but the exact word sanatan', () => {
    assert.equal(sanctumProfileFor('sanatan'), SANATAN_SANCTUM_PROFILE);
    assert.notEqual(sanctumProfileFor('jain'), SANATAN_SANCTUM_PROFILE);
  });
});

describe('which circuit gets which profile', () => {
  // Pinned by id: a new circuit, or a circuit whose tradition is edited, is a decision made here and not by omission.
  const EXPECTED_TRADITION: Record<string, string> = {
    '12-jyotirlingas': 'sanatan',
    'char-dham': 'sanatan',
    'sikh-panj-takht': 'sikh',
  };

  it('has exactly the three known circuits, each with its pinned tradition', () => {
    const actual = Object.fromEntries(Object.values(SACRED_YATRA_CIRCUITS).map((circuit) => [circuit.id, circuit.tradition]));
    assert.deepEqual(actual, EXPECTED_TRADITION);
  });

  it('gives the Sikh circuit the Sikh profile and each Hindu circuit the Hindu one', () => {
    for (const circuit of Object.values(SACRED_YATRA_CIRCUITS)) {
      const expected = circuit.tradition === 'sikh' ? SIKH_SANCTUM_PROFILE : SANATAN_SANCTUM_PROFILE;
      assert.equal(sanctumProfileFor(circuit.tradition), expected, circuit.id);
    }
  });

  it('keeps every shrine in exactly one circuit, so a circuit tradition is the tradition of each of its shrines', () => {
    const seen = new Map<string, string>();
    for (const circuit of Object.values(SACRED_YATRA_CIRCUITS)) {
      for (const node of circuit.temples) {
        assert.equal(seen.get(node.id), undefined, `${node.id} is in ${seen.get(node.id)} and in ${circuit.id}`);
        seen.set(node.id, circuit.id);
      }
    }
    assert.ok(seen.size >= 15);
  });
});
