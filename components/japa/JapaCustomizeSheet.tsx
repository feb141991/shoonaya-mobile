import { ReactNode } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { HANDS_FREE_PACE_OPTIONS, type JapaChantingMode } from '@/lib/japaPreferences';
import type { JapaSoundTrack } from '@/lib/japa-audio';

type Theme = ReturnType<typeof themeColor>;

type SheetProps = {
  visible: boolean;
  cardBg: string;
  border: string;
  text: string;
  dim: string;
  bg: string;
  theme: Theme;
  children: ReactNode;
  onClose: () => void;
};

// The in-practice "Practice atmosphere" sheet: handle, title, a scrolling
// body for the sections below, and Done.
export function JapaCustomizeSheet({ visible, cardBg, border, text, dim, bg, theme, children, onClose }: SheetProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: cardBg, borderWidth: 1, borderColor: border, padding: 22, gap: 18, maxHeight: '82%' }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ ...TYPE.screenTitle, color: text }}>Practice atmosphere</Text>
            <Text style={{ ...TYPE.caption, color: dim }}>
              Choose the visual atmosphere for this session. Mantra and mala can be changed from setup.
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ gap: 18 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          <PressableSurface
            haptic="selection"
            onPress={onClose}
            style={{
              borderRadius: 18,
              backgroundColor: theme.brand,
              minHeight: MIN_TOUCH_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: bg }}>Done</Text>
          </PressableSurface>
        </View>
      </View>
    </Modal>
  );
}

type SceneOption = {
  id: string;
  name: string;
  icon: string;
  colors: readonly [string, string, string];
  lightColors: readonly [string, string, string];
};

const SCENE_CAPTIONS: Record<string, string> = {
  midnight: 'Quiet night focus',
  himalayan: 'Soft dawn clarity',
  temple: 'Warm altar glow',
  river: 'Muted ghat calm',
  forest: 'Sage ashram stillness',
};
const DEFAULT_SCENE_CAPTION = 'Deep cosmic sky';

type RowColors = {
  isDark: boolean;
  cardBg: string;
  text: string;
  dim: string;
  theme: Theme;
};

function rowSurfaceStyle(selected: boolean, { isDark, cardBg, theme }: RowColors) {
  return {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: selected ? theme.brand : theme.premiumBorder,
    backgroundColor: selected ? theme.brandSoft : cardBg,
    overflow: 'hidden' as const,
    boxShadow: selected ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
  };
}

function SelectedCheck({ size, iconSize, theme }: { size: number; iconSize: number; theme: Theme }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.brand,
      }}
    >
      <Feather name="check" size={iconSize} color={COLORS.ink} />
    </View>
  );
}

export function JapaCustomizeSceneSection({
  options,
  selectedId,
  onSelect,
  ...colors
}: RowColors & { options: readonly SceneOption[]; selectedId: string; onSelect: (id: string) => void }) {
  const { isDark, text, dim, theme } = colors;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...TYPE.section, color: theme.brand }}>Scene</Text>
      <View style={{ gap: 10 }}>
        {options.map((item) => {
          const selected = selectedId === item.id;
          return (
            <PressableSurface
              key={item.id}
              haptic="selection"
              accessibilityState={{ selected }}
              onPress={() => onSelect(item.id)}
              style={rowSurfaceStyle(selected, colors)}
            >
              <View
                style={{
                  minHeight: 62,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <LinearGradient
                    colors={isDark ? item.colors : item.lightColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: selected ? theme.brand : theme.premiumBorder,
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
                      }}
                    >
                      <Feather name={item.icon as keyof typeof Feather.glyphMap} size={16} color={selected ? theme.brand : text} />
                    </View>
                  </LinearGradient>
                  <View style={{ gap: 2 }}>
                    <Text style={{ ...TYPE.label, color: text }}>{item.name}</Text>
                    <Text style={{ ...TYPE.caption, color: dim }}>
                      {SCENE_CAPTIONS[item.id] ?? DEFAULT_SCENE_CAPTION}
                    </Text>
                  </View>
                </View>
                {selected ? <SelectedCheck size={32} iconSize={17} theme={theme} /> : null}
              </View>
            </PressableSurface>
          );
        })}
      </View>
    </View>
  );
}

export function JapaCustomizeAmbientSoundSection({
  options,
  selectedId,
  onSelect,
  ...colors
}: RowColors & { options: readonly JapaSoundTrack[]; selectedId: string; onSelect: (id: string) => void }) {
  const { isDark, text, dim, theme } = colors;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...TYPE.section, color: theme.brand }}>Sacred Ambient Sound</Text>
      <View style={{ gap: 10 }}>
        {options.map((item) => {
          const selected = selectedId === item.id;
          return (
            <PressableSurface
              key={item.id}
              haptic="selection"
              accessibilityState={{ selected }}
              onPress={() => onSelect(item.id)}
              style={rowSurfaceStyle(selected, colors)}
            >
              <View
                style={{
                  minHeight: 58,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? theme.brand : (isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight),
                    }}
                  >
                    <Feather
                      name={item.id === 'off' ? 'volume-x' : 'music'}
                      size={16}
                      color={selected ? (isDark ? COLORS.darkBg : COLORS.creamBg) : theme.brand}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={{ ...TYPE.label, color: text }}>{item.label}</Text>
                    <Text style={{ ...TYPE.caption, color: dim }} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                {selected ? <SelectedCheck size={28} iconSize={15} theme={theme} /> : null}
              </View>
            </PressableSurface>
          );
        })}
      </View>
    </View>
  );
}

