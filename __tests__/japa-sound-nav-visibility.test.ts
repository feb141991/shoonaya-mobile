import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { setBottomNavHidden, subscribeBottomNavHidden } from '../lib/nav-bar';

describe('Japa sound & bottom nav visibility contract', () => {
  it('manages bottom nav hidden state and notifies subscribers synchronously', () => {
    let observedState = false;
    const unsubscribe = subscribeBottomNavHidden((hidden) => {
      observedState = hidden;
    });

    setBottomNavHidden(true);
    assert.equal(observedState, true);

    setBottomNavHidden(false);
    assert.equal(observedState, false);

    unsubscribe();
    setBottomNavHidden(true);
    assert.equal(observedState, false, 'Unsubscribed listener must not receive further state updates');
    setBottomNavHidden(false);
  });

  it('verifies CollapsibleBottomNav respects nav-bar hidden pub-sub', () => {
    const navFile = fs.readFileSync(path.join(__dirname, '../components/ui/CollapsibleBottomNav.tsx'), 'utf8');
    assert.match(navFile, /subscribeBottomNavHidden/);
    assert.match(navFile, /if\s*\(isNavHidden\)\s*{\s*return null;\s*}/);
  });

  it('verifies Japa practice hides nav bar and stops audio on session completion & blur', () => {
    const japaFile = fs.readFileSync(path.join(__dirname, '../app/(tabs)/japa.tsx'), 'utf8');

    // Nav bar hidden during practice
    assert.match(japaFile, /setBottomNavHidden\(true\)/);
    assert.match(japaFile, /setBottomNavHidden\(false\)/);

    // Audio stop condition includes completionVisible
    assert.match(japaFile, /completionVisible/);
    assert.match(
      japaFile,
      /if\s*\(\s*screen !== 'practice' \|\|\s*showStopSheet \|\|\s*completionVisible \|\|\s*selectedSoundId === 'off' \|\|\s*!soundTarget\s*\)\s*{\s*void audio\.stop\(\);/
    );

    // useFocusEffect cleanup stops audio and resets nav bar
    assert.match(japaFile, /void audio\.stop\(\);/);

    // The practice screen's Sound pill opens the sound sheet: the button lives
    // in JapaPracticeScreen and the screen wires it to the sound sheet.
    const practiceFile = fs.readFileSync(path.join(__dirname, '../components/japa/JapaPracticeScreen.tsx'), 'utf8');
    assert.match(practiceFile, /onPress=\{onOpenSound\}/);
    assert.match(japaFile, /<JapaPracticeScreen[\s\S]*?onOpenSound=\{\(\) => setSoundSheetOpen\(true\)\}/);

    // Launcher offers ambient sound setup: the row lives in the launcher
    // component and the screen wires it to the sound sheet. (These were once
    // a single check of japa.tsx; "Ambient sound" also appears in a comment
    // there, so it must be read from the launcher itself.)
    const launcherFile = fs.readFileSync(path.join(__dirname, '../components/japa/JapaLauncherScreen.tsx'), 'utf8');
    assert.match(launcherFile, />\s*Ambient sound\s*</);
    assert.match(launcherFile, /accessibilityLabel=\{`Ambient sound\./);
    assert.match(launcherFile, /onPress=\{onOpenSound\}/);
    assert.match(japaFile, /onOpenSound=\{\(\) => setSoundSheetOpen\(true\)\}/);
  });
});
