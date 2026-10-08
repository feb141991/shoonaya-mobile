import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, RADII, TYPE } from '@/lib/constants';
import type { DevotionalRepeatScope, DevotionalRepeatTarget, DevotionalSleepTimerSelection } from '@/lib/devotionalListening';
import { Text, View } from 'react-native';

type Language = 'en' | 'hi' | 'pa';

interface DevotionalListeningControlsProps {
  language: Language;
  accent: string;
  surface: string;
  border: string;
  text: string;
  dim: string;
  selectedText: string;
  scope: DevotionalRepeatScope;
  onScopeChange: (scope: DevotionalRepeatScope) => void;
  scopeDisabled?: boolean;
  target: DevotionalRepeatTarget;
  onTargetChange: (target: DevotionalRepeatTarget) => void;
  completedCycles: number;
  isActive: boolean;
  activeVerseNumber?: number;
  verseCount: number;
  sleepSelection: DevotionalSleepTimerSelection;
  onSleepSelectionChange: (selection: DevotionalSleepTimerSelection) => void;
}

const REPEAT_TARGETS: readonly DevotionalRepeatTarget[] = [1, 11, 21, 108];
const SLEEP_OPTIONS: readonly DevotionalSleepTimerSelection[] = ['end', 15, 30];

function copy(language: Language) {
  if (language === 'hi') return {
    title: 'श्रवण विकल्प', scope: 'पाठ', verse: 'एक श्लोक', whole: 'पूरा स्तोत्र', repeat: 'दोहराव', sleep: 'समापन',
    end: 'स्वाभाविक', minutes: (value: number) => `${value} मिनट`, progress: (cycle: number, target: number, verse?: number, count?: number) =>
      verse && count ? `आवृत्ति ${cycle} / ${target} · श्लोक ${verse} / ${count}` : `आवृत्ति ${cycle} / ${target}`,
  };
  if (language === 'pa') return {
    title: 'ਸੁਣਨ ਦੇ ਵਿਕਲਪ', scope: 'ਪਾਠ', verse: 'ਇੱਕ ਸ਼ਲੋਕ', whole: 'ਪੂਰਾ ਸਤੋਤ੍ਰ', repeat: 'ਦੁਹਰਾਉ', sleep: 'ਸਮਾਪਤੀ',
    end: 'ਕੁਦਰਤੀ ਅੰਤ', minutes: (value: number) => `${value} ਮਿੰਟ`, progress: (cycle: number, target: number, verse?: number, count?: number) =>
      verse && count ? `ਚੱਕਰ ${cycle} / ${target} · ਸ਼ਲੋਕ ${verse} / ${count}` : `ਚੱਕਰ ${cycle} / ${target}`,
  };
  return {
    title: 'Listening options', scope: 'Scope', verse: 'This verse', whole: 'Whole Stotram', repeat: 'Repeat', sleep: 'Sleep timer',
    end: 'At completion', minutes: (value: number) => `${value} min`, progress: (cycle: number, target: number, verse?: number, count?: number) =>
      verse && count ? `Cycle ${cycle} of ${target} · Verse ${verse} of ${count}` : `Cycle ${cycle} of ${target}`,
  };
}

export function DevotionalListeningControls({
  language,
  accent,
  surface,
  border,
  text,
  dim,
  selectedText,
  scope,
  onScopeChange,
  scopeDisabled = false,
  target,
  onTargetChange,
  completedCycles,
  isActive,
  activeVerseNumber,
  verseCount,
  sleepSelection,
  onSleepSelectionChange,
}: DevotionalListeningControlsProps) {
  const labels = copy(language);
  const choices = <T extends string | number>(items: readonly T[], selected: T, onSelect: (value: T) => void, getLabel: (value: T) => string, disabled = false) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((item) => {
        const active = selected === item;
        return (
          <PressableSurface
            key={String(item)}
            haptic="selection"
            disabled={disabled}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={getLabel(item)}
            accessibilityState={{ selected: active, disabled }}
            style={{
              minWidth: 52,
              minHeight: 44,
              paddingHorizontal: 12,
              borderRadius: RADII.lg,
              backgroundColor: active ? accent : surface,
              borderColor: active ? accent : border,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.55 : 1,
            }}
          >
            <Text style={{ ...TYPE.chip, color: active ? selectedText : text }}>{getLabel(item)}</Text>
          </PressableSurface>
        );
      })}
    </View>
  );

  return (
    <Card tone="auto" style={{ padding: 16, backgroundColor: surface, borderColor: border, gap: 14 }}>
      <View>
        <Text style={{ ...TYPE.section, color: text }}>{labels.title}</Text>
        {isActive || completedCycles > 0 ? (
          <Text accessibilityLiveRegion="polite" style={{ ...TYPE.micro, color: dim, marginTop: 4 }}>
            {labels.progress(Math.min(completedCycles + 1, target), target, activeVerseNumber, verseCount)}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.micro, color: dim, fontFamily: FONTS.sansSemiBold }}>{labels.scope}</Text>
        {choices(
          ['verse', 'stotram'],
          scope,
          onScopeChange,
          (value) => value === 'verse' ? labels.verse : labels.whole,
          scopeDisabled,
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.micro, color: dim, fontFamily: FONTS.sansSemiBold }}>{labels.repeat}</Text>
        {choices(REPEAT_TARGETS, target, onTargetChange, (value) => `${value}×`)}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.micro, color: dim, fontFamily: FONTS.sansSemiBold }}>{labels.sleep}</Text>
        {choices(SLEEP_OPTIONS, sleepSelection, onSleepSelectionChange, (value) =>
          value === 'end' ? labels.end : labels.minutes(Number(value)))}
      </View>
    </Card>
  );
}
