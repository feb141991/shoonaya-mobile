export const COLORS = {
  brandGold: '#C5A059',
  ink: '#3E2A1F',
  creamBg: '#FAF6EF',
  darkBg: '#0C0A07',
  cardBgLight: '#FFFDF9',
  cardBgDark: '#141210',
  heroBgDark: '#1c1c1a',
  borderLight: '#E8DCCB',
  borderDark: 'rgba(197,160,89,0.13)',
  textDimLight: '#8E7868',
  textDimDark: '#B0AA9E',
  // Success/observed state — matches web's exact values (VratClient.tsx
  // "Mark as Observed" / "Observed today" treatment), so native and web
  // render the same green rather than each screen picking its own.
  success: '#5aaa38',
  successBg: 'rgba(134,187,110,0.15)',
  successBorder: 'rgba(134,187,110,0.45)',

  // ── Design-system additions (additive only — nothing above this line
  // changed value, so no existing screen shifts color). ──────────────────

  // A quieter background layer for nested/secondary surfaces (behind a
  // group of cards, an input field's own fill) that shouldn't compete with
  // cardBgLight/Dark. Sourced from the PWA's own --surface-soft
  // (src/app/globals.css, light ~line 199 / dark ~line 130), so native's
  // "deeper" ivory/sandalwood layer matches the web reference rather than
  // being invented.
  surfaceSoftLight: '#EFE4D3',
  surfaceSoftDark: '#1C1A16',

  // A quieter border than borderLight/Dark, for dividers and nested
  // surfaces (input fields inside a Card) that shouldn't draw as much
  // attention as a card's own outer edge. Sourced from the PWA's
  // --card-border-soft (src/app/globals.css light/dark).
  borderSoftLight: 'rgba(95,58,22,0.06)',
  borderSoftDark: 'rgba(197,160,89,0.08)',

  // Accent family beyond gold, so the app doesn't read as one-note beige.
  // `sage` is lifted directly from the PWA's --glow-jain base
  // (rgb(42,107,74), src/app/globals.css:249). `navy` is a deliberately
  // desaturated, warm-compatible navy — the PWA's --glow-sikh
  // (rgba(91,164,212,0.4)) is a bright glow-overlay color tuned for
  // translucent blur effects behind festival art, not a solid fill; used
  // verbatim it would clash with the ivory/gold palette here, so this is a
  // considered value chosen to sit calmly next to brandGold/sage, not a
  // literal port.
  sage: '#2A6B4A',
  sageBg: 'rgba(42,107,74,0.12)',
  sageBorder: 'rgba(42,107,74,0.35)',
  navy: '#3E5C76',
  navyBg: 'rgba(62,92,118,0.12)',
  navyBorder: 'rgba(62,92,118,0.35)',

  // Error/danger — the web repo has no dedicated error CSS variable either
  // (checked src/app/globals.css; the (auth) login/signup pages there
  // render errors via toast, not inline color). The one place web does
  // render an inline error is src/app/admin/login/page.tsx, using
  // Tailwind's red-600/red-50/red-100. Reused verbatim here so native has
  // one sourced error color rather than the login screen's prior ad hoc
  // `'crimson'` literal.
  danger: '#DC2626',
  dangerBg: 'rgba(220,38,38,0.10)',
  dangerBorder: 'rgba(220,38,38,0.28)',

  // Calendar review state. Sourced from the PWA's existing amber-500/600
  // review treatment used by the observance-series card, promoted here so
  // Native never carries screen-local warning literals.
  warningLight: '#D97706',
  warningDark: '#F59E0B',
  warningBgLight: 'rgba(217,119,6,0.15)',
  warningBgDark: 'rgba(245,158,11,0.15)',
  warningBorderLight: 'rgba(217,119,6,0.35)',
  warningBorderDark: 'rgba(245,158,11,0.30)',

  // Home/Auth premium surfaces — promoted from the first Home/Auth visual
  // pass so the PWA-matched ivory, ink, and translucent gold treatments are
  // reusable tokens instead of screen-local literals.
  homeHeroLight: '#F6E8CF',
  homeHeroDark: '#1B130B',
  homeHeroOverlayLight: 'rgba(255,249,240,0.72)',
  homeHeroOverlayDark: 'rgba(14,8,4,0.55)',
  homeHeroFadeLight: 'rgba(253,246,227,0.78)',
  homeHeroFadeDark: 'rgba(14,8,4,0.72)',
  homeRaisedLight: '#FFF8EB',
  homeRaisedDark: '#21170E',
  homeSoftLight: 'rgba(197,160,89,0.10)',
  homeSoftDark: 'rgba(197,160,89,0.12)',
  homeBorderSoftLight: 'rgba(197,160,89,0.20)',
  homeBorderSoftDark: 'rgba(197,160,89,0.18)',
  homeRingTrackLight: 'rgba(105,75,35,0.12)',
  homeRingTrackDark: 'rgba(255,248,225,0.14)',
  homeIconWellLight: 'rgba(255,255,255,0.62)',
  homeIconWellDark: 'rgba(255,248,225,0.08)',
  homeSkeletonBlockLight: 'rgba(105,75,35,0.08)',
  homeSkeletonBlockDark: 'rgba(255,248,225,0.08)',
  homeSkeletonPlaceholderLight: 'rgba(105,75,35,0.14)',
  homeSkeletonPlaceholderDark: 'rgba(255,248,225,0.12)',
  homeShlokaSurfaceLight: 'rgba(255,249,240,0.80)',
  homeShlokaSurfaceDark: 'rgba(23,17,11,0.76)',
  homeShlokaGlassLight: 'rgba(255,255,255,0.18)',
  homeShlokaGlassDark: 'rgba(255,248,225,0.08)',
  homeShlokaGlassBorderLight: 'rgba(255,255,255,0.30)',
  homeShlokaGlassBorderDark: 'rgba(255,248,225,0.14)',
  homeGoldPillBg: 'rgba(197,160,89,0.18)',
  homeGoldPillBorder: 'rgba(197,160,89,0.32)',
  homePwaPillBg: 'rgba(197,160,89,0.16)',
  homePwaPillText: 'rgba(255,240,200,0.92)',
  homePwaPillDotActive: 'rgba(255,240,200,0.80)',
  homePwaPillDotInactive: 'rgba(255,240,200,0.25)',
  homePwaObservanceBg: 'rgba(234,112,48,0.22)',
  homePwaObservanceBorder: 'rgba(255,180,100,0.18)',
  homePwaObservanceText: 'rgba(255,200,140,0.95)',
  // Rashiphal discovery nudge pill on Home hero -- sourced from PWA's
  // HeroSection.tsx (exact background, text, and arrow colors).
  homePwaRashiphalBg: 'rgba(139,92,246,0.14)',
  homePwaRashiphalText: 'rgba(255,240,200,0.92)',
  homePwaRashiphalArrow: 'rgba(255,240,200,0.68)',
  // Mood check-in pill on the Home hero -- shares the exact translucent
  // warm gold glass treatment of the Panchang/date pill (homePwaPillBg /
  // homePwaPillText) for complete visual parity across all backdrops.
  homeMoodPillBgLight: 'rgba(197,160,89,0.16)',
  homeMoodPillBgDark: 'rgba(197,160,89,0.16)',
  homeMoodPillBorderLight: 'transparent',
  homeMoodPillBorderDark: 'transparent',
  authGoldWellBg: 'rgba(197,160,89,0.14)',
  selectionWellLight: 'rgba(255,255,255,0.60)',
  selectionWellDark: 'rgba(255,248,225,0.06)',
  selectionWellSelected: 'rgba(197,160,89,0.16)',

  // ── PWA brand-primary parity (src/app/globals.css :root / :root[data-theme='light']) ──
  // PWA does NOT use one static brand color across both themes — its actual
  // light-mode primary is a deeper terracotta-orange (#D88A1C), while
  // #C5A059 (the value `brandGold` above has always held) is specifically
  // its DARK-mode primary. `brandGold` is left unchanged here (still
  // #C5A059) so no existing dark-mode-tuned screen shifts color by surprise;
  // these two new tokens are the theme-aware pair for screens that adopt
  // them going forward — see Home's header/pill/hero-gradient rebuild for
  // the first real usage. A full-repo sweep replacing every bare
  // `COLORS.brandGold` reference with this theme-aware pair is a real,
  // tracked follow-up (flagged in the session report), not done blindly
  // here without visual QA across every screen that already ships with it.
  brandGoldLight: '#D88A1C',
  brandGoldDark: '#C5A059',
  brandPrimaryStrongLight: '#9F6314',
  brandPrimaryStrongDark: '#D4784A',
  brandSoftLight: 'rgba(216,138,28,0.12)',
  brandSoftDark: 'rgba(197,160,89,0.16)',
  brandAccentLight: '#FFFDF8',
  brandAccentDark: '#333330',
  brandEarthLight: '#7A5126',
  brandEarthDark: '#9D7A50',
  chipFillLight: '#EFE3CF',
  chipFillDark: '#F5E8D4',
  chipTextLight: '#5F3A16',
  chipTextDark: '#7A4514',
  // Text color on solid brand-filled surfaces (e.g. active filter chips).
  // Reusing creamBg on brandGoldLight produces ~2.6:1 contrast (failing WCAG AA).
  // Using dark ink in light mode achieves 4.9:1, and darkBg in dark mode achieves 7.5:1.
  textOnBrandLight: '#1C160C',
  textOnBrandDark: '#0C0A07',
  premiumGlassLight: 'rgba(255,255,255,0.75)',
  premiumGlassDark: 'rgba(22,20,16,0.72)',
  premiumBorderLight: 'rgba(216,138,28,0.15)',
  premiumBorderDark: 'rgba(197,160,89,0.18)',

  // Floating bottom navigation — matched to Home hero's warm ivory/gold
  // glass instead of the previous flat tab-bar strip. Kept as tokens so
  // the nav can be tuned with the rest of the Home surface language.
  navGlassTopLight: 'rgba(255,253,248,0.72)',
  navGlassMidLight: 'rgba(255,248,235,0.62)',
  navGlassBottomLight: 'rgba(246,232,207,0.66)',
  navGlassTopDark: 'rgba(38,28,18,0.66)',
  navGlassMidDark: 'rgba(19,17,14,0.58)',
  navGlassBottomDark: 'rgba(15,12,9,0.62)',
  navGlowGoldLight: 'rgba(216,138,28,0.16)',
  navGlowGoldDark: 'rgba(197,160,89,0.14)',
  navGlowIvoryLight: 'rgba(255,255,255,0.44)',
  navGlowIvoryDark: 'rgba(255,248,225,0.06)',

  // ── PWA divine-hero gradient overlay (src/app/globals.css .divine-hero-overlay
  // / .divine-hero-readability) — ported for expo-linear-gradient. Two
  // layers: a top-anchored darkening scrim (keeps header icons/greeting
  // legible over a bright image) that fades out by 80% down, and a
  // bottom-anchored warm blend that dissolves the image into the page/
  // shloka-panel background instead of ending in a hard edge.
  heroScrimTopLight: 'rgba(0,0,0,0.65)',
  heroScrimMidLight: 'rgba(0,0,0,0.15)',
  heroScrimTopDark: 'rgba(0,0,0,0.85)',
  heroScrimMidDark: 'rgba(0,0,0,0.35)',
  heroReadabilitySoftLight: 'rgba(250,246,239,0.30)',
  heroReadabilityLight: 'rgba(250,246,239,0.75)',
  heroReadabilitySoftDark: 'rgba(28,28,26,0.30)',
  heroReadabilityDark: 'rgba(28,28,26,0.75)',

  // Full-screen celebration backdrop (app/shloka.tsx streak celebration).
  // Deliberately darker than the app's existing bottom-sheet scrims
  // (rgba(0,0,0,0.28) in tirtha/japa, rgba(0,0,0,0.35) in
  // profile/mandali — themselves pre-existing, still-untokenized values,
  // a separate follow-up from this token) because this is a full-takeover
  // moment, not a partial sheet — named here per review feedback rather
  // than left as a raw literal.
  celebrationScrim: 'rgba(0,0,0,0.45)',
  bottomSheetScrim: 'rgba(0,0,0,0.28)',

  // Progress pillar accents. These are content/data accents, not core
  // chrome colors, so they are named here instead of forcing every pillar
  // into brand gold. Used by My Progress to keep the scorecard rich while
  // still avoiding screen-local raw color decisions.
  progressJapa: '#DC2626',
  progressJapaBgLight: 'rgba(220,38,38,0.06)',
  progressJapaBgDark: 'rgba(220,38,38,0.10)',
  progressJapaBorderLight: 'rgba(220,38,38,0.16)',
  progressJapaBorderDark: 'rgba(220,38,38,0.24)',
  progressQuiz: '#6F5CC8',
  progressQuizBg: 'rgba(111,92,200,0.12)',
  progressDharmVeer: '#D4784A',
  progressDharmVeerBg: 'rgba(212,120,74,0.12)',

  // Theme-independent white — for text/icons overlaid directly on a dark
  // scrim atop a photographic image (e.g. app/live-darshan.tsx's "Live"
  // badge and play-affordance dot on a YouTube thumbnail). Never swap for
  // COLORS.creamBg here: that token shifts with the app's own light/dark
  // theme, but a badge sitting on a photo needs to stay legible against the
  // photo itself, not the surrounding screen.
  onMediaWhite: '#FFFFFF',

  // Practice-tile category colors — ported 1:1 from the PWA's Home quick-
  // access grid (src/app/(main)/home/sections/SadhanaSection.tsx and
  // CommunitySection.tsx), so a given practice always carries the same
  // color on both platforms rather than every tile sharing one brand hue.
  // PWA computes its light-mode bg by swapping the same color's alpha from
  // 0.14 (dark) to 0.12 (light) and its border from the same base color at
  // 0.3 alpha, independent of theme — replicated exactly here as separate
  // tokens instead of a runtime string-replace.
  tileGold: '#C5A059',
  tileGoldBgDark: 'rgba(197,160,89,0.14)',
  tileGoldBgLight: 'rgba(197,160,89,0.12)',
  tileGoldBorder: 'rgba(197,160,89,0.3)',
  tilePurple: '#A594E0',
  tilePurpleBgDark: 'rgba(165,148,224,0.14)',
  tilePurpleBgLight: 'rgba(165,148,224,0.12)',
  tilePurpleBorder: 'rgba(165,148,224,0.3)',
  tileViolet: '#8B5CF6',
  tileVioletBgDark: 'rgba(139,92,246,0.14)',
  tileVioletBgLight: 'rgba(139,92,246,0.12)',
  tileVioletBorder: 'rgba(139,92,246,0.3)',
  tileGreen: '#6BC47E',
  tileGreenBgDark: 'rgba(107,196,126,0.14)',
  tileGreenBgLight: 'rgba(107,196,126,0.12)',
  tileGreenBorder: 'rgba(107,196,126,0.3)',
  tileCoral: '#FF8A65',
  tileCoralBgDark: 'rgba(255,138,101,0.14)',
  tileCoralBgLight: 'rgba(255,138,101,0.12)',
  tileCoralBorder: 'rgba(255,138,101,0.3)',
  tileBlue: '#64B5F6',
  tileBlueBgDark: 'rgba(100,181,246,0.14)',
  tileBlueBgLight: 'rgba(100,181,246,0.12)',
  tileBlueBorder: 'rgba(100,181,246,0.3)',

  // Deity-accent rose — was independently redeclared as a raw hex in both
  // app/bhakti/insights.tsx ('#C4789A') and app/bhakti/stotram/[id].tsx
  // ('#c4789a', for the Devi accent), with no shared source. Named here so
  // both stay in sync instead of drifting if one is ever tuned.
  deityRose: '#C4789A',

  // "Liked" heart accent — sourced from app/bhakti/katha/[id].tsx's existing
  // local LIKE_ACCENT literal ('#F47888'), named here so the Mandali comment
  // reaction heart matches that established precedent instead of picking a
  // new red/pink independently.
  like: '#F47888',
} as const;

