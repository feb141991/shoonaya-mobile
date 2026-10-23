import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import {
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

const HOURS_12_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Compact 12-hour reminder-time picker using dropdown buttons for hour and minute,
 * keeping settings compact while avoiding awkward sprawling button matrices.
 */
export function ReminderTimePicker({ label, value, fallback, min, max, hint, onSave, theme }: Props) {
  const initial = toClockParts(isValidClock(value) ? value : fallback) ?? { hour12: 7, minute: 0, meridiem: 'AM' as Meridiem };
  const [draft, setDraft] = useState<ClockParts>(initial);
  const [pickerOpen, setPickerOpen] = useState<'hour' | 'minute' | null>(null);

  useEffect(() => {
    const next = toClockParts(isValidClock(value) ? value : fallback);
    if (next) setDraft(next);
  }, [value, fallback]);

  const draftClock = fromClockParts(draft);
  const inRange = isClockWithin(draftClock, min, max);
  const changed = draftClock !== value;
  const rangeText = min && max ? `${formatClock12(min)} and ${formatClock12(max)}` : null;

  return (
    <View style={{ gap: 8, marginTop: 10, marginBottom: 12 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ ...TYPE.label, color: theme.text }}>{label}</Text>
        <Text style={{ ...TYPE.caption, color: theme.dim }}>{hint}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        {/* Hour Dropdown Button */}
        <PressableSurface
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={`${label}: Hour ${draft.hour12}. Tap to choose hour.`}
          onPress={() => setPickerOpen('hour')}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            minWidth: 58,
            paddingHorizontal: 12,
            borderRadius: RADII.lg,
            borderWidth: 1,
            borderColor: pickerOpen === 'hour' ? theme.brand : theme.border,
            backgroundColor: pickerOpen === 'hour' ? theme.brandSoft : theme.card,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Text style={{ ...TYPE.label, fontSize: 15, color: theme.text }}>
            {draft.hour12}
          </Text>
          <Feather name="chevron-down" size={13} color={theme.dim} />
        </PressableSurface>

        <Text style={{ ...TYPE.label, fontSize: 16, color: theme.dim, marginHorizontal: -2 }}>:</Text>

        {/* Minute Dropdown Button */}
        <PressableSurface
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={`${label}: Minute ${String(draft.minute).padStart(2, '0')}. Tap to choose minute.`}
          onPress={() => setPickerOpen('minute')}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            minWidth: 64,
            paddingHorizontal: 12,
            borderRadius: RADII.lg,
            borderWidth: 1,
            borderColor: pickerOpen === 'minute' ? theme.brand : theme.border,
            backgroundColor: pickerOpen === 'minute' ? theme.brandSoft : theme.card,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Text style={{ ...TYPE.label, fontSize: 15, color: theme.text }}>
            {String(draft.minute).padStart(2, '0')}
          </Text>
          <Feather name="chevron-down" size={13} color={theme.dim} />
        </PressableSurface>

        {/* AM / PM Segmented Buttons */}
        <View
          style={{
            flexDirection: 'row',
            borderRadius: RADII.lg,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden',
          }}
        >
          {(['AM', 'PM'] as const).map((meridiem) => {
            const isSelected = draft.meridiem === meridiem;
            return (
              <PressableSurface
                key={meridiem}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={`${meridiem}${isSelected ? ', selected' : ''}`}
                onPress={() => setDraft((c) => ({ ...c, meridiem }))}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  minWidth: 44,
                  paddingHorizontal: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? theme.brandSoft : 'transparent',
                }}
              >
                <Text
                  style={{
                    ...TYPE.caption,
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? theme.brand : theme.dim,
                  }}
                >
                  {meridiem}
                </Text>
              </PressableSurface>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        {/* Save button */}
        <Button
          label="Save"
          variant={changed && inRange ? 'primary' : 'secondary'}
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

      {/* Modal Dropdown Picker */}
      <Modal
        visible={pickerOpen !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onPress={() => setPickerOpen(null)}
        >
          <Pressable
            style={{
              width: '100%',
              maxWidth: 320,
              backgroundColor: theme.card,
              borderRadius: RADII.xl,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 20,
              gap: 16,
              ...SHADOWS.md,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
                {pickerOpen === 'hour' ? 'Select Hour' : 'Select Minute'}
              </Text>
              <PressableSurface
                onPress={() => setPickerOpen(null)}
                accessibilityLabel="Close picker"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.borderSoft,
                }}
              >
                <Feather name="x" size={16} color={theme.dim} />
              </PressableSurface>
            </View>

            {pickerOpen === 'hour' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {HOURS_12_LIST.map((hour) => {
                  const isSelected = draft.hour12 === hour;
                  return (
                    <PressableSurface
                      key={hour}
                      haptic="selection"
                      accessibilityRole="button"
                      accessibilityLabel={`${hour} o'clock`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        setDraft((c) => ({ ...c, hour12: hour }));
                        setPickerOpen(null);
                      }}
                      style={{
                        width: 62,
                        height: 44,
                        borderRadius: RADII.lg,
                        borderWidth: 1,
                        borderColor: isSelected ? theme.brand : theme.border,
                        backgroundColor: isSelected ? theme.brandSoft : theme.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ ...TYPE.body, fontWeight: isSelected ? '700' : '500', color: isSelected ? theme.brand : theme.text }}>
                        {hour}
                      </Text>
                    </PressableSurface>
                  );
                })}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {minuteOptions(draft.minute).map((min) => {
                  const isSelected = draft.minute === min;
                  const text = `:${String(min).padStart(2, '0')}`;
                  return (
                    <PressableSurface
                      key={min}
                      haptic="selection"
                      accessibilityRole="button"
                      accessibilityLabel={`${min} minutes`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        setDraft((c) => ({ ...c, minute: min }));
                        setPickerOpen(null);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 60,
                        height: 44,
                        borderRadius: RADII.lg,
                        borderWidth: 1,
                        borderColor: isSelected ? theme.brand : theme.border,
                        backgroundColor: isSelected ? theme.brandSoft : theme.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ ...TYPE.body, fontWeight: isSelected ? '700' : '500', color: isSelected ? theme.brand : theme.text }}>
                        {text}
                      </Text>
                    </PressableSurface>
                  );
                })}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
