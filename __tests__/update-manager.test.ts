import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  compareSemVer,
  evaluateStoreVersionPolicy,
  parseAppVersionInfo,
  type AppVersionInfo,
} from '../lib/updatePolicy';
import {
  isUpdatePromptSafeSurface,
  shouldCheckForUpdateOnResume,
} from '../lib/updateLifecyclePolicy';
import { createUpdateAlertGate } from '../lib/updateAlertGate';
import { getUpdateCopy } from '../lib/updateCopy';

describe('App Update Policy & Semantic Versioning Engine', () => {
  describe('compareSemVer', () => {
    it('correctly compares equal versions', () => {
      assert.strictEqual(compareSemVer('1.0.0', '1.0.0'), 0);
      assert.strictEqual(compareSemVer('v1.0.0', '1.0.0'), 0);
      assert.strictEqual(compareSemVer('1.2.3', 'v1.2.3'), 0);
    });

    it('identifies older versions correctly', () => {
      assert.strictEqual(compareSemVer('1.0.0', '1.0.1'), -1);
      assert.strictEqual(compareSemVer('1.0.0', '1.1.0'), -1);
      assert.strictEqual(compareSemVer('1.9.9', '2.0.0'), -1);
      assert.strictEqual(compareSemVer('1.0.0', '2.0.0'), -1);
      assert.strictEqual(compareSemVer('0.9.5', '1.0.0'), -1);
    });

    it('identifies newer versions correctly', () => {
      assert.strictEqual(compareSemVer('1.0.1', '1.0.0'), 1);
      assert.strictEqual(compareSemVer('1.1.0', '1.0.9'), 1);
      assert.strictEqual(compareSemVer('2.0.0', '1.9.9'), 1);
      assert.strictEqual(compareSemVer('1.10.0', '1.9.0'), 1);
    });

    it('handles two-part and mismatched length version strings safely', () => {
      assert.strictEqual(compareSemVer('1.0', '1.0.0'), 0);
      assert.strictEqual(compareSemVer('1.1', '1.0.5'), 1);
      assert.strictEqual(compareSemVer('1.0', '1.0.1'), -1);
    });

    it('compares prereleases according to SemVer and ignores build metadata', () => {
      assert.strictEqual(compareSemVer('1.0.0-alpha.2', '1.0.0-alpha.10'), -1);
      assert.strictEqual(compareSemVer('1.0.0-beta', '1.0.0'), -1);
      assert.strictEqual(compareSemVer('1.0.0+build.1', '1.0.0+build.9'), 0);
      assert.strictEqual(compareSemVer('1.999999999999999999.0', '1.1000000000000000000.0'), -1);
    });

    it('rejects malformed versions instead of coercing them to zero', () => {
      assert.throws(() => compareSemVer('1.bad.0', '1.0.0'), RangeError);
      assert.throws(() => compareSemVer('01.0.0', '1.0.0'), RangeError);
      assert.throws(() => compareSemVer('1.0.0-alpha.01', '1.0.0'), RangeError);
    });
  });

  describe('evaluateStoreVersionPolicy', () => {
    const standardPolicy: AppVersionInfo = {
      latestVersion: '1.2.0',
      minSupportedVersion: '1.0.0',
      storeUrls: {
        android: 'https://play.google.com/store/apps/details?id=com.shoonaya.app',
        ios: 'https://apps.apple.com/app/shoonaya/id6793055966',
      },
      releaseNotes: 'Introduced Chaupar and Vansh tree.',
    };

    it('returns UP_TO_DATE when client is on or above latest version', () => {
      const res = evaluateStoreVersionPolicy('1.2.0', standardPolicy, 'android');
      assert.strictEqual(res.type, 'UP_TO_DATE');

      const resNewer = evaluateStoreVersionPolicy('1.3.0', standardPolicy, 'ios');
      assert.strictEqual(resNewer.type, 'UP_TO_DATE');
    });

    it('returns OPTIONAL update when client is supported but below latest', () => {
      const resAndroid = evaluateStoreVersionPolicy('1.0.5', standardPolicy, 'android');
      assert.strictEqual(resAndroid.type, 'OPTIONAL');
      if (resAndroid.type === 'OPTIONAL') {
        assert.strictEqual(resAndroid.latestVersion, '1.2.0');
        assert.strictEqual(resAndroid.storeUrl, standardPolicy.storeUrls.android);
      }

      const resIos = evaluateStoreVersionPolicy('1.0.5', standardPolicy, 'ios');
      assert.strictEqual(resIos.type, 'OPTIONAL');
      if (resIos.type === 'OPTIONAL') {
        assert.strictEqual(resIos.storeUrl, standardPolicy.storeUrls.ios);
      }
    });

    it('returns MANDATORY update when client is below minimum supported version', () => {
      const strictPolicy: AppVersionInfo = {
        ...standardPolicy,
        minSupportedVersion: '1.1.0',
      };

      const res = evaluateStoreVersionPolicy('1.0.5', strictPolicy, 'android');
      assert.strictEqual(res.type, 'MANDATORY');
      if (res.type === 'MANDATORY') {
        assert.strictEqual(res.latestVersion, '1.2.0');
        assert.ok(res.releaseNotes.length > 0);
      }
    });

    it('forces MANDATORY update when policy explicitly sets forceUpdate: true', () => {
      const forcedPolicy: AppVersionInfo = {
        ...standardPolicy,
        forceUpdate: true,
      };

      const res = evaluateStoreVersionPolicy('1.2.0', forcedPolicy, 'android');
      assert.strictEqual(res.type, 'MANDATORY');
    });

    it('never prompts on a build number: routine same-version builds are Play / App Store territory', () => {
      // A server that still sends the retired `latestBuildNumber` must change nothing.
      const legacyBuildPolicy = { ...standardPolicy, latestVersion: '1.0.0', latestBuildNumber: 999 } as AppVersionInfo;
      for (const platform of ['android', 'ios'] as const) {
        assert.strictEqual(evaluateStoreVersionPolicy('1.0.0', legacyBuildPolicy, platform).type, 'UP_TO_DATE');
      }
    });

    it('still nudges a deliberate version bump, once and only as OPTIONAL', () => {
      const bump: AppVersionInfo = { ...standardPolicy, minSupportedVersion: '1.0.0', latestVersion: '1.1.0' };
      const res = evaluateStoreVersionPolicy('1.0.0', bump, 'android');
      assert.strictEqual(res.type, 'OPTIONAL');
      if (res.type === 'OPTIONAL') assert.strictEqual(res.latestVersion, '1.1.0');
      assert.strictEqual(evaluateStoreVersionPolicy('1.1.0', bump, 'android').type, 'UP_TO_DATE');
    });

    it('ignores a retired latestBuildNumber instead of rejecting the policy, valid or not', () => {
      for (const legacy of [15, 0, -3, 1.5, 'abc', null]) {
        const parsed = parseAppVersionInfo({ ...standardPolicy, latestBuildNumber: legacy }, 'android');
        assert.ok(parsed, `latestBuildNumber=${String(legacy)} must not invalidate an otherwise valid policy`);
        assert.ok(!('latestBuildNumber' in parsed), 'the retired field is not carried into the parsed policy');
      }
    });

    it('validates the public policy payload and rejects unsafe store URLs', () => {
      const valid = parseAppVersionInfo(standardPolicy, 'ios');
      assert.ok(valid);
      assert.strictEqual(parseAppVersionInfo({
        ...standardPolicy,
        minSupportedVersion: '2.0.0',
      }, 'ios'), null);
      assert.strictEqual(parseAppVersionInfo({
        ...standardPolicy,
        storeUrls: { ...standardPolicy.storeUrls, ios: 'http://apps.apple.com/app/id1' },
      }, 'ios'), null);
      assert.strictEqual(parseAppVersionInfo({
        ...standardPolicy,
        storeUrls: { ...standardPolicy.storeUrls, android: 'https://example.com/fake-store' },
      }, 'ios'), null);
      assert.strictEqual(parseAppVersionInfo(null, 'ios'), null);
    });
  });

  describe('exclusive update alert gate', () => {
    it('keeps one update alert visible and releases after dismissal or button action', () => {
      let dismissal: (() => void) | undefined;
      let buttonPress: (() => void) | undefined;
      const gate = createUpdateAlertGate((_title, _message, buttons, options) => {
        dismissal = options.onDismiss;
        buttonPress = buttons[0]?.onPress;
      });

      assert.strictEqual(gate.show('Update', 'Ready'), true);
      assert.strictEqual(gate.show('Another update', 'Ready'), false);
      dismissal?.();
      assert.strictEqual(gate.show('Update', 'Ready', [{ text: 'Apply' }]), true);
      buttonPress?.();
      assert.strictEqual(gate.show('Update', 'Ready'), true);
    });

    it('releases the lock when native alert presentation throws', () => {
      let shouldThrow = true;
      const gate = createUpdateAlertGate(() => {
        if (shouldThrow) throw new Error('native presentation failed');
      });

      assert.strictEqual(gate.show('Update', 'Ready'), false);
      shouldThrow = false;
      assert.strictEqual(gate.show('Update', 'Ready'), true);
    });
  });

  describe('automatic update lifecycle', () => {
    it('rechecks only after a real background-to-active resume', () => {
      assert.strictEqual(shouldCheckForUpdateOnResume('background', 'active'), true);
      assert.strictEqual(shouldCheckForUpdateOnResume('inactive', 'active'), false);
      assert.strictEqual(shouldCheckForUpdateOnResume('active', 'active'), false);
      assert.strictEqual(shouldCheckForUpdateOnResume('background', 'inactive'), false);
      assert.strictEqual(shouldCheckForUpdateOnResume(null, 'active'), false);
    });

    it('allows automatic optional prompts on Home, not over practice or lesson screens', () => {
      assert.strictEqual(isUpdatePromptSafeSurface('(tabs)', 'index'), true);
      assert.strictEqual(isUpdatePromptSafeSurface('(tabs)', undefined), true);
      assert.strictEqual(isUpdatePromptSafeSurface('(tabs)', 'japa'), false);
      assert.strictEqual(isUpdatePromptSafeSurface('(tabs)', 'mandali'), false);
      assert.strictEqual(isUpdatePromptSafeSurface('pathshala', '[pathId]'), false);
      assert.strictEqual(isUpdatePromptSafeSurface('(tabs)', 'profile'), false);
    });

    it('keeps Expo error-recovery checks while deferring normal checks to the manager', () => {
      const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')) as {
        expo: { updates: { checkAutomatically?: string } };
      };
      assert.strictEqual(config.expo.updates.checkAutomatically, 'ON_ERROR_RECOVERY');
    });
  });

  describe('localized update copy', () => {
    it('provides English, Hindi, and Punjabi update actions and prompts', () => {
      for (const language of ['en', 'hi', 'pa'] as const) {
        const copy = getUpdateCopy(language);
        assert.ok(copy.checkAction.length > 0);
        assert.ok(copy.requiredMessage('2.0.0', '').includes('2.0.0'));
        assert.ok(copy.optionalVersionMessage('2.0.0', '').includes('2.0.0'));
        assert.ok(copy.unavailableMessage.length > 0);
      }
    });

    it('falls back to English for an unknown stored language', () => {
      assert.strictEqual(getUpdateCopy('unknown').checkAction, getUpdateCopy('en').checkAction);
    });
  });
});