// Tradition accent colors — was independently redeclared twice in the same
// file (app/bhakti/katha.tsx's VIEW_META and TRADITION_LABEL) and a third
// time in app/bhakti/katha/[id].tsx's TRADITION_COLOR, all three copies
// carrying the identical five values with no shared source (a drift risk
// if any one copy were ever tuned without the others). Named here so all
// three call sites read from one place. Not used by app/(tabs)/bhakti.tsx's
// quick-access grid, which deliberately uses its own softer/muted tile
// palette (a different visual intent for that hub screen, not a duplicate).
export const TRADITION_ACCENT = {
  hindu: '#FF6B35',
  sikh: '#1B7FD4',
  buddhist: '#7C5CBF',
  jain: '#2D9E4A',
  all: '#8B9E6E',
} as const;

// Katha-specific view-key accents — puranic/bani/dhamma/jain/panchatantra
// map 1:1 onto a TRADITION_ACCENT entry; 'heroes' has no tradition
// equivalent (Heroes of Bharat spans traditions) so it keeps its own value.
export const KATHA_VIEW_ACCENT = {
  puranic: TRADITION_ACCENT.hindu,
  bani: TRADITION_ACCENT.sikh,
  dhamma: TRADITION_ACCENT.buddhist,
  jain: TRADITION_ACCENT.jain,
  panchatantra: TRADITION_ACCENT.all,
  heroes: '#D4643A',
} as const;

