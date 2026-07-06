export const COLORS = {
  brandGold: '#C5A059',
  ink: '#1A0F00',
  creamBg: '#FDF6E3',
  darkBg: '#0E0804',
  cardBgLight: '#FFF9F0',
  cardBgDark: '#17110B',
  borderLight: '#E6D8BC',
  borderDark: '#3B2B16',
  textDimLight: '#7A6A53',
  textDimDark: '#B49D7C',
  // Success/observed state — matches web's exact values (VratClient.tsx
  // "Mark as Observed" / "Observed today" treatment), so native and web
  // render the same green rather than each screen picking its own.
  success: '#5aaa38',
  successBg: 'rgba(134,187,110,0.15)',
  successBorder: 'rgba(134,187,110,0.45)',
} as const;

export const FONTS = {
  serif: 'CormorantGaramond_600SemiBold',
  serifBold: 'CormorantGaramond_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://shoonaya.com';
