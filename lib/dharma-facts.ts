// Ported 1:1 from PWA's src/lib/bhakti/dharma-facts.ts — the 16-entry pool
// behind Japa's "DHARMA REFLECTION" card. Deterministic per calendar day
// (dayOfYear() % pool.length), not random per render, so the fact shown on
// native matches what PWA shows the same day.
export type DharmaFact = {
  text: string;
  source?: string;
  traditions?: string[];
  // undefined/'reflection' = the 16 entries below, unchanged behavior for
  // pickDharmaFact/Japa's card. 'app_tip' is a second pool added for
  // Home's loading-skeleton tip rotator (see pickLoadingTips) -- kept in
  // the same file/shape rather than a second content format.
  category?: 'reflection' | 'app_tip';
};

const DHARMA_FACTS: DharmaFact[] = [
  { text: 'A mala holds 108 beads and one meru — the guru bead you never cross.' },
  { text: '108 reads as 1, 0 and 8 — the One, the emptiness, and the infinite.' },
  { text: 'Of the three japa — spoken, whispered and silent — the silent is held highest.' },
  { text: 'The thumb rolls each bead over the middle finger; the index, seat of ego, stays apart.' },
  { text: 'At the meru bead you do not cross over — you turn the mala and begin again.' },
  { text: '108 subtle channels (nadis) are said to meet at the heart.' },
  { text: 'The sun is said to sit 108 sun-widths from the earth — the mala mirrors the cosmos.' },
  { text: 'Each bead is one breath returned to the present.' },
  { text: 'The 108 Upanishads carry the inner heart of the Vedas.', traditions: ['hindu'] },
  { text: 'Repeating a mantra 100,000 times is a purascharana — a vow carried to completion.', traditions: ['hindu'] },
  { text: "Naam Simran — remembrance of the Name — is the seeker's quiet mala.", traditions: ['sikh'] },
  { text: 'Ik Onkar: there is One, and it is without end.', source: 'Mool Mantar', traditions: ['sikh'] },
  { text: 'The 108 beads answer the 108 defilements the mind can know.', traditions: ['buddhist'] },
  { text: 'Mindfulness is simply the next bead, and the next.', traditions: ['buddhist'] },
  { text: 'The Namokar mantra bows to the soul that has conquered itself.', traditions: ['jain'] },
  { text: '108 beads for the 108 virtues of the Panch Parmeshthi.', traditions: ['jain'] },
];

// App-benefit / how-to tips, gaming-loading-screen style -- shown while
// Home's skeleton is up, not mixed into Japa's deterministic daily pick.
const APP_TIPS: DharmaFact[] = [
  { text: 'Panchang updates live for your exact city and tradition.', category: 'app_tip' },
  { text: "Set your calendar profile once in Settings if festival dates ever look off.", category: 'app_tip' },
  { text: 'Your streak counts every day you complete at least one practice.', category: 'app_tip' },
  { text: 'Tap any festival card to see exactly why that date was chosen.', category: 'app_tip' },
  { text: 'Save your Nakshatra once in Settings -- every reading remembers it after.', category: 'app_tip' },
  { text: 'Your Sadhana ring fills as you complete today’s practices, one at a time.', category: 'app_tip' },
  { text: 'Mandali connects you with others walking the same path nearby.', category: 'app_tip' },
  { text: 'Ask Dharma Mitra anything -- guidance is always one tap away.', category: 'app_tip' },
  { text: 'Your calendar detail level decides how full or quiet your feed feels.', category: 'app_tip' },
  { text: "Naam Simran fits into any spare moment of your day.", category: 'app_tip', traditions: ['sikh'] },
  { text: 'A few minutes of mindful breath is still a complete practice.', category: 'app_tip', traditions: ['buddhist'] },
  { text: 'Samayika can be as short as forty-eight minutes, or as long as you need.', category: 'app_tip', traditions: ['jain'] },
  { text: 'Japa Mala tracks every round -- pick up exactly where you left off.', category: 'app_tip', traditions: ['hindu'] },
  { text: 'Your gotra, once saved, is remembered for every sankalpa and puja.', category: 'app_tip', traditions: ['hindu'] },
];

function shuffled<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickLoadingTips(tradition: string | null | undefined, count = 6): DharmaFact[] {
  const appTips = APP_TIPS.length > 0 ? APP_TIPS : DHARMA_FACTS;
  const pool = appTips.filter((tip) => !tip.traditions || (tradition && tip.traditions.includes(tradition)));
  const list = pool.length > 0 ? pool : appTips;
  return shuffled(list).slice(0, count);
}

function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export function pickDharmaFact(tradition: string | null | undefined): DharmaFact {
  const pool = DHARMA_FACTS.filter((fact) => !fact.traditions || (tradition && fact.traditions.includes(tradition)));
  const list = pool.length > 0 ? pool : DHARMA_FACTS;
  return list[dayOfYear() % list.length];
}
