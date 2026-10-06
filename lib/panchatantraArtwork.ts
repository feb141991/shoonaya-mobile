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
  'panchatantra-brahmin-and-crooks': require('@/assets/panchatantra/brahmin-crooks-1.jpg'),
  'panchatantra-camel-bell': require('@/assets/panchatantra/camel-bell.jpg'),
  'panchatantra-clever-hare-and-elephant': require('@/assets/panchatantra/clever-hare-and-elephant.jpg'),
  'panchatantra-moon-lake-rabbits': require('@/assets/panchatantra/moon-lake-rabbits.jpg'),
  'panchatantra-blue-jackal': require('@/assets/panchatantra/blue-jackal.jpg'),
  'panchatantra-lion-and-rabbit': require('@/assets/panchatantra/lion-rabbit-1.jpg'),
  'panchatantra-crows-and-cobra': require('@/assets/panchatantra/crows-and-cobra.jpg'),
  'panchatantra-mice-and-elephants': require('@/assets/panchatantra/mice-and-elephants.jpg'),
  'panchatantra-four-friends': require('@/assets/panchatantra/four-friends.jpg'),
  'panchatantra-monkey-and-crocodile': require('@/assets/panchatantra/monkey-and-crocodile.jpg'),
  'panchatantra-mongoose-and-child': require('@/assets/panchatantra/mongoose-child-1.jpg'),
  'panchatantra-talkative-tortoise': require('@/assets/panchatantra/talkative-tortoise.jpg'),
  'panchatantra-dove-king-and-net': require('@/assets/panchatantra/dove-king-1.jpg'),
  'panchatantra-foolish-friend-monkey': require('@/assets/panchatantra/foolish-friend-1.jpg'),
  'panchatantra-two-fish-and-frog': require('@/assets/panchatantra/two-fish-frog-1.jpg'),
};

/**
 * Page-by-page dedicated scene illustrations for expanded Panchatantra fables.
 * Each entry provides an array of illustrations matching the 6 progressive scenes of the tale.
 */
