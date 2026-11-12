import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import type { JapaSoundTrack } from '@/lib/japa-audio';

type Theme = { brand: string; premiumBorder: string; brandSoft: string };

type Props = {
  visible: boolean;
  selectedId: string;
  options: readonly JapaSoundTrack[];
  isDark: boolean;
  cardBg: string;
  border: string;
  text: string;
  dim: string;
  bg: string;
  theme: Theme;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export function JapaSoundSheet({ visible, selectedId, options, isDark, cardBg, border, text, dim, bg, theme, onClose, onSelect }: Props) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: cardBg, borderWidth: 1, borderColor: border, padding: 22, gap: 16, maxHeight: '82%' }}>
          <View style={{ alignItems: 'center' }}><View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2, flex: 1 }}>
              <Text style={{ ...TYPE.screenTitle, color: text }}>Sacred Ambient Sound</Text>
              <Text style={{ ...TYPE.caption, color: dim }}>Continuous harmonic drone to anchor your chanting</Text>
            </View>
            <PressableSurface haptic="selection" onPress={onClose} hitSlop={10} style={{ width: 32, height: 32, minHeight: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
              <Feather name="x" size={16} color={dim} />
            </PressableSurface>
          </View>
          <ScrollView contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
            {options.map((item) => {
              const selected = selectedId === item.id;
              return (
                <PressableSurface key={item.id} haptic="selection" accessibilityState={{ selected }} onPress={() => onSelect(item.id)} style={{ borderRadius: 18, borderWidth: selected ? 1.5 : 1, borderColor: selected ? theme.brand : theme.premiumBorder, backgroundColor: selected ? theme.brandSoft : cardBg, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', boxShadow: selected ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? theme.brand : (isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight) }}>
                      <Feather name={item.id === 'off' ? 'volume-x' : 'music'} size={18} color={selected ? (isDark ? COLORS.darkBg : COLORS.creamBg) : theme.brand} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ ...TYPE.label, color: text }}>{item.label}</Text>
                        {item.sanskritLabel ? <Text style={{ fontFamily: FONTS.serif, fontSize: 13, color: theme.brand }}>· {item.sanskritLabel}</Text> : null}
                      </View>
                      <Text style={{ ...TYPE.caption, color: dim }} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                  </View>
                  {selected ? <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brand }}><Feather name="check" size={14} color={isDark ? COLORS.darkBg : COLORS.creamBg} /></View> : null}
                </PressableSurface>
              );
            })}
          </ScrollView>
          <PressableSurface haptic="selection" onPress={onClose} style={{ borderRadius: 18, backgroundColor: theme.brand, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: isDark ? COLORS.darkBg : bg }}>Done</Text>
          </PressableSurface>
        </View>
      </View>
    </Modal>
  );
}
