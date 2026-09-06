import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveDisplayName } from '../lib/displayName';

describe('resolveDisplayName — chosen-name precedence', () => {
  it('prefers the chosen full name when present', () => {
    assert.equal(resolveDisplayName('Ananya Sharma', 'ananya_s'), 'Ananya Sharma');
  });

  it('trims the full name before using it', () => {
    assert.equal(resolveDisplayName('  Ananya Sharma  ', 'ananya_s'), 'Ananya Sharma');
  });

  it('falls back to username when full name is blank', () => {
    assert.equal(resolveDisplayName('', 'ananya_s'), 'ananya_s');
  });

  it('falls back to username when full name is whitespace-only', () => {
    assert.equal(resolveDisplayName('   ', 'ananya_s'), 'ananya_s');
  });

  it('falls back to username when full name is null or undefined', () => {
    assert.equal(resolveDisplayName(null, 'ananya_s'), 'ananya_s');
    assert.equal(resolveDisplayName(undefined, 'ananya_s'), 'ananya_s');
  });

  it('trims the username fallback too', () => {
    assert.equal(resolveDisplayName(null, '  ananya_s  '), 'ananya_s');
  });

  it('falls back to the default "Seeker" when both are blank', () => {
    assert.equal(resolveDisplayName('', ''), 'Seeker');
    assert.equal(resolveDisplayName(null, null), 'Seeker');
  });

  it('accepts a custom fallback in place of "Seeker"', () => {
    assert.equal(resolveDisplayName(null, null, 'Atithi'), 'Atithi');
  });
});
