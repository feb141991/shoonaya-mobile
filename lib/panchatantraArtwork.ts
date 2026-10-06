import { ImageSourcePropType } from 'react-native';

// Register image extension handlers in Node.js test environments
if (typeof require !== 'undefined' && require.extensions) {
  if (!require.extensions['.jpg']) {
    require.extensions['.jpg'] = (module, filename) => {
      module.exports = { uri: filename };
    };
  }
  if (!require.extensions['.webp']) {
    require.extensions['.webp'] = (module, filename) => {
      module.exports = { uri: filename };
    };
  }
}

/**
 * Local pre-bundled illustrated artwork assets for Panchatantra fables.
 * Allows zero-latency, 100% offline rendering without network roundtrips.
 */
const LOCAL_PANCHATANTRA_ARTWORK: Record<string, ImageSourcePropType> = {
  'panchatantra-brahmin-and-crooks': require('@/assets/panchatantra/brahmin-crooks-1.webp'),
  'panchatantra-camel-bell': require('@/assets/panchatantra/camel-bell.webp'),
  'panchatantra-clever-hare-and-elephant': require('@/assets/panchatantra/clever-hare-and-elephant.webp'),
  'panchatantra-moon-lake-rabbits': require('@/assets/panchatantra/moon-lake-rabbits.webp'),
  'panchatantra-blue-jackal': require('@/assets/panchatantra/blue-jackal.webp'),
  'panchatantra-lion-and-rabbit': require('@/assets/panchatantra/lion-rabbit-1.webp'),
  'panchatantra-crows-and-cobra': require('@/assets/panchatantra/crows-and-cobra.webp'),
  'panchatantra-mice-and-elephants': require('@/assets/panchatantra/mice-and-elephants.webp'),
  'panchatantra-four-friends': require('@/assets/panchatantra/four-friends.webp'),
  'panchatantra-monkey-and-crocodile': require('@/assets/panchatantra/monkey-and-crocodile.webp'),
  'panchatantra-mongoose-and-child': require('@/assets/panchatantra/mongoose-child-1.webp'),
  'panchatantra-talkative-tortoise': require('@/assets/panchatantra/talkative-tortoise.webp'),
  'panchatantra-dove-king-and-net': require('@/assets/panchatantra/dove-king-1.webp'),
  'panchatantra-foolish-friend-monkey': require('@/assets/panchatantra/foolish-friend-1.webp'),
  'panchatantra-two-fish-and-frog': require('@/assets/panchatantra/two-fish-frog-1.webp'),
  'panchatantra-bird-with-two-heads': require('@/assets/panchatantra/bird-two-heads-1.webp'),
  'panchatantra-crane-and-crab': require('@/assets/panchatantra/crane-crab-1.webp'),
  'panchatantra-merchant-and-iron-balance': require('@/assets/panchatantra/merchant-balance-1.webp'),
  'panchatantra-lion-mouse-and-cat': require('@/assets/panchatantra/lion-mouse-cat-1.webp'),
};

/**
 * Page-by-page dedicated scene illustrations for expanded Panchatantra fables.
 * Each entry provides an array of illustrations matching the 6 progressive scenes of the tale.
 */
