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
} as const;

export const FONTS = {
  serif: 'CormorantGaramond_600SemiBold',
  serifBold: 'CormorantGaramond_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://shoonaya.com';
