import { Text, View } from 'react-native';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { RADII, SPACING, TYPE, themeColor } from '@/lib/constants';
import { activeWindows, formatClock, solarEvents, type SolarDay, type SolarEventId } from '@/lib/solarDay';
import { SOLAR_EVENT_NAMES, solarEventInfo } from '@/lib/solarDayText';

type Props = {
  day: SolarDay;
  minutes: number;
  colors: Record<SolarEventId, string>;
  isDark: boolean;
  onJump: (minutes: number) => void;
};

/** The day's marked times in order. Tapping one moves the Sun there. */
export function SolarEventList({ day, minutes, colors, isDark, onJump }: Props) {
  const theme = themeColor(isDark);
  const active = new Set<SolarEventId>(activeWindows(minutes, day).map((w) => w.id));
  return (
    <View style={{ gap: SPACING.sm }}>
      {solarEvents(day).map((event) => {
        const window = day.windows.find((w) => w.id === event.id);
        const when = window ? window.label : formatClock(event.at);
        const name = SOLAR_EVENT_NAMES[event.id];
        const info = solarEventInfo(event.id);
        const selected = active.has(event.id) || Math.abs(minutes - event.at) < 1;
        return (
          <PressableSurface
            key={event.id}
            haptic="selection"
            accessibilityLabel={`${name}, ${when}`}
            accessibilityHint="Moves the Sun to this time."
            accessibilityState={{ selected }}
            onPress={() => onJump(event.at)}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: SPACING.md,
              padding: SPACING.md,
              borderRadius: RADII.md,
              borderWidth: selected ? 1.5 : 1,
              borderColor: selected ? theme.brand : theme.border,
              backgroundColor: selected ? theme.chipFill : theme.card,
            }}
          >
            <View style={{ width: 12, height: 12, borderRadius: RADII.pill, marginTop: 4, backgroundColor: colors[event.id] }} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <Text style={[TYPE.label, { color: theme.text, flex: 1 }]}>{name}</Text>
                <Text style={[TYPE.label, { color: theme.text }]}>{when}</Text>
              </View>
              {info ? <Text style={[TYPE.caption, { color: theme.dim, flex: 1 }]}>{info}</Text> : null}
            </View>
          </PressableSurface>
        );
      })}
    </View>
  );
}
