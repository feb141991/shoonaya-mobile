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
const panchang = read('app/panchang.tsx');
const dincharya = read('app/nitya-dincharya.tsx');
const profileTab = read('app/(tabs)/profile.tsx');
const mandaliTab = read('app/(tabs)/mandali.tsx');
const mandaliLib = read('lib/mandali.ts');
const profileById = read('app/profile/[id].tsx');
const liveDarshan = read('app/live-darshan.tsx');
const kundali = read('app/kundali.tsx');
const quiz = read('app/quiz.tsx');
const zen = read('app/bhakti/zen.tsx');
const mandaliReactions = read('lib/mandaliReactions.ts');
const loginScreen = read('app/(auth)/login.tsx');

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

test('Panchang never overwrites a shown profile state with generic defaults on a failed read', () => {
  assert.match(panchang, /const \{ data: profile, error: profileError \} = await supabase[\s\S]*?\.single\(\);[\s\S]*?if \(profileError\) return \{ outcome: 'failed', identity \};/);

  // Mutation check: without the guard, a resolved-with-error response (the
  // normal supabase-js shape -- it does not reject the promise) would fall
  // straight through to building nextState from INITIAL_STATE's defaults.
  const withoutGuard = panchang.replace(
    "if (profileError) return { outcome: 'failed', identity };\n\n      const nextState",
    '      const nextState'
  );
  assert.throws(() => assert.match(
    withoutGuard,
    /if \(profileError\) return \{ outcome: 'failed', identity \};/
  ));
});

test('Nitya Dincharya does not default to UTC on a failed profile read (wrong "today" boundary risk)', () => {
  assert.match(dincharya, /const \{ data: profile, error: profileError \} = await supabase[\s\S]*?if \(profileError\) throw profileError;/);
});

test('Profile retry after sign-in failure does not run the full sign-out cascade on a transient getSession error', () => {
  assert.match(layout, /const retryProfileResolution = useCallback\(async \(\) => \{[\s\S]*?const \{ data, error \} = await supabase\.auth\.getSession\(\);[\s\S]*?if \(error\) \{[\s\S]*?return;[\s\S]*?\}/);
});

test('KUL enrichment preserves the previously-shown link on a failed lookup instead of flipping to none', () => {
  assert.match(profileTab, /error: kulError \} = await supabase[\s\S]*?\.select\('kul_id, kuls\(name\)'\)/);
  assert.match(profileTab, /const preserved = kulError && cur && cur\.id === nextProfile\.id;/);
});

test('Mandali comment-reaction highlighting is left alone on a failed upvote lookup', () => {
  assert.match(mandaliTab, /error: upvoteError \} = await supabase[\s\S]*?\.from\('comment_upvotes'\)/);
  assert.match(mandaliTab, /if \(upvoteError\) \{[\s\S]*?console\.warn\('\[mandali\] comment upvote lookup unavailable'/);
});

test('fetchNearbyMandalis throws on a failed query instead of returning an empty "no mandalis nearby" result', () => {
  assert.match(mandaliLib, /if \(error\) throw error;/);
});

test('Viewing another profile keeps a known viewer identity on a failed auth check instead of looking signed-out', () => {
  assert.match(profileById, /const uid = authError \? currentUserId : \(authData\.user\?\.id \?\? null\);/);
});

test('Live Darshan tradition lookup logs a failed read (already falls back to local prefs either way)', () => {
  assert.match(liveDarshan, /if \(error\) console\.warn\('\[live-darshan\] profile tradition lookup unavailable', error\);/);
});

test('Kundali self-account prefill surfaces a failed read instead of silently showing blank fields', () => {
  assert.match(kundali, /\.select\('full_name, date_of_birth'\)[\s\S]*?if \(error\) throw error;/);
});

test('Daily quiz does not default to UTC on a failed profile read (wrong "today" boundary risk)', () => {
  assert.match(quiz, /const \{ data: profile, error: profileError \} = await supabase[\s\S]*?if \(profileError\) throw profileError;/);
});

test('Zen breathing tradition lookup surfaces a failed read through the existing catch', () => {
  assert.match(zen, /const \{ data, error \} = await supabase\.from\('profiles'\)\.select\('tradition'\)[\s\S]*?if \(error\) throw error;/);
});

test('Mandali reaction display-name enrichment logs a failed lookup instead of silently showing no username', () => {
  assert.match(mandaliReactions, /error: profileRowsError \} = await supabase[\s\S]*?if \(profileRowsError\) console\.warn/);
});

test('Post-Apple-signin session check logs a failed read (already falls back to waitForStoredSession either way)', () => {
  assert.match(loginScreen, /error: sessionError \} = await supabase\.auth\.getSession\(\);[\s\S]*?if \(sessionError\) console\.warn/);
});
