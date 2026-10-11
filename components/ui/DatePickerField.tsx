import { useState } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { CalendarDatePicker } from './CalendarDatePicker';
import {
  COLORS,
  FONTS,
  MIN_TOUCH_TARGET,
  RADII,
  TYPE,
  themeColor,
} from '@/lib/constants';

export interface DatePickerFieldProps {
  label?: string;
  value?: string | null; // YYYY-MM-DD
  onChangeDate: (dateStr: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  modalTitle?: string;
}

export function DatePickerField({
  label,
  value,
  onChangeDate,
  placeholder = 'Select date (YYYY-MM-DD)',
  minDate,
  maxDate,
  modalTitle = 'Select Date',
}: DatePickerFieldProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [showPicker, setShowPicker] = useState(false);

  const formattedDate = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.dim }]}>{label}</Text>
      ) : null}

      <PressableSurface
        haptic="selection"
        onPress={() => setShowPicker(true)}
        style={[
          styles.field,
          {
            backgroundColor: theme.glass,
            borderColor: value ? theme.brand : theme.premiumBorder,
          },
        ]}
        accessibilityLabel={label || 'Select Date'}
      >
        <Feather
          name="calendar"
          size={16}
          color={value ? theme.brand : theme.dim}
          style={{ marginRight: 10 }}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.valueText,
              {
                color: value ? theme.text : theme.dim,
                fontFamily: value ? FONTS.sansSemiBold : FONTS.sans,
              },
            ]}
          >
            {formattedDate ? `${formattedDate} (${value})` : placeholder}
          </Text>
        </View>

        <Feather name="chevron-down" size={16} color={theme.dim} />
      </PressableSurface>

      <CalendarDatePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        initialDate={value}
        onSelectDate={onChangeDate}
        minDate={minDate}
        maxDate={maxDate}
        title={modalTitle}
      />
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
});