const LOCAL_PANCHATANTRA_SCENE_ARTWORK: Record<string, ImageSourcePropType[]> = {
  'panchatantra-blue-jackal': [
    require('@/assets/panchatantra/blue-jackal-1.webp'),
    require('@/assets/panchatantra/blue-jackal-2.webp'),
    require('@/assets/panchatantra/blue-jackal-3.webp'),
    require('@/assets/panchatantra/blue-jackal-4.webp'),
    require('@/assets/panchatantra/blue-jackal-5.webp'),
    require('@/assets/panchatantra/blue-jackal-6.webp'),
  ],
  'panchatantra-brahmin-and-crooks': [
    require('@/assets/panchatantra/brahmin-crooks-1.webp'),
    require('@/assets/panchatantra/brahmin-crooks-2.webp'),
    require('@/assets/panchatantra/brahmin-crooks-3.webp'),
    require('@/assets/panchatantra/brahmin-crooks-4.webp'),
    require('@/assets/panchatantra/brahmin-crooks-5.webp'),
    require('@/assets/panchatantra/brahmin-crooks-6.webp'),
  ],
  'panchatantra-camel-bell': [
    require('@/assets/panchatantra/camel-bell-1.webp'),
    require('@/assets/panchatantra/camel-bell-2.webp'),
    require('@/assets/panchatantra/camel-bell-3.webp'),
    require('@/assets/panchatantra/camel-bell-4.webp'),
    require('@/assets/panchatantra/camel-bell-5.webp'),
    require('@/assets/panchatantra/camel-bell-6.webp'),
  ],
  'panchatantra-clever-hare-and-elephant': [
    require('@/assets/panchatantra/clever-hare-1.webp'),
    require('@/assets/panchatantra/clever-hare-2.webp'),
    require('@/assets/panchatantra/clever-hare-3.webp'),
    require('@/assets/panchatantra/clever-hare-4.webp'),
    require('@/assets/panchatantra/clever-hare-5.webp'),
    require('@/assets/panchatantra/clever-hare-6.webp'),
  ],
  'panchatantra-crows-and-cobra': [
    require('@/assets/panchatantra/crows-cobra-1.webp'),
    require('@/assets/panchatantra/crows-cobra-2.webp'),
    require('@/assets/panchatantra/crows-cobra-3.webp'),
    require('@/assets/panchatantra/crows-cobra-4.webp'),
    require('@/assets/panchatantra/crows-cobra-5.webp'),
    require('@/assets/panchatantra/crows-cobra-6.webp'),
  ],
  'panchatantra-dove-king-and-net': [
    require('@/assets/panchatantra/dove-king-1.webp'),
    require('@/assets/panchatantra/dove-king-2.webp'),
    require('@/assets/panchatantra/dove-king-3.webp'),
    require('@/assets/panchatantra/dove-king-4.webp'),
    require('@/assets/panchatantra/dove-king-5.webp'),
    require('@/assets/panchatantra/dove-king-6.webp'),
  ],
  'panchatantra-foolish-friend-monkey': [
    require('@/assets/panchatantra/foolish-friend-1.webp'),
    require('@/assets/panchatantra/foolish-friend-2.webp'),
    require('@/assets/panchatantra/foolish-friend-3.webp'),
    require('@/assets/panchatantra/foolish-friend-4.webp'),
    require('@/assets/panchatantra/foolish-friend-5.webp'),
    require('@/assets/panchatantra/foolish-friend-6.webp'),
  ],
  'panchatantra-four-friends': [
    require('@/assets/panchatantra/four-friends-1.webp'),
    require('@/assets/panchatantra/four-friends-2.webp'),
    require('@/assets/panchatantra/four-friends-3.webp'),
    require('@/assets/panchatantra/four-friends-4.webp'),
    require('@/assets/panchatantra/four-friends-5.webp'),
    require('@/assets/panchatantra/four-friends-6.webp'),
  ],
  'panchatantra-lion-and-rabbit': [
    require('@/assets/panchatantra/lion-rabbit-1.webp'),
    require('@/assets/panchatantra/lion-rabbit-2.webp'),
    require('@/assets/panchatantra/lion-rabbit-3.webp'),
    require('@/assets/panchatantra/lion-rabbit-4.webp'),
    require('@/assets/panchatantra/lion-rabbit-5.webp'),
    require('@/assets/panchatantra/lion-rabbit-6.webp'),
  ],
  'panchatantra-mice-and-elephants': [
    require('@/assets/panchatantra/mice-elephants-1.webp'),
    require('@/assets/panchatantra/mice-elephants-2.webp'),
    require('@/assets/panchatantra/mice-elephants-3.webp'),
    require('@/assets/panchatantra/mice-elephants-4.webp'),
    require('@/assets/panchatantra/mice-elephants-5.webp'),
    require('@/assets/panchatantra/mice-elephants-6.webp'),
  ],
  'panchatantra-monkey-and-crocodile': [
    require('@/assets/panchatantra/monkey-croc-1.webp'),
    require('@/assets/panchatantra/monkey-croc-2.webp'),
    require('@/assets/panchatantra/monkey-croc-3.webp'),
    require('@/assets/panchatantra/monkey-croc-4.webp'),
    require('@/assets/panchatantra/monkey-croc-5.webp'),
    require('@/assets/panchatantra/monkey-croc-6.webp'),
  ],
  'panchatantra-mongoose-and-child': [
    require('@/assets/panchatantra/mongoose-child-1.webp'),
    require('@/assets/panchatantra/mongoose-child-2.webp'),
    require('@/assets/panchatantra/mongoose-child-3.webp'),
    require('@/assets/panchatantra/mongoose-child-4.webp'),
    require('@/assets/panchatantra/mongoose-child-5.webp'),
    require('@/assets/panchatantra/mongoose-child-6.webp'),
  ],
  'panchatantra-moon-lake-rabbits': [
    require('@/assets/panchatantra/clever-hare-1.webp'),
    require('@/assets/panchatantra/clever-hare-2.webp'),
    require('@/assets/panchatantra/clever-hare-3.webp'),
    require('@/assets/panchatantra/clever-hare-4.webp'),
    require('@/assets/panchatantra/clever-hare-5.webp'),
    require('@/assets/panchatantra/clever-hare-6.webp'),
  ],
  'panchatantra-talkative-tortoise': [
    require('@/assets/panchatantra/talkative-tortoise-1.webp'),
    require('@/assets/panchatantra/talkative-tortoise-2.webp'),
    require('@/assets/panchatantra/talkative-tortoise-3.webp'),
    require('@/assets/panchatantra/talkative-tortoise-4.webp'),
    require('@/assets/panchatantra/talkative-tortoise-5.webp'),
    require('@/assets/panchatantra/talkative-tortoise-6.webp'),
  ],
  'panchatantra-two-fish-and-frog': [
    require('@/assets/panchatantra/two-fish-frog-1.webp'),
    require('@/assets/panchatantra/two-fish-frog-2.webp'),
    require('@/assets/panchatantra/two-fish-frog-3.webp'),
    require('@/assets/panchatantra/two-fish-frog-4.webp'),
    require('@/assets/panchatantra/two-fish-frog-5.webp'),
    require('@/assets/panchatantra/two-fish-frog-6.webp'),
  ],
  'panchatantra-bird-with-two-heads': [
    require('@/assets/panchatantra/bird-two-heads-1.webp'),
    require('@/assets/panchatantra/bird-two-heads-2.webp'),
    require('@/assets/panchatantra/bird-two-heads-3.webp'),
    require('@/assets/panchatantra/bird-two-heads-4.webp'),
    require('@/assets/panchatantra/bird-two-heads-5.webp'),
    require('@/assets/panchatantra/bird-two-heads-6.webp'),
  ],
  'panchatantra-crane-and-crab': [
    require('@/assets/panchatantra/crane-crab-1.webp'),
    require('@/assets/panchatantra/crane-crab-2.webp'),
    require('@/assets/panchatantra/crane-crab-3.webp'),
    require('@/assets/panchatantra/crane-crab-4.webp'),
    require('@/assets/panchatantra/crane-crab-5.webp'),
    require('@/assets/panchatantra/crane-crab-6.webp'),
  ],
  'panchatantra-merchant-and-iron-balance': [
    require('@/assets/panchatantra/merchant-balance-1.webp'),
    require('@/assets/panchatantra/merchant-balance-2.webp'),
    require('@/assets/panchatantra/merchant-balance-3.webp'),
    require('@/assets/panchatantra/merchant-balance-4.webp'),
    require('@/assets/panchatantra/merchant-balance-5.webp'),
    require('@/assets/panchatantra/merchant-balance-6.webp'),
  ],
  'panchatantra-lion-mouse-and-cat': [
    require('@/assets/panchatantra/lion-mouse-cat-1.webp'),
    require('@/assets/panchatantra/lion-mouse-cat-2.webp'),
    require('@/assets/panchatantra/lion-mouse-cat-3.webp'),
    require('@/assets/panchatantra/lion-mouse-cat-4.webp'),
    require('@/assets/panchatantra/lion-mouse-cat-5.webp'),
    require('@/assets/panchatantra/lion-mouse-cat-6.webp'),
  ],
};

