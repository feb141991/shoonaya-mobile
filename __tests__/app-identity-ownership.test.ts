import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { getAppIdentity, setAppIdentity } from '../lib/appIdentity';

test('app identity publishes explicit auth states', () => {
  setAppIdentity({ kind: 'guest' });
  assert.deepEqual(getAppIdentity(), { kind: 'guest' });

  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });
  assert.deepEqual(getAppIdentity(), { kind: 'authenticated', userId: 'user-a' });

  setAppIdentity({ kind: 'unauthenticated' });
  assert.deepEqual(getAppIdentity(), { kind: 'unauthenticated' });
});

test('Root is the only Supabase auth-event owner and guards stale routing work', () => {
  const root = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
  const home = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');
  const japa = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/japa.tsx'), 'utf8');
  const mandali = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/mandali.tsx'), 'utf8');
  const profile = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/profile.tsx'), 'utf8');
  const bhakti = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/bhakti.tsx'), 'utf8');
  const tirtha = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/tirtha.tsx'), 'utf8');
  const login = fs.readFileSync(path.join(process.cwd(), 'app/(auth)/login.tsx'), 'utf8');
  const languageContext = fs.readFileSync(path.join(process.cwd(), 'lib/i18n/LanguageContext.tsx'), 'utf8');
  const sacredCalendarSheet = fs.readFileSync(path.join(process.cwd(), 'components/home/SacredCalendarSheet.tsx'), 'utf8');
  const nityaKarma = fs.readFileSync(path.join(process.cwd(), 'app/nitya-dincharya.tsx'), 'utf8');
  const quiz = fs.readFileSync(path.join(process.cwd(), 'app/quiz.tsx'), 'utf8');
  const seva = fs.readFileSync(path.join(process.cwd(), 'app/seva.tsx'), 'utf8');

  assert.match(root, /supabase\.auth\.onAuthStateChange/);
  assert.match(root, /authRouteGenerationRef/);
  assert.match(root, /lastAuthRouteKeyRef/);
  assert.match(root, /if \(!isCurrentRoute\(\)\) return;/);
  assert.doesNotMatch(home, /supabase\.auth\.onAuthStateChange/);
  assert.doesNotMatch(home, /supabase\.auth\.getSession/);
  assert.match(home, /useAppIdentity\(\)/);

  assert.doesNotMatch(japa, /supabase\.auth\.onAuthStateChange/);
  assert.doesNotMatch(japa, /supabase\.auth\.getSession/);
  assert.doesNotMatch(japa, /isGuestMode\(/);
  assert.match(japa, /useAppIdentity\(\)/);
  assert.match(japa, /contextLoadGenerationRef/);
  assert.match(japa, /expectedUserId: userId/);

  assert.doesNotMatch(mandali, /supabase\.auth\.onAuthStateChange/);
  assert.doesNotMatch(mandali, /supabase\.auth\.getUser/);
  assert.doesNotMatch(mandali, /isGuestMode\(/);
  assert.match(mandali, /useAppIdentity\(\)/);
  assert.match(mandali, /mandaliLoadGenerationRef/);
  assert.match(mandali, /resetMandaliIdentityState/);
  assert.match(mandali, /expectedUserId: userId/);

  assert.doesNotMatch(profile, /supabase\.auth\.onAuthStateChange/);
  assert.doesNotMatch(profile, /supabase\.auth\.getUser/);
  assert.doesNotMatch(profile, /supabase\.auth\.getSession/);
  assert.doesNotMatch(profile, /isGuestMode\(/);
  assert.match(profile, /useAppIdentity\(\)/);
  assert.match(profile, /getProfileCacheSnapshot/);
  assert.match(profile, /profileLoadGenerationRef/);
  assert.match(profile, /expectedUserId: identity\.userId/);

  assert.doesNotMatch(bhakti, /supabase\.auth\.onAuthStateChange/);
  assert.doesNotMatch(bhakti, /supabase\.auth\.getUser/);
  assert.match(bhakti, /useAppIdentity\(\)/);
  assert.match(bhakti, /stateMatchesIdentity/);
  assert.match(bhakti, /focusQueryRef/);

  assert.doesNotMatch(tirtha, /supabase\.auth\.onAuthStateChange/);
  assert.doesNotMatch(tirtha, /supabase\.auth\.getUser/);
  assert.match(tirtha, /useAppIdentity\(\)/);
  assert.match(tirtha, /passportReqId/);
  assert.match(tirtha, /passportOwnerId === currentPassportUserId/);
  assert.match(tirtha, /expectedUserId: userId/);

  // A guest transition has no Supabase auth event, so it must publish the
  // identity itself before entering the tab navigator.
  assert.match(login, /await setGuestMode\(true\);[\s\S]*?setAppIdentity\(\{ kind: 'guest' \}\);\s*router\.replace\('\/\(tabs\)'\);/);

  // F03 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md): widens this
  // ownership scan beyond the tab screens above to two files the finding
  // named directly -- previously invisible to this test entirely, which
  // is exactly how their own duplicate auth subscriptions went unnoticed.
  assert.doesNotMatch(languageContext, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(languageContext, /supabase\.auth\.onAuthStateChange/);
  assert.match(languageContext, /useAppIdentity\(\)/);

  assert.doesNotMatch(sacredCalendarSheet, /supabase\.auth\.onAuthStateChange/);
  assert.match(sacredCalendarSheet, /useAppIdentity\(\)/);

  // Read-only screen initialization consumes the root-published identity
  // instead of serially checking guest storage and calling getUser. Seva's
  // write handler intentionally retains getUser as its send-time owner check.
  assert.match(nityaKarma, /useAppIdentity\(\)/);
  assert.doesNotMatch(nityaKarma, /isGuestMode\(|supabase\.auth\.getUser\(/);
  assert.match(nityaKarma, /expectedUserId: userId/);

  assert.match(quiz, /useAppIdentity\(\)/);
  assert.doesNotMatch(quiz, /isGuestMode\(|supabase\.auth\.getUser\(/);
  assert.match(quiz, /expectedUserId: userId/);

  assert.match(seva, /useAppIdentity\(\)/);
  assert.doesNotMatch(seva, /isGuestMode\(/);
  const sevaLoadStart = seva.indexOf('const loadState = useCallback(async () => {');
  const sevaLoadEnd = seva.indexOf('}, [appIdentity, router]);', sevaLoadStart);
  assert.ok(sevaLoadStart > -1 && sevaLoadEnd > sevaLoadStart, 'Seva loadState callback not found');
  assert.doesNotMatch(seva.slice(sevaLoadStart, sevaLoadEnd), /supabase\.auth\.getUser\(/);
  assert.match(seva, /expectedUserId: userId|\.eq\('user_id', userId\)/);
});
