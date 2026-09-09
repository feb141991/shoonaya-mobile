/**
 * Sacred Yatra Circuits & Temple Pilgrimage Data
 * 
 * Strict Spiritual Governance:
 * Authentic temple locations, Sthala Puranas, presiding deities, architectural
 * heritage, sacred rivers, and ritual offerings across Hindu, Sikh, and Jain traditions.
 */

export type YatraTradition = 'sanatan' | 'sikh' | 'jain';

export interface TempleSanctumNode {
  id: string;
  name: string;
  sanskritName: string;
  deity: string;
  location: string;
  stateOrRegion: string;
  sacredRiverOrKund?: string;
  architecturalStyle?: string;
  sthalaPurana: string;
  significance: string;
  offerings: string[]; // e.g. ["Bhasma Aarti", "Bilva Patra", "Ghee Diya"]
  alankaramOrTimings?: string;
  stotraOrChant?: {
    title: string;
    description: string;
  };
  liveDarshanStreamId?: string; // YouTube or live darshan id if supported
  colorAccent: string;
  latitude: number;
  longitude: number;
}

export interface YatraCircuitEdge {
  fromId: string;
  toId: string;
  label?: string; // e.g. "Sacred Route", "Pilgrim Pathway"
}

export interface YatraCircuit {
  id: string;
  title: string;
  sanskritTitle: string;
  tradition: YatraTradition;
  subtitle: string;
  description: string;
  rootNodeId: string;
  temples: TempleSanctumNode[];
  edges: YatraCircuitEdge[];
}

