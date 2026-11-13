import type { VanshBranchType } from './vansh3d';

export interface BranchTheme {
  base: string;
  glow: string;
  text: string;
  label: string;
  sutra: string;
}

export const GENERATION_ORBIT_LEVELS = [
  { gen: 1, yTier: -170, label: 'Gen 1: पूर्वज (Grandparents)' },
  { gen: 2, yTier: -60, label: 'Gen 2: माता-पिता (Parents)' },
  { gen: 3, yTier: 50, label: 'Gen 3: आप / समकालीन (Self & Living)' },
  { gen: 4, yTier: 160, label: 'Gen 4: नवीन पीढ़ी (Next Gen)' },
];

export const BRANCH_THEMES: Record<VanshBranchType, BranchTheme> = {
  pitri: {
    base: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
    text: '#FBBF24',
    label: 'Pitri (Paternal)',
    sutra: 'पितृ पक्ष (Paternal)',
  },
  matri: {
    base: '#FB7185',
    glow: 'rgba(251, 113, 133, 0.45)',
    text: '#FDA4AF',
    label: 'Matri (Maternal)',
    sutra: 'मातृ पक्ष (Maternal)',
  },
  self: {
    base: '#10B981',
    glow: 'rgba(16, 185, 129, 0.65)',
    text: '#34D399',
    label: 'Living You',
    sutra: 'जीवित आधार (Self)',
  },
  child: {
    base: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.45)',
    text: '#7DD3FC',
    label: 'Next Gen',
    sutra: 'नवीन पीढ़ी (Descendant)',
  },
};
