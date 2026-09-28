import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const modal = readFileSync(new URL('../components/pathshala/PathshalaCompletionModal.tsx', import.meta.url), 'utf8');

// Lesson/path completion had no share affordance at all. Uses the same
// rendered-image-card approach as app/vrat/[slug].tsx and app/shloka.tsx
// (ShoonayaShareCard + shareCapturedShoonayaCard), since a completed
// milestone is an achievement to celebrate rather than reading content to
// excerpt as plain text.
describe('Pathshala completion modal milestone sharing', () => {
  it('renders a share action using the branded ShoonayaShareCard pattern, not a plain-text Share.share()', () => {
    assert.match(modal, /import \{ ShoonayaShareCard \} from '@\/components\/share\/ShoonayaShareCard';/);
    assert.match(modal, /import \{ shareCapturedShoonayaCard \} from '@\/lib\/share-card';/);
    assert.doesNotMatch(modal, /from 'react-native'\)[\s\S]{0,400}\bShare\b\s*,/);
  });

  it('sanitizes pathTitle into a safe filename instead of interpolating it raw', () => {
    assert.match(modal, /const safePathSlug = pathTitle\.replace\(\/\[\^a-zA-Z0-9\]\+\/g, '-'\)/);
    assert.match(modal, /fileName: `shoonaya-pathshala-\$\{safePathSlug\}-lesson-\$\{lessonNumber\}\.png`/);
    assert.doesNotMatch(modal, /fileName: `shoonaya-pathshala-\$\{pathTitle\}/);
  });

  it('guards against a double-tap while a share is already in flight', () => {
    assert.match(modal, /const \[sharing, setSharing\] = useState\(false\);/);
    assert.match(modal, /if \(sharing\) return;/);
    assert.match(modal, /disabled=\{sharing\}/);
  });

  it('maps completion state onto the share card data with the same fields shown in the modal itself', () => {
    const dataBlock = modal.match(/data=\{\{[\s\S]*?\}\}/)?.[0];
    assert.ok(dataBlock, 'ShoonayaShareCard data prop should exist');
    assert.match(dataBlock!, /headlineValue: lessonNumber,/);
    assert.match(dataBlock!, /title: isPathDone \? 'Path Completed!' : lessonTitle,/);
    assert.match(dataBlock!, /subtitle: pathTitle,/);
  });

  it('renders the capture target off-screen, not visibly overlapping the modal content', () => {
    assert.match(modal, /left: -10000/);
    assert.match(modal, /ref=\{shareCardRef\}/);
  });
});
