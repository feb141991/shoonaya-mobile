import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getExpandedPanchatantraStory,
  enhanceWithExpandedPanchatantra,
  createOfflinePanchatantraKatha,
} from '../lib/panchatantraExpanded';
import {
  getPanchatantraArtworkSource,
  hasPanchatantraArtwork,
} from '../lib/panchatantraArtwork';

test('Panchatantra Expanded Content Integration', async (t) => {
  await t.test('retrieves 6-paragraph expanded content for camel-bell', () => {
    const story = getExpandedPanchatantraStory('panchatantra-camel-bell');
    assert.ok(story, 'Story should exist in expanded snapshot');
    assert.equal(story?.id, 'panchatantra-camel-bell');
    assert.equal(story?.portrait, '🔔');
    assert.equal(story?.durationMin, 5);
    assert.equal(story?.body.length, 6, 'English body must have 6 paragraphs');
    assert.equal(story?.bodyHi.length, 6, 'Hindi body must have 6 paragraphs');
  });

  await t.test('enhances brief katha with full 6-paragraph expansion', () => {
    const briefKatha: {
      id: string;
      title: string;
      body: string[];
      bodyHi?: string[];
      portrait?: string;
      durationMin: number;
    } = {
      id: 'panchatantra-camel-bell',
      title: 'The Camel with the Bell',
      body: ['Brief paragraph 1', 'Brief paragraph 2'],
      durationMin: 2,
    };

    const enhanced = enhanceWithExpandedPanchatantra(briefKatha);
    assert.equal(enhanced.body.length, 6, 'Enhanced katha must have 6 paragraphs');
    assert.equal(enhanced.bodyHi?.length, 6, 'Enhanced katha must include 6 Hindi paragraphs');
    assert.equal(enhanced.portrait, '🔔');
    assert.equal(enhanced.durationMin, 5);
  });

  await t.test('leaves non-Panchatantra katha intact without errors', () => {
    const regularKatha = {
      id: 'katha-ekadashi-mokshada',
      title: 'Mokshada Ekadashi',
      body: ['Paragraph 1', 'Paragraph 2'],
      durationMin: 4,
    };

    const result = enhanceWithExpandedPanchatantra(regularKatha);
    assert.equal(result.body.length, 2);
    assert.equal(result.durationMin, 4);
  });

  await t.test('creates offline fallback katha for zero-network support', () => {
    const offline = createOfflinePanchatantraKatha('panchatantra-moon-lake-rabbits');
    assert.ok(offline, 'Offline katha should be created');
    assert.equal(offline?.title, 'Moon Lake Rabbits');
    assert.equal(offline?.body.length, 6);
    assert.equal(offline?.bodyHi?.length, 6);
    assert.equal(offline?.portrait, '🌕');
  });
});

test('Panchatantra Artwork Resolution', async (t) => {
  await t.test('resolves local bundled artwork for core stories', () => {
    assert.equal(hasPanchatantraArtwork('panchatantra-camel-bell'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-clever-hare-and-elephant'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-blue-jackal'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-lion-and-rabbit'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-crows-and-cobra'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-mice-and-elephants'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-moon-lake-rabbits'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-four-friends'), true);

    const source = getPanchatantraArtworkSource('panchatantra-camel-bell');
    assert.ok(source, 'Artwork source should resolve');
    const sourceGond = getPanchatantraArtworkSource('panchatantra-mice-and-elephants');
    assert.ok(sourceGond, 'Gond artwork source should resolve');
    const sourceMoonLake = getPanchatantraArtworkSource('panchatantra-moon-lake-rabbits');
    assert.ok(sourceMoonLake, 'Moon lake artwork source should resolve');
  });

  await t.test('returns null gracefully for stories without local artwork', () => {
    assert.equal(hasPanchatantraArtwork('panchatantra-nonexistent-story'), false);
    assert.equal(getPanchatantraArtworkSource('panchatantra-nonexistent-story'), null);
  });
});

test('Panchatantra Full 98-Story Catalog Snapshot Integrity', async (t) => {
  const snapshot = require('../assets/data/panchatantra-expanded-snapshot.json');

  await t.test('contains all 98 stories in expanded snapshot', () => {
    assert.equal(snapshot.length, 98, 'Snapshot must contain exactly 98 stories');
  });

  await t.test('every story meets 6-paragraph bilingual and portrait standards', () => {
    snapshot.forEach((story: any) => {
      assert.ok(story.id, 'Story must have an id');
      assert.ok(story.portrait, `Story ${story.id} must have a portrait emoji`);
      assert.equal(story.durationMin, 5, `Story ${story.id} must have durationMin: 5`);
      assert.equal(story.body.length, 6, `Story ${story.id} must have exactly 6 English paragraphs`);
      assert.equal(story.bodyHi.length, 6, `Story ${story.id} must have exactly 6 Hindi paragraphs`);
    });
  });

  await t.test('enhances Batch 4 and Batch 5 stories correctly', () => {
    const storyB4 = getExpandedPanchatantraStory('panchatantra-wedge-pulling-monkey');
    assert.ok(storyB4);
    assert.equal(storyB4?.portrait, '🐒');
    assert.equal(storyB4?.body.length, 6);
    assert.equal(storyB4?.bodyHi.length, 6);

    const storyB5 = getExpandedPanchatantraStory('panchatantra-results-of-education');
    assert.ok(storyB5);
    assert.equal(storyB5?.portrait, '✨');
    assert.equal(storyB5?.body.length, 6);
    assert.equal(storyB5?.bodyHi.length, 6);
  });
});
