import { SEED_PATHS } from '@/lib/pathshala-paths';

export type LibraryTradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';

export interface LibraryEntry {
  id: string;
  title: string;
  source: string;
  original: string;
  transliteration: string;
  meaning: string;
  tradition: LibraryTradition;
  category: string;
  tags: string[];
}

export type Lesson = { title: string; entries: LibraryEntry[] };

const ENTRY_POOLS: Record<LibraryTradition, LibraryEntry[]> = {
  hindu: [
    {
      id: 'gita-2-47',
      title: 'Bhagavad Gita 2.47',
      source: 'Bhagavad Gita 2.47',
      original: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥',
      transliteration:
        'karmaṇy-evādhikāras te mā phaleṣu kadācana | mā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi ||',
      meaning:
        'You have a right only to action, never to its fruits. Let not the fruit of action be your motive, nor let your attachment be to inaction.',
      tradition: 'hindu',
      category: 'gita',
      tags: ['gita', 'karma', 'dharma'],
    },
    {
      id: 'gita-4-7',
      title: 'Bhagavad Gita 4.7',
      source: 'Bhagavad Gita 4.7',
      original: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत ।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् ॥',
      transliteration:
        'yadā yadā hi dharmasya glānir bhavati bhārata | abhyutthānam adharmasya tadātmānaṁ sṛjāmy aham ||',
      meaning:
        'Whenever righteousness declines and unrighteousness rises, I manifest Myself.',
      tradition: 'hindu',
      category: 'gita',
      tags: ['gita', 'avatar', 'dharma'],
    },
    {
      id: 'isha-1',
      title: 'Isha Upanishad 1',
      source: 'Isha Upanishad 1',
      original: 'ईशावास्यमिदं सर्वं यत्किञ्च जगत्यां जगत् ।\nतेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम् ॥',
      transliteration:
        'īśāvāsyam idaṁ sarvaṁ yat kiñca jagatyāṁ jagat | tena tyaktena bhuñjīthā mā gṛdhaḥ kasyasvid dhanam ||',
      meaning:
        'All this, whatsoever moves in this moving world, is enveloped by the Lord. Enjoy through renunciation; do not covet what belongs to another.',
      tradition: 'hindu',
      category: 'upanishad',
      tags: ['upanishad', 'renunciation', 'isha'],
    },
    {
      id: 'hanuman-chalisa-1',
      title: 'Hanuman Chalisa Opening',
      source: 'Hanuman Chalisa',
      original: 'श्रीगुरु चरन सरोज रज निज मन मुकुरु सुधारि ।\nबरनउँ रघुबर बिमल जसु जो दायकु फल चारि ॥',
      transliteration:
        'śrī guru caraṇa saroja raja nija mana mukuru sudhāri | baranauṁ raghubara bimala jasu jo dāyaku phala cāri ||',
      meaning:
        'With the dust of the Guru’s lotus feet I cleanse the mirror of my mind and describe the pure glory of Rama, which bestows the four fruits of life.',
      tradition: 'hindu',
      category: 'stotra',
      tags: ['stotra', 'hanuman', 'rama'],
    },
  ],
  sikh: [
    {
      id: 'japji-1',
      title: 'Japji Sahib — Mool Mantar',
      source: 'Japji Sahib',
      original: 'ਇਕ ਓਅੰਕਾਰ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ।',
      transliteration: 'ik ōaṅkār sat nām kartā purakh nirbha-u nirvair',
      meaning:
        'There is One Reality, whose Name is Truth, the Creator, without fear and without enmity.',
      tradition: 'sikh',
      category: 'gurbani',
      tags: ['japji', 'mool-mantar', 'naam'],
    },
    {
      id: 'japji-2',
      title: 'Japji Sahib — Hukam',
      source: 'Japji Sahib',
      original: 'ਹੁਕਮੀ ਹੋਵਨਿ ਆਕਾਰ ਹੁਕਮੁ ਨ ਕਹਿਆ ਜਾਈ ।',
      transliteration: 'hukmī hovan ākār hukam na kahiā jāī',
      meaning:
        'By the Divine Order, forms arise; that Order cannot fully be spoken.',
      tradition: 'sikh',
      category: 'gurbani',
      tags: ['japji', 'hukam'],
    },
    {
      id: 'sukhmani-1',
      title: 'Sukhmani Sahib — Peace',
      source: 'Sukhmani Sahib',
      original: 'ਸਿਮਰਉ ਸਿਮਰਿ ਸਿਮਰਿ ਸੁਖੁ ਪਾਵਉ ।',
      transliteration: 'simra-u simar simar sukh pāva-u',
      meaning: 'By remembering and meditating on the Divine, one attains peace.',
      tradition: 'sikh',
      category: 'gurbani',
      tags: ['sukhmani', 'peace', 'simran'],
    },
    {
      id: 'anand-1',
      title: 'Anand Sahib — Bliss',
      source: 'Anand Sahib',
      original: 'ਅਨੰਦੁ ਭਇਆ ਮੇਰੀ ਮਾਏ ਸਤਿਗੁਰੂ ਮੈ ਪਾਇਆ ।',
      transliteration: 'anand bha-iā merī mā-e satgurū mai pā-iā',
      meaning: 'Bliss has arisen, O my mother, for I have found the True Guru.',
      tradition: 'sikh',
      category: 'gurbani',
      tags: ['anand', 'bliss', 'guru'],
    },
  ],
  buddhist: [
    {
      id: 'dhammapada-1',
      title: 'Dhammapada 1',
      source: 'Dhammapada 1',
      original: 'मनोपुब्बङ्गमा धम्मा मनोसेट्ठा मनोमया ।',
      transliteration: 'manopubbaṅgamā dhammā manoseṭṭhā manomayā',
      meaning: 'Mind precedes all phenomena; mind is their chief, and they are mind-made.',
      tradition: 'buddhist',
      category: 'dhammapada',
      tags: ['dhammapada', 'mindfulness'],
    },
    {
      id: 'dhammapada-183',
      title: 'Dhammapada 183',
      source: 'Dhammapada 183',
      original: 'सबा पापस्स अकरणं कुसलस्स उपसम्पदा ।',
      transliteration: 'sabbapāpassa akaraṇaṁ kusalassa upasampadā',
      meaning: 'Avoid evil, cultivate the good, and purify the mind.',
      tradition: 'buddhist',
      category: 'dhammapada',
      tags: ['ethics', 'dhammapada'],
    },
    {
      id: 'metta-1',
      title: 'Metta Sutta',
      source: 'Metta Sutta',
      original: 'सुखिनो वा खेमिनो होन्तु सब्बे सत्ता भवन्तु सुखितत्ता ।',
      transliteration: 'sukhino vā khemino hontu sabbe sattā bhavantu sukhitattā',
      meaning: 'May all beings be happy and secure; may they be happy at heart.',
      tradition: 'buddhist',
      category: 'sutra',
      tags: ['metta', 'compassion'],
    },
    {
      id: 'heart-sutra-1',
      title: 'Heart Sutra',
      source: 'Prajnaparamita Hridaya',
      original: 'रूपं शून्यता शून्यतैव रूपम् ।',
      transliteration: 'rūpaṁ śūnyatā śūnyataiva rūpam',
      meaning: 'Form is emptiness; emptiness itself is form.',
      tradition: 'buddhist',
      category: 'sutra',
      tags: ['heart-sutra', 'emptiness'],
    },
  ],
  jain: [
    {
      id: 'namokar-1',
      title: 'Namokar Mantra',
      source: 'Namokar Mantra',
      original: 'णमो अरिहंताणं । णमो सिद्धाणं ।',
      transliteration: 'ṇamo arihantāṇaṁ | ṇamo siddhāṇaṁ |',
      meaning: 'I bow to the Arihants. I bow to the Siddhas.',
      tradition: 'jain',
      category: 'jain_mantra',
      tags: ['namokar', 'mantra'],
    },
    {
      id: 'tattvartha-1',
      title: 'Tattvartha Sutra 1.1',
      source: 'Tattvartha Sutra 1.1',
      original: 'सम्यग्दर्शनज्ञानचारित्राणि मोक्षमार्गः ।',
      transliteration: 'samyag-darśana-jñāna-cāritrāṇi mokṣa-mārgaḥ',
      meaning: 'Right faith, right knowledge, and right conduct are the path to liberation.',
      tradition: 'jain',
      category: 'jain_scripture',
      tags: ['tattvartha', 'moksha'],
    },
    {
      id: 'bhaktamar-1',
      title: 'Bhaktamar Stotra',
      source: 'Bhaktamar Stotra',
      original: 'भक्तामर-प्रणत-मौलि-मणि-प्रभाणा-\nमुद्योत्करं दलित-पाप-तमो-वितानम् ।',
      transliteration:
        'bhaktāmara-praṇata-mauli-maṇi-prabhāṇām udyotkaraṁ dalita-pāpa-tamo-vitānam',
      meaning: 'The radiance from the jewel-crowns of the devoted, bowed in reverence, destroys the darkness of sin.',
      tradition: 'jain',
      category: 'jain_scripture',
      tags: ['bhaktamar', 'stotra'],
    },
    {
      id: 'acharanga-1',
      title: 'Acharanga Sutra',
      source: 'Acharanga Sutra',
      original: 'सव्वे पाणा पियाउया, सुहसाया दुक्खपडिकूला ।',
      transliteration: 'savve pāṇā piyāuyā, suhasāyā dukkhapaḍikūlā',
      meaning: 'All living beings desire to live. They seek happiness and recoil from pain.',
      tradition: 'jain',
      category: 'jain_scripture',
      tags: ['ahimsa', 'acharanga'],
    },
  ],
};

export function getPathLessons(pathId: string): Lesson[] {
  const path = SEED_PATHS.find((candidate) => candidate.id === pathId);
  if (!path) {
    return [];
  }

  const tradition = path.tradition as LibraryTradition;
  const pool = ENTRY_POOLS[tradition] ?? ENTRY_POOLS.hindu;
  const totalLessons = Math.max(path.total_lessons, 1);

  return Array.from({ length: totalLessons }, (_, index) => {
    const baseEntry = pool[index % pool.length];
    const lessonEntry: LibraryEntry = {
      ...baseEntry,
      id: `${pathId}-${baseEntry.id}-${index + 1}`,
      title: `${baseEntry.title} — ${index + 1}`,
      tags: [...baseEntry.tags, path.id],
    };

    return {
      title: `${path.title} — Lesson ${index + 1}`,
      entries: [lessonEntry],
    };
  });
}
