import { View, useColorScheme, type OpaqueColorValue } from 'react-native';

import { ICON_WELL, iconWellColor, type IconWellSize } from '@/lib/icons';
import { SacredIcon, type SacredIconName } from './SacredIcon';
import type Feather from '@expo/vector-icons/Feather';

// The single icon-well building block — see lib/icons.ts for the size/color
// tokens this consumes. Replaces every hand-rolled
// `<View style={{width,height,borderRadius,backgroundColor,...}}><SacredIcon
// .../></View>` pair in the app with one call, so a screen can't drift onto
// its own one-off box size or color source again.
type IconTileProps = {
  name: SacredIconName;
  fallbackGlyph: keyof typeof Feather.glyphMap;
  size?: IconWellSize;
  // Icon glyph color — required, same contract as SacredIcon itself.
  color: string | OpaqueColorValue;
  // Well fill/border tint. Independent from `color`: most wells tint to
  // their own icon's color, but a hero card (Quiz) can give the well a
  // distinct identity color while the glyph stays brand gold. Omit for the
  // app-wide default brand tint.
  accent?: string;
};

export function IconTile({ name, fallbackGlyph, size = 'md', color, accent }: IconTileProps) {
  const isDark = useColorScheme() === 'dark';
  const { box, icon, radius } = ICON_WELL[size];
  const { bg, border } = iconWellColor(isDark, accent);

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <SacredIcon name={name} fallbackGlyph={fallbackGlyph} size={icon} color={color} />
    </View>
  );
}
