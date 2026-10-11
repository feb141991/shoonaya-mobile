import { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  useColorScheme,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { clampDateOnly, formatLocalDateOnly, parseDateOnly } from '@/lib/dateOnly';
import type { AppLanguage } from '@/lib/language-runtime';

const MONTH_INDICES = Array.from({ length: 12 }, (_, index) => index);
const WEEKDAY_DATES = Array.from({ length: 7 }, (_, day) => new Date(2023, 0, 1 + day));
const CALENDAR_COPY = {
  en: { today: 'Today', confirm: 'Confirm date', close: 'Close calendar', previous: 'Previous month', next: 'Next month' },
  hi: { today: 'आज', confirm: 'तिथि चुनें', close: 'कैलेंडर बंद करें', previous: 'पिछला महीना', next: 'अगला महीना' },
  pa: { today: 'ਅੱਜ', confirm: 'ਤਾਰੀਖ਼ ਚੁਣੋ', close: 'ਕੈਲੰਡਰ ਬੰਦ ਕਰੋ', previous: 'ਪਿਛਲਾ ਮਹੀਨਾ', next: 'ਅਗਲਾ ਮਹੀਨਾ' },
} as const;

export interface CalendarDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void; // Formatted YYYY-MM-DD
  initialDate?: string | null; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  title?: string;
  language?: AppLanguage;
  forceDark?: boolean;
}

