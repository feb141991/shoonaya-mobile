import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getExpandedPanchatantraStory,
  enhanceWithExpandedPanchatantra,
  createOfflinePanchatantraKatha,
} from '../lib/panchatantraExpanded';
import {
  getPanchatantraArtworkSource,
  getPanchatantraSceneArtwork,
  hasPanchatantraArtwork,
  hasDedicatedSceneArtwork,
  getPanchatantraStoryVisualTier,
  sortPanchatantraStoriesByVisualTier,
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

  await t.test('never fabricates a title or moral for an unknown story', () => {
    assert.equal(createOfflinePanchatantraKatha('panchatantra-not-a-real-story'), null);
  });

  await t.test('creates offline fallback katha for zero-network support', () => {
    const offline = createOfflinePanchatantraKatha('panchatantra-moon-lake-rabbits');
    assert.ok(offline, 'Offline katha should be created');
    assert.equal(offline?.title, 'The Rabbits and the Moon Lake');
    assert.equal(offline?.titleHi, 'खरगोश और चंद्र सरोवर');
    assert.ok(offline?.phal && offline.phal !== 'Wisdom from the Panchatantra.', 'moral must be the real one, not a placeholder');
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
    assert.equal(hasPanchatantraArtwork('panchatantra-monkey-and-crocodile'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-talkative-tortoise'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-dove-king-and-net'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-mongoose-and-child'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-foolish-friend-monkey'), true);
    assert.equal(hasPanchatantraArtwork('panchatantra-two-fish-and-frog'), true);

    const source = getPanchatantraArtworkSource('panchatantra-camel-bell');
    assert.ok(source, 'Artwork source should resolve');
    const sourceGond = getPanchatantraArtworkSource('panchatantra-mice-and-elephants');
    assert.ok(sourceGond, 'Gond artwork source should resolve');
    const sourceMoonLake = getPanchatantraArtworkSource('panchatantra-moon-lake-rabbits');
    assert.ok(sourceMoonLake, 'Moon lake artwork source should resolve');
    const sourceMonkey = getPanchatantraArtworkSource('panchatantra-monkey-and-crocodile');
    assert.ok(sourceMonkey, 'Monkey and crocodile artwork should resolve');
    const sourceTortoise = getPanchatantraArtworkSource('panchatantra-talkative-tortoise');
    assert.ok(sourceTortoise, 'Talkative tortoise artwork should resolve');
    const sourceDove = getPanchatantraArtworkSource('panchatantra-dove-king-and-net');
    assert.ok(sourceDove, 'Dove king and net artwork should resolve');
  });

  await t.test('resolves page-by-page dedicated scene artwork for stories with full scene splits', () => {
    const storiesWithScenes = [
      'panchatantra-blue-jackal',
      'panchatantra-brahmin-and-crooks',
      'panchatantra-camel-bell',
      'panchatantra-clever-hare-and-elephant',
      'panchatantra-crows-and-cobra',
      'panchatantra-dove-king-and-net',
      'panchatantra-foolish-friend-monkey',
      'panchatantra-four-friends',
      'panchatantra-lion-and-rabbit',
      'panchatantra-mice-and-elephants',
      'panchatantra-monkey-and-crocodile',
      'panchatantra-mongoose-and-child',
      'panchatantra-moon-lake-rabbits',
      'panchatantra-talkative-tortoise',
      'panchatantra-two-fish-and-frog',
      'panchatantra-bird-with-two-heads',
      'panchatantra-crane-and-crab',
      'panchatantra-merchant-and-iron-balance',
      'panchatantra-lion-mouse-and-cat',
      'panchatantra-jackal-and-drum',
      'panchatantra-fox-and-grapes',
      'panchatantra-ass-in-tiger-skin',
      'panchatantra-greedy-jackal',
      'panchatantra-heron-and-fish',
      'panchatantra-sparrow-and-elephant',
      'panchatantra-king-and-minister',
    ];

    for (const storyId of storiesWithScenes) {
      for (let sceneIndex = 0; sceneIndex < 6; sceneIndex++) {
        const sceneArt = getPanchatantraSceneArtwork(storyId, sceneIndex);
        assert.ok(sceneArt, `Scene ${sceneIndex + 1} artwork must resolve for ${storyId}`);
      }
    }

    // Fallback to master artwork when requested beyond scene splits
    const outOfRangeScene = getPanchatantraSceneArtwork('panchatantra-moon-lake-rabbits', 99);
    assert.equal(outOfRangeScene, getPanchatantraArtworkSource('panchatantra-moon-lake-rabbits'));

    // Nonexistent story returns null
    assert.equal(getPanchatantraSceneArtwork('panchatantra-nonexistent', 0), null);
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

test('Panchatantra detail screen error handling', async (t) => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(process.cwd(), 'app/bhakti/katha/[id].tsx'), 'utf8');

  await t.test('content painted from the bundled snapshot is protected like a cache hit', () => {
    const offlineBlock = src.slice(src.indexOf('createOfflinePanchatantraKatha(id)'));
    assert.match(offlineBlock.slice(0, 260), /hadCache = true/, 'painting offline content must set hadCache');
  });

  await t.test('a Panchatantra story with neither cache nor snapshot still gets the error state', () => {
    assert.doesNotMatch(src, /startsWith\('panchatantra-'\)\) setLoadError/, 'no Panchatantra exemption on setLoadError');
  });
});

