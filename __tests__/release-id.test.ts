import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RELEASE_ID_MAX_LENGTH, buildReleaseId } from '../lib/releaseId';

// The pattern and length the strictest backend endpoints enforce
// (product analytics and notification taps, plus the product-analytics RPC).
const BACKEND_APP_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const accepted = (id: string) => BACKEND_APP_VERSION.test(id) && id.length <= 32;

const UPDATE_ID = '1A2B3C4D-5E6F-4a7b-8c9d-0e1f2a3b4c5d';

describe('release id sent with diagnostics', () => {
  it('names the build, which "1.0.0" alone never did', () => {
    assert.equal(buildReleaseId({ version: '1.0.0', build: '47' }), '1.0.0+47');
    assert.equal(buildReleaseId({ version: '1.0.0', build: 47 }), '1.0.0+47');
  });

  it('adds the OTA update a build is running, so two bundles on one build differ', () => {
    assert.equal(
      buildReleaseId({ version: '1.0.0', build: '47', updateId: UPDATE_ID, isEmbeddedLaunch: false }),
      '1.0.0+47.ota.1a2b3c4d',
    );
  });

  it('leaves the OTA part off for the bundle embedded in the build, or when updates are off', () => {
    assert.equal(buildReleaseId({ version: '1.0.0', build: '47', updateId: UPDATE_ID, isEmbeddedLaunch: true }), '1.0.0+47');
    assert.equal(buildReleaseId({ version: '1.0.0', build: '47', updateId: null, isEmbeddedLaunch: false }), '1.0.0+47');
    assert.equal(buildReleaseId({ version: '1.0.0', build: '47', updateId: 'not-a-uuid', isEmbeddedLaunch: false }), '1.0.0+47');
  });

  it('falls back to the plain version when the build is unknown', () => {
    assert.equal(buildReleaseId({ version: '1.0.0', build: '' }), '1.0.0');
    assert.equal(buildReleaseId({ version: '1.0.0', build: null }), '1.0.0');
    assert.equal(buildReleaseId({ version: '1.0.0' }), '1.0.0');
    assert.equal(buildReleaseId({ version: '1.0.0', updateId: UPDATE_ID, isEmbeddedLaunch: false }), '1.0.0+ota.1a2b3c4d');
  });

  it('strips characters semver build metadata does not allow', () => {
    assert.equal(buildReleaseId({ version: '1.0.0', build: ' 4 7_b ' }), '1.0.0+47b');
    assert.equal(buildReleaseId({ version: '1.0.0', build: '..' }), '1.0.0');
  });

  it('drops the OTA part, then the build, rather than exceed the 32-character limit', () => {
    const longBuild = '12345678901234567890';
    const withBuild = buildReleaseId({ version: '10.20.30', build: longBuild, updateId: UPDATE_ID, isEmbeddedLaunch: false });
    assert.equal(withBuild, `10.20.30+${longBuild}`);
    assert.equal(buildReleaseId({ version: '10.20.30', build: '1'.repeat(40) }), '10.20.30');
  });

  it('is always accepted by every backend endpoint that stores an app version', () => {
    const cases = [
      { version: '1.0.0', build: '47', updateId: UPDATE_ID, isEmbeddedLaunch: false },
      { version: '1.0.0', build: 47 },
      { version: '2.14.3', build: '1203', updateId: UPDATE_ID, isEmbeddedLaunch: false },
      { version: '10.20.30', build: '9'.repeat(25), updateId: UPDATE_ID, isEmbeddedLaunch: false },
      { version: '1.0.0', build: '!!', updateId: UPDATE_ID, isEmbeddedLaunch: false },
      { version: '1.0.0' },
    ];
    for (const input of cases) {
      const id = buildReleaseId(input);
      assert.ok(accepted(id), `${JSON.stringify(input)} -> ${id}`);
      assert.ok(id.length <= RELEASE_ID_MAX_LENGTH);
    }
  });
});
