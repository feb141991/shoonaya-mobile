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
 * Local pre-bundled high-resolution classical artwork assets for core Dharm Veer heroes.
 * Allows zero-latency, 100% offline rendering without network roundtrips.
 */
const LOCAL_DHARM_VEER_ARTWORK: Record<string, ImageSourcePropType> = {
  'sri-krishna': require('@/assets/dharm-veer/sri-krishna.jpg'),
  'sri-rama': require('@/assets/dharm-veer/sri-rama.jpg'),
  'arjuna': require('@/assets/dharm-veer/arjuna.jpg'),
  'chanakya': require('@/assets/dharm-veer/chanakya.jpg'),
};

/**
 * Resolves the artwork source for a given Dharm Veer hero.
 * Prioritizes local pre-bundled assets; falls back to cloud CDN if available, or returns null.
 */
export function getDharmVeerArtworkSource(heroId: string): ImageSourcePropType | null {
  if (!heroId) return null;
  const normalizedId = heroId.trim().toLowerCase();
  
  if (LOCAL_DHARM_VEER_ARTWORK[normalizedId]) {
    return LOCAL_DHARM_VEER_ARTWORK[normalizedId];
  }

  return null;
}

/**
 * Returns true if a high-resolution local artwork asset is available for the given hero.
 */
export function hasDharmVeerArtwork(heroId: string): boolean {
  if (!heroId) return false;
  return Boolean(LOCAL_DHARM_VEER_ARTWORK[heroId.trim().toLowerCase()]);
}
