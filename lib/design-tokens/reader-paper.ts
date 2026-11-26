// ── Reader paper themes ──────────────────────────────────────────────────
// Phase 2 of docs/READER_EXPERIENCE_GRAND_PLAN.md (decision D2: all three).
// Page/ink pairs from the approved proposal: Bhojpatra #F7F3E8 / #2A2118,
// Sandhya #131722 / #E8D8B8, Temple Night #0C0D0E / ivory. Card, dim, border
// and bar shades are derived for each pair. Contrast is enforced by
// __tests__/reader-appearance.test.ts: text >= 7:1 and dim >= 4.5:1 on page
// and card, accent >= 4.5:1 on page. Applies only inside readers; the rest of
// the app keeps themeColor(). Brand/accent colours are left to the base
// light/dark theme so Shoonaya's identity colours do not change per paper.
export type ReaderPaperKey = 'bhojpatra' | 'sandhya' | 'templeNight';

export const READER_PAPER: Record<ReaderPaperKey, {
  isDark: boolean;
  page: string;
  card: string;
  cardSoft: string;
  border: string;
  borderSoft: string;
  text: string;
  dim: string;
  accent: string;
  bar: string;
}> = {
  bhojpatra: {
    isDark: false,
    page: '#F7F3E8',
    card: '#FDFBF5',
    cardSoft: '#F1EBDD',
    border: 'rgba(95,58,22,0.14)',
    borderSoft: 'rgba(95,58,22,0.07)',
    text: '#2A2118',
    dim: '#6B5A44',
    accent: '#A8581A',
    bar: 'rgba(247,243,232,0.94)',
  },
  sandhya: {
    isDark: true,
    page: '#131722',
    card: '#1B2030',
    cardSoft: '#222838',
    border: 'rgba(232,216,184,0.16)',
    borderSoft: 'rgba(232,216,184,0.08)',
    text: '#E8D8B8',
    dim: '#A89C86',
    accent: '#E0A85C',
    bar: 'rgba(19,23,34,0.94)',
  },
  templeNight: {
    isDark: true,
    page: '#0C0D0E',
    card: '#161718',
    cardSoft: '#1C1D1F',
    border: 'rgba(236,230,216,0.14)',
    borderSoft: 'rgba(236,230,216,0.07)',
    text: '#ECE6D8',
    dim: '#9D978A',
    accent: '#D9A55A',
    bar: 'rgba(12,13,14,0.94)',
  },
};
