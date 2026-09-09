/**
 * Sacred Lineages & Guru Parampara Data
 * 
 * Strict Spiritual Governance:
 * Canonical teacher-disciple lineages, historical eras, core contributions,
 * and scriptural associations across Hindu, Sikh, Jain, and Buddhist traditions.
 */

export type LineageTradition = 'sanatan' | 'sikh' | 'jain' | 'buddhist';

export interface LineageNode {
  id: string;
  name: string;
  sanskritName?: string;
  title: string;
  era: string; // e.g. "8th Century CE"
  location?: string;
  vedaOrScripture?: string;
  mahavakya?: string;
  summary: string;
  keyContributions: string[];
  stotraOrChant?: {
    title: string;
    description: string;
    audioUrl?: string;
  };
  iconName?: string; // Feather icon or SacredIcon identifier
  colorAccent?: string;
}

export interface LineageEdge {
  fromId: string;
  toId: string;
  label?: string; // e.g. "Primary Disciple", "Direct Successor"
}

export interface Lineage {
  id: string;
  title: string;
  sanskritTitle: string;
  tradition: LineageTradition;
  subtitle: string;
  description: string;
  rootNodeId: string;
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export const SACRED_LINEAGES: Record<string, Lineage> = {
  'advaita-shankara': {
    id: 'advaita-shankara',
    title: 'Adi Shankaracharya & 4 Amnaya Mathas',
    sanskritTitle: 'शङ्कराचार्य गुरु परम्परा',
    tradition: 'sanatan',
    subtitle: 'The Four Cardinal Pillars of Advaita Vedanta',
    description: 'Jagadguru Adi Shankaracharya established four sacred monastic centers across the four corners of India to preserve the four Vedas and teach Non-Dual Awareness (Advaita).',
    rootNodeId: 'adi-shankara',
    nodes: [
      {
        id: 'adi-shankara',
        name: 'Adi Shankaracharya',
        sanskritName: 'आदि शङ्कराचार्य',
        title: 'Jagadguru (Reviver of Advaita Vedanta)',
        era: '8th Century CE',
        location: 'Kalady, Kerala / All India',
        summary: 'Philosopher, master dialectician, and commentator on the Prasthanatrayi (Upanishads, Bhagavad Gita, and Brahma Sutras).',
        keyContributions: [
          'Commentaries (Bhashyas) on the Principal Upanishads and Gita',
          'Authored sacred stotras: Soundarya Lahari, Bhaja Govindam, Nirvana Shatkam',
          'Established the Shanmata system unifying six major deities into one cosmic truth',
          'Founded the 4 Amnaya Mathas and Dashanami Sampradaya',
        ],
        stotraOrChant: {
          title: 'Nirvana Shatkam',
          description: 'Mano-Buddhi-Ahankara Chittaani Naaham (Chidananda Rupah Shivoham Shivoham)',
        },
        colorAccent: '#D97706',
      },
      {
        id: 'sringeri-peetham',
        name: 'Dakshinamnaya Sringeri Sharada Peetham',
        sanskritName: 'शृङ्गेरी शारदा पीठम् (दक्षिण)',
        title: 'Southern Peetham (Yajurveda)',
        era: 'Established c. 8th Century CE',
        location: 'Chikkamagaluru, Karnataka',
        vedaOrScripture: 'Yajurveda',
        mahavakya: 'Aham Brahmasmi (अहं ब्रह्मास्मि)',
        summary: 'Presided originally by Acharya Sureshvara. Dedicated to Mother Sharadamba and seated on the banks of the sacred Tunga river.',
        keyContributions: [
          'Guards the Yajurvedic spiritual heritage',
          'Preserved Advaita Vedanta uninterrupted through centuries',
          'Centre of classical Sanskrit scholarship and Vedic chanting',
        ],
        stotraOrChant: {
          title: 'Sharada Bhujanga Prayata Ashtakam',
          description: 'Composed by Adi Shankara in devotion to Goddess Sharada at Sringeri.',
        },
        colorAccent: '#B45309',
      },
      {
        id: 'puri-peetham',
        name: 'Purvamnaya Govardhan Matha',
        sanskritName: 'गोवर्धन मठम्, पुरी (पूर्व)',
        title: 'Eastern Peetham (Rigveda)',
        era: 'Established c. 8th Century CE',
        location: 'Puri, Odisha',
        vedaOrScripture: 'Rigveda',
        mahavakya: 'Prajnanam Brahma (प्रज्ञानं ब्रह्म)',
        summary: 'Presided originally by Acharya Padmapada. Directly linked to the sacred Sri Jagannath temple at Puri.',
        keyContributions: [
          'Guards the Rigvedic lineage and Purvamnaya traditions',
          'Vedic mathematics and ritual preservation',
          'Spiritual guidance for coastal eastern India and holy Jagannath Kshetra',
        ],
        stotraOrChant: {
          title: 'Jagannathashtakam',
          description: 'Kadachit Kalindi-Tata-Vipina-Sangita-Taralo (Jagannatha Swami Nayana-Patha-Gami Bhavatu Me)',
        },
        colorAccent: '#EA580C',
      },
      {
        id: 'dwarka-peetham',
        name: 'Pashchimamnaya Sharada Matha',
        sanskritName: 'द्वारका शारदा पीठम् (पश्चिम)',
        title: 'Western Peetham (Samaveda)',
        era: 'Established c. 8th Century CE',
        location: 'Dwarka, Gujarat',
        vedaOrScripture: 'Samaveda',
        mahavakya: 'Tat Tvam Asi (तत्त्वमसि)',
        summary: 'Presided originally by Acharya Hastamalaka. Located at the holy city of Lord Krishna (Dwarakadheesh).',
        keyContributions: [
          'Guards the Samavedic melodic and ritual knowledge',
          'Focus on meditation, self-realization, and western pilgrimage corridors',
          'Extensive scholarship on Hastamalakiyam and non-dual contemplation',
        ],
        stotraOrChant: {
          title: 'Acyutashtakam',
          description: 'Acyutam Keshavam Rama Narayanam Krishna Damodaram Vasudevam Harim',
        },
        colorAccent: '#D97706',
      },
      {
        id: 'jyotirmath-peetham',
        name: 'Uttaramnaya Jyotirmath Badrikashram',
        sanskritName: 'ज्योतिर्मठम्, बदरिकाश्रम (उत्तर)',
        title: 'Northern Peetham (Atharvaveda)',
        era: 'Established c. 8th Century CE',
        location: 'Joshimath / Badrinath, Uttarakhand',
        vedaOrScripture: 'Atharvaveda',
        mahavakya: 'Ayam Atma Brahma (अयमात्मा ब्रह्म)',
        summary: 'Presided originally by Acharya Totakacharya. Situated in the high Himalayas at the gateway to sacred Badrinath.',
        keyContributions: [
          'Guards the Atharvavedic hymns, mantras, and Himalayan tapas traditions',
          'Spiritual sanctuary for seekers traveling to the Char Dham',
          'Preserved Totakashtakam celebrating the Guru-disciple grace',
        ],
        stotraOrChant: {
          title: 'Totakashtakam',
          description: 'Viditakhila-Shastra-Sudha-Jaladhe Mahito-Panishat-Kathitartha-Nidhe',
        },
        colorAccent: '#4F46E5',
      },
    ],
    edges: [
      { fromId: 'adi-shankara', toId: 'sringeri-peetham', label: 'South (Yajur)' },
      { fromId: 'adi-shankara', toId: 'puri-peetham', label: 'East (Rig)' },
      { fromId: 'adi-shankara', toId: 'dwarka-peetham', label: 'West (Sama)' },
      { fromId: 'adi-shankara', toId: 'jyotirmath-peetham', label: 'North (Atharva)' },
    ],
  },

  'sikh-gurus': {
    id: 'sikh-gurus',
    title: 'The Ten Sikh Gurus',
    sanskritTitle: 'ਦਸ ਗੁਰੂ ਸਾਹਿਬਾਨ (ਦਸਮ ਪਾਤਸ਼ਾਹੀ)',
    tradition: 'sikh',
    subtitle: 'From Divine Light to Eternal Scripture',
    description: 'The unbroken spiritual lineage of the Ten Gurus of Sikhism (1469–1708 CE), culminating in Sri Guru Granth Sahib Ji as the eternal living Guru.',
    rootNodeId: 'guru-nanak',
    nodes: [
      {
        id: 'guru-nanak',
        name: 'Guru Nanak Dev Ji',
        sanskritName: 'ਸ੍ਰੀ ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ',
        title: '1st Guru & Founder of Sikhism',
        era: '1469 – 1539 CE',
        location: 'Nankana Sahib / Kartarpur',
        summary: 'Revealed Ik Onkar (One Universal Creator), universal equality, Vand Chhako (share), Kirat Karo (honest work), and Naam Japna (remembering God).',
        keyContributions: [
          'Japji Sahib and Asa Di Var compositions',
          'Instituted the egalitarian Langar (community kitchen) tradition',
          'Extensive journeys (Udasis) across India, Tibet, Middle East, and Sri Lanka',
        ],
        stotraOrChant: {
          title: 'Mool Mantar',
          description: 'Ik Onkar Satnaam Karta Purakh Nirbhau Nirvair Akal Moorat Ajooni Saibhang Gurprasaad',
        },
        colorAccent: '#D97706',
      },
      {
        id: 'guru-angad',
        name: 'Guru Angad Dev Ji',
        sanskritName: 'ਸ੍ਰੀ ਗੁਰੂ ਅੰਗਦ ਦੇਵ ਜੀ',
        title: '2nd Guru (Standardized Gurmukhi)',
        era: '1504 – 1552 CE',
        location: 'Khadur Sahib',
        summary: 'Standardized the Gurmukhi script and promoted education and physical fitness (Mal Akhara) for spiritual discipline.',
        keyContributions: ['Standardized Gurmukhi script', 'Strengthened the institution of Langar', 'Compiled early hymns of Guru Nanak Dev Ji'],
        colorAccent: '#D97706',
      },
      {
        id: 'guru-amar-das',
        name: 'Guru Amar Das Ji',
        sanskritName: 'ਸ੍ਰੀ ਗੁਰੂ ਅਮਰ ਦਾਸ ਜੀ',
        title: '3rd Guru (Equality & Manji System)',
        era: '1479 – 1574 CE',
        location: 'Goindval Sahib',
        summary: 'Established the Manji system of spiritual districts, fought against caste discrimination and gender inequality.',
        keyContributions: ['Composed the Anand Sahib hymn of divine bliss', 'Pangat Pehle, Sangat Baad (first sit in equality, then meet)', 'Established Goindval Baoli Sahib'],
        colorAccent: '#D97706',
      },
      {
        id: 'guru-ram-das',
        name: 'Guru Ram Das Ji',
        sanskritName: 'ਸ੍ਰੀ ਗੁਰੂ ਰਾਮ ਦਾਸ ਜੀ',
        title: '4th Guru (Founder of Amritsar)',
        era: '1534 – 1581 CE',
        location: 'Amritsar (Ramdaspur)',
        summary: 'Founded the holy city of Amritsar and composed the sacred Anand Karaj (Lavan) marriage hymns.',
        keyContributions: ['Founded Amritsar (Chakk Ramdas)', 'Composed the Lavan wedding hymns', 'Initiated construction of Sri Harmandir Sahib Sarovar'],
        colorAccent: '#D97706',
      },
      {
        id: 'guru-arjan',
        name: 'Guru Arjan Dev Ji',
        sanskritName: 'ਸ੍ਰੀ ਗੁਰੂ ਅਰਜਨ ਦੇਵ ਜੀ',
        title: '5th Guru & First Martyr (Compiler of Adi Granth)',
        era: '1563 – 1606 CE',
        location: 'Amritsar / Lahore',
        summary: 'Compiled the Adi Granth in 1604 CE and completed the construction of Sri Harmandir Sahib with four open doors symbolizing openness to all.',
        keyContributions: [
          'Compiled the Adi Granth uniting hymns of Gurus and Bhakti/Sufi saints',
          'Composed Sukhmani Sahib (Psalm of Peace)',
          'First martyr for religious freedom and sovereign faith',
        ],
        stotraOrChant: {
          title: 'Sukhmani Sahib',
          description: 'Sukhmani Sukh Amrit Prabh Naam, Bhagat Jana Ke Man Bisram',
        },
        colorAccent: '#D97706',
      },
      {
        id: 'guru-gobind-singh',
        name: 'Guru Gobind Singh Ji',
        sanskritName: 'ਸ੍ਰੀ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ',
        title: '10th Guru & Creator of the Khalsa',
        era: '1666 – 1708 CE',
        location: 'Patna Sahib / Anandpur Sahib',
        summary: 'Warrior-poet, philosopher, created the Khalsa order in 1699 at Anandpur Sahib, and conferred eternal Guruship upon Sri Guru Granth Sahib Ji.',
        keyContributions: [
          'Created the Khalsa on Vaisakhi 1699',
          'Composed Jaap Sahib, Tav-Prasad Savaiye, and Zafarnama',
          'Conferred eternal living Guruship to Guru Granth Sahib Ji',
        ],
        stotraOrChant: {
          title: 'Jaap Sahib & Deh Shiva',
          description: 'Deh Shiva Bar Mohe Ehai Shubh Karman Te Kabhoon Na Taron',
        },
        colorAccent: '#B45309',
      },
      {
        id: 'guru-granth-sahib',
        name: 'Sri Guru Granth Sahib Ji',
        sanskritName: 'ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ',
        title: 'Eternal Living Guru',
        era: '1708 CE – Eternal',
        location: 'Universal / In every Gurdwara',
        summary: 'The living Word of God containing 5,894 sacred hymns across 31 classical Ragas from the Sikh Gurus and 15 saints across India.',
        keyContributions: [
          'Eternal spiritual guide of the Sikh Panth',
          'Synthesizes universal non-dual truth, selfless love, and righteous action',
        ],
        colorAccent: '#CA8A04',
      },
    ],
    edges: [
      { fromId: 'guru-nanak', toId: 'guru-angad' },
      { fromId: 'guru-angad', toId: 'guru-amar-das' },
      { fromId: 'guru-amar-das', toId: 'guru-ram-das' },
      { fromId: 'guru-ram-das', toId: 'guru-arjan' },
      { fromId: 'guru-arjan', toId: 'guru-gobind-singh', label: 'Unbroken Line' },
      { fromId: 'guru-gobind-singh', toId: 'guru-granth-sahib', label: 'Eternal Guruship' },
    ],
  },

  'jain-tirthankaras': {
    id: 'jain-tirthankaras',
    title: 'The 24 Jain Tirthankaras',
    sanskritTitle: 'चतुर्विंशति तीर्थङ्कर परम्परा',
    tradition: 'jain',
    subtitle: 'The Spiritual Ford-Makers of Ahimsa & Anekantavada',
    description: 'The timeless lineage of enlightened teachers who conquered the cycle of rebirth (Samsara) and established the path of supreme non-violence (Ahimsa), truth (Satya), and non-possession (Aparigraha).',
    rootNodeId: 'rishabhanatha',
    nodes: [
      {
        id: 'rishabhanatha',
        name: 'Bhagwan Rishabhanatha (Adinatha)',
        sanskritName: 'भगवान् ऋषभनाथ (आदिनाथ)',
        title: '1st Tirthankara (Symbol: Bull)',
        era: 'Beginning of Avasarpini era',
        location: 'Ayodhya / Ashtapada',
        summary: 'The first Tirthankara who laid the foundations of civilized society, agriculture, writing (Brahmi script), and supreme ascetic detachment.',
        keyContributions: [
          'Founded the spiritual path of Moksha-Marga in the current era',
          'Father of Bharata Chakravartin and Bahubali (symbol of supreme renunciation)',
          'Established fundamental principles of ethical living',
        ],
        stotraOrChant: {
          title: 'Bhaktamara Stotra (Adinatha Stuti)',
          description: 'Bhaktamara-Pranata-Mauli-Mani-Prabhanaam-Uddyotakam Dalita-Papa-Tamo-Vitanam',
        },
        colorAccent: '#D97706',
      },
      {
        id: 'parshvanatha',
        name: 'Bhagwan Parshvanatha',
        sanskritName: 'भगवान् पार्श्वनाथ',
        title: '23rd Tirthankara (Symbol: Serpent)',
        era: '9th Century BCE (c. 877 – 777 BCE)',
        location: 'Varanasi / Sammed Shikharji',
        summary: 'Historical Tirthankara who preached the fourfold vows (Chaturyama Dharma) and attained Nirvana atop sacred Sammed Shikharji.',
        keyContributions: [
          'Established Ahimsa, Satya, Asteya, and Aparigraha',
          'Supreme forbearance (Kshama) amidst adversity',
          'Consecrated Sammed Shikharji as the holiest Jain pilgrimage',
        ],
        colorAccent: '#059669',
      },
      {
        id: 'mahavira',
        name: 'Bhagwan Mahavira (Vardhamana)',
        sanskritName: 'भगवान् महावीर (वर्धमान)',
        title: '24th Tirthankara (Symbol: Lion)',
        era: '6th Century BCE (c. 599 – 527 BCE)',
        location: 'Kundalpur, Vaishali / Pavapuri',
        summary: 'Revived and codified the five great vows (Mahavratas), established Anekantavada (multi-sided reality) and Syadvada, attaining Nirvana at Pavapuri.',
        keyContributions: [
          'Formulated Ahimsa Paramo Dharma as a universal law of existence',
          'Established Anekantavada and Syadvada (relativity of perspective)',
          'Formulated the 5 Mahavratas by integrating Brahmacharya',
        ],
        stotraOrChant: {
          title: 'Namokar Mahamantra',
          description: 'Namo Arihantanam, Namo Siddhanam, Namo Ayariyanam, Namo Uvajjhayanam, Namo Loe Savva Sahunam',
        },
        colorAccent: '#EA580C',
      },
    ],
    edges: [
      { fromId: 'rishabhanatha', toId: 'parshvanatha', label: 'Ancient Lineage' },
      { fromId: 'parshvanatha', toId: 'mahavira', label: '24th Tirthankara' },
    ],
  },
  'sanatana-shastra-map': {
    id: 'sanatana-shastra-map',
    title: 'Sanatana Shastra Map',
    sanskritTitle: 'सनातन शास्त्र परम्परा',
    tradition: 'sanatan',
    subtitle: 'The Cosmic Library of Vedas, Upanishads & Darshanas',
    description: 'The timeless hierarchy of Sanatana Dharma scriptures: from the foundational breath of the Vedas (Shruti) and the non-dual realizations of the Upanishads to the 6 classical Darshanas, Bhagavad Gita, and Puranas.',
    rootNodeId: 'four-vedas',
    nodes: [
      {
        id: 'four-vedas',
        name: 'The Four Vedas (Shruti)',
        sanskritName: 'चतुर्वेदाः (ऋग्, यजुर्, साम, अथर्व)',
        title: 'Foundational Divine Revelation (Apaurusheya)',
        era: 'Timeless / Vedic Era',
        location: 'Sapta Sindhu / Aryavarta',
        summary: 'The eternal sonic vibrations heard by ancient Rishis in deep Samadhi. Form the supreme authority and bedrock of Sanatana Dharma.',
        keyContributions: [
          'Rigveda: Sacred hymns of cosmic order (Rita) & Gayatri Mantra',
          'Yajurveda: Sacrificial mantras and inner ritual sciences',
          'Samaveda: Melodic chants (Gandharva Veda) and devotional ecstasy',
          'Atharvaveda: Practical sciences, medicine (Ayurveda), and daily mantras',
        ],
        stotraOrChant: {
          title: 'Purusha Suktam (Rigveda 10.90)',
          description: 'Sahasra Shirsha Purushah Sahasrakshah Sahasrapat — Cosmic vision of the Supreme.',
        },
        colorAccent: '#D97706',
      },
      {
        id: 'upanishads',
        name: 'The 108 Upanishads (Vedanta)',
        sanskritName: 'उपनिषदः (ज्ञानकाण्ड)',
        title: 'Peak of Spiritual Realization',
        era: 'c. 1500 – 500 BCE',
        location: 'Ashrams of Ancient Rishis',
        vedaOrScripture: 'Prasthanatrayi',
        mahavakya: 'Prajnanam Brahma · Tat Tvam Asi · Ayam Atma Brahma · Aham Brahmasmi',
        summary: 'The secret essence (Jnana Kanda) of the Vedas revealing the oneness of the Individual Self (Atman) with the Supreme Reality (Brahman).',
        keyContributions: [
          'Mundaka Upanishad: Satyameva Jayate (Truth alone triumphs)',
          'Katha Upanishad: Nachiketa’s immortal dialogue with Yama',
          'Mandukya Upanishad: The four states of consciousness (A-U-M)',
          'Brihadaranyaka: Asato Ma Sadgamaya, Tamaso Ma Jyotirgamaya',
        ],
        stotraOrChant: {
          title: 'Shanti Mantra (Isha Upanishad)',
          description: 'Om Purnamadah Purnamidam Purnat Purnamudachyate — The Fullness of the Infinite.',
        },
        colorAccent: '#B45309',
      },
      {
        id: 'vedangas',
        name: 'The 6 Vedangas',
        sanskritName: 'षडङ्गाः (वेद के ६ अङ्ग)',
        title: 'Auxiliary Sciences of Knowledge',
        era: 'Classical Vedic Period',
        summary: 'Six sacred disciplines necessary to understand, pronounce, chant, and apply Vedic mantras with precision.',
        keyContributions: [
          'Shiksha: Science of proper phonetics & pronunciation',
          'Chandas: Metric science of poetic meters (Gayatri, Anushtup, Trishtup)',
          'Vyakarana: Paninian grammar and linguistic structure',
          'Nirukta: Etymology and semantic root analysis (Yaska)',
          'Jyotisha: Astronomical timing of sacred observances and seasons',
          'Kalpa: Practical rules of rituals, ethics, and geometry (Shulba Sutras)',
        ],
        colorAccent: '#059669',
      },
      {
        id: 'shad-darshanas',
        name: 'The 6 Classical Darshanas',
        sanskritName: 'षड्दर्शनानि (आस्तिक दर्शन)',
        title: 'Schools of Indian Philosophy',
        era: 'c. 6th – 2nd Century BCE',
        summary: 'Six profound philosophical perspectives exploring epistemological truth, liberation (Moksha), consciousness, and the universe.',
        keyContributions: [
          'Nyaya (Sage Gautama): Logic, debate, and valid sources of knowledge',
          'Vaisheshika (Sage Kanada): Atomism, metaphysics, and physical reality',
          'Samkhya (Sage Kapila): Dualism of Consciousness (Purusha) & Nature (Prakriti)',
          'Yoga (Maharishi Patanjali): Ashtanga Yoga (8 Limbs of Self-Mastery)',
          'Purva Mimamsa (Sage Jaimini): Dharma, Vedic rituals, and ethical action',
          'Uttara Mimamsa / Vedanta (Sage Badarayana): Non-dual Advaita & devotion',
        ],
        stotraOrChant: {
          title: 'Patanjali Yoga Sutra Opening',
          description: 'Atha Yoganushasanam — Yogash Chitta Vritti Nirodhah.',
        },
        colorAccent: '#7C3AED',
      },
      {
        id: 'bhagavad-gita',
        name: 'Srimad Bhagavad Gita',
        sanskritName: 'श्रीमद्भगवद्गीता (गीतोपनिषद्)',
        title: 'Song of the Divine / Essence of Upanishads',
        era: 'Mahabharata Era (Kurukshetra)',
        location: 'Kurukshetra, Haryana',
        vedaOrScripture: 'Smriti Prasthana',
        mahavakya: 'Karmanye Vadhikaraste Ma Phaleshu Kadachana',
        summary: '700-verse dialogue between Bhagwan Sri Krishna and Arjuna on the battlefield of life, synthesizing Karma Yoga, Bhakti Yoga, Raja Yoga, and Jnana Yoga.',
        keyContributions: [
          'Karma Yoga: Selfless action free from attachment to fruits',
          'Bhakti Yoga: Loving surrender and universal compassion',
          'Jnana Yoga: Discrimination between the eternal Soul and mortal body',
          'Vishwarupa Darshana: Cosmic universal vision of Divinity',
        ],
        stotraOrChant: {
          title: 'Gita Mahatmya (Gita Dhyanam)',
          description: 'Sarvopanishado Gavo Dogdha Gopala Nandanah — The Upanishads are cows, Krishna is the milkman.',
        },
        colorAccent: '#EA580C',
      },
      {
        id: 'itihasa-purana',
        name: 'Itihasas & 18 Mahapuranas',
        sanskritName: 'इतिहास एवं १८ महापुराण',
        title: 'Sacred Epics & Living Traditions',
        era: 'Sage Valmiki & Sage Veda Vyasa Era',
        location: 'All India / Naimisharanya',
        summary: 'The living spiritual epics (Ramayana and Mahabharata) and 18 Mahapuranas translating high Vedic philosophy into stories, ethics, devotion, and culture.',
        keyContributions: [
          'Valmiki Ramayana: Maryada Purushottama Dharma & devotion',
          'Mahabharata: Comprehensive epic of Dharma, Artha, Kama, and Moksha',
          '18 Mahapuranas: Vishnu, Shiva, Devi Bhagavata, Srimad Bhagavatam',
          'Agamas & Tantras: Temple architecture, deity consecration, and upasana',
        ],
        stotraOrChant: {
          title: 'Aditya Hridaya Stotra',
          description: 'From Valmiki Ramayana Yuddha Kanda, taught by Sage Agastya to Lord Rama.',
        },
        colorAccent: '#2563EB',
      },
    ],
    edges: [
      { fromId: 'four-vedas', toId: 'upanishads', label: 'Jnana Kanda' },
      { fromId: 'four-vedas', toId: 'vedangas', label: '6 Limbs' },
      { fromId: 'upanishads', toId: 'shad-darshanas', label: 'Philosophies' },
      { fromId: 'upanishads', toId: 'bhagavad-gita', label: 'Gita Essence' },
      { fromId: 'four-vedas', toId: 'itihasa-purana', label: 'Epics & Puranas' },
    ],
  },
  'dincharya-ashrama-tree': {
    id: 'dincharya-ashrama-tree',
    title: 'Dincharya & Ashrama Dharma',
    sanskritTitle: 'दिनचर्या एवं आश्रम धर्म',
    tradition: 'sanatan',
    subtitle: 'The Circadian Sadhana Cycle & Lifespan Progression',
    description: 'The sacred rhythm of Sanatana Dharma: synchronizing daily hours with cosmic energies (Dincharya) and walking the four noble life stages (Chaturashrama) towards ultimate liberation (Moksha).',
    rootNodeId: 'brahma-muhurta',
    nodes: [
      {
        id: 'brahma-muhurta',
        name: 'Brahma Muhurta (Dawn Awakening)',
        sanskritName: 'ब्राह्ममुहूर्ते उत्तिष्ठेत्',
        title: '04:00 AM – 06:00 AM (Cosmic Amrit Vela)',
        era: 'Daily Circadian Cycle',
        mahavakya: 'Karagre Vasate Lakshmi, Karamadhye Saraswati',
        summary: 'The most sattvic hours before sunrise when the mind is naturally calm, prana is pure, and meditation yields immediate spiritual absorption.',
        keyContributions: [
          'Karadarshanam: Viewing palms and invoking Lakshmi, Saraswati & Govinda',
          'Bhumi Vandana: Seeking forgiveness from Mother Earth before stepping down',
          'Pranayama & Japa: Chanting Ishta mantra in silent stillness',
          'Sankalpa: Setting the righteous spiritual intention for the day',
        ],
        stotraOrChant: {
          title: 'Pratah Smarana Stotram',
          description: 'Pratah Smarami Hridi Samsphurad Atma-Tattvam — Adi Shankaracharya morning contemplation.',
        },
        colorAccent: '#D97706',
      },
      {
        id: 'pratah-sandhya',
        name: 'Pratah Sandhya (Morning Worship)',
        sanskritName: 'प्रातः सन्ध्योपासनम्',
        title: '06:00 AM – 08:00 AM (Sunrise & Solar Alignment)',
        era: 'Daily Circadian Cycle',
        vedaOrScripture: 'Rigveda Gayatri Mantra',
        summary: 'Sacred bath (Snana), offering water to the rising Sun (Surya Arghya), and chanting the sacred Gayatri Mantra for intellect illumination.',
        keyContributions: [
          'Shaucha & Snana: Physical and energetic purification',
          'Surya Namaskar & Arghya: Saluting the Sun as the visible eye of God',
          'Gayatri Japa: 108 repetitions for dhi (higher intellect) activation',
          'Puja & Deepa Prajwalana: Lighting the morning ghee lamp',
        ],
        stotraOrChant: {
          title: 'Gayatri Mahamantra',
          description: 'Om Bhur Bhuvah Svah, Tat Savitur Varenyam, Bhargo Devasya Dhimahi, Dhiyo Yo Nah Prachodayat.',
        },
        colorAccent: '#EA580C',
      },
      {
        id: 'madhyahna-karma',
        name: 'Madhyahna Karma (Righteous Action)',
        sanskritName: 'मध्याह्न कर्म एवं अन्न दान',
        title: '12:00 PM – 01:30 PM (Midday Duty & Seva)',
        era: 'Daily Circadian Cycle',
        summary: 'Transforming work into Karma Yoga, offering sattvic food to the Divine (Naivedya), and practicing charity (Anna Danam).',
        keyContributions: [
          'Karma Yoga: Performing professional duties with integrity and zero malice',
          'Bhojana Vidhi: Chanting Gita 4.24 (Brahmarpanam) before eating',
          'Atithi Seva: Sharing food with guests, birds, animals, and the needy',
          'Mitahara: Consuming pure, sattvic, seasonal meals in moderation',
        ],
        colorAccent: '#059669',
      },
      {
        id: 'sayahna-sandhya',
        name: 'Sayahna Sandhya (Twilight Transition)',
        sanskritName: 'सायं सन्ध्या एवं दीप प्रज्वलन',
        title: '05:30 PM – 07:30 PM (Sunset & Temple Aarti)',
        era: 'Daily Circadian Cycle',
        summary: 'As the sun sets, lighting evening lamps, performing twilight meditation, offering Aarti, and gathering for devotional singing.',
        keyContributions: [
          'Deepa Vandana: Shubham Karoti Kalyanam — lighting lamps for auspiciousness',
          'Sayahna Sandhyavandana: Evening solar-lunar harmonizing meditation',
          'Aarti & Kirtan: Family devotion, stotra chanting, and bell ringing',
          'Transition to Sattva: Winding down external work and entering peace',
        ],
        stotraOrChant: {
          title: 'Deepa Jyoti Stuti',
          description: 'Deepo Jyotih Param Brahma Deepo Jyotir Janardanah, Deepo Haratu Me Papam.',
        },
        colorAccent: '#7C3AED',
      },
      {
        id: 'ratri-svadhyaya',
        name: 'Ratri Svadhyaya (Night Study & Surrender)',
        sanskritName: 'रात्रि स्वाध्याय एवं शयन',
        title: '09:00 PM – 10:00 PM (Reflection & Sleep Sadhana)',
        era: 'Daily Circadian Cycle',
        summary: 'Evening scriptural reading (Svadhyaya), mental review of the day’s actions, Shanti Paatha, and offering all karma to the Supreme before sleep.',
        keyContributions: [
          'Svadhyaya: Reading one chapter of Gita, Upanishad, or holy life story',
          'Atma-Nirikshana: Self-reflection on thoughts and actions without guilt',
          'Sarva-Samarpana: Surrendering the day’s deeds to Ishvara',
          'Shanti Mantra: Chanting for universal peace before restful sleep',
        ],
        stotraOrChant: {
          title: 'Kayena Vacha Shanti Prayer',
          description: 'Kayena Vacha Manasendriyairva Buddhyatmana Va Prakriteh Swabhavat Karomi Yadyat Sakalam Parasmai Narayanayeti Samarpayami.',
        },
        colorAccent: '#2563EB',
      },
      {
        id: 'chaturashrama-ladder',
        name: 'Chaturashrama (4 Lifespan Stages)',
        sanskritName: 'चतुराश्रम धर्म (जीवन का महामार्ग)',
        title: 'Brahmacharya → Grihastha → Vanaprastha → Sannyasa',
        era: 'Lifespan Spiritual Evolution',
        summary: 'The fourfold developmental stages of human life balancing Dharma (ethics), Artha (wealth), Kama (desires), and Moksha (spiritual freedom).',
        keyContributions: [
          '1. Brahmacharya (Student): Discipline, scriptural study, Gayatri initiation',
          '2. Grihastha (Householder): Supporting society, family dharma, charity',
          '3. Vanaprastha (Retirement): Spiritual contemplation, detachment, seva',
          '4. Sannyasa (Renunciation): Total oneness with Brahman, final liberation',
        ],
        stotraOrChant: {
          title: 'Maha Mrityunjaya Mantra',
          description: 'Om Tryambakam Yajamahe Sugandhim Pushtivardhanam, Urvarukamiva Bandhanan Mrityor Mukshiya Mamritat.',
        },
        colorAccent: '#B45309',
      },
    ],
    edges: [
      { fromId: 'brahma-muhurta', toId: 'pratah-sandhya', label: 'Sunrise' },
      { fromId: 'pratah-sandhya', toId: 'madhyahna-karma', label: 'Midday Duties' },
      { fromId: 'madhyahna-karma', toId: 'sayahna-sandhya', label: 'Twilight' },
      { fromId: 'sayahna-sandhya', toId: 'ratri-svadhyaya', label: 'Night Rest' },
      { fromId: 'brahma-muhurta', toId: 'chaturashrama-ladder', label: 'Lifespan Path' },
    ],
  },
};

export function getLineageList(): Lineage[] {
  return Object.values(SACRED_LINEAGES);
}

export function getLineageById(id: string): Lineage | null {
  return SACRED_LINEAGES[id] ?? null;
}
