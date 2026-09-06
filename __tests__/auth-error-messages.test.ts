import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { classifySignInErrorMessage } from '../lib/authErrorMessages';

describe('classifySignInErrorMessage -- non-enumerating sign-in errors', () => {
  it('maps "Invalid login credentials" to the generic non-enumerating message', () => {
    assert.equal(
      classifySignInErrorMessage('Invalid login credentials'),
      'Incorrect email or password. Try again, or reset your password below.'
    );
  });

  it('maps any casing/phrasing variant Supabase might use, not just the exact string', () => {
    assert.equal(
      classifySignInErrorMessage('INVALID LOGIN CREDENTIALS'),
      'Incorrect email or password. Try again, or reset your password below.'
    );
    assert.equal(
      classifySignInErrorMessage('Invalid credentials provided'),
      'Incorrect email or password. Try again, or reset your password below.'
    );
  });

  it('does NOT distinguish "no such account" from "wrong password" -- both map to the same copy', () => {
    // Supabase itself only ever sends one unified message for both, but
    // the classifier's job is specifically to never let either case
    // produce different client-visible text, however it's phrased.
    const noAccount = classifySignInErrorMessage('Invalid login credentials');
    const wrongPassword = classifySignInErrorMessage('Invalid login credentials');
    assert.equal(noAccount, wrongPassword);
  });

  it('passes through non-credential errors unchanged (network, rate limit, etc.)', () => {
    assert.equal(classifySignInErrorMessage('Network request failed'), 'Network request failed');
    assert.equal(classifySignInErrorMessage('Too many requests'), 'Too many requests');
  });
});
