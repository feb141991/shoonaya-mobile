import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, RADII, TYPE } from '@/lib/constants';
import type { DevotionalSleepTimerSelection } from '@/lib/devotionalListening';
import { Text, View } from 'react-native';

interface DevotionalSleepTimerStripProps {
  language: 'en' | 'hi' | 'pa';
  accent: string;
  surface: string;
  border: string;
  text: string;
  selectedText: string;
  selection: DevotionalSleepTimerSelection;
  onSelectionChange: (selection: DevotionalSleepTimerSelection) => void;
}

export function DevotionalSleepTimerStrip({
  language,
  accent,
  surface,
  border,
  text,
  selectedText,
  selection,
  onSelectionChange,
}: DevotionalSleepTimerStripProps) {
  const labels = language === 'hi'
    ? { title: 'समापन', end: 'कथा के अंत में', minutes: (n: number) => `${n} मिनट` }
    : language === 'pa'
      ? { title: 'ਸਮਾਪਤੀ', end: 'ਕਥਾ ਦੇ ਅੰਤ ਤੇ', minutes: (n: number) => `${n} ਮਿੰਟ` }
      : { title: 'Sleep', end: 'End of story', minutes: (n: number) => `${n} min` };

  const options: readonly DevotionalSleepTimerSelection[] = ['end', 15, 30];
  return (
    <View accessibilityLabel={labels.title} style={{ minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: surface }}>
      <Text style={{ ...TYPE.micro, color: text, fontFamily: FONTS.sansSemiBold, marginRight: 2 }}>{labels.title}</Text>
      {options.map((option) => {
        const selected = selection === option;
        const label = option === 'end' ? labels.end : labels.minutes(option);
        return (
          <PressableSurface
            key={String(option)}
            haptic="selection"
            onPress={() => onSelectionChange(option)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            style={{ minHeight: 44, paddingHorizontal: 10, borderRadius: RADII.lg, backgroundColor: selected ? accent : surface, borderWidth: 1, borderColor: selected ? accent : border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text numberOfLines={1} style={{ ...TYPE.micro, color: selected ? selectedText : text, fontFamily: FONTS.sansSemiBold }}>{label}</Text>
          </PressableSurface>
        );
      })}
    </View>
  );
}