export function CalendarDatePicker({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  minDate,
  maxDate,
  title = 'Select Date',
  language: languageOverride,
  forceDark,
}: CalendarDatePickerProps) {
  const colorScheme = useColorScheme();
  const isDark = forceDark ?? colorScheme === 'dark';
  const theme = themeColor(isDark);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { language: contextLanguage } = useLanguage();
  const language = languageOverride ?? contextLanguage;
  const locale = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
  const copy = CALENDAR_COPY[language];
  const monthNames = useMemo(() => MONTH_INDICES.map((month) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2023, month, 1))), [locale]);
  const weekdayNames = useMemo(() => WEEKDAY_DATES.map((date) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)), [locale]);

  const validMinDate = minDate && parseDateOnly(minDate) ? minDate : undefined;
  const validMaxDate = maxDate && parseDateOnly(maxDate) ? maxDate : undefined;
  const parsedInitial = useMemo(() => {
    const candidate = parseDateOnly(initialDate) ?? new Date();
    const clamped = clampDateOnly(formatLocalDateOnly(candidate), validMinDate, validMaxDate);
    return parseDateOnly(clamped) ?? candidate;
  }, [initialDate, validMinDate, validMaxDate]);

  const [selectedDate, setSelectedDate] = useState<Date>(parsedInitial);
  const [viewYear, setViewYear] = useState<number>(parsedInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsedInitial.getMonth());
  const [pickingMode, setPickingMode] = useState<'calendar' | 'year' | 'month'>('calendar');

  const todayStr = formatLocalDateOnly(new Date());

  // Update view when initialDate changes and modal opens
  const handleOpen = useCallback(() => {
    const candidate = parseDateOnly(initialDate) ?? new Date();
    const d = parseDateOnly(clampDateOnly(formatLocalDateOnly(candidate), validMinDate, validMaxDate)) ?? candidate;
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setPickingMode('calendar');
  }, [initialDate, validMinDate, validMaxDate]);

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = validMaxDate ? Number(validMaxDate.slice(0, 4)) : currentYear + 10;
    const minYear = validMinDate ? Number(validMinDate.slice(0, 4)) : 1920;
    const list: number[] = [];
    for (let y = maxYear; y >= minYear && y <= maxYear; y--) {
      list.push(y);
    }
    return list.length ? list : [viewYear];
  }, [validMinDate, validMaxDate, viewYear]);

  const currentMonthKey = viewYear * 12 + viewMonth;
  const minMonthKey = validMinDate ? Number(validMinDate.slice(0, 4)) * 12 + Number(validMinDate.slice(5, 7)) - 1 : -Infinity;
  const maxMonthKey = validMaxDate ? Number(validMaxDate.slice(0, 4)) * 12 + Number(validMaxDate.slice(5, 7)) - 1 : Infinity;
  const canGoPrevious = currentMonthKey > minMonthKey;
  const canGoNext = currentMonthKey < maxMonthKey;
  const todayIsAllowed = (!validMinDate || todayStr >= validMinDate) && (!validMaxDate || todayStr <= validMaxDate);

  const prevMonth = () => {
    if (!canGoPrevious) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelectDate(formatLocalDateOnly(selectedDate));
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
    if (validMinDate && str < validMinDate) return true;
    if (validMaxDate && str > validMaxDate) return true;
    return false;
  };

  const formattedSelected = useMemo(() => {
    return selectedDate.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate, locale]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      onShow={handleOpen}
      accessibilityViewIsModal
    >
      <View style={[styles.backdrop, { paddingHorizontal: windowWidth < 360 ? 0 : 16 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.modalCard,
            {
              maxHeight: Math.max(280, windowHeight - insets.top - insets.bottom - 32),
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
              accessibilityLabel={copy.close}
            >
              <Feather name="x" size={18} color={theme.text} />
            </PressableSurface>
          </View>

          {/* Month / Year Bar */}
          <View style={[styles.navBar, { borderBottomColor: theme.borderSoft }]}>
            <PressableSurface
              haptic="selection"
              onPress={prevMonth}
              disabled={!canGoPrevious}
              style={[styles.navArrow, { borderColor: theme.borderSoft }]}
              accessibilityLabel={copy.previous}
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
                accessibilityLabel={language === 'hi' ? 'महीना चुनें' : language === 'pa' ? 'ਮਹੀਨਾ ਚੁਣੋ' : 'Choose month'}
                accessibilityState={{ expanded: pickingMode === 'month' }}
              >
                <Text style={[styles.navMonthText, { color: theme.text }]}>
                  {monthNames[viewMonth]}
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
                accessibilityLabel={language === 'hi' ? 'वर्ष चुनें' : language === 'pa' ? 'ਸਾਲ ਚੁਣੋ' : 'Choose year'}
                accessibilityState={{ expanded: pickingMode === 'year' }}
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
              disabled={!canGoNext}
              style={[styles.navArrow, { borderColor: theme.borderSoft }]}
              accessibilityLabel={copy.next}
            >
              <Feather name="chevron-right" size={20} color={theme.text} />
            </PressableSurface>
          </View>

          {/* Content Mode: Calendar Grid, Month Selector, or Year Selector */}
          {pickingMode === 'year' ? (
            <View style={{ height: Math.min(260, Math.max(120, windowHeight - insets.top - insets.bottom - 250)) }}>
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
                        const selectedMonthKey = y * 12 + viewMonth;
                        if (selectedMonthKey < minMonthKey) {
                          setViewMonth(Number(validMinDate!.slice(5, 7)) - 1);
                        } else if (selectedMonthKey > maxMonthKey) {
                          setViewMonth(Number(validMaxDate!.slice(5, 7)) - 1);
                        }
                        setViewYear(y);
                        setPickingMode('calendar');
                      }}
                      accessibilityLabel={String(y)}
                      accessibilityState={{ selected: isCurrent }}
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
            <ScrollView
              style={{ maxHeight: Math.max(120, windowHeight - insets.top - insets.bottom - 250) }}
              contentContainerStyle={styles.monthGrid}
              showsVerticalScrollIndicator={false}
            >
                {MONTH_INDICES.map((idx) => {
                  const name = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2023, idx, 1));
                const isCurrent = idx === viewMonth;
                const monthKey = viewYear * 12 + idx;
                const isDisabled = monthKey < minMonthKey || monthKey > maxMonthKey;
                return (
                  <PressableSurface
                    key={name}
                    haptic="selection"
                    disabled={isDisabled}
                    onPress={() => {
                      setViewMonth(idx);
                      setPickingMode('calendar');
                    }}
                    accessibilityLabel={name}
                    accessibilityState={{ selected: isCurrent }}
                    style={[
                      styles.monthCell,
                      {
                      backgroundColor: isCurrent ? theme.brand : theme.brandSoft,
                      borderColor: isCurrent ? theme.brand : theme.borderSoft,
                      opacity: isDisabled ? 0.4 : 1,
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
            </ScrollView>
          ) : (
            <ScrollView
              style={{ maxHeight: Math.max(120, windowHeight - insets.top - insets.bottom - 250) }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.calendarContainer}
            >
              {/* Weekday Row */}
              <View style={styles.weekdayRow}>
                {weekdayNames.map((w, index) => (
                  <Text key={`${w}-${index}`} style={[styles.weekdayText, { color: theme.dim }]}>
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
                        accessibilityLabel={`${day} ${monthNames[viewMonth]} ${viewYear}`}
                        accessibilityState={{ selected, disabled }}
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
            </ScrollView>
          )}

          {/* Bottom Actions */}
          <View style={[styles.footer, { borderTopColor: theme.borderSoft }]}>
            <PressableSurface
              haptic="selection"
              disabled={!todayIsAllowed}
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
              <Text style={[styles.todayBtnText, { color: theme.brandStrong }]}>{copy.today}</Text>
            </PressableSurface>

            <PressableSurface
              haptic="none"
              onPress={handleConfirm}
              accessibilityLabel={`${copy.confirm}: ${formattedSelected}`}
              style={[styles.confirmBtn, { backgroundColor: theme.brand }]}
            >
              <Feather name="check" size={16} color={COLORS.ink} style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>{copy.confirm}</Text>
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
    backgroundColor: COLORS.calendarModalScrim,
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
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
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
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
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
    paddingHorizontal: 0,
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
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
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
    height: MIN_TOUCH_TARGET,
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