export function JapaCustomizeSoundLinkSection({
  soundOn,
  activeSound,
  cardBg,
  text,
  dim,
  theme,
  onPress,
}: {
  soundOn: boolean;
  activeSound: JapaSoundTrack;
  cardBg: string;
  text: string;
  dim: string;
  theme: Theme;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...TYPE.section, color: theme.brand }}>Sacred Sound</Text>
      <PressableSurface
        haptic="selection"
        onPress={onPress}
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.premiumBorder,
          backgroundColor: cardBg,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name={soundOn ? 'music' : 'volume-x'} size={18} color={theme.brand} />
          <View>
            <Text style={{ ...TYPE.label, color: text }}>
              {soundOn ? activeSound.label : 'Sound: Off'}
            </Text>
            <Text style={{ ...TYPE.caption, color: dim }}>
              {soundOn ? activeSound.subtitle : 'No background ambient drone'}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={16} color={dim} />
      </PressableSurface>
    </View>
  );
}

export function JapaCustomizeChantingModeSection({
  chantingMode,
  paceSeconds,
  isDark,
  cardBg,
  text,
  dim,
  theme,
  onSelectMode,
  onSelectPace,
  ceremonyAutoAdvance,
  onChangeCeremonyAutoAdvance,
}: RowColors & {
  chantingMode: JapaChantingMode;
  paceSeconds: number;
  onSelectMode: (mode: JapaChantingMode) => void;
  onSelectPace: (seconds: number) => void;
  ceremonyAutoAdvance: boolean;
  onChangeCeremonyAutoAdvance: (enabled: boolean) => void;
}) {
  const isHandsFree = chantingMode === 'hands_free';
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...TYPE.section, color: theme.brand }}>Chanting Mode</Text>
      <View style={{ gap: 10 }}>
        <PressableSurface
          haptic="selection"
          onPress={() => onSelectMode('manual')}
          style={rowSurfaceStyle(!isHandsFree, { isDark, cardBg, text, dim, theme })}
        >
          <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
              <Feather name="radio" size={18} color={!isHandsFree ? theme.brand : dim} />
              <View style={{ flexShrink: 1 }}>
                <Text style={{ ...TYPE.label, color: text }}>Manual Tap</Text>
                <Text style={{ ...TYPE.caption, color: dim }}>Tap anywhere on the screen to tell each bead</Text>
              </View>
            </View>
            {!isHandsFree ? <SelectedCheck size={28} iconSize={15} theme={theme} /> : null}
          </View>
        </PressableSurface>

        <PressableSurface
          haptic="selection"
          onPress={() => onSelectMode('hands_free')}
          style={rowSurfaceStyle(isHandsFree, { isDark, cardBg, text, dim, theme })}
        >
          <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
              <Feather name="zap" size={18} color={isHandsFree ? theme.brand : dim} />
              <View style={{ flexShrink: 1 }}>
                <Text style={{ ...TYPE.label, color: text }}>Hands-Free (Paced)</Text>
                <Text style={{ ...TYPE.caption, color: dim }}>Beads advance automatically at your chosen rhythm</Text>
              </View>
            </View>
            {isHandsFree ? <SelectedCheck size={28} iconSize={15} theme={theme} /> : null}
          </View>
        </PressableSurface>

        {isHandsFree ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {HANDS_FREE_PACE_OPTIONS.map((opt) => {
              const active = Math.abs(paceSeconds - opt.seconds) < 0.2;
              return (
                <PressableSurface
                  key={opt.seconds}
                  haptic="selection"
                  onPress={() => onSelectPace(opt.seconds)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? theme.brandSoft : cardBg,
                    borderWidth: 1,
                    borderColor: active ? theme.brand : theme.premiumBorder,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: active ? theme.brand : text }}>
                    {opt.label}
                  </Text>
                </PressableSurface>
              );
            })}
          </View>
        ) : null}
        {isHandsFree ? (
          <PressableSurface
            accessibilityRole="switch"
            accessibilityState={{ checked: ceremonyAutoAdvance }}
            accessibilityLabel="Auto-close the completion ceremony"
            haptic="selection"
            onPress={() => onChangeCeremonyAutoAdvance(!ceremonyAutoAdvance)}
            style={rowSurfaceStyle(ceremonyAutoAdvance, { isDark, cardBg, text, dim, theme })}
          >
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ ...TYPE.label, color: text, flexShrink: 1 }}>Auto-close ceremony after 10 seconds</Text>
              <Feather name={ceremonyAutoAdvance ? 'check-circle' : 'circle'} size={18} color={theme.brand} />
            </View>
          </PressableSurface>
        ) : null}
      </View>
    </View>
  );
}