export const themeColor = (isDark: boolean) => ({
  bg: isDark ? COLORS.darkBg : COLORS.creamBg,
  card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
  cardSoft: isDark ? COLORS.surfaceSoftDark : COLORS.surfaceSoftLight,
  border: isDark ? COLORS.borderDark : COLORS.borderLight,
  borderSoft: isDark ? COLORS.borderSoftDark : COLORS.borderSoftLight,
  text: isDark ? COLORS.creamBg : COLORS.ink,
  dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
  brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
  brandStrong: isDark ? COLORS.brandPrimaryStrongDark : COLORS.brandPrimaryStrongLight,
  brandSoft: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
  accent: isDark ? COLORS.brandAccentDark : COLORS.brandAccentLight,
  earth: isDark ? COLORS.brandEarthDark : COLORS.brandEarthLight,
  glass: isDark ? COLORS.premiumGlassDark : COLORS.premiumGlassLight,
  premiumBorder: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
  chipFill: isDark ? COLORS.chipFillDark : COLORS.chipFillLight,
  chipText: isDark ? COLORS.chipTextDark : COLORS.chipTextLight,
  textOnBrand: isDark ? COLORS.textOnBrandDark : COLORS.textOnBrandLight,
});

export const FONTS = {
  serif: 'CormorantGaramond_600SemiBold',
  serifBold: 'CormorantGaramond_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  // Handwritten signature look (onboarding founder note) — Kalam covers
  // Latin only here, used for the "Prince" signature so it reads as an
  // ink flourish rather than typeset text.
  script: 'Kalam_400Regular',
  scriptBold: 'Kalam_700Bold',
  // Hindi body copy (onboarding founder note EN/HI toggle) — Mukta is a
  // clean, widely-used Devanagari text face; Cormorant/Inter have no
  // Devanagari glyphs at all.
  devanagari: 'Mukta_400Regular',
  devanagariBold: 'Mukta_700Bold',
} as const;

