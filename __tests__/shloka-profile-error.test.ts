import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { describe, it } from 'node:test';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const shlokaScreen = read('app/shloka.tsx');
const insightsScreen = read('app/bhakti/insights.tsx');
const tirthaScreen = read('app/(tabs)/tirtha.tsx');
const mantrasScreen = read('app/mantras.tsx');
const nityaKarmaScreen = read('app/nitya-karma.tsx');
const sevaScreen = read('app/seva.tsx');

describe('Shloka screen profile read error guard', () => {
  it('checks profileResult.error and isolates state when profile lookup fails', () => {
    assert.match(
      shlokaScreen,
      /if \(profileResult\.error\) \{[\s\S]*?setProfile\(null\);[\s\S]*?setProfileError\(profileResult\.error\);[\s\S]*?\} else \{[\s\S]*?const row = profileResult\.data;[\s\S]*?setProfile\(\{[\s\S]*?shlokaStreak: row\?\.shloka_streak \?\? 0/,
    );
  });

  it('keeps streak card strictly guarded behind profile truthiness', () => {
    assert.match(
      shlokaScreen,
      /\{profile \? \([\s\S]*?\{profile\.shlokaStreak\} day\{profile\.shlokaStreak === 1 \? '' : 's'\} sacred text streak[\s\S]*?\) : profileError \? \(/,
    );
  });

  it('disables "Mark as read" button when profile read fails or profile is unknown', () => {
    assert.match(
      shlokaScreen,
      /disabled=\{readToday \|\| marking \|\| Boolean\(profileError\) \|\| !profile\}/,
    );
    assert.match(
      shlokaScreen,
      /accessibilityLabel=\{[\s\S]*?profileError \|\| !profile\s*\?\s*'Streak status unavailable'/,
    );
    assert.match(
      shlokaScreen,
      /Streak unavailable/,
    );
  });

  it('presents retry affordance using describeFailure with 44px min touch target', () => {
    assert.match(
      shlokaScreen,
      /describeFailure\(profileError, 'Could not load your reading streak\. Please try again\.'\)/,
    );
    assert.match(
      shlokaScreen,
      /accessibilityLabel="Retry loading reading streak"[\s\S]*?onPress=\{\(\) => \{ void retryProfile\(\); \}\}[\s\S]*?minHeight: MIN_TOUCH_TARGET[\s\S]*?minWidth: 44/,
    );
  });

  it('retryProfile queries profiles, checks error, and updates profile only on success', () => {
    assert.match(
      shlokaScreen,
      /const retryProfile = useCallback\(async \(\) => \{[\s\S]*?const \{ data: row, error \} = await supabase[\s\S]*?\.from\('profiles'\)[\s\S]*?if \(error\) \{[\s\S]*?setProfileError\(error\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?setProfileError\(null\);[\s\S]*?setProfile\(\{/,
    );
  });

  it('does not fabricate streak count in share card when profile is null', () => {
    assert.match(
      shlokaScreen,
      /footer: profile \? `\$\{profile\.shlokaStreak\}-day sacred text streak` : undefined/,
    );
  });
});

describe('Repo-wide sweep for unchecked Supabase read errors (AGENTS §18)', () => {
  it('bhakti insights checks profileError alongside mala_sessions error', () => {
    assert.match(
      insightsScreen,
      /\{ data: profile, error: profileError \}[\s\S]*?if \(error \|\| profileError\) \{ setLoadError\(true\); return; \}/,
    );
  });

  it('tirtha passport does not wipe saved places or visits on read error', () => {
    assert.match(
      tirthaScreen,
      /if \(savesResult\.error \|\| visitsResult\.error\) return;[\s\S]*?setPassportOwnerId\(userId\);[\s\S]*?setSavedPlaces\(/,
    );
  });

  it('mantras screen only updates profile tradition context on successful read', () => {
    assert.match(
      mantrasScreen,
      /if \(appIdentity\.kind === 'authenticated' && !profileResult\.error && profileResult\.data\) \{[\s\S]*?setProfileContext\(\{/,
    );
  });

  it('nitya-karma throws on profile read failure instead of zeroing ashrama stage', () => {
    assert.match(
      nityaKarmaScreen,
      /if \(profileResult\.error\) throw profileResult\.error;[\s\S]*?const profile = profileResult\.data;/,
    );
  });

  it('seva screen throws on countError or profileError to prevent zeroing monthly count and cache', () => {
    assert.match(
      sevaScreen,
      /if \(profileError \|\| countError\) throw profileError \?\? countError;[\s\S]*?const nextTradition = isTraditionKey\(profileRow\?\.tradition\)/,
    );
  });
});

describe('Mutation checks for load-bearing guards', () => {
  it('fails if shloka profile error is ignored and streak defaults to 0', () => {
    const mutated = shlokaScreen.replace(
      'if (profileResult.error) {',
      'if (false && profileResult.error) {',
    );
    assert.throws(() => {
      assert.match(
        mutated,
        /if \(profileResult\.error\) \{[\s\S]*?setProfile\(null\);[\s\S]*?setProfileError\(profileResult\.error\);/,
      );
    });
  });

  it('fails if "Mark as read" button is not disabled on profile error', () => {
    const mutated = shlokaScreen.replace(
      'disabled={readToday || marking || Boolean(profileError) || !profile}',
      'disabled={readToday || marking}',
    );
    assert.throws(() => {
      assert.match(
        mutated,
        /disabled=\{readToday \|\| marking \|\| Boolean\(profileError\) \|\| !profile\}/,
      );
    });
  });

  it('fails if bhakti insights ignores profileError', () => {
    const mutated = insightsScreen.replace(
      'if (error || profileError) { setLoadError(true); return; }',
      'if (error) { setLoadError(true); return; }',
    );
    assert.throws(() => {
      assert.match(
        mutated,
        /if \(error \|\| profileError\) \{ setLoadError\(true\); return; \}/,
      );
    });
  });

  it('fails if tirtha wipes saved places on error', () => {
    const mutated = tirthaScreen.replace(
      'if (savesResult.error || visitsResult.error) return;',
      '',
    );
    assert.throws(() => {
      assert.match(
        mutated,
        /if \(savesResult\.error \|\| visitsResult\.error\) return;/,
      );
    });
  });
});
