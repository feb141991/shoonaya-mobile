// Native port of PWA's static HOME_HERO_THEMES catalog
// (src/config/festivalThemes.ts, Sanatan Sangam/Shoonaya repo). Ported as
// plain data (id/label/heroImage/traditions only) for the Home hero
// background picker sheet — deliberately NOT porting PWA's full
// resolveHomeHeroTheme() engine (sampradaya/ishtaDevata/festival-slug
// matching + DB hero_assets merge), since that auto-selection logic
// already runs server-side in /api/native/home-summary (see
// resolveHomeHeroTheme() call in the web repo's route.ts) and is what
// picks state.hero.imageUrl's default before the user ever opens this
// picker. This file only needs to answer "what can the user manually
// choose from," not "what should auto-select."
export type HeroThemeOption = {
  id: string;
  label: string;
  // Relative path, same convention as state.hero.imageUrl — resolved via
  // resolveAssetUrl() against API_BASE, same as every other PWA-hosted
  // asset native already displays.
  heroImage: string;
  traditions?: string[];
};

export const HERO_THEME_OPTIONS: HeroThemeOption[] = [
  {
    id: 'shaiva-default',
    label: 'Shaiva',
    heroImage: '/assets/images/heroes/hindu/shiva-default.webp',
    traditions: ['hindu'],
  },
  {
    id: 'sikh-default',
    label: 'Sikh',
    heroImage: '/assets/images/heroes/sikh/default.webp',
    traditions: ['sikh'],
  },
  {
    id: 'buddhist-default',
    label: 'Buddhist',
    heroImage: '/assets/images/heroes/buddhist/default.webp',
    traditions: ['buddhist'],
  },
  {
    id: 'jain-default',
    label: 'Jain',
    heroImage: '/assets/images/heroes/jain/default.webp',
    traditions: ['jain'],
  },
  {
    id: 'global-default',
    label: 'Default',
    heroImage: '/assets/images/heroes/all/default.webp',
  },
];

// Options relevant to a user: their own tradition's theme(s) first, plus
// the global default, in the same priority order PWA's static list uses.
export function heroThemeOptionsFor(tradition: string | null | undefined): HeroThemeOption[] {
  const own = HERO_THEME_OPTIONS.filter((t) => t.traditions?.includes(tradition ?? ''));
  const shared = HERO_THEME_OPTIONS.filter((t) => !t.traditions);
  return [...own, ...shared];
}
