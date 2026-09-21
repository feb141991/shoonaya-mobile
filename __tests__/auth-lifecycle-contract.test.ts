import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const root = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

describe('root auth lifecycle contracts', () => {
  it('keeps the auth event callback synchronous and defers route work', () => {
    assert.match(root, /onAuthStateChange\(\(_event, session\) => \{/);
    assert.match(root, /void Promise\.resolve\(\)\.then\(async \(\) => \{/);
    assert.doesNotMatch(root, /onAuthStateChange\(async \(_event, session\)/);
  });

  it('masks the old account before asynchronous sign-out cleanup', () => {
    const signOutBranch = root.slice(root.indexOf('if (!session) {'), root.indexOf('// If guest mode is active'));
    assert.ok(signOutBranch.indexOf("setAppIdentity({ kind: 'loading' });") < signOutBranch.indexOf('await clearDeviceStartupPreferences();'));
  });

  it('guards cached-onboarding background revalidation against stale accounts', () => {
    const backgroundStart = root.indexOf('// Background revalidation:');
    const backgroundEnd = root.indexOf('setProfileResolutionFailure(null);', backgroundStart);
    assert.match(root.slice(backgroundStart, backgroundEnd), /if \(!isCurrentRoute\(\)\) return;/);
  });

  it('purges every private tab cache, including Japa, on auth boundaries', () => {
    assert.match(root, /void clearJapaContextCache\(\);/);
    const switchBranch = root.slice(
      root.indexOf('if (previousRouteKey && previousRouteKey !== session.user.id)'),
      root.indexOf("void getOrReadHomeCache({ kind: 'authenticated'"),
    );
    for (const cleanup of [
      'clearAllHomeCaches',
      'clearAllMandaliCaches',
      'clearAllSettingsCaches',
      'clearAllNotificationsCaches',
      'clearAllPathshalaCaches',
      'clearJapaContextCache',
      'clearAllTelemetry',
      'clearAllSankalpaOutboxes',
      'clearAllReactionOutboxes',
      'clearAllOnboardingDrafts',
      'clearAllHomeDiscoveryStates',
      'clearProfileCache',
    ]) {
      assert.match(switchBranch, new RegExp(`void ${cleanup}\\(`));
    }
  });
});
