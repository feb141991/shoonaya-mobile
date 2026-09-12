import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('Pathshala Chapter Completion Celebration Suite', () => {
  const lessonReaderSrc = readFileSync(new URL('../app/pathshala/[pathId]/[lessonId].tsx', import.meta.url), 'utf8');
  const modalSrc = readFileSync(new URL('../components/pathshala/PathshalaCompletionModal.tsx', import.meta.url), 'utf8');

  it('renders PathshalaCompletionModal upon completing a lesson instead of abrupt timeout', () => {
    assert.doesNotMatch(lessonReaderSrc, /setTimeout\(returnToPathshala, 650\)/);
    assert.match(lessonReaderSrc, /<PathshalaCompletionModal/);
    assert.match(lessonReaderSrc, /setCompletionModalVisible\(true\)/);
  });

  it('captures karmaEarned and dailySadhanaUpdated from backend progress response', () => {
    assert.match(lessonReaderSrc, /karmaEarned\?: number/);
    assert.match(lessonReaderSrc, /dailySadhanaUpdated\?: boolean/);
    assert.match(lessonReaderSrc, /setCompletionReward\({ karmaEarned: earned, dailySadhanaUpdated: sadhanaUpdated }\)/);
  });

  it('enables direct navigation to the next lesson without kicking the user out', () => {
    assert.match(lessonReaderSrc, /handleContinueNextLesson/);
    assert.match(lessonReaderSrc, /params: \{ pathId, lessonId: String\(nextIndex\) \}/);
    assert.match(lessonReaderSrc, /onContinueNextLesson=\{handleContinueNextLesson\}/);
  });

  it('provides tradition-aware sacred glyphs and contemplation guidance in the modal', () => {
    assert.match(modalSrc, /TRADITION_GLYPHS/);
    assert.match(modalSrc, /Pause & Contemplate/);
    assert.match(modalSrc, /\+{karmaEarned} Karma/);
    assert.match(modalSrc, /Sadhana Done/);
  });
});
