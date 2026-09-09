import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sortLiveStreamsByTradition, type LiveStream } from '../lib/live-darshan';

const MOCK_STREAMS: LiveStream[] = [
  {
    id: 'stream-1',
    title: 'Somnath Temple',
    location: 'Gujarat, India',
    schedule: 'Daily 06:00 - 22:00',
    category: 'mandir',
    tradition: 'hindu',
    youtubeVideoId: 'somnath123',
  },
  {
    id: 'stream-2',
    title: 'Golden Temple (Harmandir Sahib)',
    location: 'Amritsar, Punjab',
    schedule: 'Daily 03:00 - 22:00',
    category: 'mandir',
    tradition: 'sikh',
    youtubeVideoId: 'goldentemple123',
  },
  {
    id: 'stream-3',
    title: 'Mahabodhi Temple',
    location: 'Bodh Gaya, Bihar',
    schedule: 'Daily 05:00 - 21:00',
    category: 'mandir',
    tradition: 'buddhist',
    youtubeVideoId: 'mahabodhi123',
  },
  {
    id: 'stream-4',
    title: 'Palitana Shatrunjaya',
    location: 'Palitana, Gujarat',
    schedule: 'Daily 06:00 - 18:00',
    category: 'mandir',
    tradition: 'jain',
    youtubeVideoId: 'palitana123',
  },
  {
    id: 'stream-5',
    title: 'Kashi Vishwanath Temple',
    location: 'Varanasi, UP',
    schedule: 'Daily 04:00 - 23:00',
    category: 'mandir',
    tradition: 'hindu',
    youtubeVideoId: 'kashi123',
  },
];

describe('sortLiveStreamsByTradition', () => {
  it('places Sikh streams first when user tradition is sikh', () => {
    const sorted = sortLiveStreamsByTradition(MOCK_STREAMS, 'sikh');
    assert.equal(sorted[0].id, 'stream-2');
    assert.equal(sorted[0].tradition, 'sikh');
    // Remaining streams preserve their relative order
    const remainingIds = sorted.slice(1).map((s) => s.id);
    assert.deepEqual(remainingIds, ['stream-1', 'stream-3', 'stream-4', 'stream-5']);
  });

  it('places Jain streams first when user tradition is jain', () => {
    const sorted = sortLiveStreamsByTradition(MOCK_STREAMS, 'jain');
    assert.equal(sorted[0].id, 'stream-4');
    assert.equal(sorted[0].tradition, 'jain');
    const remainingIds = sorted.slice(1).map((s) => s.id);
    assert.deepEqual(remainingIds, ['stream-1', 'stream-2', 'stream-3', 'stream-5']);
  });

  it('places Buddhist streams first when user tradition is buddhist', () => {
    const sorted = sortLiveStreamsByTradition(MOCK_STREAMS, 'buddhist');
    assert.equal(sorted[0].id, 'stream-3');
    assert.equal(sorted[0].tradition, 'buddhist');
    const remainingIds = sorted.slice(1).map((s) => s.id);
    assert.deepEqual(remainingIds, ['stream-1', 'stream-2', 'stream-4', 'stream-5']);
  });

  it('places Hindu streams first when user tradition is hindu', () => {
    const sorted = sortLiveStreamsByTradition(MOCK_STREAMS, 'hindu');
    const hinduIds = sorted.filter((s) => s.tradition === 'hindu').map((s) => s.id);
    assert.deepEqual(hinduIds, ['stream-1', 'stream-5']);
    assert.equal(sorted[0].id, 'stream-1');
    assert.equal(sorted[1].id, 'stream-5');
    const nonHinduIds = sorted.slice(2).map((s) => s.id);
    assert.deepEqual(nonHinduIds, ['stream-2', 'stream-3', 'stream-4']);
  });

  it('handles case insensitivity and whitespace', () => {
    const sorted = sortLiveStreamsByTradition(MOCK_STREAMS, '  SIKH  ');
    assert.equal(sorted[0].id, 'stream-2');
  });

  it('returns original array when tradition is null, undefined, all, or neutral', () => {
    assert.deepEqual(sortLiveStreamsByTradition(MOCK_STREAMS, null), MOCK_STREAMS);
    assert.deepEqual(sortLiveStreamsByTradition(MOCK_STREAMS, undefined), MOCK_STREAMS);
    assert.deepEqual(sortLiveStreamsByTradition(MOCK_STREAMS, 'all'), MOCK_STREAMS);
    assert.deepEqual(sortLiveStreamsByTradition(MOCK_STREAMS, 'neutral'), MOCK_STREAMS);
  });
});
