import AsyncStorage from '@react-native-async-storage/async-storage';

// Register .webp extension handler in Node.js test environments
if (typeof require !== 'undefined' && require.extensions && !require.extensions['.webp']) {
  require.extensions['.webp'] = (module: any, filename: string) => {
    module.exports = { uri: filename };
  };
}

// The user's Home hero backdrop pick & size preference — mirrors the PWA's own
// `localStorage`-only `shoonaya_hero_pick` (src/app/(main)/home/sections/
// HeroSection.tsx): device-local only, no `profiles` column, so growing
// the picker's theme pool never costs per-user DB storage. Native stores
// the resolved image/position alongside the id (not just the id) so Home
// can apply the override immediately on mount without an extra round trip
// to /api/native/hero-themes just to look the id back up.
const HERO_PICK_KEY = 'shoonaya_hero_pick';
const HERO_SIZE_KEY = 'shoonaya_hero_size';

export type HeroPick = {
  id: string;
  imageUrl: string;
  objectPosition?: string;
};

export type HeroSize = 'standard' | 'expanded' | 'immersive';

export type HeroSizeDetails = {
  label: string;
  description: string;
  height: number;
  readabilityHeight: number;
};

export const HERO_SIZE_CONFIG: Record<HeroSize, HeroSizeDetails> = {
  standard: {
    label: 'Standard',
    description: 'Balanced view',
    height: 420,
    readabilityHeight: 242,
  },
  expanded: {
    label: 'Expanded',
    description: 'More room for artwork',
    height: 525,
    readabilityHeight: 303,
  },
  immersive: {
    label: 'Immersive',
    description: 'Largest sanctuary view',
    height: 630,
    readabilityHeight: 363,
  },
};

export const DEFAULT_HERO_SIZE: HeroSize = 'standard';

export const LOCAL_HERO_ASSETS: Record<string, any> = {
  'shiva-golden-silhouette': require('@/assets/heroes/hindu/shiva-golden-silhouette.webp'),
  'shiva-moonlit-kedar': require('@/assets/heroes/hindu/shiva-moonlit-kedar.webp'),
  'shiva-dhyana-dawn': require('@/assets/heroes/hindu/shiva-dhyana-dawn.webp'),
  'shiva-cosmic-dhyana': require('@/assets/heroes/hindu/shiva-cosmic-dhyana.webp'),
  'shiva-sacred-fresco': require('@/assets/heroes/hindu/shiva-sacred-fresco.webp'),
  'hanuman-sanjeevani-mountain': require('@/assets/heroes/hindu/hanuman-sanjeevani-mountain.webp'),
  'hanuman-bal-roop': require('@/assets/heroes/hindu/hanuman-bal-roop.webp'),
  'hanuman-temple-blessing': require('@/assets/heroes/hindu/hanuman-temple-blessing.webp'),
  'hanuman-forest-dhyana': require('@/assets/heroes/hindu/hanuman-forest-dhyana.webp'),
  'hanuman-sita-ram-darshan': require('@/assets/heroes/hindu/hanuman-sita-ram-darshan.webp'),
  'krishna-cosmic-flute': require('@/assets/heroes/hindu/krishna-cosmic-flute.webp'),
  'krishna-yamuna-sunrise': require('@/assets/heroes/hindu/krishna-yamuna-sunrise.webp'),
  'krishna-sacred-pichwai': require('@/assets/heroes/hindu/krishna-sacred-pichwai.webp'),
  'jain-samavasarana-assembly': require('@/assets/heroes/jain/jain-samavasarana-assembly.webp'),
  'jain-palitana-shatrunjaya': require('@/assets/heroes/jain/jain-palitana-shatrunjaya.webp'),
  'jain-mahavir-meditation': require('@/assets/heroes/jain/jain-mahavir-meditation.webp'),
  'jain-ahimsa-dharmachakra': require('@/assets/heroes/jain/jain-ahimsa-dharmachakra.webp'),
  'jain-derasar-garbhagriha': require('@/assets/heroes/jain/jain-derasar-garbhagriha.webp'),
  'sikh-guru-gobind-singh-ji': require('@/assets/heroes/sikh/sikh-guru-gobind-singh-ji.webp'),
  'sikh-gurbani-kirtan-darbar': require('@/assets/heroes/sikh/sikh-gurbani-kirtan-darbar.webp'),
  'sikh-harmandir-sahib-sarovar': require('@/assets/heroes/sikh/sikh-harmandir-sahib-sarovar.webp'),
  'buddhist-bodhi-tree-dhyana': require('@/assets/heroes/buddhist/buddhist-bodhi-tree-dhyana.webp'),
  'buddhist-gompa-butter-lamps': require('@/assets/heroes/buddhist/buddhist-gompa-butter-lamps.webp'),
  'buddhist-himalayan-monastery': require('@/assets/heroes/buddhist/buddhist-himalayan-monastery.webp'),
  'buddhist-mandala-lotus-buddha': require('@/assets/heroes/buddhist/buddhist-mandala-lotus-buddha.webp'),
};

