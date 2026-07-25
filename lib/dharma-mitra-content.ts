// Tradition-aware copy for the Dharma Mitra AI chat entry points (floating
// sheet + full-page /ai-chat screen). Matches the PWA's AIChatFAB.tsx exactly
// so both apps read the same greetings/prompts per tradition.

export const DEFAULT_TRADITION = 'hindu';

export const TRADITION_GREETINGS: Record<string, string> = {
  hindu: 'Hari Om 🕉️',
  sikh: 'Sat Sri Akal ☬',
  buddhist: 'Namo Buddhaya ☸️',
  jain: 'Jai Jinendra 🤲',
};

export const TRADITION_PROMPTS: Record<string, string[]> = {
  hindu: [
    'What does the Gita say about anxiety?',
    'How do I start a daily sadhana?',
    'What is the meaning of dharma?',
    'How to balance work and spiritual life?',
  ],
  sikh: [
    'What is the meaning of Ik Onkar?',
    'How do I start a Nitnem practice?',
    'What does Gurbani say about hardship?',
    'Explain Seva and its importance',
  ],
  buddhist: [
    'What is the Noble Eightfold Path?',
    'How do I start meditating daily?',
    'Explain impermanence simply',
    'How to cultivate Metta?',
  ],
  jain: [
    'What is Ahimsa in daily life?',
    'What does the Namokar Mantra mean?',
    'Explain Anekantavada',
    'What are the Five Major Vows?',
  ],
};

export function getTraditionGreeting(tradition: string | null | undefined) {
  return TRADITION_GREETINGS[tradition ?? DEFAULT_TRADITION] ?? TRADITION_GREETINGS[DEFAULT_TRADITION];
}

export function getTraditionPrompts(tradition: string | null | undefined) {
  return TRADITION_PROMPTS[tradition ?? DEFAULT_TRADITION] ?? TRADITION_PROMPTS[DEFAULT_TRADITION];
}
