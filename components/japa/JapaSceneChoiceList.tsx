import { ScrollView, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, FONTS, SHADOWS } from '@/lib/constants';
import { SelectableCard } from '@/components/japa/JapaSelectionControls';

type SceneOption = {
  id: string;
  name: string;
  icon: string;
  colors: readonly [string, string, string];
  lightColors: readonly [string, string, string];
};

type Theme = { brand: string; premiumBorder: string };

type Props = {
  options: readonly SceneOption[];
  selectedId: string;
  isDark: boolean;
  dim: string;
  theme: Theme;
  onSelect: (id: string) => void;
};

export function JapaSceneChoiceList({ options, selectedId, isDark, dim, theme, onSelect }: Props) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dim }}>
        Practice background
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 2 }}>
        {options.map((item) => {
          const selected = selectedId === item.id;
          return (
            <SelectableCard key={item.id} selected={selected} accessibilityLabel={`Select ${item.name} background`} onPress={() => onSelect(item.id)} style={{ alignItems: 'center', width: 64, gap: 6 }}>
              <LinearGradient colors={isDark ? item.colors : item.lightColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 58, height: 58, borderRadius: 18, borderWidth: selected ? 2 : 1, borderColor: selected ? theme.brand : theme.premiumBorder, alignItems: 'center', justifyContent: 'center', boxShadow: selected ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light) : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) }}>
                {selected ? <View style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={9} color={isDark ? COLORS.darkBg : COLORS.creamBg} /></View> : null}
                <Feather name={item.icon as keyof typeof Feather.glyphMap} size={18} color={COLORS.onMediaWhite} />
              </LinearGradient>
              <Text numberOfLines={1} style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9, color: selected ? theme.brand : dim, textAlign: 'center' }}>{item.name}</Text>
            </SelectableCard>
          );
        })}
      </ScrollView>
    </View>
  );
}
