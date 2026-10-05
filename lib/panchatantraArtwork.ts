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
  'panchatantra-camel-bell': require('@/assets/panchatantra/camel-bell.jpg'),
  'panchatantra-clever-hare-and-elephant': require('@/assets/panchatantra/clever-hare-and-elephant.jpg'),
  'panchatantra-moon-lake-rabbits': require('@/assets/panchatantra/moon-lake-rabbits.jpg'),
  'panchatantra-blue-jackal': require('@/assets/panchatantra/blue-jackal.jpg'),
  'panchatantra-lion-and-rabbit': require('@/assets/panchatantra/lion-and-rabbit.jpg'),
  'panchatantra-crows-and-cobra': require('@/assets/panchatantra/crows-and-cobra.jpg'),
  'panchatantra-mice-and-elephants': require('@/assets/panchatantra/mice-and-elephants.jpg'),
  'panchatantra-four-friends': require('@/assets/panchatantra/four-friends.jpg'),
  'panchatantra-monkey-and-crocodile': require('@/assets/panchatantra/monkey-and-crocodile.jpg'),
  'panchatantra-talkative-tortoise': require('@/assets/panchatantra/talkative-tortoise.jpg'),
  'panchatantra-dove-king-and-net': require('@/assets/panchatantra/dove-king-and-net.jpg'),
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
 * Returns true if a local artwork asset is available for the given story.
 */
export function hasPanchatantraArtwork(storyId: string): boolean {
  if (!storyId) return false;
  return Boolean(LOCAL_PANCHATANTRA_ARTWORK[storyId.trim().toLowerCase()]);
}
