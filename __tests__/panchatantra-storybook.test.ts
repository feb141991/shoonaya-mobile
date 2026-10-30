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
      'panchatantra-owl-and-crows',
      'panchatantra-golden-dropping-bird',
      'panchatantra-weaver-as-vishnu',
      'panchatantra-cat-as-judge',
      'panchatantra-donkey-and-jackal',
      'panchatantra-potter-as-warrior',
      'panchatantra-greedy-brahmin-dream',
      'panchatantra-snake-and-frogs',
      'panchatantra-lion-makers',
      'panchatantra-sage-and-mouse',
      'panchatantra-three-fish',
      'panchatantra-dharmabuddhi-papabuddhi',
      'panchatantra-musical-donkey',
      'panchatantra-monk-and-jackal',
      'panchatantra-lion-and-bull',
      'panchatantra-hunter-and-pigeons',
      'panchatantra-four-treasure-seekers',
      'panchatantra-raven-and-swan',
      'panchatantra-golds-gloom',
      'panchatantra-mother-shandilees-bargain',
      'panchatantra-self-defeating-forethought',
      'panchatantra-mister-duly',
      'panchatantra-soft-the-weaver',
      'panchatantra-hang-ball-and-greedy',
      'panchatantra-spots-captivity',
      'panchatantra-hundred-wit-thousand-wit-single-wit',
      'panchatantra-slow-the-weaver',
      'panchatantra-unforgiving-monkey',
      'panchatantra-credulous-fiend',
      'panchatantra-three-breasted-princess',
      'panchatantra-fiend-who-washed-his-feet',
      'panchatantra-handsome-and-theodore',
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

  await t.test('integrates 3.5s auto-hide chrome controller for obstacle-free full screen reading', () => {
    assert.match(src, /createReaderChromeController/);
    assert.match(src, /chrome\.start\(\)/);
    assert.match(src, /controlsProgress/);
    assert.match(src, /onTouchStart=\{onScreenTouchStart\}/);
    assert.match(src, /onTouchEnd=\{onScreenTouchEnd\}/);
  });

  await t.test('provides Dharm Veer styled small buttons and pin toggle', () => {
    assert.match(src, /readerControlsPalette/);
    assert.match(src, /dharmBtnSmall/);
    assert.match(src, /dharmBtnSmallInner/);
    assert.match(src, /capsuleBar/);
    assert.match(src, /name=\{pinned \? "minimize-2" : "maximize-2"\}/);
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
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-owl-and-crows'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-golden-dropping-bird'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-weaver-as-vishnu'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-cat-as-judge'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-donkey-and-jackal'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-potter-as-warrior'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-greedy-brahmin-dream'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-snake-and-frogs'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-lion-makers'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-sage-and-mouse'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-three-fish'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-dharmabuddhi-papabuddhi'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-musical-donkey'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-monk-and-jackal'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-lion-and-bull'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-hunter-and-pigeons'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-four-treasure-seekers'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-raven-and-swan'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-golds-gloom'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-mother-shandilees-bargain'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-self-defeating-forethought'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-mister-duly'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-soft-the-weaver'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-hang-ball-and-greedy'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-spots-captivity'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-hundred-wit-thousand-wit-single-wit'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-slow-the-weaver'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-unforgiving-monkey'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-credulous-fiend'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-three-breasted-princess'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-fiend-who-washed-his-feet'), 2);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-handsome-and-theodore'), 2);

    // Tier 0: Manuscript folios without local art
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-wedge-pulling-monkey'), 0);
    assert.equal(getPanchatantraStoryVisualTier('panchatantra-nonexistent'), 0);
  });

  await t.test('sorts stories so full scene storybooks appear first, then manuscript', () => {
    const mixed = [
      { id: 'panchatantra-wedge-pulling-monkey', title: 'Wedge Pulling Monkey' },
      { id: 'panchatantra-monk-and-jackal', title: 'The Monk and the Jackal' },
      { id: 'panchatantra-dove-king-and-net', title: 'The Dove King and the Net' },
      { id: 'panchatantra-fiend-who-washed-his-feet', title: "The Fiend Who Washed His Feet" },
      { id: 'panchatantra-musical-donkey', title: 'The Musical Donkey' },
      { id: 'panchatantra-lion-and-rabbit', title: 'The Lion and the Rabbit' },
    ];

    const sorted = sortPanchatantraStoriesByVisualTier(mixed);

    // Tier 2 items must appear at indices 0, 1, 2, 3, and 4
    assert.equal(sorted[0].id, 'panchatantra-monk-and-jackal');
    assert.equal(sorted[1].id, 'panchatantra-dove-king-and-net');
    assert.equal(sorted[2].id, 'panchatantra-fiend-who-washed-his-feet');
    assert.equal(sorted[3].id, 'panchatantra-musical-donkey');
    assert.equal(sorted[4].id, 'panchatantra-lion-and-rabbit');

    // Tier 0 item must follow at index 5
    assert.equal(sorted[5].id, 'panchatantra-wedge-pulling-monkey');
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

test('The Owls and the Crows story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-owl-and-crows');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-owl-and-crows'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-owl-and-crows'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-owl-and-crows', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Bird with Golden Droppings story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-golden-dropping-bird');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-golden-dropping-bird'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-golden-dropping-bird'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-golden-dropping-bird', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Weaver Who Pretended to Be Vishnu story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-weaver-as-vishnu');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-weaver-as-vishnu'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-weaver-as-vishnu'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-weaver-as-vishnu', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Cat as Judge story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-cat-as-judge');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-cat-as-judge'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-cat-as-judge'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-cat-as-judge', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Donkey and the Jackal story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-donkey-and-jackal');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-donkey-and-jackal'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-donkey-and-jackal'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-donkey-and-jackal', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});


