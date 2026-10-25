import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const layout = read('app/_layout.tsx');
const coordinator = read('lib/authCoordinator.ts');
const callback = read('app/auth/callback.tsx');
const plans = read('app/nitya-plans.tsx');
const ashrama = read('app/nitya-ashrama.tsx');

test('cached onboarding stays non-blocking, but a confirmed mismatch is guarded until the corrected route lands', () => {
  assert.match(layout, /if \(cached === 'true'\)[\s\S]*?void supabase[\s\S]*?if \(error\) \{\s*console\.warn\('\[auth-profile\] onboarding revalidation unavailable', error\);\s*return;\s*\}/);
  assert.match(layout, /p\?\.onboarding_completed === false[\s\S]*?redirectForAuth\('\/\(auth\)\/onboarding'\)/);
  assert.match(layout, /const startupRouteReady = readyToRender && !startupRoutePending && pendingStartupDestination === null;/);
  assert.match(layout, /if \([\s\S]*?pendingStartupDestination &&[\s\S]*?isStartupAuthDestinationVisible\(pendingStartupDestination/);
});

test('startup initialization failure cannot expose a protected default route without a routing decision', () => {
  assert.match(layout, /if \(routedSessionUserId\)[\s\S]*?setProfileResolutionFailure\(\{ userId: routedSessionUserId \}\);[\s\S]*?else[\s\S]*?redirectForAuth\('\/\(auth\)\/login'\);[\s\S]*?setAuthReady\(true\);/);
  assert.match(layout, /if \(sessionResult\.error\) throw sessionResult\.error;/);
  assert.match(layout, /Linking\.getInitialURL\(\)\.catch\(\(error\) => \{[\s\S]*?return null;/);
});

test('both active and dormant onboarding reads preserve query errors instead of treating them as a missing row', () => {
  assert.match(layout, /let \{ data: profile, error: profileReadError \} = await supabase[\s\S]*?if \(profileReadError\) throw profileReadError;/);
  assert.match(layout, /fetchOnboardingStatus: async \(userId\)[\s\S]*?const \{ data, error \} = await supabase[\s\S]*?if \(error\) throw error;[\s\S]*?return data \?\? null;/);
  assert.match(coordinator, /void d\.fetchOnboardingStatus\(session\.user\.id\)[\s\S]*?\.catch\(\(\) => \{\}\)/);
});

test('OAuth callback never interprets a failed or missing profile read as onboarding complete', () => {
  assert.match(callback, /const \{ data: profile, error: profileError \} = await supabase[\s\S]*?if \(profileError\) throw profileError;/);
  assert.match(callback, /const needsOnboarding = profile\?\.onboarding_completed !== true;/);
});

test('guided-plan actions remain blocked until progress loads, with an explicit retry state', () => {
  assert.match(plans, /if \(!userId \|\| !progressLoaded \|\| progressLoadError \|\| loading\) return;/);
  assert.match(plans, /if \(error\) throw error;[\s\S]*?setProgressLoaded\(true\);/);
  assert.match(plans, /if \(progressLoadError \|\| !progressLoaded\)[\s\S]*?Your saved journey is safe[\s\S]*?onCta=\{\(\) => \{/);
  assert.match(plans, /existingStatus === 'dismissed'[\s\S]*?\.update\(\{ status: 'active', updated_at: now \}\)/);
  assert.match(plans, /isCompleted && \([\s\S]*?onPress=\{\(\) => handleRestartPlan\(plan\)\}[\s\S]*?Begin Again/);

  // Mutation check for the load-bearing guard: the test must fail if an
  // unknown progress state is allowed to reach the Day-1 upsert again.
  const withoutGuard = plans.replace(
    'if (!userId || !progressLoaded || progressLoadError || loading) return;',
    'if (!userId) return;',
  );
  assert.throws(() => assert.match(withoutGuard, /if \(!userId \|\| !progressLoaded \|\| progressLoadError \|\| loading\) return;/));
});

test('Ashrama setup is not shown as empty when its profile read fails, and can retry', () => {
  assert.match(ashrama, /const \{ data: prof, error: profileError \} = await supabase[\s\S]*?if \(profileError\) throw profileError;/);
  assert.match(ashrama, /if \(loadError\)[\s\S]*?Could not load your Ashrama details[\s\S]*?onCta=\{\(\) => \{ void loadData\(\); \}\}/);
});
