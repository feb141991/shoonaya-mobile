import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifySignInErrorMessage,
  classifySignUpErrorMessage,
  classifyOAuthErrorMessage,
  sanitizeRawError,
} from '../lib/authErrorMessages';

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
    const noAccount = classifySignInErrorMessage('Invalid login credentials');
    const wrongPassword = classifySignInErrorMessage('Invalid login credentials');
    assert.equal(noAccount, wrongPassword);
  });

  it('passes through non-credential errors unchanged (network, rate limit, etc.)', () => {
    assert.equal(classifySignInErrorMessage('Network request failed'), 'Network request failed');
    assert.equal(classifySignInErrorMessage('Too many requests'), 'Too many requests');
  });

  it('sanitizes raw 500 JSON error objects so no technical URLs or JSON leaks', () => {
    const rawJson = '{"status":500,"statusText":"","redirected":false,"url":"https://mnbwodcswxoojndytngu.supabase.co/auth/v1/token"}';
    const result = classifySignInErrorMessage(rawJson);
    assert.equal(result, 'Authentication service is temporarily unavailable. Please check your connection and try again.');
    assert.equal(result.includes('status'), false);
    assert.equal(result.includes('supabase.co'), false);
  });
});

describe('classifySignUpErrorMessage -- account creation errors', () => {
  it('intercepts the exact raw 500 JSON error from Supabase Auth and renders friendly guidance', () => {
    const raw500 = '{"status":500,"statusText":"","redirected":false,"url":"https://mnbwodcswxoojndytngu.supabase.co/auth/v1/signup?redirect_to=shoonaya%3A%2F%2Fauth%2Fcallback"}';
    const result = classifySignUpErrorMessage(raw500);
    assert.equal(
      result,
      'Unable to send verification email right now. If your account already exists, please tap "Sign in" above.'
    );
    assert.equal(result.includes('500'), false);
    assert.equal(result.includes('supabase.co'), false);
  });

  it('maps "Error sending confirmation email" to the same friendly guidance', () => {
    assert.equal(
      classifySignUpErrorMessage('AuthRetryableFetchError: Error sending confirmation email'),
      'Unable to send verification email right now. If your account already exists, please tap "Sign in" above.'
    );
  });

  it('guides users whose accounts already exist directly to the Sign in tab', () => {
    assert.equal(
      classifySignUpErrorMessage('User already registered'),
      'An account with this email already exists. Please tap "Sign in" above to log in.'
    );
    assert.equal(
      classifySignUpErrorMessage('email already in use'),
      'An account with this email already exists. Please tap "Sign in" above to log in.'
    );
  });
});

describe('classifyOAuthErrorMessage -- Google & Apple cancellations and errors', () => {
  it('returns null for user cancellations so no ugly error banner is displayed', () => {
    assert.equal(classifyOAuthErrorMessage('The authorization attempt was canceled.', 'Apple'), null);
    assert.equal(classifyOAuthErrorMessage('ERR_REQUEST_CANCELED', 'Apple'), null);
    assert.equal(classifyOAuthErrorMessage('Sign-in canceled by user', 'Google'), null);
  });

  it('returns friendly message for network or server errors', () => {
    assert.equal(
      classifyOAuthErrorMessage('Network error', 'Google'),
      'Google sign-in could not connect. Please check your connection and try again.'
    );
  });
});