test('Panchatantra storybook font scaling controls', async (t) => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(process.cwd(), 'components/reader/PanchatantraStorybookView.tsx'), 'utf8');

  await t.test('provides dedicated -- and ++ font scaling steppers while reading', () => {
    assert.match(src, /accessibilityLabel="Decrease text size \(--\)"/);
    assert.match(src, /accessibilityLabel="Increase text size \(\+\+\)"/);
    assert.match(src, /STORYBOOK_FONT_SCALES/);
    assert.match(src, />\s*--\s*<\/Text>/);
    assert.match(src, />\s*\+\+\s*<\/Text>/);
  });
});

test('Panchatantra story sorting and visual tier priority', async (t) => {
  await t.test('calculates correct visual tier for each fable category', () => {
    // Tier 2: Dedicated 6-scene storybooks
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-blue-jackal'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-brahmin-and-crooks'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-camel-bell'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-clever-hare-and-elephant'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-crows-and-cobra'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-dove-king-and-net'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-foolish-friend-monkey'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-four-friends'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-lion-and-rabbit'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-mice-and-elephants'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-monkey-and-crocodile'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-mongoose-and-child'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-talkative-tortoise'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-two-fish-and-frog'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-moon-lake-rabbits'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-bird-with-two-heads'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-crane-and-crab'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-merchant-and-iron-balance'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-lion-mouse-and-cat'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-jackal-and-drum'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-fox-and-grapes'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-ass-in-tiger-skin'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-greedy-jackal'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-heron-and-fish'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-sparrow-and-elephant'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-king-and-minister'), 2);

    // Tier 0: Manuscript folios without local art
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-cat-as-judge'), 0);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-nonexistent'), 0);
  });

  await t.test('sorts stories so full scene storybooks appear first, then manuscript', () => {
    const mixed = [
      { id: 'panchatantra-cat-as-judge', title: 'The Cat as Judge' },
      { id: 'panchatantra-dove-king-and-net', title: 'The Dove King and the Net' },
      { id: 'panchatantra-wedge-pulling-monkey', title: 'Wedge Pulling Monkey' },
      { id: 'panchatantra-lion-and-rabbit', title: 'The Lion and the Rabbit' },
      { id: 'panchatantra-moon-lake-rabbits', title: 'Moon Lake Rabbits' },
    ];

    const sorted = sortPanchatantraStoriesByVisualTier(mixed);

    // Tier 2 items must appear at indices 0, 1, and 2
    assert.equal(sorted[0].id, 'panchatantra-dove-king-and-net');
    assert.equal(sorted[1].id, 'panchatantra-lion-and-rabbit');
    assert.equal(sorted[2].id, 'panchatantra-moon-lake-rabbits');

    // Tier 0 items must follow at indices 3 and 4
    assert.equal(sorted[3].id, 'panchatantra-cat-as-judge');
    assert.equal(sorted[4].id, 'panchatantra-wedge-pulling-monkey');
  });

  await t.test('katha.tsx integrates visual tier sorting and thumbnail priority for Story of the Day', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const src = fs.readFileSync(path.join(process.cwd(), 'app/bhakti/katha.tsx'), 'utf8');

    assert.match(src, /sortPanchatantraStoriesByVisualTier/);
    assert.match(src, /const sortedKathas = useMemo/);
    assert.match(src, /Story of the Day • 6 Scenes/);
    assert.match(src, /Read Storybook/);
  });
});

test('King and Wise Minister story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-king-and-minister');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-king-and-minister'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-king-and-minister'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-king-and-minister', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});
