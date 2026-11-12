import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';

const TARGET_OPTIONS = [1, 3, 5, 11] as const;
const MAX_TARGET_ROUNDS = 108;
type Theme = ReturnType<typeof themeColor>;

export function TargetRoundSelector({ value, onChange, theme, isDark }: { value: number; onChange: (value: number) => void; theme: Theme; isDark: boolean }) {
  const [customValue, setCustomValue] = useState(TARGET_OPTIONS.includes(value as (typeof TARGET_OPTIONS)[number]) ? '' : String(value));
  const customNumber = Number(customValue);
  const customSelected = !TARGET_OPTIONS.includes(value as (typeof TARGET_OPTIONS)[number]);
  const customValid = Number.isInteger(customNumber) && customNumber >= 1 && customNumber <= MAX_TARGET_ROUNDS;

  useEffect(() => {
    if (!TARGET_OPTIONS.includes(value as (typeof TARGET_OPTIONS)[number])) setCustomValue(String(value));
  }, [value]);

  const commitCustomValue = () => {
    if (!customValid) return;
    void Haptics.selectionAsync().catch(() => {});
    onChange(customNumber);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...TYPE.chip, letterSpacing: 1.3, textTransform: 'uppercase', color: theme.dim }}>Target rounds</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {TARGET_OPTIONS.map((n) => {
          const selected = value === n;
          return <View key={n} style={{ flex: 1, borderRadius: 999, borderWidth: 1.5, borderColor: selected ? theme.brand : theme.borderSoft, backgroundColor: selected ? theme.brandSoft : isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight }}>
            <Pressable accessibilityLabel={`${n} target round${n > 1 ? 's' : ''}`} accessibilityState={{ selected }} onPress={() => { void Haptics.selectionAsync().catch(() => {}); onChange(n); }} style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: selected ? theme.brand : theme.text }}>{n}</Text>
            </Pressable>
          </View>;
        })}
      </View>
      <View style={{ borderRadius: 18, borderWidth: 1, borderColor: customSelected ? theme.brand : theme.premiumBorder, backgroundColor: customSelected ? theme.brandSoft : isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight, paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: customSelected ? theme.brand : theme.text }}>Custom target</Text>
            <Text style={{ ...TYPE.caption, color: theme.dim }}>1-{MAX_TARGET_ROUNDS} malas</Text>
          </View>
          <TextInput accessibilityLabel="Custom target rounds" keyboardType="number-pad" value={customValue} onChangeText={(text) => setCustomValue(text.replace(/[^0-9]/g, '').slice(0, 3))} onSubmitEditing={commitCustomValue} onBlur={commitCustomValue} placeholder="e.g. 7" placeholderTextColor={theme.dim} style={{ width: 82, minHeight: MIN_TOUCH_TARGET, borderRadius: 14, borderWidth: 1, borderColor: customSelected ? theme.brand : theme.premiumBorder, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.cardBgLight, color: theme.text, textAlign: 'center', fontFamily: FONTS.sansSemiBold, fontSize: 16, paddingHorizontal: 10 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Apply custom target rounds" disabled={!customValid} onPress={commitCustomValue} style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: customValid ? theme.brand : theme.premiumBorder, opacity: customValid ? 1 : 0.55 }}>
            <Feather name="check" size={18} color={customValid ? COLORS.ink : theme.dim} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function SelectableCard({ selected, onPress, style, children, haptic = 'selection', accessibilityLabel }: { selected: boolean; onPress: () => void; style: object; children: ReactNode; haptic?: 'impact' | 'selection' | 'none'; accessibilityLabel?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasSelected = useRef(selected);

  useEffect(() => {
    if (selected && !wasSelected.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.03, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      ]).start();
    }
    wasSelected.current = selected;
  }, [scale, selected]);

  return <Animated.View style={{ transform: [{ scale }] }}><PressableSurface haptic={haptic} accessibilityLabel={accessibilityLabel} accessibilityState={{ selected }} onPress={onPress} style={style}>{children}</PressableSurface></Animated.View>;
}
