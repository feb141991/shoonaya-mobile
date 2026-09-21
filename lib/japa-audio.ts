// Japa Ambient Sounds & Tanpura Drones
// Defines canonical ambient soundscapes and root drone keys for Japa Sadhana.
// Sourced as authentic pure acoustic 4-string Tanpura drones (zero vocals, Sa-Pa strings).
// Bundled locally in assets/audio/tanpura/ with dedicated CDN fallbacks.

if (typeof require !== 'undefined' && require.extensions && !require.extensions['.mp3']) {
  require.extensions['.mp3'] = (module: any, filename: string) => {
    module.exports = { uri: filename };
  };
}

export type JapaSoundTrack = {
  id: string;
  label: string;
  sanskritLabel: string;
  subtitle: string;
  keyNote?: string;
  audioSource: any;
  audioUrl: string | null;
  sourceName: string;
  sourceUrl: string;
  creator: string;
  licenseLabel: string;
  attributionText: string;
  approvalStatus: 'approved' | 'provisional';
  note: string;
};

export const JAPA_SOUND_OPTIONS: JapaSoundTrack[] = [
  {
    id: 'off',
    label: 'Silent Practice',
    sanskritLabel: 'मौन साधना',
    subtitle: 'Pure silence · Breath & internal focus',
    audioSource: null,
    audioUrl: null,
    sourceName: 'Shoonaya Built-in',
    sourceUrl: '',
    creator: 'Shoonaya',
    licenseLabel: 'Built-in',
    attributionText: 'Silent practice mode.',
    approvalStatus: 'approved',
    note: 'Default practice mode without external audio.',
  },
  {
    id: 'tanpura-a',
    label: 'Tanpura (Key A)',
    sanskritLabel: 'तानपूरा (षड्ज - मन्द्रा)',
    subtitle: 'Deep · Shaiva / Dhyana grounding',
    keyNote: 'A',
    audioSource: require('@/assets/audio/tanpura/tanpura-a.mp3'),
    audioUrl: 'https://cdn.shoonaya.com/audio/tanpura/tanpura-a.mp3',
    sourceName: 'Shoonaya Acoustic Tanpura Master',
    sourceUrl: 'https://cdn.shoonaya.com/audio/tanpura/tanpura-a.mp3',
    creator: 'Shoonaya Acoustic Engine',
    licenseLabel: 'Shoonaya Master / CC0',
    attributionText: 'Pure 4-string acoustic Tanpura drone loop in Key A (Sa-Pa strings, zero vocals).',
    approvalStatus: 'approved',
    note: 'Deep grounding acoustic root drone in Key A for Shiva / Dhyana sadhana.',
  },
  {
    id: 'tanpura-c',
    label: 'Tanpura (Key C)',
    sanskritLabel: 'तानपूरा (मध्य षड्ज)',
    subtitle: 'Standard · Surya / Gayatri clarity',
    keyNote: 'C',
    audioSource: require('@/assets/audio/tanpura/tanpura-c.mp3'),
    audioUrl: 'https://cdn.shoonaya.com/audio/tanpura/tanpura-c.mp3',
    sourceName: 'Shoonaya Acoustic Tanpura Master',
    sourceUrl: 'https://cdn.shoonaya.com/audio/tanpura/tanpura-c.mp3',
    creator: 'Shoonaya Acoustic Engine',
    licenseLabel: 'Shoonaya Master / CC0',
    attributionText: 'Pure 4-string acoustic Tanpura drone loop in Key C (Sa-Pa strings, zero vocals).',
    approvalStatus: 'approved',
    note: 'Standard natural middle pitch (C) for Gayatri and morning japa.',
  },
  {
    id: 'tanpura-d',
    label: 'Tanpura (Key D)',
    sanskritLabel: 'तानपूरा (भक्ति षड्ज)',
    subtitle: 'Warm · Krishna / Bhakti devotion',
    keyNote: 'D',
    audioSource: require('@/assets/audio/tanpura/tanpura-d.mp3'),
    audioUrl: 'https://cdn.shoonaya.com/audio/tanpura/tanpura-d.mp3',
    sourceName: 'Shoonaya Acoustic Tanpura Master',
    sourceUrl: 'https://cdn.shoonaya.com/audio/tanpura/tanpura-d.mp3',
    creator: 'Shoonaya Acoustic Engine',
    licenseLabel: 'Shoonaya Master / CC0',
    attributionText: 'Pure 4-string acoustic Tanpura drone loop in Key D (Sa-Pa strings, zero vocals).',
    approvalStatus: 'approved',
    note: 'Warm melodic drone for Krishna / Rama / Bhakti practice.',
  },
  {
    id: 'tanpura-g',
    label: 'Tanpura (Key G)',
    sanskritLabel: 'तानपूरा (शक्ति षड्ज)',
    subtitle: 'High · Devi / Shakti resonance',
    keyNote: 'G',
    audioSource: require('@/assets/audio/tanpura/tanpura-g.mp3'),
    audioUrl: 'https://cdn.shoonaya.com/audio/tanpura/tanpura-g.mp3',
    sourceName: 'Shoonaya Acoustic Tanpura Master',
    sourceUrl: 'https://cdn.shoonaya.com/audio/tanpura/tanpura-g.mp3',
    creator: 'Shoonaya Acoustic Engine',
    licenseLabel: 'Shoonaya Master / CC0',
    attributionText: 'Pure 4-string acoustic Tanpura drone loop in Key G (Sa-Pa strings, zero vocals).',
    approvalStatus: 'approved',
    note: 'High vibrant acoustic resonance for Shakti / Devi chanting.',
  },
];

export const DEFAULT_JAPA_SOUND_ID = 'off';

export function getJapaSoundById(id: string | null | undefined): JapaSoundTrack {
  if (!id) return JAPA_SOUND_OPTIONS[0];
  return JAPA_SOUND_OPTIONS.find((s) => s.id === id) ?? JAPA_SOUND_OPTIONS[0];
}

export function getAllJapaSounds(): JapaSoundTrack[] {
  return JAPA_SOUND_OPTIONS;
}

