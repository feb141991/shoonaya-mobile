import { type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, RADII, TYPE } from '@/lib/constants';
import type { ReaderCopy } from '@/lib/readerCopy';

// Presentational pieces of the reader controls (Phase 1 of
// docs/READER_EXPERIENCE_GRAND_PLAN.md). State and timing live in ReaderShell
// + lib/readerChrome.ts; colours arrive as a ReaderPalette so paper themes
// (Phase 2) can swap them without touching these components.

export type ReaderPalette = {
  isDark: boolean;
  page: string;
  bar: string;
  barBorder: string;
  well: string;
  border: string;
  text: string;
  dim: string;
  accent: string;
  onAccent: string;
  glass: string;
  /** Solid fill for floating controls over text (glass let text show through). */
  capsule: string;
  glassBorder: string;
  shadow: string;
  floatingShadow: string;
  scrim: string;
};

/** Chrome text may grow with Dynamic Type, but only this much (reading text is uncapped). */
export const CHROME_MAX_FONT_SCALE = 1.35;
const HIT = 44;

function RoundButton({
  icon, onPress, label, palette, selected, disabled, busy, testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label: string;
  palette: ReaderPalette;
  selected?: boolean;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <PressableSurface
      haptic="selection"
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled), busy: Boolean(busy) }}
      testID={testID}
      style={{
        width: HIT,
        height: HIT,
        minHeight: 0,
        borderRadius: HIT / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? palette.accent : 'transparent',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={palette.accent} />
      ) : (
        <Feather name={icon} size={19} color={selected ? palette.onAccent : palette.accent} />
      )}
    </PressableSurface>
  );
}

export function ReaderTopBar({
  palette, title, subtitle, centerContent, onBack, pinned, onTogglePin, copy,
}: {
  palette: ReaderPalette;
  title: string;
  subtitle?: string;
  centerContent?: ReactNode;
  onBack: () => void;
  pinned: boolean;
  onTogglePin: () => void;
  copy: ReaderCopy;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <PressableSurface
        haptic="selection"
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={copy.back}
        style={{
          width: HIT, height: HIT, minHeight: 0, borderRadius: HIT / 2,
          backgroundColor: palette.well, borderColor: palette.border, borderWidth: 1,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Feather name="chevron-left" size={20} color={palette.accent} />
      </PressableSurface>

      <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }} accessible accessibilityRole="header">
        {centerContent ?? (
          <>
            {subtitle ? (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
                style={{ color: palette.accent, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}
              >
                {subtitle}
              </Text>
            ) : null}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
              style={{ color: palette.text, fontFamily: FONTS.serifBold, fontSize: 18 }}
            >
              {title}
            </Text>
          </>
        )}
      </View>

      <PressableSurface
        haptic="selection"
        onPress={onTogglePin}
        accessibilityRole="switch"
        accessibilityLabel={pinned ? copy.unpin : copy.pin}
        accessibilityState={{ checked: pinned }}
        style={{
          width: HIT, height: HIT, minHeight: 0, borderRadius: HIT / 2,
          backgroundColor: pinned ? palette.accent : palette.well,
          borderColor: palette.border, borderWidth: 1,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Feather name={pinned ? 'minimize-2' : 'maximize-2'} size={17} color={pinned ? palette.onAccent : palette.accent} />
      </PressableSurface>
    </View>
  );
}

export type CapsuleProps = {
  palette: ReaderPalette;
  copy: ReaderCopy;
  font?: { canDecrease: boolean; canIncrease: boolean; label: string; onDecrease: () => void; onIncrease: () => void };
  listen?: { speaking: boolean; preparing: boolean; onPress: () => void };
  language?: { label: string; onPress: () => void };
  onOpenOptions?: () => void;
  onInteract: () => void;
};

/** The floating thumb-zone capsule. Renders nothing if a screen offers no controls. */
export function ReaderCapsule({ palette, copy, font, listen, language, onOpenOptions, onInteract }: CapsuleProps) {
  if (!font && !listen && !language && !onOpenOptions) return null;
  const tap = (fn: () => void) => () => { onInteract(); fn(); };
  const divider = <View style={{ width: 1, height: 24, backgroundColor: palette.border, marginHorizontal: 2 }} />;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: RADII.pill,
        overflow: 'hidden',
        backgroundColor: palette.capsule,
        borderWidth: 1,
        borderColor: palette.glassBorder,
        boxShadow: palette.floatingShadow,
      }}
    >
      {font ? (
        <>
          <RoundButton icon="minus" palette={palette} label={`${copy.smaller}. ${copy.textSize(font.label)}`} disabled={!font.canDecrease} onPress={tap(font.onDecrease)} testID="reader-font-smaller" />
          <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.chip, color: palette.dim, minWidth: 26, textAlign: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
            {font.label}
          </Text>
          <RoundButton icon="plus" palette={palette} label={`${copy.larger}. ${copy.textSize(font.label)}`} disabled={!font.canIncrease} onPress={tap(font.onIncrease)} testID="reader-font-larger" />
        </>
      ) : null}
      {font && (listen || language || onOpenOptions) ? divider : null}
      {listen ? (
        <RoundButton
          icon={listen.speaking ? 'pause' : 'volume-2'}
          palette={palette}
          label={listen.preparing ? copy.preparingAudio : listen.speaking ? copy.stopListening : copy.listen}
          selected={listen.speaking}
          busy={listen.preparing}
          onPress={tap(listen.onPress)}
          testID="reader-listen"
        />
      ) : null}
      {language ? (
        <PressableSurface
          haptic="selection"
          onPress={tap(language.onPress)}
          accessibilityRole="button"
          accessibilityLabel={copy.language(language.label)}
          testID="reader-language"
          style={{ minWidth: HIT, height: HIT, minHeight: 0, paddingHorizontal: 8, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.chip, fontSize: 12, color: palette.accent }}>{language.label}</Text>
        </PressableSurface>
      ) : null}
      {onOpenOptions ? (
        <PressableSurface
          haptic="selection"
          onPress={tap(onOpenOptions)}
          accessibilityRole="button"
          accessibilityLabel={copy.moreOptions}
          testID="reader-options"
          style={{ width: HIT, height: HIT, minHeight: 0, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ fontFamily: FONTS.serifBold, fontSize: 18, color: palette.accent }}>Aa</Text>
        </PressableSurface>
      ) : null}
    </View>
  );
}

