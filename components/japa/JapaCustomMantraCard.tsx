import { Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SelectableCard } from '@/components/japa/JapaSelectionControls';
import type { JapaMantra } from '@/lib/traditions';

type Theme = { brand: string; brandSoft: string; premiumBorder: string };

type Props = {
  customMantra: JapaMantra | null;
  selected: boolean;
  isDark: boolean;
  cardBg: string;
  dim: string;
  text: string;
  theme: Theme;
  onSelect: () => void;
  onEdit: () => void;
};

export function JapaCustomMantraCard({ customMantra, selected, isDark, cardBg, dim, text, theme, onSelect, onEdit }: Props) {
  return (
    <SelectableCard selected={selected} accessibilityLabel={customMantra ? 'Select personal mantra' : 'Add personal mantra'} onPress={onSelect} style={{ borderRadius: 18, borderWidth: selected ? 1.5 : 1, borderColor: selected ? theme.brand : theme.premiumBorder, backgroundColor: selected ? theme.brandSoft : cardBg, padding: 14, gap: 4, boxShadow: selected ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light) : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13.5, color: text }}>{customMantra ? 'Personal mantra' : 'Add personal mantra'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {customMantra ? <PressableSurface haptic="selection" onPress={onEdit} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.premiumBorder }}><Text style={{ fontFamily: FONTS.sansMedium, fontSize: 10.5, color: dim }}>Edit</Text></PressableSurface> : null}
          {selected ? <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={11} color={isDark ? COLORS.darkBg : COLORS.creamBg} /></View> : null}
        </View>
      </View>
      <Text style={{ ...TYPE.caption, color: dim }}>{customMantra ? customMantra.devanagari : 'Use your own mantra in mala practice'}</Text>
    </SelectableCard>
  );
}