export const BUNDLED_HERO_THEMES: Array<{
  id: string;
  label: string;
  heroImage: string;
  objectPosition?: string;
  traditions?: string[];
}> = [
  {
    id: 'shiva-golden-silhouette',
    label: 'Adiyogi Gold Silhouette',
    heroImage: '/assets/images/heroes/hindu/shiva-golden-silhouette.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'shiva-moonlit-kedar',
    label: 'Shiva at Moonlit Kedar',
    heroImage: '/assets/images/heroes/hindu/shiva-moonlit-kedar.webp',
    objectPosition: '25% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'shiva-dhyana-dawn',
    label: 'Shiva Dhyana at Dawn',
    heroImage: '/assets/images/heroes/hindu/shiva-dhyana-dawn.webp',
    objectPosition: '30% 30%',
    traditions: ['hindu'],
  },
  {
    id: 'shiva-cosmic-dhyana',
    label: 'Shiva Cosmic Dhyana',
    heroImage: '/assets/images/heroes/hindu/shiva-cosmic-dhyana.webp',
    objectPosition: '50% 30%',
    traditions: ['hindu'],
  },
  {
    id: 'shiva-sacred-fresco',
    label: 'Shiva Sacred Fresco',
    heroImage: '/assets/images/heroes/hindu/shiva-sacred-fresco.webp',
    objectPosition: '70% 30%',
    traditions: ['hindu'],
  },
  {
    id: 'hanuman-sanjeevani-mountain',
    label: 'Hanuman with Sanjeevani',
    heroImage: '/assets/images/heroes/hindu/hanuman-sanjeevani-mountain.webp',
    objectPosition: '50% 20%',
    traditions: ['hindu'],
  },
  {
    id: 'hanuman-bal-roop',
    label: 'Bal Hanuman at Sunrise',
    heroImage: '/assets/images/heroes/hindu/hanuman-bal-roop.webp',
    objectPosition: '50% 20%',
    traditions: ['hindu'],
  },
  {
    id: 'hanuman-temple-blessing',
    label: 'Sri Hanuman Blessing',
    heroImage: '/assets/images/heroes/hindu/hanuman-temple-blessing.webp',
    objectPosition: '50% 20%',
    traditions: ['hindu'],
  },
  {
    id: 'hanuman-forest-dhyana',
    label: 'Hanuman Dhyana in Forest',
    heroImage: '/assets/images/heroes/hindu/hanuman-forest-dhyana.webp',
    objectPosition: '50% 20%',
    traditions: ['hindu'],
  },
  {
    id: 'hanuman-sita-ram-darshan',
    label: 'Hanuman Sita-Ram Darshan',
    heroImage: '/assets/images/heroes/hindu/hanuman-sita-ram-darshan.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'krishna-cosmic-flute',
    label: 'Krishna Cosmic Flute',
    heroImage: '/assets/images/heroes/hindu/krishna-cosmic-flute.webp',
    objectPosition: '65% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'krishna-yamuna-sunrise',
    label: 'Krishna by the Yamuna',
    heroImage: '/assets/images/heroes/hindu/krishna-yamuna-sunrise.webp',
    objectPosition: '22% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'krishna-sacred-pichwai',
    label: 'Krishna Sacred Pichwai',
    heroImage: '/assets/images/heroes/hindu/krishna-sacred-pichwai.webp',
    objectPosition: '75% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'shaiva-default',
    label: 'Shaiva Default',
    heroImage: '/assets/images/heroes/hindu/shiva-default.webp',
    objectPosition: '58% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'maha-shivaratri',
    label: 'Maha Shivaratri',
    heroImage: '/assets/images/heroes/hindu/mahashivratri.webp',
    objectPosition: '58% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'jain-samavasarana-assembly',
    label: 'Samavasarana Assembly',
    heroImage: '/assets/images/heroes/jain/jain-samavasarana-assembly.webp',
    objectPosition: 'center 20%',
    traditions: ['jain'],
  },
  {
    id: 'jain-palitana-shatrunjaya',
    label: 'Shatrunjaya Tirth Palitana',
    heroImage: '/assets/images/heroes/jain/jain-palitana-shatrunjaya.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-mahavir-meditation',
    label: 'Bhagwan Mahavir Dhyana',
    heroImage: '/assets/images/heroes/jain/jain-mahavir-meditation.webp',
    objectPosition: 'center 22%',
    traditions: ['jain'],
  },
  {
    id: 'jain-ahimsa-dharmachakra',
    label: 'Ahimsa Paramo Dharma',
    heroImage: '/assets/images/heroes/jain/jain-ahimsa-dharmachakra.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-derasar-garbhagriha',
    label: 'Sacred Derasar Sanctuary',
    heroImage: '/assets/images/heroes/jain/jain-derasar-garbhagriha.webp',
    objectPosition: 'center 20%',
    traditions: ['jain'],
  },
  {
    id: 'sikh-guru-gobind-singh-ji',
    label: 'Guru Gobind Singh Ji',
    heroImage: '/assets/images/heroes/sikh/sikh-guru-gobind-singh-ji.webp',
    objectPosition: 'center 20%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-harmandir-sahib-sarovar',
    label: 'Harmandir Sahib Amritsar',
    heroImage: '/assets/images/heroes/sikh/sikh-harmandir-sahib-sarovar.webp',
    objectPosition: 'center 25%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-gurbani-kirtan-darbar',
    label: 'Gurbani Kirtan Darbar',
    heroImage: '/assets/images/heroes/sikh/sikh-gurbani-kirtan-darbar.webp',
    objectPosition: 'center 22%',
    traditions: ['sikh'],
  },
  {
    id: 'buddhist-bodhi-tree-dhyana',
    label: 'Bodhi Tree Sunrise Dhyana',
    heroImage: '/assets/images/heroes/buddhist/buddhist-bodhi-tree-dhyana.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-gompa-butter-lamps',
    label: 'Gompa Chanting & Butter Lamps',
    heroImage: '/assets/images/heroes/buddhist/buddhist-gompa-butter-lamps.webp',
    objectPosition: 'center 20%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-himalayan-monastery',
    label: 'Himalayan Monastery Dawn',
    heroImage: '/assets/images/heroes/buddhist/buddhist-himalayan-monastery.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-mandala-lotus-buddha',
    label: 'Mandala Lotus Buddha',
    heroImage: '/assets/images/heroes/buddhist/buddhist-mandala-lotus-buddha.webp',
    objectPosition: 'center 20%',
    traditions: ['buddhist'],
  },
];

export async function getHeroPick(): Promise<HeroPick | null> {
  try {
    const raw = await AsyncStorage.getItem(HERO_PICK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HeroPick;
  } catch {
    return null;
  }
}

export async function setHeroPick(pick: HeroPick | null): Promise<void> {
  try {
    if (pick) {
      await AsyncStorage.setItem(HERO_PICK_KEY, JSON.stringify(pick));
    } else {
      await AsyncStorage.removeItem(HERO_PICK_KEY);
    }
  } catch {
    // Best-effort, matching the PWA's own localStorage usage (no throw).
  }
}

export async function getHeroSize(): Promise<HeroSize> {
  try {
    const raw = await AsyncStorage.getItem(HERO_SIZE_KEY);
    if (raw === 'standard' || raw === 'expanded' || raw === 'immersive') {
      return raw as HeroSize;
    }
    return DEFAULT_HERO_SIZE;
  } catch {
    return DEFAULT_HERO_SIZE;
  }
}

export async function setHeroSize(size: HeroSize): Promise<void> {
  try {
    await AsyncStorage.setItem(HERO_SIZE_KEY, size);
  } catch {
    // Best-effort
  }
}
