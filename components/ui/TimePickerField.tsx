import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  useColorScheme,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import {
  COLORS,
  FONTS,
  MIN_TOUCH_TARGET,
  RADII,
  SHADOWS,
  TYPE,
  themeColor,
} from '@/lib/constants';
import {
  parseTimeToHoursAndMinutes,
  formatTime24,
  formatTime12Display,
  HOURS_24,
  HOURS_12,
  MINUTES,
  MINUTE_PRESETS,
} from '@/lib/timePicker';

export {
  parseTimeToHoursAndMinutes,
  formatTime24,
  formatTime12Display,
  HOURS_24,
  HOURS_12,
  MINUTES,
  MINUTE_PRESETS,
};

export interface TimePickerFieldProps {
  label?: string;
  value?: string | null; // HH:MM (24-hour format)
  onChangeTime: (timeStr: string) => void;
  placeholder?: string;
  modalTitle?: string;
  allowUnknown?: boolean;
}

export function TimePickerField({
  label,
  value,
  onChangeTime,
  placeholder = 'HH:MM',
  modalTitle = 'Select Birth Time',
  allowUnknown = true,
}: TimePickerFieldProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const { height: windowHeight } = useWindowDimensions();

  const [modalVisible, setModalVisible] = useState(false);
  const [use12HourMode, setUse12HourMode] = useState(true);

  // Working state in modal
  const initialTime = useMemo(() => parseTimeToHoursAndMinutes(value), [value]);
  const [selectedHour, setSelectedHour] = useState<number>(initialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initialTime.minute);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (modalVisible) {
      const parsed = parseTimeToHoursAndMinutes(value);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
    }
  }, [modalVisible, value]);

  const displayTime12 = formatTime12Display(value);
  const displayValue = value ? `${displayTime12} (${value})` : placeholder;

  // 12-hour breakdown of working state
  const isPM = selectedHour >= 12;
  const selectedHour12 = selectedHour % 12 === 0 ? 12 : selectedHour % 12;

  const handleSelectHour12 = (h12: number) => {
    void Haptics.selectionAsync().catch(() => {});
    let h24: number;
    if (isPM) {
      h24 = h12 === 12 ? 12 : h12 + 12;
    } else {
      h24 = h12 === 12 ? 0 : h12;
    }
    setSelectedHour(h24);
  };

  const handleTogglePeriod = (pm: boolean) => {
    void Haptics.selectionAsync().catch(() => {});
    if (pm && selectedHour < 12) {
      setSelectedHour(selectedHour + 12);
    } else if (!pm && selectedHour >= 12) {
      setSelectedHour(selectedHour - 12);
    }
  };

  const handleSelectHour24 = (h: number) => {
    void Haptics.selectionAsync().catch(() => {});
    setSelectedHour(h);
  };

  const handleSelectMinute = (m: number) => {
    void Haptics.selectionAsync().catch(() => {});
    setSelectedMinute(m);
  };

  const handleConfirm = () => {
    const formatted = formatTime24(selectedHour, selectedMinute);
    void Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onChangeTime(formatted);
    setModalVisible(false);
  };

  const handleClear = () => {
    void Haptics.selectionAsync().catch(() => {});
    onChangeTime('');
    setModalVisible(false);
  };

  const currentFormatted24 = formatTime24(selectedHour, selectedMinute);
  const currentFormatted12 = formatTime12Display(currentFormatted24);

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.dim }]}>{label}</Text>
      ) : null}

      <PressableSurface
        haptic="selection"
        onPress={() => setModalVisible(true)}
        style={[
          styles.field,
          {
            backgroundColor: theme.glass,
            borderColor: value ? theme.brand : theme.premiumBorder,
          },
        ]}
        accessibilityLabel={`${label || 'Time'}: ${displayValue}`}
        accessibilityHint="Opens time selector"
      >
        <Feather
          name="clock"
          size={16}
          color={value ? theme.brand : theme.dim}
          style={{ marginRight: 10 }}
        />

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[
              styles.valueText,
              {
                color: value ? theme.text : theme.dim,
                fontFamily: value ? FONTS.sansSemiBold : FONTS.sans,
              },
            ]}
          >
            {value ? `${displayTime12}` : placeholder}
          </Text>
        </View>

        <Feather name="chevron-down" size={16} color={theme.dim} />
      </PressableSurface>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalScrim}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss time picker"
          />

          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                maxHeight: Math.min(windowHeight * 0.85, 620),
                boxShadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
              },
            ]}
          >
            {/* Grab handle */}
            <View style={styles.handleContainer}>
              <View style={[styles.handleBar, { backgroundColor: theme.borderSoft }]} />
            </View>

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{modalTitle}</Text>
                <Text style={[styles.headerSubtitle, { color: theme.dim }]}>
                  Set exact hour and minute for Kundali
                </Text>
              </View>

              <PressableSurface
                haptic="selection"
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.closeButton, { backgroundColor: theme.cardSoft }]}
              >
                <Feather name="x" size={16} color={theme.text} />
              </PressableSurface>
            </View>

            {/* Time Preview Plaque */}
            <View
              style={[
                styles.previewPlaque,
                {
                  backgroundColor: theme.cardSoft,
                  borderColor: theme.borderSoft,
                },
              ]}
            >
              <View style={styles.previewTimeRow}>
                <Text style={[styles.previewTimeMain, { color: theme.text }]}>
                  {currentFormatted12}
                </Text>
                <View style={[styles.tagBadge, { backgroundColor: theme.brandSoft }]}>
                  <Text style={[styles.tagBadgeText, { color: theme.brand }]}>
                    24h: {currentFormatted24}
                  </Text>
                </View>
              </View>

              {/* Format Toggle Pill */}
              <View style={styles.modeToggleRow}>
                <PressableSurface
                  haptic="selection"
                  onPress={() => setUse12HourMode(true)}
                  style={[
                    styles.modeToggleBtn,
                    use12HourMode
                      ? { backgroundColor: theme.brand, borderColor: theme.brand }
                      : { backgroundColor: theme.card, borderColor: theme.borderSoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeToggleText,
                      { color: use12HourMode ? COLORS.ink : theme.dim },
                    ]}
                  >
                    12-Hour (AM/PM)
                  </Text>
                </PressableSurface>

                <PressableSurface
                  haptic="selection"
                  onPress={() => setUse12HourMode(false)}
                  style={[
                    styles.modeToggleBtn,
                    !use12HourMode
                      ? { backgroundColor: theme.brand, borderColor: theme.brand }
                      : { backgroundColor: theme.card, borderColor: theme.borderSoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeToggleText,
                      { color: !use12HourMode ? COLORS.ink : theme.dim },
                    ]}
                  >
                    24-Hour (00–23)
                  </Text>
                </PressableSurface>
              </View>

              {/* AM / PM Selector (if 12-hour mode) */}
              {use12HourMode ? (
                <View style={styles.periodRow}>
                  <PressableSurface
                    haptic="selection"
                    onPress={() => handleTogglePeriod(false)}
                    style={[
                      styles.periodBtn,
                      !isPM
                        ? { backgroundColor: theme.brandSoft, borderColor: theme.brand }
                        : { backgroundColor: theme.card, borderColor: theme.borderSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.periodBtnText,
                        { color: !isPM ? theme.brand : theme.dim },
                      ]}
                    >
                      AM (Morning)
                    </Text>
                  </PressableSurface>

                  <PressableSurface
                    haptic="selection"
                    onPress={() => handleTogglePeriod(true)}
                    style={[
                      styles.periodBtn,
                      isPM
                        ? { backgroundColor: theme.brandSoft, borderColor: theme.brand }
                        : { backgroundColor: theme.card, borderColor: theme.borderSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.periodBtnText,
                        { color: isPM ? theme.brand : theme.dim },
                      ]}
                    >
                      PM (Evening/Night)
                    </Text>
                  </PressableSurface>
                </View>
              ) : null}
            </View>

            {/* Quick Minute Presets */}
            <View style={styles.presetsRow}>
              <Text style={[styles.presetsLabel, { color: theme.dim }]}>Minutes:</Text>
              {MINUTE_PRESETS.map((m) => {
                const active = selectedMinute === m;
                return (
                  <PressableSurface
                    key={m}
                    haptic="selection"
                    onPress={() => handleSelectMinute(m)}
                    style={[
                      styles.presetChip,
                      active
                        ? { backgroundColor: theme.brand, borderColor: theme.brand }
                        : { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: active ? COLORS.ink : theme.text },
                      ]}
                    >
                      :{m.toString().padStart(2, '0')}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>

            {/* Columns Container: Hours & Minutes */}
            <View style={styles.columnsContainer}>
              {/* Hours Column */}
              <View style={styles.columnWrapper}>
                <View style={[styles.columnHeader, { borderBottomColor: theme.borderSoft }]}>
                  <Feather name="clock" size={12} color={theme.brand} />
                  <Text style={[styles.columnHeaderText, { color: theme.dim }]}>HOUR</Text>
                </View>

                <ScrollView
                  ref={hourScrollRef}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.columnScrollContent}
                  style={styles.columnScrollView}
                >
                  {(use12HourMode ? HOURS_12 : HOURS_24).map((h) => {
                    const isSelected = use12HourMode
                      ? selectedHour12 === h
                      : selectedHour === h;
                    const displayLabel = use12HourMode
                      ? `${h.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`
                      : `${h.toString().padStart(2, '0')}:00`;

                    return (
                      <PressableSurface
                        key={h}
                        haptic="selection"
                        onPress={() => (use12HourMode ? handleSelectHour12(h) : handleSelectHour24(h))}
                        style={[
                          styles.timeItem,
                          isSelected
                            ? {
                                backgroundColor: theme.brandSoft,
                                borderColor: theme.brand,
                              }
                            : {
                                backgroundColor: 'transparent',
                                borderColor: 'transparent',
                              },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeItemText,
                            {
                              color: isSelected ? theme.brand : theme.text,
                              fontFamily: isSelected ? FONTS.sansSemiBold : FONTS.sans,
                            },
                          ]}
                        >
                          {displayLabel}
                        </Text>
                        {isSelected ? (
                          <Feather name="check" size={14} color={theme.brand} />
                        ) : null}
                      </PressableSurface>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Separator Line */}
              <View style={[styles.columnDivider, { backgroundColor: theme.borderSoft }]} />

              {/* Minutes Column */}
              <View style={styles.columnWrapper}>
                <View style={[styles.columnHeader, { borderBottomColor: theme.borderSoft }]}>
                  <Feather name="activity" size={12} color={theme.brand} />
                  <Text style={[styles.columnHeaderText, { color: theme.dim }]}>MINUTE</Text>
                </View>

                <ScrollView
                  ref={minuteScrollRef}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.columnScrollContent}
                  style={styles.columnScrollView}
                >
                  {MINUTES.map((m) => {
                    const isSelected = selectedMinute === m;
                    return (
                      <PressableSurface
                        key={m}
                        haptic="selection"
                        onPress={() => handleSelectMinute(m)}
                        style={[
                          styles.timeItem,
                          isSelected
                            ? {
                                backgroundColor: theme.brandSoft,
                                borderColor: theme.brand,
                              }
                            : {
                                backgroundColor: 'transparent',
                                borderColor: 'transparent',
                              },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeItemText,
                            {
                              color: isSelected ? theme.brand : theme.text,
                              fontFamily: isSelected ? FONTS.sansSemiBold : FONTS.sans,
                            },
                          ]}
                        >
                          {m.toString().padStart(2, '0')} min
                        </Text>
                        {isSelected ? (
                          <Feather name="check" size={14} color={theme.brand} />
                        ) : null}
                      </PressableSurface>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.actionRow}>
              {allowUnknown ? (
                <PressableSurface
                  haptic="selection"
                  onPress={handleClear}
                  style={[
                    styles.secondaryActionBtn,
                    {
                      backgroundColor: theme.cardSoft,
                      borderColor: theme.borderSoft,
                    },
                  ]}
                >
                  <Feather name="slash" size={14} color={theme.dim} />
                  <Text style={[styles.secondaryActionText, { color: theme.dim }]}>
                    Time Unknown
                  </Text>
                </PressableSurface>
              ) : (
                <PressableSurface
                  haptic="selection"
                  onPress={() => setModalVisible(false)}
                  style={[
                    styles.secondaryActionBtn,
                    {
                      backgroundColor: theme.cardSoft,
                      borderColor: theme.borderSoft,
                    },
                  ]}
                >
                  <Text style={[styles.secondaryActionText, { color: theme.dim }]}>
                    Cancel
                  </Text>
                </PressableSurface>
              )}

              <PressableSurface
                haptic="impact"
                onPress={handleConfirm}
                style={[
                  styles.primaryActionBtn,
                  {
                    backgroundColor: theme.brand,
                  },
                ]}
              >
                <Feather name="check" size={16} color={COLORS.ink} />
                <Text style={styles.primaryActionText}>
                  Confirm Time
                </Text>
              </PressableSurface>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  valueText: {
    fontSize: 15,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: COLORS.bottomSheetScrim,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  handleBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 20,
  },
  headerSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaque: {
    borderRadius: RADII.lg,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  previewTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTimeMain: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  tagBadge: {
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagBadgeText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11.5,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeToggleBtn: {
    flex: 1,
    borderRadius: RADII.md,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  modeToggleText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    borderRadius: RADII.md,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  periodBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetsLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  presetChip: {
    borderRadius: RADII.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12.5,
  },
  columnsContainer: {
    flexDirection: 'row',
    height: 190,
    gap: 8,
  },
  columnWrapper: {
    flex: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  columnHeaderText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  columnScrollView: {
    flex: 1,
  },
  columnScrollContent: {
    gap: 4,
    paddingVertical: 4,
  },
  columnDivider: {
    width: 1,
    marginVertical: 10,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADII.md,
    borderWidth: 1,
    minHeight: 38,
  },
  timeItemText: {
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADII.lg,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13.5,
  },
  primaryActionBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADII.lg,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 18,
  },
  primaryActionText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    color: COLORS.ink,
  },
});
