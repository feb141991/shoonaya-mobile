import { Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { SelectableCard } from '@/components/japa/JapaSelectionControls';
import { getMantraScriptFont } from '@/lib/japaPresentation';
import type { JapaMantra } from '@/lib/traditions';

type Theme = { brand: string; brandSoft: string; premiumBorder: string };

type Props = {
  mantras: readonly JapaMantra[];
  selectedIndex: number;
  isDark: boolean;
  cardBg: string;
  dim: string;
  text: string;
  theme: Theme;
  onSelect: (index: number, key: string) => void;
};

export function JapaMantraChoiceList({ mantras, selectedIndex, isDark, cardBg, dim, text, theme, onSelect }: Props) {
  return (
    <View style={{ gap: 12 }}>
      {mantras.map((item, index) => {
        const selected = selectedIndex === index;
        return (
          <SelectableCard key={item.key} selected={selected} accessibilityLabel={`Select ${item.label} mantra`} onPress={() => onSelect(index, item.key)} style={{ borderRadius: 18, borderWidth: selected ? 1.5 : 1, borderColor: selected ? theme.brand : theme.premiumBorder, backgroundColor: selected ? theme.brandSoft : cardBg, padding: 14, gap: 4, boxShadow: selected ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light) : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: getMantraScriptFont(item.devanagari, FONTS), fontSize: 22, lineHeight: 32, paddingTop: 4, paddingBottom: 2, color: theme.brand }}>{item.devanagari}</Text>
              {selected ? <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={12} color={isDark ? COLORS.darkBg : COLORS.creamBg} /></View> : <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: theme.premiumBorder }} />}
            </View>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>{item.label}</Text>
            <Text style={{ ...TYPE.caption, color: dim }}>{item.meaning}</Text>
          </SelectableCard>
        );
      })}
    </View>
  );
}
