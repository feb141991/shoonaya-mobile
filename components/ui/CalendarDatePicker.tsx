import { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  useColorScheme,
  StyleSheet,
  Pressable,
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CalendarDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void; // Formatted YYYY-MM-DD
  initialDate?: string | null; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  title?: string;
}

function parseDateOrFallback(dateStr?: string | null): Date {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date;
  }
  return new Date();
}

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarDatePicker({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  minDate,
  maxDate,
  title = 'Select Date',
}: CalendarDatePickerProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const parsedInitial = useMemo(() => parseDateOrFallback(initialDate), [initialDate]);

  const [selectedDate, setSelectedDate] = useState<Date>(parsedInitial);
  const [viewYear, setViewYear] = useState<number>(parsedInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsedInitial.getMonth());
  const [pickingMode, setPickingMode] = useState<'calendar' | 'year' | 'month'>('calendar');

  const todayStr = useMemo(() => formatDateString(new Date()), []);

  // Update view when initialDate changes and modal opens
  const handleOpen = useCallback(() => {
    const d = parseDateOrFallback(initialDate);
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setPickingMode('calendar');
  }, [initialDate]);

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = maxDate ? parseInt(maxDate.split('-')[0], 10) : currentYear + 10;
    const minYear = minDate ? parseInt(minDate.split('-')[0], 10) : 1920;
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [minDate, maxDate]);

  const prevMonth = () => {
    void Haptics.selectionAsync();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    void Haptics.selectionAsync();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    void Haptics.selectionAsync();
    const newDate = new Date(viewYear, viewMonth, day);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelectDate(formatDateString(selectedDate));
    onClose();
  };

  const isDaySelected = (day: number) => {
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    );
  };

  const isDayToday = (day: number) => {
    const str = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return str === todayStr;
  };

  const isDayDisabled = (day: number) => {
    const str = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && str < minDate) return true;
    if (maxDate && str > maxDate) return true;
    return false;
  };

  const formattedSelected = useMemo(() => {
    return selectedDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.brandStrong }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: theme.brand }]}>{formattedSelected}</Text>
            </View>
            <PressableSurface
              haptic="selection"
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: theme.brandSoft,
                  borderColor: theme.premiumBorder,
                },
              ]}
              accessibilityLabel="Close calendar"
            >
              <Feather name="x" size={18} color={theme.text} />
            </PressableSurface>
          </View>

          {/* Month / Year Bar */}
          <View style={[styles.navBar, { borderBottomColor: theme.borderSoft }]}>
            <PressableSurface
              haptic="selection"
              onPress={prevMonth}
              style={[styles.navArrow, { borderColor: theme.borderSoft }]}
              accessibilityLabel="Previous month"
            >
              <Feather name="chevron-left" size={20} color={theme.text} />
            </PressableSurface>

            <View style={styles.navTitleContainer}>
              <PressableSurface
                haptic="selection"
                onPress={() => setPickingMode(pickingMode === 'month' ? 'calendar' : 'month')}
                style={[
                  styles.navPill,
                  {
                    backgroundColor: pickingMode === 'month' ? theme.brandSoft : 'transparent',
                    borderColor: pickingMode === 'month' ? theme.brand : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.navMonthText, { color: theme.text }]}>
                  {MONTH_NAMES[viewMonth]}
                </Text>
                <Feather
                  name={pickingMode === 'month' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={theme.brand}
                />
              </PressableSurface>

              <PressableSurface
                haptic="selection"
                onPress={() => setPickingMode(pickingMode === 'year' ? 'calendar' : 'year')}
                style={[
                  styles.navPill,
                  {
                    backgroundColor: pickingMode === 'year' ? theme.brandSoft : 'transparent',
                    borderColor: pickingMode === 'year' ? theme.brand : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.navYearText, { color: theme.brandStrong }]}>
                  {viewYear}
                </Text>
                <Feather
                  name={pickingMode === 'year' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={theme.brand}
                />
              </PressableSurface>
            </View>

            <PressableSurface
              haptic="selection"
              onPress={nextMonth}
              style={[styles.navArrow, { borderColor: theme.borderSoft }]}
              accessibilityLabel="Next month"
            >
              <Feather name="chevron-right" size={20} color={theme.text} />
            </PressableSurface>
          </View>

          {/* Content Mode: Calendar Grid, Month Selector, or Year Selector */}
          {pickingMode === 'year' ? (
            <View style={{ height: 260 }}>
              <ScrollView
                showsVerticalScrollIndicator
                contentContainerStyle={styles.yearGrid}
              >
                {yearsList.map((y) => {
                  const isCurrent = y === viewYear;
                  return (
                    <PressableSurface
                      key={y}
                      haptic="selection"
                      onPress={() => {
                        setViewYear(y);
                        setPickingMode('calendar');
                      }}
                      style={[
                        styles.yearCell,
                        {
                          backgroundColor: isCurrent ? theme.brand : theme.brandSoft,
                          borderColor: isCurrent ? theme.brand : theme.borderSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.yearCellText,
                          { color: isCurrent ? COLORS.ink : theme.text },
                        ]}
                      >
                        {y}
                      </Text>
                    </PressableSurface>
                  );
                })}
              </ScrollView>
            </View>
          ) : pickingMode === 'month' ? (
            <View style={styles.monthGrid}>
              {MONTH_NAMES_SHORT.map((name, idx) => {
                const isCurrent = idx === viewMonth;
                return (
                  <PressableSurface
                    key={name}
                    haptic="selection"
                    onPress={() => {
                      setViewMonth(idx);
                      setPickingMode('calendar');
                    }}
                    style={[
                      styles.monthCell,
                      {
                        backgroundColor: isCurrent ? theme.brand : theme.brandSoft,
                        borderColor: isCurrent ? theme.brand : theme.borderSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        { color: isCurrent ? COLORS.ink : theme.text },
                      ]}
                    >
                      {name}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>
          ) : (
            <View style={styles.calendarContainer}>
              {/* Weekday Row */}
              <View style={styles.weekdayRow}>
                {WEEKDAY_NAMES.map((w) => (
                  <Text key={w} style={[styles.weekdayText, { color: theme.dim }]}>
                    {w}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {/* Empty padding slots before day 1 */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCellContainer} />
                ))}

                {/* Real Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const selected = isDaySelected(day);
                  const today = isDayToday(day);
                  const disabled = isDayDisabled(day);

                  return (
                    <View key={`day-${day}`} style={styles.dayCellContainer}>
                      <PressableSurface
                        haptic="selection"
                        disabled={disabled}
                        onPress={() => handleSelectDay(day)}
                        style={[
                          styles.dayButton,
                          selected && {
                            backgroundColor: theme.brand,
                            borderColor: theme.brand,
                          },
                          today && !selected && {
                            borderColor: theme.brand,
                            borderWidth: 1.5,
                          },
                          disabled && { opacity: 0.25 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: selected
                                ? COLORS.ink
                                : today
                                ? theme.brand
                                : theme.text,
                              fontFamily: selected || today ? FONTS.sansSemiBold : FONTS.sans,
                            },
                          ]}
                        >
                          {day}
                        </Text>
                      </PressableSurface>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Bottom Actions */}
          <View style={[styles.footer, { borderTopColor: theme.borderSoft }]}>
            <PressableSurface
              haptic="selection"
              onPress={() => {
                const now = new Date();
                setSelectedDate(now);
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                setPickingMode('calendar');
              }}
              style={[
                styles.todayBtn,
                {
                  borderColor: theme.premiumBorder,
                  backgroundColor: theme.brandSoft,
                },
              ]}
            >
              <Text style={[styles.todayBtnText, { color: theme.brandStrong }]}>Today</Text>
            </PressableSurface>

            <PressableSurface
              haptic="selection"
              onPress={handleConfirm}
              style={[styles.confirmBtn, { backgroundColor: theme.brand }]}
            >
              <Feather name="check" size={16} color={COLORS.ink} style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>Confirm Date</Text>
            </PressableSurface>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADII.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    ...TYPE.cardHeading,
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  navArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  navMonthText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
  },
  navYearText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
  },
  calendarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellContainer: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    justifyContent: 'center',
  },
  yearCell: {
    width: 72,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCellText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 18,
    justifyContent: 'center',
    height: 240,
  },
  monthCell: {
    width: '28%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCellText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  todayBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: RADII.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  confirmBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADII.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    color: COLORS.ink,
  },
});
