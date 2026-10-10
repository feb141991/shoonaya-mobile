import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const onboarding = readFileSync(join(process.cwd(), 'app/(auth)/onboarding.tsx'), 'utf8');
const shell = readFileSync(join(process.cwd(), 'components/onboarding/OnboardingShell.tsx'), 'utf8');
const picker = readFileSync(join(process.cwd(), 'components/onboarding/NakshatraPicker.tsx'), 'utf8');
const welcome = readFileSync(join(process.cwd(), 'components/onboarding/OnboardingWelcomeScreen.tsx'), 'utf8');

describe('Onboarding shell integration contracts', () => {
  it('routes every standard onboarding step through the shared safe-area shell', () => {
    assert.match(onboarding, /<OnboardingShell[\s\S]*?transitionKey=\{step\}/);
    assert.doesNotMatch(onboarding, /<ScrollView/);
    assert.match(shell, /useSafeAreaInsets\(\)/);
    assert.match(shell, /paddingBottom: Math\.max\(insets\.bottom, 16\)/);
    assert.match(shell, /MIN_TOUCH_TARGET/);
  });

  it('resets and announces each step and maps Android system Back to step history', () => {
    assert.match(shell, /scrollViewRef\.current\?\.scrollTo\(\{ y: 0, animated: false \}\)/);
    assert.match(shell, /AccessibilityInfo\.setAccessibilityFocus/);
    assert.match(shell, /AccessibilityInfo\.announceForAccessibility/);
    assert.match(shell, /BackHandler\.addEventListener\('hardwareBackPress'/);
    assert.match(onboarding, /onBack=\{\(\) => \{ void goBack\(\); \}\}/);
  });

  it('keeps notification deferral reversible and recovers blocked permissions through Settings', () => {
    assert.match(onboarding, /getPermissionRecoveryAction\(notificationsDenied, notificationsCanAskAgain\)/);
    assert.match(onboarding, /getPermissionRecoveryAction\(locationDenied, locationCanAskAgain\)/);
    assert.match(onboarding, /Linking\.openSettings\(\)/);
    assert.match(onboarding, /AppState\.addEventListener\('change'/);
    assert.match(onboarding, /permission\.granted[\s\S]*?goToStepRef\.current\?\.\('location'/);
  });

  it('stores the canonical Nakshatra key and shows selected state accessibly', () => {
    assert.match(picker, /onSelect\(item\.key\)/);
    assert.match(picker, /accessibilityState=\{\{ selected: isSelected \}\}/);
  });

  it('keeps Welcome destinations secondary to a pinned Enter Shoonaya action', () => {
    assert.match(onboarding, /step === 'ready'[\s\S]*?translated\('Enter Shoonaya'/);
    assert.match(onboarding, /void complete\('\/\(tabs\)'\)/);
    assert.match(welcome, /DESTINATIONS\.map/);
    assert.match(welcome, /recommendedPractice/);
    assert.match(welcome, /calendarScopeLabel/);
  });
});