const LOCAL_PANCHATANTRA_SCENE_ARTWORK: Record<string, ImageSourcePropType[]> = {
  'panchatantra-blue-jackal': [
    require('@/assets/panchatantra/blue-jackal-1.jpg'),
    require('@/assets/panchatantra/blue-jackal-2.jpg'),
    require('@/assets/panchatantra/blue-jackal-3.jpg'),
    require('@/assets/panchatantra/blue-jackal-4.jpg'),
    require('@/assets/panchatantra/blue-jackal-5.jpg'),
    require('@/assets/panchatantra/blue-jackal-6.jpg'),
  ],
  'panchatantra-brahmin-and-crooks': [
    require('@/assets/panchatantra/brahmin-crooks-1.jpg'),
    require('@/assets/panchatantra/brahmin-crooks-2.jpg'),
    require('@/assets/panchatantra/brahmin-crooks-3.jpg'),
    require('@/assets/panchatantra/brahmin-crooks-4.jpg'),
    require('@/assets/panchatantra/brahmin-crooks-5.jpg'),
    require('@/assets/panchatantra/brahmin-crooks-6.jpg'),
  ],
  'panchatantra-camel-bell': [
    require('@/assets/panchatantra/camel-bell-1.jpg'),
    require('@/assets/panchatantra/camel-bell-2.jpg'),
    require('@/assets/panchatantra/camel-bell-3.jpg'),
    require('@/assets/panchatantra/camel-bell-4.jpg'),
    require('@/assets/panchatantra/camel-bell-5.jpg'),
    require('@/assets/panchatantra/camel-bell-6.jpg'),
  ],
  'panchatantra-clever-hare-and-elephant': [
    require('@/assets/panchatantra/clever-hare-1.jpg'),
    require('@/assets/panchatantra/clever-hare-2.jpg'),
    require('@/assets/panchatantra/clever-hare-3.jpg'),
    require('@/assets/panchatantra/clever-hare-4.jpg'),
    require('@/assets/panchatantra/clever-hare-5.jpg'),
    require('@/assets/panchatantra/clever-hare-6.jpg'),
  ],
  'panchatantra-crows-and-cobra': [
    require('@/assets/panchatantra/crows-cobra-1.jpg'),
    require('@/assets/panchatantra/crows-cobra-2.jpg'),
    require('@/assets/panchatantra/crows-cobra-3.jpg'),
    require('@/assets/panchatantra/crows-cobra-4.jpg'),
    require('@/assets/panchatantra/crows-cobra-5.jpg'),
    require('@/assets/panchatantra/crows-cobra-6.jpg'),
  ],
  'panchatantra-dove-king-and-net': [
    require('@/assets/panchatantra/dove-king-1.jpg'),
    require('@/assets/panchatantra/dove-king-2.jpg'),
    require('@/assets/panchatantra/dove-king-3.jpg'),
    require('@/assets/panchatantra/dove-king-4.jpg'),
    require('@/assets/panchatantra/dove-king-5.jpg'),
    require('@/assets/panchatantra/dove-king-6.jpg'),
  ],
  'panchatantra-foolish-friend-monkey': [
    require('@/assets/panchatantra/foolish-friend-1.jpg'),
    require('@/assets/panchatantra/foolish-friend-2.jpg'),
    require('@/assets/panchatantra/foolish-friend-3.jpg'),
    require('@/assets/panchatantra/foolish-friend-4.jpg'),
    require('@/assets/panchatantra/foolish-friend-5.jpg'),
    require('@/assets/panchatantra/foolish-friend-6.jpg'),
  ],
  'panchatantra-four-friends': [
    require('@/assets/panchatantra/four-friends-1.jpg'),
    require('@/assets/panchatantra/four-friends-2.jpg'),
    require('@/assets/panchatantra/four-friends-3.jpg'),
    require('@/assets/panchatantra/four-friends-4.jpg'),
    require('@/assets/panchatantra/four-friends-5.jpg'),
    require('@/assets/panchatantra/four-friends-6.jpg'),
  ],
  'panchatantra-lion-and-rabbit': [
    require('@/assets/panchatantra/lion-rabbit-1.jpg'),
    require('@/assets/panchatantra/lion-rabbit-2.jpg'),
    require('@/assets/panchatantra/lion-rabbit-3.jpg'),
    require('@/assets/panchatantra/lion-rabbit-4.jpg'),
    require('@/assets/panchatantra/lion-rabbit-5.jpg'),
    require('@/assets/panchatantra/lion-rabbit-6.jpg'),
  ],
  'panchatantra-mice-and-elephants': [
    require('@/assets/panchatantra/mice-elephants-1.jpg'),
    require('@/assets/panchatantra/mice-elephants-2.jpg'),
    require('@/assets/panchatantra/mice-elephants-3.jpg'),
    require('@/assets/panchatantra/mice-elephants-4.jpg'),
    require('@/assets/panchatantra/mice-elephants-5.jpg'),
    require('@/assets/panchatantra/mice-elephants-6.jpg'),
  ],
  'panchatantra-monkey-and-crocodile': [
    require('@/assets/panchatantra/monkey-croc-1.jpg'),
    require('@/assets/panchatantra/monkey-croc-2.jpg'),
    require('@/assets/panchatantra/monkey-croc-3.jpg'),
    require('@/assets/panchatantra/monkey-croc-4.jpg'),
    require('@/assets/panchatantra/monkey-croc-5.jpg'),
    require('@/assets/panchatantra/monkey-croc-6.jpg'),
  ],
  'panchatantra-mongoose-and-child': [
    require('@/assets/panchatantra/mongoose-child-1.jpg'),
    require('@/assets/panchatantra/mongoose-child-2.jpg'),
    require('@/assets/panchatantra/mongoose-child-3.jpg'),
    require('@/assets/panchatantra/mongoose-child-4.jpg'),
    require('@/assets/panchatantra/mongoose-child-5.jpg'),
    require('@/assets/panchatantra/mongoose-child-6.jpg'),
  ],
  'panchatantra-talkative-tortoise': [
    require('@/assets/panchatantra/talkative-tortoise-1.jpg'),
    require('@/assets/panchatantra/talkative-tortoise-2.jpg'),
    require('@/assets/panchatantra/talkative-tortoise-3.jpg'),
    require('@/assets/panchatantra/talkative-tortoise-4.jpg'),
    require('@/assets/panchatantra/talkative-tortoise-5.jpg'),
    require('@/assets/panchatantra/talkative-tortoise-6.jpg'),
  ],
  'panchatantra-two-fish-and-frog': [
    require('@/assets/panchatantra/two-fish-frog-1.jpg'),
    require('@/assets/panchatantra/two-fish-frog-2.jpg'),
    require('@/assets/panchatantra/two-fish-frog-3.jpg'),
    require('@/assets/panchatantra/two-fish-frog-4.jpg'),
    require('@/assets/panchatantra/two-fish-frog-5.jpg'),
    require('@/assets/panchatantra/two-fish-frog-6.jpg'),
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
