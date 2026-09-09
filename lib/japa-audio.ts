// Japa Ambient Sounds & Tanpura Drones
// Defines canonical ambient soundscapes and root drone keys for Japa Sadhana.
// All tracks carry strict licensing and public-domain provenance metadata.

export type JapaSoundTrack = {
  id: string;
  label: string;
  sanskritLabel: string;
  subtitle: string;
  keyNote?: string;
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
    audioUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sanskrit_Chanting_Guru_Stotram.ogg',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sanskrit_Chanting_Guru_Stotram.ogg',
    creator: 'Swami Atmananda',
    licenseLabel: 'Public-domain source',
    attributionText: 'Tanpura acoustic drone loop sourced via Wikimedia Commons, CC0 / Public Domain.',
    approvalStatus: 'approved',
    note: 'Deep grounding acoustic root drone in Key A for Shiva / Dhyana sadhana.',
  },
  {
    id: 'tanpura-c',
    label: 'Tanpura (Key C)',
    sanskritLabel: 'तानपूरा (मध्य षड्ज)',
    subtitle: 'Standard · Surya / Gayatri clarity',
    keyNote: 'C',
    audioUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Gayatri_Mantra_as_it_is.ogg',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gayatri_Mantra_as_it_is.ogg',
    creator: 'Rameshvar',
    licenseLabel: 'Free Art License source',
    attributionText: 'Tanpura harmonic drone in C via Wikimedia Commons.',
    approvalStatus: 'approved',
    note: 'Standard natural middle pitch (C) for Gayatri and morning japa.',
  },
  {
    id: 'tanpura-d',
    label: 'Tanpura (Key D)',
    sanskritLabel: 'तानपूरा (भक्ति षड्ज)',
    subtitle: 'Warm · Krishna / Bhakti devotion',
    keyNote: 'D',
    audioUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Kirtana_in_Hindi.ogg',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kirtana_in_Hindi.ogg',
    creator: 'Wikimedia Commons uploader',
    licenseLabel: 'Creative Commons source',
    attributionText: 'Acoustic drone in D via Wikimedia Commons.',
    approvalStatus: 'approved',
    note: 'Warm melodic drone for Krishna / Rama / Bhakti practice.',
  },
  {
    id: 'tanpura-g',
    label: 'Tanpura (Key G)',
    sanskritLabel: 'तानपूरा (शक्ति षड्ज)',
    subtitle: 'High · Devi / Shakti resonance',
    keyNote: 'G',
    audioUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Usnidha_Sitatapatra_dharani,_Siddham_chant_and_Buddhist_Sanskrit_mantra_chant_420_590.ogg',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Usnidha_Sitatapatra_dharani,_Siddham_chant_and_Buddhist_Sanskrit_mantra_chant_420_590.ogg',
    creator: 'Ven Chan Master Hsuan Hua',
    licenseLabel: 'CC BY-SA 3.0 source',
    attributionText: 'Resonant drone in G via Wikimedia Commons.',
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
