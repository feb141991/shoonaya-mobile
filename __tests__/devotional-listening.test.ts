import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  getDevotionalSleepTimerDeadline,
  getNextDevotionalRecitationPosition,
  isDevotionalSleepTimerExpired,
} from '../lib/devotionalListening';

describe('standalone devotional listening controls', () => {
  it('repeats the selected verse and stops exactly at the requested target', () => {
    let position = { scope: 'verse' as const, verseIndex: 4, verseCount: 12, completedCycles: 0, targetCycles: 11 as const };
    for (let cycle = 1; cycle <= 11; cycle += 1) {
      const next = getNextDevotionalRecitationPosition(position);
      assert.equal(next.verseIndex, 4);
      assert.equal(next.completedCycles, cycle);
      assert.equal(next.done, cycle === 11);
      position = { ...position, completedCycles: next.completedCycles };
    }
  });

  it('follows verses in order, then counts one completed cycle for the whole Stotram', () => {
    const targetCycles = 11 as const;
    let position = { scope: 'stotram' as const, verseIndex: 0, verseCount: 3, completedCycles: 0, targetCycles };
    const sequence: Array<[number, number, boolean]> = [];
    for (let step = 0; step < 3 * targetCycles; step += 1) {
      const next = getNextDevotionalRecitationPosition(position);
      sequence.push([next.verseIndex, next.completedCycles, next.done]);
      if (next.done) break;
      position = { ...position, verseIndex: next.verseIndex, completedCycles: next.completedCycles };
    }
    assert.deepEqual(sequence.slice(0, 3), [[1, 0, false], [2, 0, false], [0, 1, false]]);
    assert.deepEqual(sequence.at(-1), [0, 11, true]);
  });

  it('treats End as natural completion and computes 15/30 minute deadlines', () => {
    assert.equal(getDevotionalSleepTimerDeadline('end', 10_000), null);
    assert.equal(getDevotionalSleepTimerDeadline(15, 10_000), 910_000);
    assert.equal(getDevotionalSleepTimerDeadline(30, 10_000), 1_810_000);
    assert.equal(isDevotionalSleepTimerExpired(910_000, 909_999), false);
    assert.equal(isDevotionalSleepTimerExpired(910_000, 910_000), true);
    assert.equal(isDevotionalSleepTimerExpired(null, 50_000_000), false);
  });

  it('finishes safely for empty or invalid verse positions', () => {
    assert.equal(getNextDevotionalRecitationPosition({ scope: 'stotram', verseIndex: 0, verseCount: 0, completedCycles: 0, targetCycles: 1 }).done, true);
    assert.equal(getNextDevotionalRecitationPosition({ scope: 'verse', verseIndex: 3, verseCount: 2, completedCycles: 0, targetCycles: 11 }).done, true);
  });

  it('wires Stotram verse follow, highlighted scrolling, bounded repeats, and background metadata', () => {
    const screen = fs.readFileSync(path.join(process.cwd(), 'app/bhakti/stotram/[id].tsx'), 'utf8');
    assert.match(screen, /getNextDevotionalRecitationPosition\(/);
    assert.match(screen, /onComplete: finishRecitationCycle/);
    assert.match(screen, /card\.measureLayout\(scrollHandle/);
    assert.match(screen, /backgroundPlayback: true/);
    assert.match(screen, /lockScreenMetadata:/);
    assert.match(screen, /DevotionalListeningControls/);
    assert.doesNotMatch(screen, /daily_sadhana|karmaEarned|japaCount/, 'recitation controls stay separate from practice accounting');
  });

  it('narrates Panchatantra scenes through story completion and stops on its local sleep deadline', () => {
    const story = fs.readFileSync(path.join(process.cwd(), 'components/reader/PanchatantraStorybookView.tsx'), 'utf8');
    const route = fs.readFileSync(path.join(process.cwd(), 'app/bhakti/katha/[id].tsx'), 'utf8');
    assert.match(story, /const nextPage = narrationPageRef\.current \+ 1/);
    assert.match(story, /nextPage >= totalPages/);
    assert.match(story, /isDevotionalSleepTimerExpired/);
    assert.match(story, /DevotionalSleepTimerStrip/);
    assert.match(route, /onComplete,/);
    assert.match(route, /onStopTTS=\{\(\) => \{ void handlers\.stopTTS\(\); \}\}/);
  });
});
