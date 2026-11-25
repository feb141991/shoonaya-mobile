import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveDharmVeerProfile } from '../lib/dharmVeerProfile';

describe('the Dharm Veer profile read', () => {
  it('returns the saved tradition and timezone', () => {
    assert.deepEqual(resolveDharmVeerProfile({ data: { tradition: 'sikh', timezone: 'Asia/Kolkata' }, error: null }), { tradition: 'sikh', timezone: 'Asia/Kolkata' });
  });

  it('uses the defaults only when the read succeeded and the columns are blank', () => {
    const expected = { tradition: 'hindu', timezone: 'UTC' };
    assert.deepEqual(resolveDharmVeerProfile({ data: { tradition: null, timezone: null }, error: null }), expected);
    assert.deepEqual(resolveDharmVeerProfile({ data: { tradition: '', timezone: '' }, error: null }), expected);
    assert.deepEqual(resolveDharmVeerProfile({ data: null, error: null }), expected);
  });

  it('throws the original error on a failed read instead of inventing a tradition and a day', () => {
    const failure = { code: '57014', message: 'canceling statement due to statement timeout' };
    assert.throws(() => resolveDharmVeerProfile({ data: null, error: failure }), (thrown) => thrown === failure);
    // Even when the failed read also carries stale-looking data.
    assert.throws(() => resolveDharmVeerProfile({ data: { tradition: 'sikh', timezone: 'Asia/Kolkata' }, error: failure }));
  });
});
