import Feather from '@expo/vector-icons/Feather';
import { Text, View } from 'react-native';

import { COLORS, FONTS } from '@/lib/constants';
import { ritualWindowNote } from '@/lib/ritualWindow';

type Props = {
  observance: Parameters<typeof ritualWindowNote>[0];
  timeZone: string;
  size?: 'row' | 'sheet';
};

/** One line saying when the ritual may begin; renders nothing unless the engine flagged a window. */
export function RitualWindowNote({ observance, timeZone, size = 'row' }: Props) {
  const note = ritualWindowNote(observance, timeZone);
  if (!note) return null;
  const fontSize = size === 'sheet' ? 13 : 11;
  return (
    <View
      accessible
      accessibilityLabel={note.text}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: size === 'sheet' ? 0 : 4 }}
    >
      <Feather name="clock" size={fontSize} color={COLORS.brandGoldDark} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, color: COLORS.brandGoldDark, fontFamily: FONTS.sansSemiBold, fontSize, lineHeight: fontSize + 5 }}>
        {note.text}
      </Text>
    </View>
  );
}
