import { COLORS, RADII, SHADOWS, TYPE } from './constants';

export function getHomeMoodPillStyle(pressed: boolean, isDark = false) {
  return {
    flexDirection: 'row' as const,
    flexWrap: 'nowrap' as const,
    boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    flexShrink: 1,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.homePwaPillBg,
    borderWidth: 0,
    borderColor: 'transparent',
    gap: 5,
    opacity: pressed ? 0.76 : 1,
  };
}

export const HOME_MOOD_PILL_TEXT_STYLE = {
  ...TYPE.chip,
  flexShrink: 1,
  color: COLORS.homePwaPillText,
};
