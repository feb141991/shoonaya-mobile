import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyProfileLoadFailure, getProfileFailureCopy, ProfileLoadError } from '../lib/profileLoadPolicy';

describe('profile load failure policy', () => {
  it('preserves the reason from an already-classified response', () => {
    assert.equal(classifyProfileLoadFailure(new ProfileLoadError('server_error', '503')), 'server_error');
    assert.equal(classifyProfileLoadFailure(new ProfileLoadError('timeout', 'deadline')), 'timeout');
    assert.equal(classifyProfileLoadFailure(new ProfileLoadError('unauthorized', 'expired')), 'unauthorized');
  });

  it('classifies the existing timeout, owner-mismatch, server, and transport errors', () => {
    const timeout = new Error('API request timed out');
    timeout.name = 'AbortError';
    assert.equal(classifyProfileLoadFailure(timeout), 'timeout');
    assert.equal(classifyProfileLoadFailure(new Error('Profile response owner did not match the active account')), 'owner_mismatch');
    assert.equal(classifyProfileLoadFailure(new Error('Could not load progress summary')), 'server_error');
    assert.equal(classifyProfileLoadFailure(new Error('Network request failed')), 'network');
  });

  it('does not use network copy for server or timeout failures', () => {
    assert.match(getProfileFailureCopy('server_error').title, /temporarily unavailable/i);
    assert.match(getProfileFailureCopy('timeout').title, /longer than expected/i);
    assert.match(getProfileFailureCopy('network').subtitle, /connection/i);
  });
});
