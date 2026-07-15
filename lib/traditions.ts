export type TraditionKey = 'hindu' | 'sikh' | 'buddhist' | 'jain';

// Per-tradition accent hex — ported verbatim from the PWA's
// lib/tradition-config.ts (TRADITION_CONFIG[*].accentColour), used to tint
// the Bhakti hero gradient/pills so each tradition reads as its own color
// identity instead of the app-wide brand gold. Kept as plain hex (not an
// alpha-suffixed token) so callers can freely compose `${accent}NN` tints,
// matching how the PWA source computes its own gradient stops.
export const TRADITION_ACCENT: Record<TraditionKey, string> = {
  hindu: '#D4740F',
  sikh: '#2E6FA8',
  buddhist: '#B07D3A',
  jain: '#A07830',
};

export function getTraditionAccent(tradition: string | null | undefined): string {
  return TRADITION_ACCENT[(tradition as TraditionKey)] ?? TRADITION_ACCENT.hindu;
}

export type TraditionOption = {
  value: string;
  label: string;
};

export type IshtaOption = TraditionOption & {
  emoji: string;
};

export type JapaPracticeType = 'hindu_japa' | 'naam_simran' | 'buddhist_mantra' | 'jain_navkar';

export type JapaMantra = {
  key: string;
  label: string;
  devanagari: string;
  meaning: string;
  tradition: TraditionKey | 'all';
};

export const SAMPRADAYAS_BY_TRADITION: Record<TraditionKey, TraditionOption[]> = {
  hindu: [
    { value: 'vaishnava', label: 'Vaishnava' },
    { value: 'shaiva', label: 'Shaiva' },
    { value: 'shakta', label: 'Shakta' },
    { value: 'smarta', label: 'Smarta' },
    { value: 'iskcon', label: 'ISKCON' },
    { value: 'swaminarayan', label: 'Swaminarayan' },
    { value: 'arya_samaj', label: 'Arya Samaj' },
    { value: 'veerashaiva', label: 'Veerashaiva / Lingayat' },
    { value: 'other', label: 'Other / Exploring' },
  ],
  sikh: [
    { value: 'khalsa', label: 'Khalsa' },
    { value: 'nanakpanthi', label: 'Nanakpanthi' },
    { value: 'nihang', label: 'Nihang Singh' },
    { value: 'udasi', label: 'Udasi' },
    { value: 'other', label: 'Other / Exploring' },
  ],
  buddhist: [
    { value: 'theravada', label: 'Theravada' },
    { value: 'mahayana', label: 'Mahayana' },
    { value: 'vajrayana', label: 'Vajrayana / Tibetan' },
    { value: 'zen', label: 'Zen / Chan' },
    { value: 'other', label: 'Other / Exploring' },
  ],
  jain: [
    { value: 'digambara', label: 'Digambara' },
    { value: 'shvetambara', label: 'Shvetambara' },
    { value: 'sthanakvasi', label: 'Sthanakvasi' },
    { value: 'other', label: 'Other / Exploring' },
  ],
};

export const ISHTA_DEVATAS_BY_TRADITION: Record<TraditionKey, IshtaOption[]> = {
  hindu: [
    { value: 'krishna', label: 'Shri Krishna', emoji: '🦚' },
    { value: 'vishnu', label: 'Shri Vishnu', emoji: '🌺' },
    { value: 'rama', label: 'Shri Rama', emoji: '🏹' },
    { value: 'shiva', label: 'Shri Shiva', emoji: '🔱' },
    { value: 'durga', label: 'Maa Durga', emoji: '⚔️' },
    { value: 'lakshmi', label: 'Maa Lakshmi', emoji: '🪷' },
    { value: 'saraswati', label: 'Maa Saraswati', emoji: '🎶' },
    { value: 'ganesha', label: 'Shri Ganesha', emoji: '🐘' },
    { value: 'hanuman', label: 'Shri Hanuman', emoji: '🙏' },
    { value: 'kartikeya', label: 'Shri Kartikeya', emoji: '🌟' },
    { value: 'other', label: 'Other', emoji: '✨' },
  ],
  sikh: [
    { value: 'waheguru', label: 'Waheguru', emoji: '☬' },
    { value: 'guru_nanak', label: 'Guru Nanak Dev', emoji: '🙏' },
    { value: 'other', label: 'Other', emoji: '✨' },
  ],
  buddhist: [
    { value: 'buddha', label: 'Shakyamuni Buddha', emoji: '☸️' },
    { value: 'avalokiteshvara', label: 'Avalokiteshvara', emoji: '🪷' },
    { value: 'manjushri', label: 'Manjushri', emoji: '📖' },
    { value: 'tara', label: 'Green Tara', emoji: '🌿' },
    { value: 'amitabha', label: 'Amitabha Buddha', emoji: '🌅' },
    { value: 'other', label: 'Other', emoji: '✨' },
  ],
  jain: [
    { value: 'mahavir', label: 'Bhagwan Mahavir', emoji: '🤲' },
    { value: 'parshvanath', label: 'Bhagwan Parshvanath', emoji: '🌿' },
    { value: 'rishabhanatha', label: 'Adinath Rishabha', emoji: '✨' },
    { value: 'other', label: 'Other', emoji: '✨' },
  ],
};

