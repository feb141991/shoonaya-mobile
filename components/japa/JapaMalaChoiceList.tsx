import { Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { JapaMalaArtwork } from '@/components/japa/JapaMalaArtwork';
import { SelectableCard } from '@/components/japa/JapaSelectionControls';
import type { MalaSkin } from '@/lib/mala-skins';

type Theme = { brand: string; brandSoft: string; premiumBorder: string };

type Props = {
  options: readonly { id: string; skin: MalaSkin; tagline: string }[];
  selectedId: string | null;
  isDark: boolean;
  cardBg: string;
  dim: string;
  text: string;
  theme: Theme;
  onSelect: (id: string) => void;
};

export function JapaMalaChoiceList({ options, selectedId, isDark, cardBg, dim, text, theme, onSelect }: Props) {
  return (
    <View style={{ gap: 12 }}>
      {options.map(({ id, skin, tagline }) => {
        const selected = (selectedId ?? 'default') === id;
        return (
          <SelectableCard
            key={id}
            selected={selected}
            accessibilityLabel={`Select ${skin.label} mala`}
            onPress={() => onSelect(id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: selected ? 1.5 : 1, borderColor: selected ? skin.glowColor : theme.premiumBorder, backgroundColor: selected ? theme.brandSoft : cardBg, padding: 14, boxShadow: selected ? `0 6px 18px ${skin.glowColor}` : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) }}
          >
            <JapaMalaArtwork skin={skin} size={60} glow={selected} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>{skin.label}</Text>
              <Text style={{ ...TYPE.caption, color: dim, marginTop: 2 }}>{tagline}</Text>
            </View>
            {selected ? (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="check" size={13} color={isDark ? COLORS.darkBg : COLORS.creamBg} />
              </View>
            ) : (
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: theme.premiumBorder }} />
            )}
          </SelectableCard>
        );
      })}
    </View>
  );
}
