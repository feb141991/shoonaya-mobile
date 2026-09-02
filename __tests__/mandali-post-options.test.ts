import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dedupeNearbyMandalis, mandaliLocationKey } from '../lib/mandaliLocation';

const screen = readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8');
const sheet = readFileSync(new URL('../components/mandali/PostOptionsSheet.tsx', import.meta.url), 'utf8');
const confetti = readFileSync(new URL('../components/ui/ConfettiOverlay.tsx', import.meta.url), 'utf8');

describe('Mandali post options', () => {
  it('uses the app-owned sheet rather than Android Alert menus for post actions', () => {
    assert.match(screen, /import \{ PostOptionsSheet \}/);
    assert.match(screen, /setPostOptionsPost\(post\)/);
    assert.doesNotMatch(screen, /Alert\.alert\('Options'/);
    assert.doesNotMatch(screen, /Alert\.alert\('Your Post'/);
    assert.doesNotMatch(screen, /Alert\.alert\('Report Post'/);
  });

  it('keeps compose controls measurable and gives the user an explicit discard path', () => {
    assert.match(screen, /const discardCompose = useCallback/);
    assert.match(screen, /onRequestClose=\{requestComposerClose\}/);
    assert.match(screen, />Discard<\/Text>/);
    assert.doesNotMatch(screen, /minHeight: 0,\s*borderRadius: 999/);
    assert.match(screen, /minHeight: 44,\s*borderRadius: 999/);
    assert.match(screen, /KeyboardAvoidingView/);
    assert.match(screen, /keyboardShouldPersistTaps="handled"/);
    assert.match(screen, /onPanResponderRelease/);
  });

  it('keeps report, block, edit, and delete inside readable themed UI', () => {
    for (const label of ['Report post', 'Block user', 'Edit post', 'Delete post']) {
      assert.match(sheet, new RegExp(label));
    }
    assert.match(sheet, /backgroundColor: theme\.card/);
    assert.match(sheet, /color: theme\.text/);
  });

  it('normalizes a city and country before nearby Mandalis are deduplicated', () => {
    assert.equal(mandaliLocationKey(' Bedford ', 'United Kingdom'), mandaliLocationKey('bedford', 'united kingdom'));
    assert.deepEqual(
      dedupeNearbyMandalis([
        { id: 'nearest', city: 'Bedford', country: 'United Kingdom', member_count: 0, distanceKm: 2 },
        { id: 'duplicate', city: 'bedford', country: 'united kingdom', member_count: 0, distanceKm: 2.1 },
        { id: 'cranfield', city: 'Cranfield', country: 'United Kingdom', member_count: 0, distanceKm: 14 },
      ]),
      [
        { id: 'nearest', city: 'Bedford', country: 'United Kingdom', member_count: 0, distanceKm: 2 },
        { id: 'cranfield', city: 'Cranfield', country: 'United Kingdom', member_count: 0, distanceKm: 14 },
      ],
    );
  });
});

describe('Native celebration palette', () => {
  it('uses the same sacred confetti palette as the PWA', () => {
    for (const color of ['#E88C35', '#C5A059', '#F0A830', '#D4784A', '#F2EAD6', '#D4926A', '#FABE5A']) {
      assert.match(confetti, new RegExp(color));
    }
  });
});