// ── Radii ────────────────────────────────────────────────────────────────
// A shared corner-radius scale so primitives (and future screens) draw from
// one set of values instead of sprinkling 14/16/18/20/22/24/28 ad hoc.
// `xl` (24) matches Card's pre-existing radius exactly, so adopting this
// scale in Card does not shift its rendered size.
export const RADII = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 24,
  pill: 999,
} as const;

// ── Spacing ──────────────────────────────────────────────────────────────
// Used by new primitives only in this slice (Button/Pill/SectionHeader) —
// not retrofitted onto existing per-screen padding, to keep this change
// narrow.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

// ── Shadows ──────────────────────────────────────────────────────────────
// CSS `boxShadow` strings, not the legacy shadowColor/shadowOffset/
// shadowOpacity/shadowRadius/elevation quintet. This repo already renders
// shadows this way (app/(tabs)/index.tsx's `theme.shadow`,
// `boxShadow: theme.shadow`) and supports it — react-native 0.85.3,
// newArchEnabled: true (app.json) — so the design-system foundation should
// match that convention, not reintroduce the older per-platform shadow
// props alongside it.
//
// Each size has a light/dark pair because the existing convention already
// varies shadow color by theme (index.tsx: a warm sandalwood-brown shadow
// in light mode, black in dark mode — a warm-tinted shadow barely reads
// against a near-black background, so dark mode needs its own value rather
// than reusing the light one at higher opacity). `shadowColorLight` here is
// COLORS.borderDark's rgb triplet (59,43,22) — the same warm ink-brown the
// previous shadow-prop version used — kept as a value, not introduced as a
// new raw hex.
export const SHADOWS = {
  sm: {
    light: '0 8px 24px rgba(62, 42, 31, 0.08), 0 2px 8px rgba(62, 42, 31, 0.05)',
    dark: '0 1px 4px rgba(0, 0, 0, 0.24)',
  },
  md: {
    light: '0 10px 24px rgba(49, 35, 20, 0.08)',
    dark: '0 6px 16px rgba(0, 0, 0, 0.30)',
  },
  lg: {
    light: '0 16px 34px rgba(49, 35, 20, 0.10)',
    dark: '0 14px 28px rgba(0, 0, 0, 0.34)',
  },
  heroCard: {
    light: '0 14px 28px rgba(105, 75, 35, 0.10)',
    dark: '0 18px 36px rgba(0, 0, 0, 0.28)',
  },
  shlokaGlass: {
    light: '0 -10px 34px rgba(105, 75, 35, 0.08)',
    dark: '0 -10px 34px rgba(0, 0, 0, 0.24)',
  },
  tabBar: {
    light: '0 -2px 10px rgba(59, 43, 22, 0.07)',
    dark: '0 -2px 10px rgba(0, 0, 0, 0.30)',
  },
  navFloating: {
    light: '0 -10px 34px rgba(105,75,35,0.13), 0 0 30px rgba(216,138,28,0.14)',
    dark: '0 -10px 30px rgba(0,0,0,0.42), 0 0 26px rgba(197,160,89,0.14)',
  },
  navCenterActive: {
    light: '0 12px 26px rgba(159,99,20,0.20)',
    dark: '0 10px 24px rgba(0,0,0,0.34)',
  },
} as const;

