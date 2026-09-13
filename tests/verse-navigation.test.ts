import { test } from 'node:test';
import assert from 'node:assert/strict';

// Helper mimicking the canonical verse navigation state logic implemented in [lessonId].tsx
interface VerseReaderState {
  totalVerses: number;
  verseIndex: number;
  completedLessons: number[];
  lessonIndex: number;
  totalLessons: number;
}

function getNavigationActions(state: VerseReaderState) {
  const isLastVerse = state.verseIndex >= state.totalVerses - 1;
  const isFirstVerse = state.verseIndex === 0;
  const isCompleted = state.completedLessons.includes(state.lessonIndex);

  let primaryAction: 'next_verse' | 'complete_lesson' | 'next_lesson' | 'path_completed';
  let primaryLabel: string;

  if (!isLastVerse) {
    primaryAction = 'next_verse';
    primaryLabel = `Next Verse (${state.verseIndex + 2}/${state.totalVerses})`;
  } else if (!isCompleted) {
    primaryAction = 'complete_lesson';
    primaryLabel = 'Complete Lesson & Earn Karma';
  } else if (state.lessonIndex < state.totalLessons - 1) {
    primaryAction = 'next_lesson';
    primaryLabel = 'Next Lesson';
  } else {
    primaryAction = 'path_completed';
    primaryLabel = 'Path Completed ✓';
  }

  const showPrevVerse = !isFirstVerse;

  return {
    isLastVerse,
    isFirstVerse,
    showPrevVerse,
    primaryAction,
    primaryLabel,
  };
}

function handleSwipe(
  translationX: number,
  state: VerseReaderState
): { nextVerseIndex: number; changedLesson: boolean } {
  let nextVerseIndex = state.verseIndex;
  let changedLesson = false;

  if (translationX < -60) {
    // Swipe left: advance verse strictly within current lesson
    if (state.verseIndex < state.totalVerses - 1) {
      nextVerseIndex = state.verseIndex + 1;
    }
    // Crucial: never call goToLesson on swipe end!
  } else if (translationX > 60) {
    // Swipe right: previous verse strictly within current lesson
    if (state.verseIndex > 0) {
      nextVerseIndex = state.verseIndex - 1;
    }
  }

  return { nextVerseIndex, changedLesson };
}

test('Pathshala Verse Progression & Adaptive CTA Suite', async (t) => {
  await t.test('1. On multi-verse lesson, Verse 1 shows Next Verse CTA, never Done/Complete', () => {
    const state: VerseReaderState = {
      totalVerses: 5,
      verseIndex: 0,
      completedLessons: [],
      lessonIndex: 0,
      totalLessons: 10,
    };

    const actions = getNavigationActions(state);
    assert.equal(actions.isLastVerse, false);
    assert.equal(actions.showPrevVerse, false);
    assert.equal(actions.primaryAction, 'next_verse');
    assert.equal(actions.primaryLabel, 'Next Verse (2/5)');
  });

  await t.test('2. Intermediate verses (e.g. Verse 3 of 5) show both Prev Verse and Next Verse', () => {
    const state: VerseReaderState = {
      totalVerses: 5,
      verseIndex: 2, // 3rd verse
      completedLessons: [],
      lessonIndex: 0,
      totalLessons: 10,
    };

    const actions = getNavigationActions(state);
    assert.equal(actions.isLastVerse, false);
    assert.equal(actions.showPrevVerse, true);
    assert.equal(actions.primaryAction, 'next_verse');
    assert.equal(actions.primaryLabel, 'Next Verse (4/5)');
  });

  await t.test('3. ONLY final verse (Verse 5 of 5) transforms into Complete Lesson & Earn Karma', () => {
    const state: VerseReaderState = {
      totalVerses: 5,
      verseIndex: 4, // 5th verse (last)
      completedLessons: [],
      lessonIndex: 0,
      totalLessons: 10,
    };

    const actions = getNavigationActions(state);
    assert.equal(actions.isLastVerse, true);
    assert.equal(actions.showPrevVerse, true);
    assert.equal(actions.primaryAction, 'complete_lesson');
    assert.equal(actions.primaryLabel, 'Complete Lesson & Earn Karma');
  });

  await t.test('4. Already completed lesson shows Next Lesson CTA on final verse', () => {
    const state: VerseReaderState = {
      totalVerses: 5,
      verseIndex: 4,
      completedLessons: [0], // lesson 0 is completed
      lessonIndex: 0,
      totalLessons: 10,
    };

    const actions = getNavigationActions(state);
    assert.equal(actions.isLastVerse, true);
    assert.equal(actions.primaryAction, 'next_lesson');
    assert.equal(actions.primaryLabel, 'Next Lesson');
  });

  await t.test('5. Final lesson of path when completed shows Path Completed ✓', () => {
    const state: VerseReaderState = {
      totalVerses: 5,
      verseIndex: 4,
      completedLessons: [0, 1, 2],
      lessonIndex: 2, // last lesson of 3
      totalLessons: 3,
    };

    const actions = getNavigationActions(state);
    assert.equal(actions.isLastVerse, true);
    assert.equal(actions.primaryAction, 'path_completed');
    assert.equal(actions.primaryLabel, 'Path Completed ✓');
  });

  await t.test('6. Swipe left on Verse 1 advances to Verse 2 without changing lesson', () => {
    const state: VerseReaderState = {
      totalVerses: 5,
      verseIndex: 0,
      completedLessons: [],
      lessonIndex: 0,
      totalLessons: 10,
    };

    const result = handleSwipe(-80, state);
    assert.equal(result.nextVerseIndex, 1);
    assert.equal(result.changedLesson, false);
  });

  await t.test('7. Swipe left on the LAST verse never bounces to next lesson', () => {
    const state: VerseReaderState = {
      totalVerses: 5,
      verseIndex: 4, // already last
      completedLessons: [],
      lessonIndex: 0,
      totalLessons: 10,
    };

    const result = handleSwipe(-80, state);
    assert.equal(result.nextVerseIndex, 4);
    assert.equal(result.changedLesson, false);
  });

  await t.test('8. Swipe right on Verse 1 never bounces to previous lesson', () => {
    const state: VerseReaderState = {
      totalVerses: 5,
      verseIndex: 0, // first
      completedLessons: [],
      lessonIndex: 1,
      totalLessons: 10,
    };

    const result = handleSwipe(80, state);
    assert.equal(result.nextVerseIndex, 0);
    assert.equal(result.changedLesson, false);
  });
});
