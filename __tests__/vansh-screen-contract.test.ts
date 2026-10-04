import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const screen = readFileSync(new URL('../app/kul.tsx', import.meta.url), 'utf8');
const canvas = readFileSync(new URL('../components/kul/VanshGraphCanvas.tsx', import.meta.url), 'utf8');
const chauparStatus = readFileSync(new URL('../lib/chaupar/README.md', import.meta.url), 'utf8');

describe('KUL family tree interaction contract', () => {
  it('uses one normalized tree model for canvas and list rendering', () => {
    assert.match(screen, /const familyTreeLayout = useMemo\(\s*\(\) => computeVanshLayout/);
    assert.match(screen, /<VanshGraphCanvas\s+layout=\{familyTreeLayout\}/);
    assert.match(screen, /familyTreeLayout\.nodes\.map\(\(node\)/);
    assert.match(screen, /const parentName = node\.resolvedParentId/);
    assert.match(screen, /Generation \{node\.generation\}/);
  });

  it('allows selecting a list row and exposes the same selected-member guardian actions', () => {
    assert.match(screen, /accessibilityState=\{\{ selected \}\}/);
    assert.match(screen, /onPress=\{\(\) => setSelectedFamilyMemberId\(/);
    assert.match(screen, /\{selectedFamilyMember \? \(/);
    assert.match(screen, /accessibilityLabel=\{`Edit \$\{selectedFamilyMember\.name\}`\}/);
    assert.match(screen, /accessibilityLabel=\{`Remove \$\{selectedFamilyMember\.name\} from family tree`\}/);
    assert.match(screen, /minHeight: MIN_TOUCH_TARGET/);
  });

  it('fits the canvas from measured dimensions and keeps it centered around the controls dock', () => {
    assert.match(canvas, /computeVanshFitScale\(/);
    assert.match(canvas, /onLayout=\{\(event\) =>/);
    assert.match(canvas, /alignItems: 'center'/);
    assert.match(canvas, /justifyContent: 'center'/);
    assert.match(canvas, /paddingBottom: 72/);
  });

  it('keeps Chaupar clearly out of the authentic/player-ready feature scope', () => {
    assert.match(chauparStatus, /not yet a playable or release-ready Chaupar feature/);
    assert.match(chauparStatus, /has not been reviewed against a named ruleset/);
    assert.match(chauparStatus, /Do not describe the implementation as an authentic or complete rules engine/);
  });
});