/**
 * Resolves the artwork source for a given Panchatantra story.
 * Prioritizes local pre-bundled assets; falls back to cloud CDN if available, or returns null.
 */
export function getPanchatantraArtworkSource(storyId: string): ImageSourcePropType | null {
  if (!storyId) return null;
  const normalizedId = storyId.trim().toLowerCase();
  
  if (LOCAL_PANCHATANTRA_ARTWORK[normalizedId]) {
    return LOCAL_PANCHATANTRA_ARTWORK[normalizedId];
  }

  return null;
}

/**
 * Resolves the page-specific scene illustration for a given story and page index.
 * If a dedicated scene image exists for that page index, it is returned.
 * Otherwise, falls back to the story's master artwork, or null.
 */
export function getPanchatantraSceneArtwork(storyId: string, sceneIndex: number): ImageSourcePropType | null {
  if (!storyId) return null;
  const normalizedId = storyId.trim().toLowerCase();
  const sceneList = LOCAL_PANCHATANTRA_SCENE_ARTWORK[normalizedId];
  if (sceneList && sceneList[sceneIndex]) {
    return sceneList[sceneIndex];
  }
  return getPanchatantraArtworkSource(storyId);
}

/**
 * Returns true if a local artwork asset is available for the given story.
 */
export function hasPanchatantraArtwork(storyId: string): boolean {
  if (!storyId) return false;
  return Boolean(LOCAL_PANCHATANTRA_ARTWORK[storyId.trim().toLowerCase()]);
}

/**
 * Returns true if dedicated scene-by-scene illustrations exist for this story.
 */
export function hasDedicatedSceneArtwork(storyId: string): boolean {
  if (!storyId) return false;
  return Boolean(LOCAL_PANCHATANTRA_SCENE_ARTWORK[storyId.trim().toLowerCase()]);
}

/**
 * Computes the visual tier for a Panchatantra fable:
 * Tier 2 = Has dedicated 6-scene storybook artwork (highest priority)
 * Tier 1 = Has masterwork cover artwork
 * Tier 0 = Manuscript text-only folio
 */
export function getPanchatantraStoryVisualTier(storyId: string): number {
  if (hasDedicatedSceneArtwork(storyId)) return 2;
  if (hasPanchatantraArtwork(storyId)) return 1;
  return 0;
}

/**
 * Sorts an array of Panchatantra stories:
 * Stories with full 6-scene dedicated illustrations appear first (Tier 2),
 * followed by stories with masterwork covers (Tier 1),
 * followed by remaining manuscript fables (Tier 0).
 * Stable sort preserves the catalog order within each tier.
 */
export function sortPanchatantraStoriesByVisualTier<T extends { id: string }>(stories: T[]): T[] {
  return [...stories].sort((a, b) => {
    return getPanchatantraStoryVisualTier(b.id) - getPanchatantraStoryVisualTier(a.id);
  });
}
