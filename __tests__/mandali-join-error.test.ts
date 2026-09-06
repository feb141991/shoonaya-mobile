import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mandaliJoinErrorMessage } from '../lib/mandaliJoinError';

it('shows an actionable duplicate-city result but never arbitrary database details', () => {
  const message = 'Multiple Mandalis match this city. Select a specific Mandali.';
  assert.equal(mandaliJoinErrorMessage({ message, code: '22023' }), message);
  assert.equal(mandaliJoinErrorMessage(new Error('internal database hostname')), 'Could not join your Mandali right now. Please try again.');
});
