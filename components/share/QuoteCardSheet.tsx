import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHROME_MAX_FONT_SCALE, SheetChip } from '@/components/reader/ReaderControls';
import { PressableSurface } from '@/components/ui/PressableSurface';
import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_SQUARE_HEIGHT,
  SHARE_CARD_WIDTH,
  ShoonayaQuoteCard,
  type ShoonayaQuoteCardData,
} from '@/components/share/ShoonayaShareCard';
import { FONTS, RADII, TYPE } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { QUOTE_CARD_FORMATS, type QuoteCardFormat } from '@/lib/quoteCard';
import { readerControlsPalette } from '@/lib/readerAppearance';
import { readerCopy } from '@/lib/readerCopy';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { useReaderAppearance } from '@/lib/useReaderAppearance';

// "Share as card" (Phase 7): preview, square or 9:16, then the system share
// sheet. Styled like the reader's "Aa" sheet (same palette and chips).

export function QuoteCardSheet({
  visible,
  onClose,
  data,
  fileName,
}: {
  visible: boolean;
  onClose: () => void;
  data: ShoonayaQuoteCardData;
  fileName: string;
}) {
  const { paper } = useReaderAppearance();
  const palette = readerControlsPalette(paper);
  const { language } = useLanguage();
  const copy = readerCopy(language);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [format, setFormat] = useState<QuoteCardFormat>('square');
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View | null>(null);

  const cardHeight = format === 'square' ? SHARE_CARD_SQUARE_HEIGHT : SHARE_CARD_HEIGHT;
  // Preview fits the sheet: at most the screen width and ~45% of its height.
  const scale = Math.min((windowWidth - 64) / SHARE_CARD_WIDTH, (windowHeight * 0.45) / cardHeight, 1);
  const formatLabel = (value: QuoteCardFormat) => (value === 'square' ? copy.cardFormatSquare : copy.cardFormatStory);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80)); // let the card finish layout
      await shareCapturedShoonayaCard(cardRef, {
        fileName: `${fileName}-${format}.png`,
        dialogTitle: copy.shareAsCard,
        fallbackMessage: `${data.text}\n— ${data.attribution}`,
        size: { width: SHARE_CARD_WIDTH, height: cardHeight },
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', inset: 0, backgroundColor: palette.scrim }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={copy.done}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: palette.page,
            borderTopLeftRadius: RADII.xl,
            borderTopRightRadius: RADII.xl,
            borderWidth: 1,
            borderColor: palette.border,
            paddingTop: 10,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            gap: 16,
            boxShadow: palette.shadow,
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} accessibilityRole="header" style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: palette.text }}>
              {copy.shareAsCard}
            </Text>
            <PressableSurface
              haptic="selection"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={copy.done}
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: RADII.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.well, borderWidth: 1, borderColor: palette.border }}
            >
              <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.label, color: palette.text }}>{copy.done}</Text>
            </PressableSurface>
          </View>

          {/* Preview: the real card, scaled down. */}
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${copy.cardPreview(formatLabel(format))}. ${data.text} — ${data.attribution}`}
            style={{ alignSelf: 'center', width: SHARE_CARD_WIDTH * scale, height: cardHeight * scale }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: (SHARE_CARD_WIDTH * scale - SHARE_CARD_WIDTH) / 2,
                top: (cardHeight * scale - cardHeight) / 2,
                transform: [{ scale }],
              }}
            >
              <ShoonayaQuoteCard data={data} format={format} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {QUOTE_CARD_FORMATS.map((value) => (
              <SheetChip key={value} label={formatLabel(value)} role="radio" selected={format === value} palette={palette} onPress={() => setFormat(value)} />
            ))}
          </View>

          <PressableSurface
            haptic="selection"
            onPress={share}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel={copy.shareCard}
            style={{ minHeight: 52, borderRadius: RADII.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: palette.accent }}
          >
            {sharing ? <ActivityIndicator color={palette.onAccent} /> : (
              <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.label, fontSize: 15, color: palette.onAccent }}>{copy.shareCard}</Text>
            )}
          </PressableSurface>
        </View>

        {/* Full-size copy captured for sharing (off screen). */}
        <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0 }}>
          <ShoonayaQuoteCard ref={cardRef} data={data} format={format} />
        </View>
      </View>
    </Modal>
  );
}
