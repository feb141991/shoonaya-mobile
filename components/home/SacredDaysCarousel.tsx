import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { useReducedMotion } from '@/components/ui/Motion';
import { ShimmerBlock } from '@/components/ui/SkeletonLoader';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE } from '@/lib/constants';
import type { ObservanceSeries } from '@/lib/observance-series-contract.generated';
import {
  buildSacredDaysDeck,
  SACRED_DAYS_CARD_HEIGHT,
  type SacredDaysDeckItem,
  type SacredDaysObservance,
} from '@/lib/sacred-days-deck';
import { ObservanceSeriesCard } from './ObservanceSeriesCard';
import { SacredDaysCard } from './SacredDaysCard';
import { SacredCalendarSheet } from './SacredCalendarSheet';

type Theme = {
  card: string;
  border: string;
  premiumBorder: string;
  text: string;
  dim: string;
  brand: string;
};

const COPY = {
  en: {
    title: 'Sacred Days',
    export: 'Sacred Calendar',
    exportBusy: 'Preparing',
    unavailable: 'Sacred days could not be refreshed.',
    retry: 'Retry',
    sharingUnavailable: 'Your device cannot share calendar files.',
    exportFailed: 'The calendar could not be exported. Please try again.',
  },
  hi: {
    title: 'पवित्र दिन',
    export: 'पवित्र कैलेंडर',
    exportBusy: 'तैयार हो रहा है',
    unavailable: 'पवित्र दिनों की जानकारी रीफ़्रेश नहीं हो सकी।',
    retry: 'पुनः प्रयास',
    sharingUnavailable: 'आपका डिवाइस कैलेंडर फ़ाइल साझा नहीं कर सकता।',
    exportFailed: 'कैलेंडर निर्यात नहीं हो सका। कृपया फिर प्रयास करें।',
  },
  pa: {
    title: 'ਪਵਿੱਤਰ ਦਿਨ',
    export: 'ਪਵਿੱਤਰ ਕੈਲੰਡਰ',
    exportBusy: 'ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ',
    unavailable: 'ਪਵਿੱਤਰ ਦਿਨਾਂ ਦੀ ਜਾਣਕਾਰੀ ਤਾਜ਼ਾ ਨਹੀਂ ਹੋ ਸਕੀ।',
    retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼',
    sharingUnavailable: 'ਤੁਹਾਡੀ ਡਿਵਾਈਸ ਕੈਲੰਡਰ ਫਾਈਲ ਸਾਂਝੀ ਨਹੀਂ ਕਰ ਸਕਦੀ।',
    exportFailed: 'ਕੈਲੰਡਰ ਨਿਰਯਾਤ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
} as const;

const CARD_GAP = 12;

export function SacredDaysCarousel({
  observances,
  series,
  calendarStatus,
  theme,
  isDark,
  lang = 'en',
  spiritualDate,
  onRetryUnavailable,
}: {
  observances: SacredDaysObservance[];
  series: ObservanceSeries[];
  calendarStatus: 'ready' | 'pending' | 'unavailable';
  theme: Theme;
  isDark: boolean;
  lang?: 'en' | 'hi' | 'pa';
  spiritualDate: string;
  onRetryUnavailable?: () => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const listRef = useRef<FlatList<SacredDaysDeckItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const closeCalendar = useCallback(() => setCalendarOpen(false), []);
  const copy = COPY[lang];
  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const cardWidth = Math.min(380, Math.max(280, screenWidth - 48));

  const items = useMemo(
    () => buildSacredDaysDeck({ observances, series, spiritualDate }),
    [observances, series, spiritualDate],
  );

  useEffect(() => {
    setActiveIndex((current) => items.length === 0 ? 0 : Math.min(current, items.length - 1));
  }, [items.length]);

  const scrollTo = useCallback((index: number) => {
    if (items.length === 0) return;
    const boundedIndex = Math.max(0, Math.min(index, items.length - 1));
    listRef.current?.scrollToOffset({
      offset: boundedIndex * (cardWidth + CARD_GAP),
      animated: !reducedMotion,
    });
    setActiveIndex(boundedIndex);
  }, [cardWidth, items.length, reducedMotion]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + CARD_GAP));
    setActiveIndex(Math.max(0, Math.min(index, items.length - 1)));
  }, [cardWidth, items.length]);

  const exportCalendar = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(copy.title, copy.sharingUnavailable);
        return;
      }

      const response = await apiFetch('/api/calendar/export');
      if (!response.ok) throw new Error(`Calendar export failed (${response.status})`);
      const calendarBody = await response.text();
      const targetFile = new FileSystem.File(FileSystem.Paths.cache, 'shoonaya-dharmic-calendar.ics');
      targetFile.write(calendarBody);
      await Sharing.shareAsync(targetFile.uri, {
        dialogTitle: copy.export,
        mimeType: 'text/calendar',
        UTI: 'public.calendar-event',
      });
    } catch {
      Alert.alert(copy.title, copy.exportFailed);
    } finally {
      setExporting(false);
    }
  }, [copy, exporting]);

  const hasItems = items.length > 0;



  return (
    <View accessibilityLabel={copy.title} style={{ marginBottom: 4 }}>
      {calendarOpen ? <SacredCalendarSheet lang={lang} onClose={closeCalendar} downloading={exporting} onDownload={() => void exportCalendar()} /> : null}
      <View style={{ minHeight: 34, paddingHorizontal: 4, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 }}>
          <Feather name="calendar" size={15} color={accent} />
          <Text style={{ ...TYPE.section, color: accent }} numberOfLines={1}>
            {copy.title}
          </Text>
          {calendarStatus === 'ready' ? (
            <View style={{ minWidth: 24, paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADII.pill, backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight }}>
              <Text style={{ ...TYPE.chip, color: accent, textAlign: 'center' }}>{items.length}</Text>
            </View>
          ) : null}
        </View>

        {calendarStatus === 'ready' ? (
          <PressableSurface
            haptic="selection"
            accessibilityLabel={copy.export}
            accessibilityState={{ busy: exporting, disabled: exporting }}
            disabled={exporting}
            onPress={() => setCalendarOpen(true)}
            style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Feather name="calendar" size={14} color={accent} />
            <Text style={{ ...TYPE.chip, color: accent }} numberOfLines={1}>
              {exporting ? copy.exportBusy : copy.export}
            </Text>
          </PressableSurface>
        ) : null}
      </View>

      {calendarStatus === 'pending' && !hasItems ? (
        <View accessibilityState={{ busy: true }} style={{ height: SACRED_DAYS_CARD_HEIGHT }}>
          <ShimmerBlock style={{ height: SACRED_DAYS_CARD_HEIGHT, width: cardWidth, borderRadius: RADII.xl }} />
        </View>
      ) : calendarStatus === 'unavailable' && !hasItems ? (
        <View
          style={{
            minHeight: SACRED_DAYS_CARD_HEIGHT,
            borderRadius: RADII.xl,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            backgroundColor: theme.card,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            gap: 8,
          }}
        >
          <Feather name="cloud-off" size={20} color={theme.dim} />
          <Text style={{ ...TYPE.caption, color: theme.dim, textAlign: 'center' }}>{copy.unavailable}</Text>
          {onRetryUnavailable ? (
            <PressableSurface
              haptic="selection"
              accessibilityLabel={copy.retry}
              onPress={onRetryUnavailable}
              style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: accent }}>{copy.retry}</Text>
            </PressableSurface>
          ) : null}
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            horizontal
            data={items}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <View style={{ width: cardWidth, height: SACRED_DAYS_CARD_HEIGHT }}>
                {item.type === 'series' ? (
                  <ObservanceSeriesCard
                    series={item.series}
                    child={item.child}
                    theme={theme}
                    isDark={isDark}
                    lang={lang}
                    spiritualDate={spiritualDate}
                  />
                ) : (
                  <SacredDaysCard entry={item.entry} theme={theme} isDark={isDark} lang={lang} />
                )}
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + CARD_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onMomentumScrollEnd={handleMomentumEnd}
            getItemLayout={(_, index) => ({
              length: cardWidth + CARD_GAP,
              offset: (cardWidth + CARD_GAP) * index,
              index,
            })}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          />

          {items.length > 1 ? (
            <View style={{ minHeight: MIN_TOUCH_TARGET, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {items.map((item, index) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.title}, ${index + 1} of ${items.length}`}
                  accessibilityState={{ selected: index === activeIndex }}
                  onPress={() => scrollTo(index)}
                  style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View
                    style={{
                      width: index === activeIndex ? 16 : 6,
                      height: 6,
                      borderRadius: RADII.pill,
                      backgroundColor: index === activeIndex ? accent : theme.border,
                    }}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
