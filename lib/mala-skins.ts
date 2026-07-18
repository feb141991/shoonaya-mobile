export type MalaSkin = {
  beadColor: string;
  beadBorder: string;
  threadColor: string;
  glowColor: string;
  label: string;
  pendant: 'rishi' | 'trishul' | 'flute' | 'leaf' | 'lotus' | 'halo' | 'bodhi';
};

export const MALA_SKINS: Record<string, MalaSkin> = {
  default: {
    beadColor: '#EFD7A8',
    beadBorder: 'rgba(176,118,55,0.78)',
    threadColor: '#C9831F',
    glowColor: 'rgba(216,138,28,0.52)',
    label: 'Sandalwood',
    pendant: 'rishi',
  },
  'sacred-mala': {
    beadColor: '#8B4513',
    beadBorder: 'rgba(100,40,0,0.8)',
    threadColor: '#C5A059',
    glowColor: 'rgba(197,160,89,0.8)',
    label: 'Rudraksha',
    pendant: 'trishul',
  },
  'krishna-flute': {
    beadColor: '#1E5F8C',
    beadBorder: 'rgba(30,100,160,0.7)',
    threadColor: '#5BA4CF',
    glowColor: 'rgba(91,164,207,0.7)',
    label: 'Neel Kamal',
    pendant: 'flute',
  },
  'tulsi-leaf': {
    beadColor: '#2E6B3E',
    beadBorder: 'rgba(40,100,50,0.7)',
    threadColor: '#5BA45B',
    glowColor: 'rgba(91,164,91,0.7)',
    label: 'Tulsi',
    pendant: 'leaf',
  },
  'brahma-lotus': {
    beadColor: '#C87AA0',
    beadBorder: 'rgba(200,120,160,0.6)',
    threadColor: '#F0C0D8',
    glowColor: 'rgba(240,192,216,0.7)',
    label: 'Kamal',
    pendant: 'lotus',
  },
  'the-sage-halo': {
    beadColor: '#B8860B',
    beadBorder: 'rgba(255,215,0,0.8)',
    threadColor: '#FFD700',
    glowColor: 'rgba(255,215,0,0.9)',
    label: 'Suvarna',
    pendant: 'halo',
  },
  'bodhi-leaf': {
    beadColor: '#4A3728',
    beadBorder: 'rgba(74,55,40,0.8)',
    threadColor: '#8B7355',
    glowColor: 'rgba(139,115,85,0.7)',
    label: 'Bodhi',
    pendant: 'bodhi',
  },
};

export function getMalaSkin(activeSymbolId: string | null | undefined) {
  if (!activeSymbolId) return MALA_SKINS.default;
  return MALA_SKINS[activeSymbolId] ?? MALA_SKINS.default;
}