// ── Typography scale ─────────────────────────────────────────────────────
// display/title/section/body/label/caption/shloka, per the design brief.
// `shloka` uses the existing serif (Cormorant Garamond) at a larger, airier
// size for Sanskrit/transliteration content — NOT a Devanagari-specific
// font. No Devanagari font is bundled (package.json only has
// @expo-google-fonts/cormorant-garamond and .../inter); pairing a real
// Devanagari face is a follow-up risk, not solved in this slice, since it
// would require a new dependency.
//
// Values below are aligned to PWA's own --type-* scale (src/app/globals.css)
// rather than invented sizes — this constant had ZERO call sites anywhere
// in the app before this pass (grepped repo-wide), so realigning it here is
// a zero-regression-risk change; every existing screen still uses its own
// ad-hoc inline fontSize, unaffected by this file. `hero`/`screenTitle`/
// `cardHeading`/`metric`/`chip`/`micro` are new keys added to close the
// direct 1:1 gap against PWA's scale (display/hero/screen-title/
// card-heading/sanskrit/metric/body/section-label/card-label/chip/tab/
// micro) — `display`/`title`/`section`/`body`/`label`/`caption`/`shloka`
// keep their existing names for continuity with the earlier design-system
// slice, mapped onto the closest PWA equivalent's px value.
export const TYPE = {
  display: { fontFamily: FONTS.serifBold, fontSize: 36, lineHeight: 42 },   // PWA --type-display: 36px
  hero: { fontFamily: FONTS.serifBold, fontSize: 28, lineHeight: 34 },      // PWA --type-hero: 28px
  title: { fontFamily: FONTS.serifBold, fontSize: 23, lineHeight: 29 },     // PWA --type-screen-title: 23px
  screenTitle: { fontFamily: FONTS.serifBold, fontSize: 23, lineHeight: 29 },
  cardHeading: { fontFamily: FONTS.serifBold, fontSize: 17, lineHeight: 22 }, // PWA --type-card-heading: 17px
  metric: { fontFamily: FONTS.serifBold, fontSize: 24, lineHeight: 28 },    // PWA --type-metric: 24px
  section: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,                                                          // PWA --type-section-label: 14px
    lineHeight: 18,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  body: { fontFamily: FONTS.sans, fontSize: 14, lineHeight: 21 },           // PWA --type-body: 14px
  label: { fontFamily: FONTS.sansSemiBold, fontSize: 12.5, lineHeight: 17 }, // PWA --type-card-label: 12.5px
  caption: { fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17 },        // PWA --type-micro: 12px
  chip: { fontFamily: FONTS.sansSemiBold, fontSize: 11, lineHeight: 14 },   // PWA --type-chip / --type-tab: 11px
  micro: { fontFamily: FONTS.sans, fontSize: 12, lineHeight: 16 },
  shloka: { fontFamily: FONTS.serif, fontSize: 18, lineHeight: 26, letterSpacing: 0.2 }, // PWA --type-sanskrit: 18px
  homeHeroGreeting: { fontFamily: FONTS.serifBold, fontSize: 20, lineHeight: 24 }, // PWA Home HeroSection text-xl/leading-tight
  homeHeroLocation: { fontFamily: FONTS.sansSemiBold, fontSize: 11, lineHeight: 14 },
  homeHeroMeaning: { fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 22 },
} as const;

// Minimum touch target per accessibility guidance (WCAG 2.5.5 / Material
// 44dp) — was already duplicated as a local constant in login.tsx/
// whatsapp.tsx; promoted here so new primitives (and those screens, in a
// future pass) share one source of truth.
export const MIN_TOUCH_TARGET = 44;

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://www.shoonaya.com';