function SheetSection({ title, palette, children }: { title: string; palette: ReaderPalette; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.section, color: palette.accent }} accessibilityRole="header">
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

export function SheetChip({
  label, selected, onPress, palette, icon, accessibilityLabel, role = 'button', swatch,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  palette: ReaderPalette;
  icon?: keyof typeof Feather.glyphMap;
  accessibilityLabel?: string;
  role?: 'button' | 'switch' | 'radio';
  /** Small paper sample (page colour with an ink dot) for paper-theme chips. */
  swatch?: { page: string; ink: string };
}) {
  return (
    <PressableSurface
      haptic="selection"
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={role === 'switch' ? { checked: Boolean(selected) } : { selected: Boolean(selected) }}
      style={{
        minHeight: HIT,
        paddingHorizontal: 14,
        borderRadius: RADII.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? palette.accent : palette.well,
        borderWidth: 1,
        borderColor: selected ? palette.accent : palette.border,
      }}
    >
      {icon ? <Feather name={icon} size={15} color={selected ? palette.onAccent : palette.accent} /> : null}
      {swatch ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: swatch.page, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: swatch.ink }} />
        </View>
      ) : null}
      <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.label, color: selected ? palette.onAccent : palette.text }}>
        {label}
      </Text>
    </PressableSurface>
  );
}

export type OptionsSheetSection = { key: string; title: string; content: ReactNode };

/** The "Aa" sheet: less-frequent reading options, grouped into sections. */
export function ReaderOptionsSheet({
  visible, onClose, palette, copy, sections, bottomInset, reduceMotion,
}: {
  visible: boolean;
  onClose: () => void;
  palette: ReaderPalette;
  copy: ReaderCopy;
  sections: OptionsSheetSection[];
  bottomInset: number;
  reduceMotion: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
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
            paddingBottom: bottomInset + 16,
            maxHeight: '80%',
            boxShadow: palette.shadow,
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: palette.text }} accessibilityRole="header">
              {copy.sheetTitle}
            </Text>
            <PressableSurface
              haptic="selection"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={copy.done}
              style={{ minHeight: HIT, paddingHorizontal: 14, borderRadius: RADII.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent }}
            >
              <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.label, color: palette.onAccent }}>{copy.done}</Text>
            </PressableSurface>
          </View>
          <ScrollView contentContainerStyle={{ gap: 22, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <SheetSection key={section.key} title={section.title} palette={palette}>
                {section.content}
              </SheetSection>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
