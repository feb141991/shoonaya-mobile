import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldBlockPanchangScreen } from '../lib/panchang-screen-policy';

describe('Panchang first paint', () => {
  it('does not block a same-identity screen while profile/calendar data loads', () => {
    assert.equal(shouldBlockPanchangScreen({
      panchangOwner: 'user:123', cacheIdentity: 'user:123', identityKind: 'authenticated',
    }), false);
  });

  it('blocks identity transitions and unresolved auth state', () => {
    assert.equal(shouldBlockPanchangScreen({
      panchangOwner: 'user:old', cacheIdentity: 'user:new', identityKind: 'authenticated',
    }), true);
    assert.equal(shouldBlockPanchangScreen({
      panchangOwner: null, cacheIdentity: null, identityKind: 'loading',
    }), true);
    assert.equal(shouldBlockPanchangScreen({
      panchangOwner: null, cacheIdentity: null, identityKind: 'unauthenticated',
    }), true);
  });

  it('wires the screen gate to identity ownership and labels the reference location', () => {
    const source = readFileSync('app/panchang.tsx', 'utf8');
    assert.match(source, /shouldBlockPanchangScreen\(/);
    assert.match(source, /Ujjain reference timings/);
    assert.doesNotMatch(source, /if\s*\(\s*loading\s*\|\|/);
  });
});
