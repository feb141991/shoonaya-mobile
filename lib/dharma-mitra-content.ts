// Tradition-aware copy for the Dharma Mitra AI chat entry points (floating
// sheet + full-page /ai-chat screen). Matches the PWA's AIChatFAB.tsx
// while ensuring universal fallbacks for neutral seekers across all traditions.

export const DEFAULT_TRADITION = 'neutral';

export const TRADITION_SYMBOLS: Record<string, string> = {
  hindu: '🕉️',
  sikh: '☬',
  buddhist: '☸️',
  jain: '🪷',
  neutral: '✨',
  none: '✨',
  all: '✨',
};

export const TRADITION_GREETINGS: Record<string, string> = {
  hindu: 'Hari Om 🕉️',
  sikh: 'Sat Sri Akal ☬',
  buddhist: 'Namo Buddhaya ☸️',
  jain: 'Jai Jinendra 🙏',
  neutral: 'Namaste 🙏',
  none: 'Namaste 🙏',
  all: 'Namaste 🙏',
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
  neutral: [
    'How can I cultivate inner peace today?',
    'How do I start a daily meditation practice?',
    'What is the core meaning of dharma and karma?',
    'How to overcome mental restlessness and fear?',
  ],
  none: [
    'How can I cultivate inner peace today?',
    'How do I start a daily meditation practice?',
    'What is the core meaning of dharma and karma?',
    'How to overcome mental restlessness and fear?',
  ],
  all: [
    'How can I cultivate inner peace today?',
    'How do I start a daily meditation practice?',
    'What is the core meaning of dharma and karma?',
    'How to overcome mental restlessness and fear?',
  ],
};

export function getTraditionSymbol(tradition: string | null | undefined): string {
  if (!tradition) return TRADITION_SYMBOLS.neutral;
  return TRADITION_SYMBOLS[tradition.toLowerCase()] ?? TRADITION_SYMBOLS.neutral;
}

export function getTraditionGreeting(tradition: string | null | undefined): string {
  if (!tradition) return TRADITION_GREETINGS.neutral;
  return TRADITION_GREETINGS[tradition.toLowerCase()] ?? TRADITION_GREETINGS.neutral;
}

export function getTraditionPrompts(tradition: string | null | undefined): string[] {
  if (!tradition) return TRADITION_PROMPTS.neutral;
  return TRADITION_PROMPTS[tradition.toLowerCase()] ?? TRADITION_PROMPTS.neutral;
}

