import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STANDARD_ROLES } from '../lib/vanshRoles';
import { GENERATION_ORBIT_LEVELS } from '../lib/vanshThemes';
import { parseDateOnly } from '../lib/dateOnly';

describe('Vansh Roles and Sacred Dates Contract', () => {
  it('defines comprehensive standard Vedic family roles', () => {
    assert.ok(STANDARD_ROLES.length >= 10, 'Expected at least 10 standardized roles');

    for (const roleItem of STANDARD_ROLES) {
      assert.ok(typeof roleItem.label === 'string' && roleItem.label.length > 0);
      assert.ok(typeof roleItem.hindi === 'string' && roleItem.hindi.length > 0);
      assert.ok(typeof roleItem.role === 'string');
      assert.ok(
        Number.isInteger(roleItem.defaultGen) &&
          roleItem.defaultGen >= 1 &&
          roleItem.defaultGen <= 4,
        `Expected valid generation tier for ${roleItem.label}`,
      );
    }
  });

  it('maps generation tiers accurately to ancestral hierarchy', () => {
    const grandfather = STANDARD_ROLES.find((r) => r.label === 'Paternal Grandfather');
    assert.ok(grandfather);
    assert.equal(grandfather.defaultGen, 1, 'Paternal Grandfather must be Gen 1 (Pitri/Ancestors)');

    const father = STANDARD_ROLES.find((r) => r.label === 'Father');
    assert.ok(father);
    assert.equal(father.defaultGen, 2, 'Father must be Gen 2 (Parents)');

    const mother = STANDARD_ROLES.find((r) => r.label === 'Mother');
    assert.ok(mother);
    assert.equal(mother.defaultGen, 2, 'Mother must be Gen 2 (Parents)');

    const spouse = STANDARD_ROLES.find((r) => r.label === 'Spouse');
    assert.ok(spouse);
    assert.equal(spouse.defaultGen, 3, 'Spouse must be Gen 3 (Self/Living contemporaries)');

    const son = STANDARD_ROLES.find((r) => r.label === 'Son');
    assert.ok(son);
    assert.equal(son.defaultGen, 4, 'Son must be Gen 4 (Next Gen)');

    const daughter = STANDARD_ROLES.find((r) => r.label === 'Daughter');
    assert.ok(daughter);
    assert.equal(daughter.defaultGen, 4, 'Daughter must be Gen 4 (Next Gen)');
  });

  it('clarifies Gen 1 explicitly as Grandparents & earlier ancestors', () => {
    const gen1Orbit = GENERATION_ORBIT_LEVELS.find((l) => l.gen === 1);
    assert.ok(gen1Orbit);
    assert.equal(gen1Orbit.label, 'Gen 1: पूर्वज (Grandparents & earlier)');
  });

  it('validates DOB and Anniversary dates rigorously with parseDateOnly (Rule 13)', () => {
    // Valid Gregorian calendar dates
    assert.ok(parseDateOnly('2026-11-13') instanceof Date);
    assert.ok(parseDateOnly('1990-08-15') instanceof Date);
    assert.ok(parseDateOnly('2024-02-29') instanceof Date, '2024 is a leap year');

    // Impossible dates must be rejected (no rollover)
    assert.equal(parseDateOnly('2025-02-31'), null, 'Feb 31 does not exist');
    assert.equal(parseDateOnly('2025-02-29'), null, '2025 is not a leap year');
    assert.equal(parseDateOnly('2026-04-31'), null, 'April only has 30 days');
    assert.equal(parseDateOnly('2026-13-01'), null, 'Month 13 does not exist');
    assert.equal(parseDateOnly('invalid-date'), null, 'Invalid string rejected');
    assert.equal(parseDateOnly(''), null, 'Empty string rejected');
    assert.equal(parseDateOnly(null), null, 'Null rejected');
  });
});
