import { COLORS, RADII, TYPE } from './constants';

export function getHomeMoodPillStyle(pressed: boolean) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    flexShrink: 0,
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
  flexShrink: 0,
  color: COLORS.homePwaPillText,
};
