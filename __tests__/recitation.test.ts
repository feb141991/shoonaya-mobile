import assert from 'node:assert/strict';
import test from 'node:test';

import { nextRecitationStep, nextTrackPlay, REPEAT_OPTIONS } from '../lib/recitation';

function run(start: { verse: number; pass: number }, verses: number, target: number) {
  const played = [start];
  let at: { verse: number; pass: number } | null = start;
  while ((at = nextRecitationStep(at, verses, target))) played.push(at);
  return played;
}

test('repeat options are exactly 1, 11, 21, 108', () => {
  assert.deepEqual([...REPEAT_OPTIONS], [1, 11, 21, 108]);
});

test('one pass plays from the open verse to the last, then stops', () => {
  assert.deepEqual(run({ verse: 2, pass: 1 }, 5, 1).map((p) => p.verse), [2, 3, 4]);
});

test('11 passes of a 5-verse stotram play exactly 55 verses, each later pass from verse 1', () => {
  const played = run({ verse: 0, pass: 1 }, 5, 11);
  assert.equal(played.length, 55);
  assert.equal(played.at(-1)?.pass, 11);
  assert.equal(played.filter((p) => p.verse === 0).length, 11);
});

test('starting mid-way still completes the target number of passes', () => {
  const played = run({ verse: 3, pass: 1 }, 5, 3);
  assert.deepEqual(played.map((p) => `${p.pass}:${p.verse}`), ['1:3', '1:4', '2:0', '2:1', '2:2', '2:3', '2:4', '3:0', '3:1', '3:2', '3:3', '3:4']);
});

test('stop after this recitation ends at the end of the current pass', () => {
  assert.deepEqual(nextRecitationStep({ verse: 3, pass: 2 }, 5, 11, true), { verse: 4, pass: 2 });
  assert.equal(nextRecitationStep({ verse: 4, pass: 2 }, 5, 11, true), null);
});

test('no verses means nothing to play; a target below 1 behaves as 1', () => {
  assert.equal(nextRecitationStep({ verse: 0, pass: 1 }, 0, 11), null);
  assert.equal(nextRecitationStep({ verse: 0, pass: 1 }, 1, 0), null);
});

test('recorded track repeats until the target number of plays', () => {
  const plays = [1];
  let next: number | null = 1;
  while ((next = nextTrackPlay(next, 21))) plays.push(next);
  assert.equal(plays.length, 21);
  assert.equal(nextTrackPlay(3, 21, true), null);
});
