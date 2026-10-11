import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';
import {
  REMINDER_HOURS_12,
  formatClock12,
  fromClockParts,
  isClockWithin,
  isNightClock,
  isValidClock,
  minuteOptions,
  toClockParts,
  type ClockParts,
  type Meridiem,
} from '@/lib/reminderTime';

type Props = {
  label: string;
  /** Stored 24-hour "HH:MM" value. */
  value: string;
  /** Fallback shown when the stored value is not a valid clock. */
  fallback: string;
  /** Inclusive bounds, as "HH:MM", when the server only accepts a range. */
  min?: string;
  max?: string;
  hint: string;
  onSave: (clock: string) => void;
  theme: ReturnType<typeof themeColor>;
};

/**
 * 12-hour reminder-time picker (hour, minute, AM/PM). Replaces the free-text
 * 24-hour fields in Settings, where "01:00" was easy to enter meaning 1 PM.
 * Chips copy the observance-day chips in app/settings/detail-screen.tsx.
 */
export function ReminderTimePicker({ label, value, fallback, min, max, hint, onSave, theme }: Props) {
  const initial = toClockParts(isValidClock(value) ? value : fallback) ?? { hour12: 7, minute: 0, meridiem: 'AM' as Meridiem };
  const [draft, setDraft] = useState<ClockParts>(initial);

  useEffect(() => {
    const next = toClockParts(isValidClock(value) ? value : fallback);
    if (next) setDraft(next);
  }, [value, fallback]);

  const draftClock = fromClockParts(draft);
  const inRange = isClockWithin(draftClock, min, max);
  const changed = draftClock !== value;
  const rangeText = min && max ? `${formatClock12(min)} and ${formatClock12(max)}` : null;

  const chip = (key: string, text: string, selected: boolean, accessibilityLabel: string, onPress: () => void) => (
    <PressableSurface
      key={key}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        minWidth: MIN_TOUCH_TARGET,
        borderRadius: RADII.lg,
        borderWidth: 1,
        borderColor: selected ? theme.brand : theme.border,
        backgroundColor: selected ? theme.brandSoft : theme.card,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ ...TYPE.caption, color: selected ? theme.brand : theme.text }}>{text}</Text>
    </PressableSurface>
  );

  return (
    <View style={{ gap: 10, marginTop: 12, marginBottom: 14 }}>
      <Text style={{ ...TYPE.label, color: theme.text }}>{label}</Text>
      <Text style={{ ...TYPE.caption, color: theme.dim }}>{hint}</Text>
      <Text
        accessibilityLiveRegion="polite"
        style={{ ...TYPE.cardHeading, color: theme.text }}
      >
        {formatClock12(draftClock)}
      </Text>

      <View accessibilityLabel={`${label}: hour`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REMINDER_HOURS_12.map((hour) =>
          chip(`h${hour}`, String(hour), draft.hour12 === hour, `${hour} o'clock${draft.hour12 === hour ? ', selected' : ''}`, () =>
            setDraft((current) => ({ ...current, hour12: hour }))),
        )}
      </View>

      <View accessibilityLabel={`${label}: minutes`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {minuteOptions(draft.minute).map((minute) => {
          const text = `:${String(minute).padStart(2, '0')}`;
          return chip(`m${minute}`, text, draft.minute === minute, `${minute} minutes${draft.minute === minute ? ', selected' : ''}`, () =>
            setDraft((current) => ({ ...current, minute })));
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {(['AM', 'PM'] as const).map((meridiem) =>
          chip(meridiem, meridiem, draft.meridiem === meridiem, `${meridiem}${draft.meridiem === meridiem ? ', selected' : ''}`, () =>
            setDraft((current) => ({ ...current, meridiem }))),
        )}
        <View style={{ flex: 1 }} />
        <Button
          label="Save time"
          variant="secondary"
          disabled={!inRange || !changed}
          accessibilityLabel={`Save ${label.toLowerCase()} as ${formatClock12(draftClock)}`}
          onPress={() => onSave(draftClock)}
        />
      </View>

      {!inRange && rangeText ? (
        <Text accessibilityLiveRegion="polite" style={{ ...TYPE.caption, color: COLORS.danger }}>
          Choose a time between {rangeText}.
        </Text>
      ) : inRange && isNightClock(draftClock) ? (
        <Text accessibilityLiveRegion="polite" style={{ ...TYPE.caption, color: theme.dim }}>
          {formatClock12(draftClock)} is at night. Your reminder will still arrive at this time.
        </Text>
      ) : null}
    </View>
  );
}
