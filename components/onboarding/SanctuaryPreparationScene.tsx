import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionView, useReducedMotion } from '@/components/ui/Motion';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SPACING } from '@/lib/constants';

type Props = {
  artwork: ImageSourcePropType;
  artworkLabel: string;
  symbol: ImageSourcePropType | null;
  symbolText?: string;
  greeting: string;
  firstName: string;
  isHindi: boolean;
  onContinue: () => void;
  onArtworkError?: () => void;
};

/** Image-first, unframed transition. The spinner represents an actual pending
 * request, not fabricated progress. Continue remains available from frame one. */
export function SanctuaryPreparationScene({ artwork, artworkLabel, symbol, symbolText, greeting, firstName, isHindi, onContinue, onArtworkError }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  return (
    <View style={styles.scene}>
      <Image source={artwork} accessibilityLabel={artworkLabel} onError={onArtworkError} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        pointerEvents="none"
        colors={[COLORS.heroScrimTopLight, COLORS.heroScrimMidLight, COLORS.heroScrimTopDark, COLORS.darkBg]}
        locations={[0, 0.28, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.xxl, paddingBottom: insets.bottom + SPACING.xl }]}
      >
        <View style={styles.header}>
          <Text style={styles.wordmark}>Shoonaya</Text>
          <Text style={[styles.eyebrow, isHindi && styles.hindi]}>{isHindi ? 'आपकी अपनी शरणस्थली' : 'A SPACE TO COME HOME TO'}</Text>
        </View>
        <View style={styles.artworkSpace} />
        <MotionView distance={6} duration={280} style={styles.message}>
          {symbol ? <Image source={symbol} style={styles.symbol} resizeMode="contain" accessible={false} />
            : symbolText ? <Text style={styles.symbolText}>{symbolText}</Text>
            : <Feather name="sun" size={40} color={COLORS.brandGold} />}
          <Text style={[styles.greeting, isHindi && styles.hindi]}>{greeting}, {firstName}</Text>
          <Text accessibilityRole="header" style={[styles.title, isHindi && styles.hindiTitle]}>{isHindi ? 'आपकी शरणस्थली\nसँवर रही है' : 'Preparing your\nsanctuary'}</Text>
          <Text style={[styles.description, isHindi && styles.hindi]}>{isHindi
            ? 'आपकी दैनिक साधना और स्थानीय पावन कैलेंडर को एक साथ ला रहे हैं।'
            : 'Bringing together your daily practice and local sacred calendar.'}</Text>
          <View style={styles.status} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
            {reduceMotion
              ? <Feather name="loader" size={16} color={COLORS.brandGold} />
              : <ActivityIndicator size="small" color={COLORS.brandGold} />}
            <Text style={[styles.statusText, isHindi && styles.hindi]}>{isHindi ? 'आपकी पसंद सहेज ली गई है' : 'Your preferences are saved'}</Text>
          </View>
          <PressableSurface onPress={onContinue} accessibilityRole="button" accessibilityLabel={isHindi ? 'Shoonaya में प्रवेश करें' : 'Enter Shoonaya'} style={styles.continue}>
            <Text style={[styles.continueText, isHindi && styles.hindi]}>{isHindi ? 'Shoonaya में प्रवेश करें' : 'Enter Shoonaya'}</Text>
            <Feather name="arrow-right" color={COLORS.onMediaWhite} size={22} />
          </PressableSurface>
        </MotionView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: COLORS.darkBg },
  content: { flexGrow: 1, paddingHorizontal: SPACING.xxl },
  header: { alignItems: 'center', gap: SPACING.sm },
  wordmark: { fontFamily: FONTS.serifBold, fontSize: 28, lineHeight: 36, color: COLORS.onMediaWhite, letterSpacing: 0 },
  eyebrow: { fontFamily: FONTS.sans, fontSize: 10, lineHeight: 16, color: COLORS.onMediaWhite, letterSpacing: 0, textAlign: 'center' },
  artworkSpace: { flexGrow: 1, minHeight: 130 },
  message: { alignSelf: 'center', width: '100%', maxWidth: 520, gap: SPACING.md },
  symbol: { width: 52, height: 52, marginBottom: SPACING.sm },
  // The existing ahimsa-hand bitmap is mislabeled (a generic peace icon).
  // Use the tradition's own word with the hand already in its sanctuary art.
  symbolText: { fontFamily: FONTS.devanagariBold, fontSize: 28, lineHeight: 52, color: COLORS.brandGold, marginBottom: SPACING.sm },
  greeting: { fontFamily: FONTS.sansMedium, fontSize: 16, lineHeight: 25, color: COLORS.brandGold },
  title: { fontFamily: FONTS.serifBold, fontSize: 42, lineHeight: 49, color: COLORS.onMediaWhite, letterSpacing: 0 },
  description: { fontFamily: FONTS.sans, fontSize: 16, lineHeight: 25, color: COLORS.onMediaWhite, maxWidth: 380 },
  status: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg },
  statusText: { flex: 1, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 21, color: COLORS.onMediaWhite },
  continue: { minHeight: MIN_TOUCH_TARGET, paddingVertical: SPACING.lg, marginTop: SPACING.lg, borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLORS.brandGold, flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  continueText: { flex: 1, fontFamily: FONTS.sansMedium, fontSize: 16, lineHeight: 25, color: COLORS.onMediaWhite },
  hindi: { fontFamily: FONTS.devanagari },
  hindiTitle: { fontFamily: FONTS.devanagariBold, lineHeight: 60 },
});
