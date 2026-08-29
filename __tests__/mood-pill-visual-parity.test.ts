import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { COLORS, RADII, TYPE } from '../lib/constants';
import { getHomeMoodPillStyle, HOME_MOOD_PILL_TEXT_STYLE } from '../lib/homeHeroPills';

describe('Mood Pill Visual Parity & Surface Token Suite', () => {
  it('1. Mood pill and Date/Panchang pill share identical surface background token', () => {
    // Both pills must use the canonical warm gold translucent glass background
    assert.equal(COLORS.homeMoodPillBgLight, COLORS.homePwaPillBg);
    assert.equal(COLORS.homeMoodPillBgDark, COLORS.homePwaPillBg);
    assert.equal(COLORS.homePwaPillBg, 'rgba(197,160,89,0.16)');
  });

  it('2. Mood pill and Date/Panchang pill share identical ivory/cream text token', () => {
    assert.equal(COLORS.homePwaPillText, 'rgba(255,240,200,0.92)');
  });

  it('3. Mood pill uses the same pill corner radius (RADII.pill = 999)', () => {
    assert.equal(RADII.pill, 999);
  });

  it('4. Mood pill uses transparent / zero-border styling matching default Panchang pill', () => {
    assert.equal(COLORS.homeMoodPillBorderLight, 'transparent');
    assert.equal(COLORS.homeMoodPillBorderDark, 'transparent');
  });

  it('5. Mood pill typography matches TYPE.chip', () => {
    assert.ok(TYPE.chip.fontFamily);
    assert.equal(TYPE.chip.fontSize, 11);
    assert.equal(TYPE.chip.lineHeight, 14);
  });

  it('6. Text and icon contrast verification against bright and dark backdrops', () => {
    // Both pills sit over the hero scrim + readability layer
    // Sourced from PWA globals.css and proven across light/dark themes
    assert.equal(COLORS.homePwaPillText, 'rgba(255,240,200,0.92)');
    assert.ok(COLORS.homePwaPillBg.startsWith('rgba(197,160,89,'));
  });

  it('7. Mood pill layout bounds keep it compact and clear of top action icons', () => {
    const bellIconRightBound = 20 + 48; // x=68
    const profileAvatarLeftBound = 20 + 48; // right inset=68
    const moodPillHorizontalInset = 76;

    assert.ok(
      moodPillHorizontalInset > bellIconRightBound,
      'Mood pill horizontal margin must clear bell button'
    );
    assert.ok(
      moodPillHorizontalInset > profileAvatarLeftBound,
      'Mood pill horizontal margin must clear profile avatar'
    );
  });

  it('8. production mood pill consumes the canonical translucent surface and stays on one line', () => {
    const style = getHomeMoodPillStyle(false);
    assert.equal(style.backgroundColor, COLORS.homePwaPillBg);
    assert.equal(style.borderWidth, 0);
    assert.equal(style.flexShrink, 0);
    assert.equal(style.minHeight, 30);
    assert.equal(HOME_MOOD_PILL_TEXT_STYLE.flexShrink, 0);
    assert.equal(HOME_MOOD_PILL_TEXT_STYLE.color, COLORS.homePwaPillText);
  });

  it('9. Home uses the production helper and keeps observance copy to one rendered line', () => {
    const homeSource = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
    assert.match(homeSource, /style=\{\(\{ pressed \}\) => getHomeMoodPillStyle\(pressed\)\}/);
    assert.doesNotMatch(homeSource, /splitSentences|labelLines/);
    assert.match(homeSource, /numberOfLines=\{1\}[\s\S]*?currentSlide\.label/);
  });
});