test('The Snake Who Carried Frogs story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-snake-and-frogs');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-snake-and-frogs'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-snake-and-frogs'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-snake-and-frogs', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Scholars Who Made a Lion story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-lion-makers');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-lion-makers'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-lion-makers'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-lion-makers', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Sage and the Mouse story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-sage-and-mouse');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-sage-and-mouse'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-sage-and-mouse'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-sage-and-mouse', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Three Fish story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-three-fish');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-three-fish'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-three-fish'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-three-fish', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('Dharmabuddhi and Papabuddhi story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-dharmabuddhi-papabuddhi');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-dharmabuddhi-papabuddhi'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-dharmabuddhi-papabuddhi'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-dharmabuddhi-papabuddhi', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Musical Donkey story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-musical-donkey');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-musical-donkey'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-musical-donkey'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-musical-donkey', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Monk and the Jackal story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-monk-and-jackal');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-monk-and-jackal'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-monk-and-jackal'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-monk-and-jackal', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Lion and the Bull story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-lion-and-bull');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-lion-and-bull'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-lion-and-bull'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-lion-and-bull', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});


test('The Hunter and the Pigeons story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-hunter-and-pigeons');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-hunter-and-pigeons'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-hunter-and-pigeons'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-hunter-and-pigeons', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Four Treasure-Seekers story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-four-treasure-seekers');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-four-treasure-seekers'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-four-treasure-seekers'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-four-treasure-seekers', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});


test('The Raven and the Swan story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-raven-and-swan');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-raven-and-swan'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-raven-and-swan'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-raven-and-swan', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test("Gold's Gloom story uses six paragraph-aligned offline scenes", () => {
  const story = getExpandedPanchatantraStory('panchatantra-golds-gloom');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-golds-gloom'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-golds-gloom'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-golds-gloom', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test("Mother Shandilee's Bargain story uses six paragraph-aligned offline scenes", () => {
  const story = getExpandedPanchatantraStory('panchatantra-mother-shandilees-bargain');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-mother-shandilees-bargain'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-mother-shandilees-bargain'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-mother-shandilees-bargain', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('Self-Defeating Forethought story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-self-defeating-forethought');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-self-defeating-forethought'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-self-defeating-forethought'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-self-defeating-forethought', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('Mister Duly story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-mister-duly');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-mister-duly'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-mister-duly'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-mister-duly', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('Soft the Weaver story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-soft-the-weaver');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-soft-the-weaver'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-soft-the-weaver'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-soft-the-weaver', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('Hang-Ball and Greedy story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-hang-ball-and-greedy');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-hang-ball-and-greedy'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-hang-ball-and-greedy'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-hang-ball-and-greedy', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test("Spot's Captivity story uses six paragraph-aligned offline scenes", () => {
  const story = getExpandedPanchatantraStory('panchatantra-spots-captivity');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-spots-captivity'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-spots-captivity'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-spots-captivity', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('Hundred-Wit, Thousand-Wit, and Single-Wit story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-hundred-wit-thousand-wit-single-wit');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-hundred-wit-thousand-wit-single-wit'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-hundred-wit-thousand-wit-single-wit'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-hundred-wit-thousand-wit-single-wit', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('Slow the Weaver story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-slow-the-weaver');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-slow-the-weaver'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-slow-the-weaver'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-slow-the-weaver', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Unforgiving Monkey story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-unforgiving-monkey');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-unforgiving-monkey'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-unforgiving-monkey'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-unforgiving-monkey', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Credulous Fiend story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-credulous-fiend');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-credulous-fiend'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-credulous-fiend'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-credulous-fiend', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Three-Breasted Princess story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-three-breasted-princess');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-three-breasted-princess'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-three-breasted-princess'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-three-breasted-princess', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('The Fiend Who Washed His Feet story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-fiend-who-washed-his-feet');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-fiend-who-washed-his-feet'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-fiend-who-washed-his-feet'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-fiend-who-washed-his-feet', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});

test('Handsome and Theodore story uses six paragraph-aligned offline scenes', () => {
  const story = getExpandedPanchatantraStory('panchatantra-handsome-and-theodore');
  assert.ok(story);
  assert.equal(story?.body.length, 6);
  assert.equal(hasPanchatantraArtwork('panchatantra-handsome-and-theodore'), true);
  assert.equal(hasDedicatedSceneArtwork('panchatantra-handsome-and-theodore'), true);
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex += 1) {
    assert.ok(getPanchatantraSceneArtwork('panchatantra-handsome-and-theodore', sceneIndex), `scene ${sceneIndex + 1} should resolve offline`);
  }
});