export const JAPA_MANTRAS: JapaMantra[] = [
  { key: 'om_pranava', label: 'Om (Pranava)', devanagari: 'ॐ', meaning: 'The primordial sound of the universe and the essence of consciousness.', tradition: 'all' },
  { key: 'gayatri', label: 'Gayatri Mantra', devanagari: 'गायत्री मंत्र', meaning: 'A universal mantra of light and wisdom.', tradition: 'hindu' },
  { key: 'om_namah_shivaya', label: 'Om Namah Shivaya', devanagari: 'ॐ नमः शिवाय', meaning: 'I bow to Shiva, the supreme reality and the inner self.', tradition: 'hindu' },
  { key: 'hare_krishna', label: 'Hare Krishna', devanagari: 'हरे कृष्ण महामंत्र', meaning: 'O Lord, O Energy of the Lord, please engage me in Your loving service.', tradition: 'hindu' },
  { key: 'om_namo_narayanaya', label: 'Om Namo Narayanaya', devanagari: 'ॐ नमो नारायणाय', meaning: 'Salutation to Lord Narayana.', tradition: 'hindu' },
  { key: 'mahamrityunjaya', label: 'Mahamrityunjaya', devanagari: 'ॐ त्र्यम्बकं यजामहे', meaning: 'The great death-conquering mantra of Shiva.', tradition: 'hindu' },
  { key: 'waheguru', label: 'Waheguru', devanagari: 'ਵਾਹਿਗੁਰੂ', meaning: 'Wondrous Enlightener.', tradition: 'sikh' },
  { key: 'om_mani_padme_hum', label: 'Om Mani Padme Hum', devanagari: 'ॐ मणि पद्मे हूँ', meaning: 'The jewel is in the lotus, a mantra of compassion.', tradition: 'buddhist' },
  { key: 'namokar', label: 'Namokar Mantra', devanagari: 'णमोकार मंत्र', meaning: 'I bow to the Arihants, Siddhas, Acharyas, Upadhyayas, and all Sadhus.', tradition: 'jain' },
];

const RECOMMENDED_JAPA: Record<TraditionKey, string[]> = {
  hindu: ['gayatri', 'om_namah_shivaya', 'hare_krishna', 'om_namo_narayanaya', 'mahamrityunjaya', 'om_pranava'],
  sikh: ['waheguru', 'om_pranava'],
  buddhist: ['om_mani_padme_hum', 'om_pranava'],
  jain: ['namokar', 'om_pranava'],
};

export function getSampradayaLabel(tradition: TraditionKey): string {
  switch (tradition) {
    case 'sikh':
      return 'Sikh Panth';
    case 'buddhist':
      return 'Buddhist School';
    case 'jain':
      return 'Jain Sect';
    case 'hindu':
      return 'Sampradaya';
  }
}

export function getIshtaDevataLabel(tradition: TraditionKey): string {
  switch (tradition) {
    case 'sikh':
      return 'Simran Focus';
    case 'buddhist':
      return 'Bodhisattva / Buddha';
    case 'jain':
      return 'Tirthankar Devotion';
    case 'hindu':
      return 'Ishta Devata';
  }
}

export function getJapaMantrasForTradition(tradition: string | null | undefined): JapaMantra[] {
  const key = isTraditionKey(tradition) ? tradition : 'hindu';
  const recommended = RECOMMENDED_JAPA[key];
  const recommendedSet = new Set(recommended);
  const byKey = new Map(JAPA_MANTRAS.map((mantra) => [mantra.key, mantra]));
  return [
    ...recommended.map((id) => byKey.get(id)).filter((mantra): mantra is JapaMantra => Boolean(mantra)),
    ...JAPA_MANTRAS.filter((mantra) => !recommendedSet.has(mantra.key) && (mantra.tradition === key || mantra.tradition === 'all')),
  ];
}

export function getJapaPracticeType(tradition: string | null | undefined): JapaPracticeType {
  switch (tradition) {
    case 'sikh':
      return 'naam_simran';
    case 'buddhist':
      return 'buddhist_mantra';
    case 'jain':
      return 'jain_navkar';
    default:
      return 'hindu_japa';
  }
}

function isTraditionKey(value: string | null | undefined): value is TraditionKey {
  return value === 'hindu' || value === 'sikh' || value === 'buddhist' || value === 'jain';
}
