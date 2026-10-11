import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Source-level guard for the Panchatantra storybook's wisdom actions (Save to Treasury, Finish Reading).
// A review found the first version could not compile (a stray brace that no unit test imports), the
// "Saved to Treasury" button saved nothing, "Finish Reading" still recorded the daily katha after the
// "Earn Karma" label was removed, and the new buttons used hard-coded colours. See AGENTS.md section 13.
const root = resolve(__dirname, '..');
const view = readFileSync(resolve(root, 'components/reader/PanchatantraStorybookView.tsx'), 'utf8');
const katha = readFileSync(resolve(root, 'app/bhakti/katha/[id].tsx'), 'utf8');

const actionsStart = view.indexOf('{/* Meaningful Wisdom Actions');
const actionsEnd = view.indexOf('/* Standard Story Scene');
const actions = view.slice(actionsStart, actionsEnd);

describe('wisdom actions block is found', () => {
  it('can be sliced out of the view', () => {
    assert.ok(actionsStart > 0 && actionsEnd > actionsStart, 'markers present');
    assert.ok(actions.length > 500);
  });
});

describe('Save to Treasury is real', () => {
  it('reads and writes through the persisted Treasury, not local component state', () => {
    assert.match(view, /useNitiTreasuryItem\(\{ kind: "panchatantra", id: katha\.id \}\)/);
    assert.doesNotMatch(view, /savedToTreasury/);
    assert.doesNotMatch(view, /useState\(false\)[^\n]*[Tt]reasury/);
    assert.match(actions, /treasury\.saved/);
  });

  it('waits for the saved state to load before it can be tapped', () => {
    assert.match(actions, /disabled=\{!treasury\.ready\}/);
  });

  it('tells the person when nothing was saved, and never claims a save that did not happen', () => {
    assert.match(view, /if \(!result\.ok\) \{/);
    assert.match(view, /Alert\.alert\(/);
    assert.match(view, /NotificationFeedbackType\.Error/);
  });

  it('plays the success haptic for a save and a plain one for removal, after the result', () => {
    assert.match(view, /if \(result\.saved\) void Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Success\);/);
    assert.match(view, /else void Haptics\.selectionAsync\(\);/);
    assert.match(actions, /haptic="none"/);
  });

  it('exposes the saved state to a screen reader', () => {
    assert.match(actions, /accessibilityRole="button"/);
    assert.match(actions, /accessibilityState=\{\{ selected: treasury\.saved, disabled: !treasury\.ready \}\}/);
    assert.match(actions, /Saved to Treasury\. Tap to remove\./);
  });

  it('has no leftover identical-branch icon ternary', () => {
    assert.doesNotMatch(view, /'bookmark' : 'bookmark'/);
  });
});

describe('the hook only enables the control for an identity that can hold a Treasury', () => {
  it('requires a signed-in person or a guest', () => {
    const hook = readFileSync(resolve(root, 'components/reader/useNitiTreasury.ts'), 'utf8');
    assert.match(hook, /identity\.kind === 'authenticated' \|\| identity\.kind === 'guest'/);
    assert.match(hook, /ready: canHoldTreasury/);
  });
});

describe('wisdom actions use theme tokens, not literals', () => {
  it('has no hex or rgba colour literal', () => {
    assert.doesNotMatch(actions, /#[0-9A-Fa-f]{3,8}\b/);
    assert.doesNotMatch(actions, /rgba?\(/);
    assert.doesNotMatch(actions, /\$\{accent\}[0-9a-fA-F]{2}/);
  });

  it('takes borders and surfaces from the reader paper theme and tints the accent with withAlpha', () => {
    assert.match(actions, /theme\.border/);
    assert.match(actions, /theme\.cardSoft/);
    assert.match(actions, /withAlpha\(accent, 0\.12\)/);
  });
});

describe('finishing a wisdom tale', () => {
  it('only closes the reader: it never records the daily katha', () => {
    const raw = katha.slice(katha.indexOf('if (isPanchatantra) {'), katha.indexOf('return (\n    <ReaderShell'));
    // The explanatory comment names markDone; only code counts.
    const block = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.match(block, /const leaveStorybook = \(\) => \{/);
    assert.match(block, /onBack=\{leaveStorybook\}/);
    assert.match(block, /onComplete=\{leaveStorybook\}/);
    assert.doesNotMatch(block, /markDone/);
    assert.doesNotMatch(block, /complete_katha/);
  });

  it('other kathas still record it', () => {
    assert.match(katha, /rpc\('complete_katha'/);
    assert.match(katha, /onPress=\{\(\) => void markDone\(\)\}/);
  });
});
