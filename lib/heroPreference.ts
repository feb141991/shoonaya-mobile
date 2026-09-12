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
  'sri-rama-darbar-serene': require('@/assets/heroes/hindu/sri-rama-darbar-serene.webp'),
  'ganesha-divine-dhyana': require('@/assets/heroes/hindu/ganesha-divine-dhyana.webp'),
  'chhath-surya-arghya': require('@/assets/heroes/hindu/chhath-surya-arghya.webp'),
  'dhanteras-deepam-kuber': require('@/assets/heroes/hindu/dhanteras-deepam-kuber.webp'),
  'naraka-chaturdashi-dawn-deepam': require('@/assets/heroes/hindu/naraka-chaturdashi-dawn-deepam.webp'),
  'diwali-deepam-serenity': require('@/assets/heroes/hindu/diwali-deepam-serenity.webp'),
  'govardhan-annakut-darshan': require('@/assets/heroes/hindu/govardhan-annakut-darshan.webp'),
  'bhai-dooj-sacred-aarti': require('@/assets/heroes/hindu/bhai-dooj-sacred-aarti.webp'),
  'holi-gulal-vrindavan': require('@/assets/heroes/hindu/holi-gulal-vrindavan.webp'),
  'makar-sankranti-uttarayan-dawn': require('@/assets/heroes/hindu/makar-sankranti-uttarayan-dawn.webp'),
  'vasant-panchami-saraswati-amber': require('@/assets/heroes/hindu/vasant-panchami-saraswati-amber.webp'),
  'gudi-padwa-chaitra-sunrise': require('@/assets/heroes/hindu/gudi-padwa-chaitra-sunrise.webp'),
  'ugadi-pachadi-mango-dawn': require('@/assets/heroes/hindu/ugadi-pachadi-mango-dawn.webp'),
  'akshaya-tritiya-udaka-kumbha': require('@/assets/heroes/hindu/akshaya-tritiya-udaka-kumbha.webp'),
  'narasimha-twilight-protection': require('@/assets/heroes/hindu/narasimha-twilight-protection.webp'),
  'shani-peepal-deepam-dhyana': require('@/assets/heroes/hindu/shani-peepal-deepam-dhyana.webp'),
  'jagannath-puri-rath-yatra': require('@/assets/heroes/hindu/jagannath-puri-rath-yatra.webp'),
  'nag-panchami-shesha-dhyana': require('@/assets/heroes/hindu/nag-panchami-shesha-dhyana.webp'),
  'hartalika-teej-forest-tapasya': require('@/assets/heroes/hindu/hartalika-teej-forest-tapasya.webp'),
  'karva-chauth-moonrise-serenity': require('@/assets/heroes/hindu/karva-chauth-moonrise-serenity.webp'),
  'gita-jayanti-kurukshetra-darshan': require('@/assets/heroes/hindu/gita-jayanti-kurukshetra-darshan.webp'),
  'jain-samavasarana-assembly': require('@/assets/heroes/jain/jain-samavasarana-assembly.webp'),
  'jain-palitana-shatrunjaya': require('@/assets/heroes/jain/jain-palitana-shatrunjaya.webp'),
  'jain-mahavir-meditation': require('@/assets/heroes/jain/jain-mahavir-meditation.webp'),
  'jain-ahimsa-dharmachakra': require('@/assets/heroes/jain/jain-ahimsa-dharmachakra.webp'),
  'jain-derasar-garbhagriha': require('@/assets/heroes/jain/jain-derasar-garbhagriha.webp'),
  'jain-mahavir-jayanti-darshan': require('@/assets/heroes/jain/jain-mahavir-jayanti-darshan.webp'),
  'jain-akshaya-tritiya-adinatha': require('@/assets/heroes/jain/jain-akshaya-tritiya-adinatha.webp'),
  'jain-paryushana-parva-samavasarana': require('@/assets/heroes/jain/jain-paryushana-parva-samavasarana.webp'),
  'jain-samvatsari-universal-forgiveness': require('@/assets/heroes/jain/jain-samvatsari-universal-forgiveness.webp'),
  'jain-das-lakshana-dharma': require('@/assets/heroes/jain/jain-das-lakshana-dharma.webp'),
  'jain-new-year-gautama-kevala': require('@/assets/heroes/jain/jain-new-year-gautama-kevala.webp'),
  'jain-diwali-nirvana-deepotsav': require('@/assets/heroes/jain/jain-diwali-nirvana-deepotsav.webp'),
  'jain-kartik-purnima-shatrunjaya': require('@/assets/heroes/jain/jain-kartik-purnima-shatrunjaya.webp'),
  'sikh-baisakhi-khalsa-saajna': require('@/assets/heroes/sikh/sikh-baisakhi-khalsa-saajna.webp'),
  'sikh-guru-nanak-gurpurab': require('@/assets/heroes/sikh/sikh-guru-nanak-gurpurab.webp'),
  'sikh-guru-gobind-singh-ji': require('@/assets/heroes/sikh/sikh-guru-gobind-singh-ji.webp'),
  'sikh-bandhi-chhor-divas': require('@/assets/heroes/sikh/sikh-bandhi-chhor-divas.webp'),
  'sikh-hola-mohalla': require('@/assets/heroes/sikh/sikh-hola-mohalla.webp'),
  'sikh-lohri-bonfire': require('@/assets/heroes/sikh/sikh-lohri-bonfire.webp'),
  'sikh-guru-arjan-dev-shaheedi': require('@/assets/heroes/sikh/sikh-guru-arjan-dev-shaheedi.webp'),
  'sikh-guru-tegh-bahadur-shaheedi': require('@/assets/heroes/sikh/sikh-guru-tegh-bahadur-shaheedi.webp'),
  'sikh-chaar-sahibzade-shaheedi': require('@/assets/heroes/sikh/sikh-chaar-sahibzade-shaheedi.webp'),
  'sikh-guru-ravidas-jayanti': require('@/assets/heroes/sikh/sikh-guru-ravidas-jayanti.webp'),
  'sikh-gurbani-kirtan-darbar': require('@/assets/heroes/sikh/sikh-gurbani-kirtan-darbar.webp'),
  'sikh-harmandir-sahib-sarovar': require('@/assets/heroes/sikh/sikh-harmandir-sahib-sarovar.webp'),
  'buddhist-bodhi-tree-dhyana': require('@/assets/heroes/buddhist/buddhist-bodhi-tree-dhyana.webp'),
  'buddhist-gompa-butter-lamps': require('@/assets/heroes/buddhist/buddhist-gompa-butter-lamps.webp'),
  'buddhist-himalayan-monastery': require('@/assets/heroes/buddhist/buddhist-himalayan-monastery.webp'),
  'buddhist-mandala-lotus-buddha': require('@/assets/heroes/buddhist/buddhist-mandala-lotus-buddha.webp'),
  'buddhist-vesak-buddha-purnima': require('@/assets/heroes/buddhist/buddhist-vesak-buddha-purnima.webp'),
  'buddhist-asalha-puja-dharmachakra': require('@/assets/heroes/buddhist/buddhist-asalha-puja-dharmachakra.webp'),
  'buddhist-magha-puja-sangha': require('@/assets/heroes/buddhist/buddhist-magha-puja-sangha.webp'),
  'buddhist-vassa-monsoon-retreat': require('@/assets/heroes/buddhist/buddhist-vassa-monsoon-retreat.webp'),
  'buddhist-pavarana-kathina': require('@/assets/heroes/buddhist/buddhist-pavarana-kathina.webp'),
  'buddhist-bodhi-day-awakening': require('@/assets/heroes/buddhist/buddhist-bodhi-day-awakening.webp'),
  'buddhist-parinirvana-day': require('@/assets/heroes/buddhist/buddhist-parinirvana-day.webp'),
  'buddhist-losar-tibetan-new-year': require('@/assets/heroes/buddhist/buddhist-losar-tibetan-new-year.webp'),
  'buddhist-sangha-day': require('@/assets/heroes/buddhist/buddhist-sangha-day.webp'),
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
    id: 'sri-rama-darbar-serene',
    label: 'Sri Rama Maryada Purushottam',
    heroImage: '/assets/images/heroes/hindu/sri-rama-darbar-serene.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'ganesha-divine-dhyana',
    label: 'Lord Ganesha Sanctuary',
    heroImage: '/assets/images/heroes/hindu/ganesha-divine-dhyana.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'chhath-surya-arghya',
    label: 'Chhath Surya Arghya Ghat',
    heroImage: '/assets/images/heroes/hindu/chhath-surya-arghya.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'dhanteras-deepam-kuber',
    label: 'Dhanteras Sacred Deepam',
    heroImage: '/assets/images/heroes/hindu/dhanteras-deepam-kuber.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'naraka-chaturdashi-dawn-deepam',
    label: 'Naraka Chaturdashi Dawn',
    heroImage: '/assets/images/heroes/hindu/naraka-chaturdashi-dawn-deepam.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'diwali-deepam-serenity',
    label: 'Diwali Deepavali Serenity',
    heroImage: '/assets/images/heroes/hindu/diwali-deepam-serenity.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'govardhan-annakut-darshan',
    label: 'Govardhan Annakut Sanctuary',
    heroImage: '/assets/images/heroes/hindu/govardhan-annakut-darshan.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'bhai-dooj-sacred-aarti',
    label: 'Bhai Dooj Sacred Aarti',
    heroImage: '/assets/images/heroes/hindu/bhai-dooj-sacred-aarti.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'holi-gulal-vrindavan',
    label: 'Holi Sacred Gulal Dawn',
    heroImage: '/assets/images/heroes/hindu/holi-gulal-vrindavan.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'makar-sankranti-uttarayan-dawn',
    label: 'Makar Sankranti Uttarayan Dawn',
    heroImage: '/assets/images/heroes/hindu/makar-sankranti-uttarayan-dawn.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'vasant-panchami-saraswati-amber',
    label: 'Vasant Panchami Saraswati Amber',
    heroImage: '/assets/images/heroes/hindu/vasant-panchami-saraswati-amber.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'gudi-padwa-chaitra-sunrise',
    label: 'Gudi Padwa Chaitra Sunrise',
    heroImage: '/assets/images/heroes/hindu/gudi-padwa-chaitra-sunrise.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'ugadi-pachadi-mango-dawn',
    label: 'Ugadi Deccan Sunrise',
    heroImage: '/assets/images/heroes/hindu/ugadi-pachadi-mango-dawn.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'akshaya-tritiya-udaka-kumbha',
    label: 'Akshaya Tritiya Sacred Kumbha',
    heroImage: '/assets/images/heroes/hindu/akshaya-tritiya-udaka-kumbha.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'narasimha-twilight-protection',
    label: 'Lord Narasimha Twilight Protection',
    heroImage: '/assets/images/heroes/hindu/narasimha-twilight-protection.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'shani-peepal-deepam-dhyana',
    label: 'Shani Peepal Deepam Dhyana',
    heroImage: '/assets/images/heroes/hindu/shani-peepal-deepam-dhyana.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'jagannath-puri-rath-yatra',
    label: 'Jagannath Puri Rath Yatra',
    heroImage: '/assets/images/heroes/hindu/jagannath-puri-rath-yatra.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'nag-panchami-shesha-dhyana',
    label: 'Nag Panchami Shesha Dhyana',
    heroImage: '/assets/images/heroes/hindu/nag-panchami-shesha-dhyana.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'hartalika-teej-forest-tapasya',
    label: 'Hartalika Teej Forest Tapasya',
    heroImage: '/assets/images/heroes/hindu/hartalika-teej-forest-tapasya.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'karva-chauth-moonrise-serenity',
    label: 'Karva Chauth Moonrise Serenity',
    heroImage: '/assets/images/heroes/hindu/karva-chauth-moonrise-serenity.webp',
    objectPosition: '50% 25%',
    traditions: ['hindu'],
  },
  {
    id: 'gita-jayanti-kurukshetra-darshan',
    label: 'Gita Jayanti Kurukshetra Darshan',
    heroImage: '/assets/images/heroes/hindu/gita-jayanti-kurukshetra-darshan.webp',
    objectPosition: '50% 25%',
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
    id: 'sikh-baisakhi-khalsa-saajna',
    label: 'Khalsa Saajna Divas (Vaisakhi)',
    heroImage: '/assets/images/heroes/sikh/sikh-baisakhi-khalsa-saajna.webp',
    objectPosition: 'center 25%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-guru-nanak-gurpurab',
    label: 'Sri Guru Nanak Dev Ji Gurpurab',
    heroImage: '/assets/images/heroes/sikh/sikh-guru-nanak-gurpurab.webp',
    objectPosition: 'center 20%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-guru-gobind-singh-ji',
    label: 'Sri Guru Gobind Singh Ji Gurpurab',
    heroImage: '/assets/images/heroes/sikh/sikh-guru-gobind-singh-ji.webp',
    objectPosition: 'center 20%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-bandhi-chhor-divas',
    label: 'Bandi Chhor Divas',
    heroImage: '/assets/images/heroes/sikh/sikh-bandhi-chhor-divas.webp',
    objectPosition: 'center 25%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-hola-mohalla',
    label: 'Hola Mohalla at Anandpur Sahib',
    heroImage: '/assets/images/heroes/sikh/sikh-hola-mohalla.webp',
    objectPosition: 'center 25%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-lohri-bonfire',
    label: 'Lohri Winter Harvest',
    heroImage: '/assets/images/heroes/sikh/sikh-lohri-bonfire.webp',
    objectPosition: 'center 25%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-guru-arjan-dev-shaheedi',
    label: 'Sri Guru Arjan Dev Ji Shaheedi',
    heroImage: '/assets/images/heroes/sikh/sikh-guru-arjan-dev-shaheedi.webp',
    objectPosition: 'center 25%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-guru-tegh-bahadur-shaheedi',
    label: 'Sri Guru Tegh Bahadur Ji Shaheedi',
    heroImage: '/assets/images/heroes/sikh/sikh-guru-tegh-bahadur-shaheedi.webp',
    objectPosition: 'center 25%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-chaar-sahibzade-shaheedi',
    label: 'Chaar Sahibzade Shaheedi Diwas',
    heroImage: '/assets/images/heroes/sikh/sikh-chaar-sahibzade-shaheedi.webp',
    objectPosition: 'center 20%',
    traditions: ['sikh'],
  },
  {
    id: 'sikh-guru-ravidas-jayanti',
    label: 'Bhagat Ravidas Ji Jayanti',
    heroImage: '/assets/images/heroes/sikh/sikh-guru-ravidas-jayanti.webp',
    objectPosition: 'center 25%',
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
  // ==================== BUDDHIST FESTIVAL THEMES ====================
  {
    id: 'buddhist-vesak-buddha-purnima',
    label: 'Vesak (Buddha Purnima)',
    heroImage: '/assets/images/heroes/buddhist/buddhist-vesak-buddha-purnima.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-asalha-puja-dharmachakra',
    label: 'Asalha Puja (Dhamma Day)',
    heroImage: '/assets/images/heroes/buddhist/buddhist-asalha-puja-dharmachakra.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-magha-puja-sangha',
    label: 'Magha Puja (Sangha Day)',
    heroImage: '/assets/images/heroes/buddhist/buddhist-magha-puja-sangha.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-vassa-monsoon-retreat',
    label: 'Vassa (Rains Retreat)',
    heroImage: '/assets/images/heroes/buddhist/buddhist-vassa-monsoon-retreat.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-pavarana-kathina',
    label: 'Pavarana & Kathina Robe Ceremony',
    heroImage: '/assets/images/heroes/buddhist/buddhist-pavarana-kathina.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-bodhi-day-awakening',
    label: 'Bodhi Day (Supreme Awakening)',
    heroImage: '/assets/images/heroes/buddhist/buddhist-bodhi-day-awakening.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-parinirvana-day',
    label: 'Parinirvana Day',
    heroImage: '/assets/images/heroes/buddhist/buddhist-parinirvana-day.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-losar-tibetan-new-year',
    label: 'Losar (Tibetan New Year)',
    heroImage: '/assets/images/heroes/buddhist/buddhist-losar-tibetan-new-year.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  {
    id: 'buddhist-sangha-day',
    label: 'Sangha Day (Loy Krathong)',
    heroImage: '/assets/images/heroes/buddhist/buddhist-sangha-day.webp',
    objectPosition: 'center 25%',
    traditions: ['buddhist'],
  },
  // ==================== JAIN FESTIVAL THEMES ====================
  {
    id: 'jain-mahavir-jayanti-darshan',
    label: 'Bhagwan Mahavir Jayanti',
    heroImage: '/assets/images/heroes/jain/jain-mahavir-jayanti-darshan.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-akshaya-tritiya-adinatha',
    label: 'Akshaya Tritiya (Adinatha Parana)',
    heroImage: '/assets/images/heroes/jain/jain-akshaya-tritiya-adinatha.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-paryushana-parva-samavasarana',
    label: 'Paryushana Parvadhiraja',
    heroImage: '/assets/images/heroes/jain/jain-paryushana-parva-samavasarana.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-samvatsari-universal-forgiveness',
    label: 'Samvatsari (Micchami Dukkadam)',
    heroImage: '/assets/images/heroes/jain/jain-samvatsari-universal-forgiveness.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-das-lakshana-dharma',
    label: 'Das Lakshana Parva',
    heroImage: '/assets/images/heroes/jain/jain-das-lakshana-dharma.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-new-year-gautama-kevala',
    label: 'Jain New Year (Gautama Kevala Jnana)',
    heroImage: '/assets/images/heroes/jain/jain-new-year-gautama-kevala.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-diwali-nirvana-deepotsav',
    label: 'Jain Diwali (Mahavira Nirvana)',
    heroImage: '/assets/images/heroes/jain/jain-diwali-nirvana-deepotsav.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
  },
  {
    id: 'jain-kartik-purnima-shatrunjaya',
    label: 'Kartik Purnima Shatrunjaya Yatra',
    heroImage: '/assets/images/heroes/jain/jain-kartik-purnima-shatrunjaya.webp',
    objectPosition: 'center 25%',
    traditions: ['jain'],
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

/**
 * Deterministically resolves an auto-rotated hero theme for the user's tradition.
 * Rotates daily based on the day of the year so the sanctuary always feels alive
 * and fresh every morning, while staying deterministic throughout the day.
 */
export function resolveAutoRotatedHeroTheme(
  tradition: string = 'hindu',
  date: Date = new Date()
): { id: string; label: string; heroImage: string; objectPosition?: string } | null {
  const normTradition = tradition.trim().toLowerCase() || 'hindu';
  const matchingThemes = BUNDLED_HERO_THEMES.filter(
    (t) => !t.traditions?.length || t.traditions.includes(normTradition)
  );

  if (matchingThemes.length === 0) {
    return BUNDLED_HERO_THEMES[0] ?? null;
  }

  // Calculate day of the year (0 - 365)
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const index = Math.abs(diffDays) % matchingThemes.length;

  return matchingThemes[index];
}

