import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SACRED_YATRA_CIRCUITS, SHIVA_SANCTUM_FLOOR_MANTRA, type TempleSanctumNode } from '../lib/yatra-data';

// The virtual sanctum used to print a Shaiva mantra on the floor of EVERY temple, so a Badrinath, Dwarka, Puri or
// Gurdwara shrine said "Om Namah Shivaya". The mantra is now a recorded fact of a shrine. These tests pin which shrines
// record it, by count and by id, so adding a mantra to another shrine (or defaulting one in) is a decision someone makes
// here, with a reviewed source, and not something that happens by omission. (AGENTS.md section 3 and section 39.)

const allNodes: Array<{ circuitId: string; tradition: string; node: TempleSanctumNode }> = Object.values(SACRED_YATRA_CIRCUITS).flatMap((circuit) =>
  circuit.temples.map((node) => ({ circuitId: circuit.id, tradition: circuit.tradition, node })),
);

// The seven Jyotirlinga shrines in the first circuit and Rameswaram (a Jyotirlinga) in the Char Dham circuit.
const SHIVA_SHRINES = ['kashi-vishwanath', 'kedarnath', 'mahakaleshwar', 'mallikarjuna', 'omkareshwar', 'rameshwaram-dham', 'rameswaram', 'somnath'];

describe('the sanctum floor mantra belongs to the shrines of Shiva only', () => {
  it('is recorded on exactly the eight Shiva shrines, no more and no fewer', () => {
    const recorded = allNodes.filter(({ node }) => node.sanctumFloorMantra !== undefined).map(({ node }) => node.id).sort();
    assert.deepEqual(recorded, SHIVA_SHRINES);
  });

  it('is the one Shaiva mantra, unchanged, on each of them', () => {
    for (const { node } of allNodes) {
      if (SHIVA_SHRINES.includes(node.id)) {
        assert.equal(node.sanctumFloorMantra, SHIVA_SANCTUM_FLOOR_MANTRA, node.id);
      }
    }
    assert.ok(SHIVA_SANCTUM_FLOOR_MANTRA.includes('शिवाय'), 'the constant must still be the Shiva mantra');
  });

  it('is absent from every Sikh shrine', () => {
    const sikh = allNodes.filter(({ tradition }) => tradition === 'sikh');
    assert.ok(sikh.length >= 4, 'expected the Panj Takht nodes');
    for (const { node } of sikh) {
      assert.equal(node.sanctumFloorMantra, undefined, `${node.id} must not carry a Shaiva mantra`);
    }
  });

  it('is absent from the Vishnu, Krishna and Jagannath shrines of the Char Dham', () => {
    for (const id of ['badrinath', 'dwarkadhish', 'puri-jagannath']) {
      const entry = allNodes.find(({ node }) => node.id === id);
      assert.ok(entry, `${id} must still exist`);
      assert.equal(entry.node.sanctumFloorMantra, undefined, `${id} must not carry a Shaiva mantra`);
    }
  });

  it('is never an empty or blank string (a blank would show an empty floor line)', () => {
    for (const { node } of allNodes) {
      if (node.sanctumFloorMantra !== undefined) {
        assert.ok(node.sanctumFloorMantra.trim().length > 0, node.id);
      }
    }
  });
});
