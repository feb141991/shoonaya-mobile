import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const root = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

describe('root auth lifecycle contracts', () => {
  it('keeps the auth event callback synchronous and defers route work', () => {
    assert.match(root, /onAuthStateChange\(\(_?event, session\) => \{/);
    assert.match(root, /void Promise\.resolve\(\)\.then\(async \(\) => \{/);
    assert.doesNotMatch(root, /onAuthStateChange\(async \(_?event, session\)/);
  });

  it('reports a new-device sign-in only after the route publishes authenticated identity', () => {
    const listenerStart = root.indexOf('supabase.auth.onAuthStateChange');
    const listenerEnd = root.indexOf('return () => {', listenerStart);
    const listener = root.slice(listenerStart, listenerEnd);
    const routeIndex = listener.indexOf('await dispatchRouteForSession(session);');
    const reportIndex = listener.indexOf('reportNewDeviceSignIn(session.user.id)');

    assert.ok(routeIndex >= 0, 'auth event should await route resolution');
    assert.ok(reportIndex > routeIndex, 'identity-dependent device report must follow route resolution');
    assert.doesNotMatch(listener.slice(0, routeIndex), /reportNewDeviceSignIn/);
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
