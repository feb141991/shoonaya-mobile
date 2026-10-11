import { useState } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { CalendarDatePicker } from './CalendarDatePicker';
import {
  FONTS,
  MIN_TOUCH_TARGET,
  RADII,
  themeColor,
} from '@/lib/constants';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { parseDateOnly } from '@/lib/dateOnly';
import type { AppLanguage } from '@/lib/language-runtime';

export interface DatePickerFieldProps {
  label?: string;
  value?: string | null; // YYYY-MM-DD
  onChangeDate: (dateStr: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  modalTitle?: string;
  language?: AppLanguage;
}

export function DatePickerField({
  label,
  value,
  onChangeDate,
  placeholder = 'Select date (YYYY-MM-DD)',
  minDate,
  maxDate,
  modalTitle = 'Select Date',
  language: languageOverride,
}: DatePickerFieldProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const { language: contextLanguage } = useLanguage();
  const language = languageOverride ?? contextLanguage;
  const locale = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
  const [showPicker, setShowPicker] = useState(false);

  const parsedValue = parseDateOnly(value);
  const formattedDate = parsedValue
    ? parsedValue.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const displayValue = formattedDate ?? (value || placeholder);

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
        accessibilityLabel={`${label || placeholder}: ${formattedDate || value || ''}`.trim()}
        accessibilityHint={language === 'hi' ? 'कैलेंडर खोलने के लिए दो बार टैप करें' : language === 'pa' ? 'ਕੈਲੰਡਰ ਖੋਲ੍ਹਣ ਲਈ ਦੋ ਵਾਰ ਟੈਪ ਕਰੋ' : 'Opens a calendar to choose a date'}
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
            {displayValue}
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
        language={language}
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