export const SACRED_YATRA_CIRCUITS: Record<string, YatraCircuit> = {
  '12-jyotirlingas': {
    id: '12-jyotirlingas',
    title: '12 Sacred Jyotirlinga Mahayatra',
    sanskritTitle: 'द्वादश ज्योतिर्लिंग तीर्थ यात्रा',
    tradition: 'sanatan',
    subtitle: 'The 12 Radiant Columns of Cosmic Light',
    description: 'The twelve supreme abodes of Lord Shiva spread across India where the Supreme Lord manifested as a pillar of infinite light (*Jyotirlinga*).',
    rootNodeId: 'somnath',
    temples: [
      {
        id: 'somnath',
        name: 'Somnath Jyotirlinga',
        sanskritName: 'सोमनाथ ज्योतिर्लिंग',
        deity: 'Lord Shiva (Lord of the Moon)',
        location: 'Prabhas Patan, Veraval, Gujarat',
        stateOrRegion: 'Gujarat',
        sacredRiverOrKund: 'Triveni Sangam (Hiran, Kapila, Saraswati)',
        architecturalStyle: 'Chalukya / Kailash Mahameru Prasad',
        sthalaPurana: 'The first of the twelve Jyotirlingas, built by Chandra Deva (the Moon God) after Lord Shiva cured him of Daksha’s curse.',
        significance: 'Symbolizes eternal resurrection and the triumph of spiritual light over time and destruction.',
        offerings: ['Ganga Jal Abhisheka', 'Panchamrita', 'Ghee Deepam'],
        alankaramOrTimings: 'Sandhya Aarti (07:00 PM) with Sound & Light',
        stotraOrChant: {
          title: 'Saurashtre Somanatham (Dvadasha Jyotirlinga Stotram)',
          description: 'Saurashtre Somanatham Cha Shrishaile Mallikarjunam — Adi Shankaracharya.',
        },
        colorAccent: '#D97706',
        latitude: 20.888,
        longitude: 70.401,
      },
      {
        id: 'mallikarjuna',
        name: 'Mallikarjuna Jyotirlinga',
        sanskritName: 'मल्लिकार्जुन ज्योतिर्लिंग (श्रीशैलम)',
        deity: 'Lord Shiva & Devi Bhramaramba',
        location: 'Srisailam, Nallamala Hills, Andhra Pradesh',
        stateOrRegion: 'Andhra Pradesh',
        sacredRiverOrKund: 'Krishna River (Patalaganga)',
        architecturalStyle: 'Vijayanagara & Dravidian',
        sthalaPurana: 'Worshipped by Lord Rama, Arjuna, and Adi Shankara. Unique shrine that is both a Jyotirlinga and one of the 18 Maha Shakti Peethas.',
        significance: 'Bestows instant liberation and spiritual awakening (*Kailasa of the South*).',
        offerings: ['Jasmine (Mallika) Flowers', 'Bilva Patra', 'Rudrabhisheka'],
        stotraOrChant: {
          title: 'Shivananda Lahari at Srisailam',
          description: 'Composed by Jagadguru Adi Shankaracharya during his tapasya at Srisailam.',
        },
        colorAccent: '#EA580C',
        latitude: 16.074,
        longitude: 78.868,
      },
      {
        id: 'mahakaleshwar',
        name: 'Mahakaleshwar Jyotirlinga',
        sanskritName: 'महाकालेश्वर ज्योतिर्लिंग (उज्जयिनी)',
        deity: 'Lord Mahakala (Master of Time & Death)',
        location: 'Ujjain, Madhya Pradesh',
        stateOrRegion: 'Madhya Pradesh',
        sacredRiverOrKund: 'Shipra River',
        architecturalStyle: 'Bhumija & Maratha',
        sthalaPurana: 'The only south-facing (Dakshinmukhi) Jyotirlinga, positioned at the navel of the Earth (*Nabhi Desha*) on the prime meridian of ancient astronomy.',
        significance: 'Protector from untimely death (Akal Mrityu) and master of cosmic time.',
        offerings: ['Bhasma Aarti', 'Chandan & Saffron Paste', 'Bel Leaves'],
        alankaramOrTimings: 'Bhasma Aarti at 04:00 AM (Brahma Muhurta)',
        stotraOrChant: {
          title: 'Mahakal Ashtakam',
          description: 'Om Mahakalaya Namah — Chanting for fearlessness from death.',
        },
        colorAccent: '#B45309',
        latitude: 23.183,
        longitude: 75.768,
      },
      {
        id: 'omkareshwar',
        name: 'Omkareshwar Jyotirlinga',
        sanskritName: 'ॐकारेश्वर ज्योतिर्लिंग',
        deity: 'Lord Shiva (Lord of the Pranava OM)',
        location: 'Mandhata Island, Narmada River, Madhya Pradesh',
        stateOrRegion: 'Madhya Pradesh',
        sacredRiverOrKund: 'Narmada River',
        architecturalStyle: 'North Indian Nagara',
        sthalaPurana: 'The sacred island in the Narmada River naturally shaped like the cosmic syllable ॐ (OM). Where Adi Shankara met his Guru Govinda Bhagavatpada.',
        significance: 'Resonates with the primal vibration of creation and meditation.',
        offerings: ['Narmada Holy Water', 'Dhatura Flowers', 'Ghee Lamps'],
        stotraOrChant: {
          title: 'Narmadastakam',
          description: 'Twadiya Pada Pankajam Namami Devi Narmade — Salutations to Mother Narmada.',
        },
        colorAccent: '#7C3AED',
        latitude: 22.247,
        longitude: 76.151,
      },
      {
        id: 'kedarnath',
        name: 'Kedarnath Jyotirlinga',
        sanskritName: 'केदारनाथ ज्योतिर्लिंग (हिमालय)',
        deity: 'Lord Shiva (Sadashiva in the Snows)',
        location: 'Rudraprayag, Garhwal Himalayas, Uttarakhand',
        stateOrRegion: 'Uttarakhand',
        sacredRiverOrKund: 'Mandakini River',
        architecturalStyle: 'Katyuri Stone Architecture (c. 8th Century)',
        sthalaPurana: 'Established by the Pandavas seeking absolution after the Kurukshetra war. The hump of Lord Shiva materialized here as a triangular rock.',
        significance: 'Highest of the 12 Jyotirlingas (3,583m elevation), exuding profound meditative silence.',
        offerings: ['Ghee Lepanam', 'Brahma Kamal Flowers', 'Gangotri Jal'],
        stotraOrChant: {
          title: 'Kedarashtakam',
          description: 'Kedararanya-Vasam Mahadev-Isam — Divine hymn composed in devotion to Kedarnath.',
        },
        colorAccent: '#2563EB',
        latitude: 30.735,
        longitude: 79.066,
      },
      {
        id: 'kashi-vishwanath',
        name: 'Kashi Vishwanath Jyotirlinga',
        sanskritName: 'काशी विश्वनाथ ज्योतिर्लिंग (वाराणसी)',
        deity: 'Lord Vishwanath (Ruler of the Universe)',
        location: 'Varanasi (Kashi), Uttar Pradesh',
        stateOrRegion: 'Uttar Pradesh',
        sacredRiverOrKund: 'Mother Ganga (Dashashwamedh & Manikarnika)',
        architecturalStyle: 'Nagara with Golden Spire (*Swarna Shikhar*)',
        sthalaPurana: 'The eternal cosmic city standing on Shiva’s Trishula. Lord Shiva whispers the Taraka Mantra into the ears of all who depart here, granting Moksha.',
        significance: 'The center of Vedic knowledge, liberation, and spiritual transformation.',
        offerings: ['Ganga Jal Abhishekam', 'Bilva Archana', 'Kashi Aarti'],
        alankaramOrTimings: 'Mangala Aarti (03:00 AM) & Shringar Aarti (09:00 PM)',
        stotraOrChant: {
          title: 'Kashi Vishwanathashtakam',
          description: 'Ganga-Taranga-Ramaniya-Jata-Kalapam Gauri-Nirantara-Vibhushita-Vama-Bhagam.',
        },
        colorAccent: '#D97706',
        latitude: 25.311,
        longitude: 83.011,
      },
      {
        id: 'rameswaram',
        name: 'Rameshwaram (Ramanathaswamy)',
        sanskritName: 'रामेश्वरम् (रामनाथस्वामी)',
        deity: 'Lord Ramanatha (Installed by Sri Rama)',
        location: 'Rameswaram Island, Tamil Nadu',
        stateOrRegion: 'Tamil Nadu',
        sacredRiverOrKund: '22 Holy Theerthams & Agni Theertham (Indian Ocean)',
        architecturalStyle: 'Dravidian with 1,212 Grand Pillared Corridor',
        sthalaPurana: 'Lord Sri Rama sculpted and consecrated this Shivalinga with Mother Sita before crossing to Lanka, seeking blessings for victory and Dharma.',
        significance: 'Sacred bridge between North and South India, purifying all karmic burdens through 22 holy water baths.',
        offerings: ['22 Theertham Sacred Snana', 'Ganga Jal Samarpan', 'Bilva Garland'],
        stotraOrChant: {
          title: 'Rama Setu & Shiva Stuti',
          description: 'Setubandhe Tu Ramesham — Southern pinnacle of the Jyotirlinga circuit.',
        },
        colorAccent: '#059669',
        latitude: 9.288,
        longitude: 79.317,
      },
    ],
    edges: [
      { fromId: 'somnath', toId: 'mallikarjuna', label: 'West to South' },
      { fromId: 'mallikarjuna', toId: 'mahakaleshwar', label: 'Central Light' },
      { fromId: 'mahakaleshwar', toId: 'omkareshwar', label: 'Pranava Twin' },
      { fromId: 'omkareshwar', toId: 'kedarnath', label: 'Ascent to Himalayas' },
      { fromId: 'kedarnath', toId: 'kashi-vishwanath', label: 'Ganga Descent' },
      { fromId: 'kashi-vishwanath', toId: 'rameswaram', label: 'Moksha Bridge' },
    ],
  },
  'char-dham': {
    id: 'char-dham',
    title: 'The Great Char Dham Mahayatra',
    sanskritTitle: 'महा चार धाम तीर्थ यात्रा',
    tradition: 'sanatan',
    subtitle: 'The Four Cardinal Shrines of Sanatana Dharma',
    description: 'Established by Jagadguru Adi Shankaracharya across the four geographical extremities of India, defining the spiritual geometry of the subcontinent.',
    rootNodeId: 'badrinath',
    temples: [
      {
        id: 'badrinath',
        name: 'Badrinath Dham (North)',
        sanskritName: 'बद्रीनाथ धाम (उत्तर)',
        deity: 'Lord Badri Vishal (Narayana in Padmasana)',
        location: 'Chamoli, Uttarakhand (Alaknanda River)',
        stateOrRegion: 'Uttarakhand (Himalayas)',
        sacredRiverOrKund: 'Alaknanda River & Tapt Kund (Thermal Spring)',
        architecturalStyle: 'Traditional Garhwali / Tibetan Pagoda Facade',
        sthalaPurana: 'Where Lord Vishnu performed severe penance (Tapasya) under the Badri (jujube) tree, shielded from the elements by Mother Lakshmi.',
        significance: 'The northern guardian of Dharma and supreme Vaishnava shrine in the Himalayas.',
        offerings: ['Chandan Lepanam', 'Tulsi Garlands', 'Ghee Lamps'],
        stotraOrChant: {
          title: 'Badrinath Stotram',
          description: 'Narada-Sevya-Pada-Pankaja — Devotional salutation to Lord Badri Narayana.',
        },
        colorAccent: '#D97706',
        latitude: 30.743,
        longitude: 79.493,
      },
      {
        id: 'dwarkadhish',
        name: 'Dwarkadhish Dham (West)',
        sanskritName: 'द्वारकाधीश धाम (पश्चिम)',
        deity: 'Lord Sri Krishna (King of Dwarka)',
        location: 'Dwarka, Gujarat (Arabian Sea)',
        stateOrRegion: 'Gujarat',
        sacredRiverOrKund: 'Gomti River & Arabian Sea Sangam',
        architecturalStyle: 'Maha-Chalukya (72 Pillared Jagat Mandir, 78m Spire)',
        sthalaPurana: 'The golden capital city (*Dvaravati*) built by Vishvakarma where Bhagwan Sri Krishna ruled as King of Dharma after Mathura.',
        significance: 'The western gateway to liberation (*Moksha Puri*), radiating royal grace and protective power.',
        offerings: ['52-Yard Flag (Dhwajarohan)', 'Tulsi Leaves', 'Makhan Mishri Prashad'],
        stotraOrChant: {
          title: 'Dwarkadhish Aarti',
          description: 'Aarti Kunj Bihari Ki, Shri Girdhar Krishna Murari Ki.',
        },
        colorAccent: '#EA580C',
        latitude: 22.237,
        longitude: 68.968,
      },
      {
        id: 'puri-jagannath',
        name: 'Puri Jagannath Dham (East)',
        sanskritName: 'जगन्नाथ पुरी धाम (पूर्व)',
        deity: 'Lord Jagannath, Balabhadra & Subhadra',
        location: 'Puri, Odisha (Bay of Bengal)',
        stateOrRegion: 'Odisha',
        sacredRiverOrKund: 'Mahodadhi (Bay of Bengal) & Indradyumna Tank',
        architecturalStyle: 'Kalinga Architecture (Deula with Nilachakra)',
        sthalaPurana: 'The Lord of the Universe who eats in Puri, sleeps in Dwarka, bathes in Rameswaram, and meditates in Badrinath. Famous for the world-renowned Ratha Yatra.',
        significance: 'The supreme abode of universal brotherhood and divine Mahaprasad.',
        offerings: ['56 Bhog (Chhappan Bhog)', 'Khandua Silk Pata', 'Tulsi & Lotus'],
        stotraOrChant: {
          title: 'Jagannathashtakam',
          description: 'Kadachit Kalindi-Tata-Vipina-Sangita-Taralo Jagannatha-Swami Nayana-Patha-Gami Bhavatu Me.',
        },
        colorAccent: '#2563EB',
        latitude: 19.805,
        longitude: 85.818,
      },
      {
        id: 'rameshwaram-dham',
        name: 'Rameshwaram Dham (South)',
        sanskritName: 'रामेश्वरम् धाम (दक्षिण)',
        deity: 'Lord Ramanathaswamy (Installed by Sri Rama)',
        location: 'Rameswaram, Tamil Nadu',
        stateOrRegion: 'Tamil Nadu',
        sacredRiverOrKund: 'Agni Theertham & 22 Temple Wells',
        architecturalStyle: 'Grand Dravidian Gopurams & Stone Corridors',
        sthalaPurana: 'Where Sri Rama installed the Lingam to worship Shiva after the battle of Lanka, linking Vaishnava and Shaiva devotion forever.',
        significance: 'Southern anchor of the Char Dham, completing the sacred pilgrim circuit of India.',
        offerings: ['Ganga Jal Abhishekam', 'Bilva Patra', 'Agni Theertha Snana'],
        colorAccent: '#059669',
        latitude: 9.288,
        longitude: 79.317,
      },
    ],
    edges: [
      { fromId: 'badrinath', toId: 'dwarkadhish', label: 'North to West' },
      { fromId: 'dwarkadhish', toId: 'rameshwaram-dham', label: 'West to South' },
      { fromId: 'rameshwaram-dham', toId: 'puri-jagannath', label: 'South to East' },
      { fromId: 'puri-jagannath', toId: 'badrinath', label: 'East to North Circuit' },
    ],
  },
  'sikh-panj-takht': {
    id: 'sikh-panj-takht',
    title: 'The Sikh Panj Takht Yatra',
    sanskritTitle: 'पञ्च तख्त पवित्र यात्रा',
    tradition: 'sikh',
    subtitle: 'The Five Sacred Thrones of Temporal & Spiritual Authority',
    description: 'The five Takhts (Thrones) of supreme spiritual and temporal authority (Miri-Piri) established by the Sikh Gurus.',
    rootNodeId: 'akal-takht',
    temples: [
      {
        id: 'akal-takht',
        name: 'Sri Akal Takht Sahib',
        sanskritName: 'श्री अकाल तख़्त साहिब',
        deity: 'The Timeless Throne (Waheguru)',
        location: 'Amritsar, Punjab (Opposite Sri Harmandir Sahib)',
        stateOrRegion: 'Punjab',
        sacredRiverOrKund: 'Amrit Sarovar',
        architecturalStyle: 'Sikh Architecture with Gilded Domes',
        sthalaPurana: 'Established in 1606 by Guru Hargobind Ji as the Throne of the Timeless (Akal), symbolizing sovereignty, justice, and spiritual bravery (Miri-Piri).',
        significance: 'The supreme decision-making seat for the global Sikh Panth.',
        offerings: ['Karah Prashad', 'Shabad Kirtan', 'Langar Seva'],
        colorAccent: '#D97706',
        latitude: 31.62,
        longitude: 74.876,
      },
      {
        id: 'patna-sahib',
        name: 'Takht Sri Patna Sahib',
        sanskritName: 'तख़्त श्री पटना साहिब',
        deity: 'Birthplace of Guru Gobind Singh Ji',
        location: 'Patna, Bihar (Ganga River)',
        stateOrRegion: 'Bihar',
        sacredRiverOrKund: 'Ganga River',
        architecturalStyle: 'White Marble Sikh Shrine',
        sthalaPurana: 'The birthplace of the tenth master, Guru Gobind Singh Ji in 1666, who founded the Khalsa Panth.',
        significance: 'Preserves sacred historical relics including the Guru’s childhood weapons and cradle.',
        offerings: ['Karah Prashad', 'Nitnem Path', 'Seva'],
        colorAccent: '#EA580C',
        latitude: 25.597,
        longitude: 85.228,
      },
      {
        id: 'keshgarh-sahib',
        name: 'Takht Sri Keshgarh Sahib',
        sanskritName: 'तख़्त श्री केशगढ़ साहिब (आनंदपुर)',
        deity: 'Birthplace of the Khalsa',
        location: 'Anandpur Sahib, Punjab',
        stateOrRegion: 'Punjab',
        sacredRiverOrKund: 'Charan Ganga',
        architecturalStyle: 'Hilltop Fortress Gurdwara',
        sthalaPurana: 'Where Guru Gobind Singh Ji initiated the Panj Pyare on Vaisakhi 1699 and created the Khalsa.',
        significance: 'Birthplace of the Khalsa order, celebrating supreme sacrifice and valor.',
        offerings: ['Amrit Sanchar', 'Karah Prashad', 'Gurbani Chanting'],
        colorAccent: '#2563EB',
        latitude: 31.235,
        longitude: 76.498,
      },
      {
        id: 'hazur-sahib',
        name: 'Takht Sachkhand Sri Hazur Sahib',
        sanskritName: 'तख़्त सचखण्ड श्री हजूर साहिब',
        deity: 'Abode of Eternal Truth',
        location: 'Nanded, Maharashtra (Godavari River)',
        stateOrRegion: 'Maharashtra',
        sacredRiverOrKund: 'Godavari River',
        architecturalStyle: 'Marble Complex with Golden Finials',
        sthalaPurana: 'Where Guru Gobind Singh Ji spent his final days in 1708 and conferred the eternal Guruship onto the Sri Guru Granth Sahib Ji.',
        significance: 'Where the living Guru was established forever in the holy scripture.',
        offerings: ['Aarti (Gagan Mein Thaal)', 'Karah Prashad', 'Degh Seva'],
        colorAccent: '#059669',
        latitude: 19.152,
        longitude: 77.319,
      },
    ],
    edges: [
      { fromId: 'akal-takht', toId: 'keshgarh-sahib', label: 'Punjab Core' },
      { fromId: 'keshgarh-sahib', toId: 'patna-sahib', label: 'Birthplace Connection' },
      { fromId: 'patna-sahib', toId: 'hazur-sahib', label: 'Guruship Conferred' },
    ],
  },
};

export function getYatraList(): YatraCircuit[] {
  return Object.values(SACRED_YATRA_CIRCUITS);
}

export function getYatraById(id: string): YatraCircuit | null {
  return SACRED_YATRA_CIRCUITS[id] ?? null;
}
