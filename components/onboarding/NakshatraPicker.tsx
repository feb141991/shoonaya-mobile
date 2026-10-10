import { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';

export type NakshatraOption = {
  key: string;
  label: string;
  sanskrit: string;
  ruler: string;
  rulerHi: string;
  deity: string;
  deityHi: string;
  symbol: string;
};

type NakshatraPickerProps = {
  options: readonly NakshatraOption[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  isHindi?: boolean;
};

export function NakshatraPicker({
  options,
  selectedKey,
  onSelect,
  isHindi = false,
}: NakshatraPickerProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedNakshatra = useMemo(
    () => options.find((n) => n.key === selectedKey || n.label === selectedKey) ?? null,
    [options, selectedKey]
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.sanskrit.toLowerCase().includes(q) ||
        n.ruler.toLowerCase().includes(q) ||
        n.rulerHi.toLowerCase().includes(q) ||
        n.deity.toLowerCase().includes(q) ||
        n.deityHi.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  return (
    <View style={{ gap: 12 }}>
      {selectedNakshatra ? (
        <Card
          elevated
          tone="auto"
          style={{
            backgroundColor: theme.card,
            borderColor: theme.brand,
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 28 }}>{selectedNakshatra.symbol}</Text>
              <View>
                <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
                  {selectedNakshatra.label} ({selectedNakshatra.sanskrit})
                </Text>
                <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
                  {isHindi ? `स्वामी: ${selectedNakshatra.rulerHi} · देवता: ${selectedNakshatra.deityHi}` : `Ruler: ${selectedNakshatra.ruler} · Deity: ${selectedNakshatra.deity}`}
                </Text>
              </View>
            </View>

            <PressableSurface
              accessibilityLabel="Change selected Nakshatra"
              onPress={() => setModalVisible(true)}
              haptic="selection"
              style={{
                minHeight: MIN_TOUCH_TARGET,
                paddingHorizontal: 12,
                borderRadius: RADII.pill,
                backgroundColor: theme.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...TYPE.caption, color: theme.brand, fontFamily: FONTS.sansMedium }}>
                {isHindi ? 'बदलें' : 'Change'}
              </Text>
            </PressableSurface>
          </View>
        </Card>
      ) : (
        <PressableSurface
          accessibilityLabel="Select Nakshatra from catalog"
          onPress={() => setModalVisible(true)}
          haptic="selection"
          style={{
            minHeight: 56,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.cardSoft,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="search" size={18} color={theme.dim} />
            <Text style={{ ...TYPE.body, color: theme.dim }}>
              {isHindi ? 'अपना नक्षत्र खोजें या चुनें…' : 'Search or choose your Nakshatra…'}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={theme.dim} />
        </PressableSurface>
      )}

      {/* SEARCHABLE FULL-SCREEN MODAL */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View
            style={{
              paddingTop: 16,
              paddingHorizontal: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.borderSoft,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
              {isHindi ? 'नक्षत्र का चयन करें' : 'Select Nakshatra'}
            </Text>
            <PressableSurface
              accessibilityLabel="Close Nakshatra picker"
              accessibilityRole="button"
              onPress={() => setModalVisible(false)}
              haptic="selection"
              style={{
                width: MIN_TOUCH_TARGET,
                height: MIN_TOUCH_TARGET,
                borderRadius: MIN_TOUCH_TARGET / 2,
                backgroundColor: theme.cardSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="x" size={18} color={theme.text} />
            </PressableSurface>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.cardSoft,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 12,
                height: 48,
                gap: 8,
              }}
            >
              <Feather name="search" size={18} color={theme.dim} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel={isHindi ? 'नक्षत्र सूची खोजें' : 'Search Nakshatra list'}
                placeholder={isHindi ? 'नक्षत्र या स्वामी खोजें…' : 'Search Nakshatra or ruler…'}
                placeholderTextColor={theme.dim}
                style={{ flex: 1, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
                autoCorrect={false}
              />
              {searchQuery ? (
                <PressableSurface
                  accessibilityLabel={isHindi ? 'खोज मिटाएँ' : 'Clear search'}
                  onPress={() => setSearchQuery('')}
                  haptic="none"
                  style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x-circle" size={16} color={theme.dim} />
                </PressableSurface>
              ) : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {filteredOptions.map((item) => {
              const isSelected = selectedKey === item.key || selectedKey === item.label;
              return (
                <PressableSurface
                  key={item.key}
                  accessibilityLabel={isHindi ? `${item.sanskrit}, ${item.rulerHi} के स्वामी` : `Select ${item.label}, ruled by ${item.ruler}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onSelect(item.key);
                    setModalVisible(false);
                  }}
                  haptic="selection"
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isSelected ? theme.brand : theme.borderSoft,
                    backgroundColor: isSelected ? theme.brandSoft : theme.card,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Text style={{ fontSize: 24 }}>{item.symbol}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...TYPE.cardHeading, color: theme.text, fontSize: 16 }}>
                        {item.label} ({item.sanskrit})
                      </Text>
                      <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
                        {isHindi ? `स्वामी: ${item.rulerHi} · देवता: ${item.deityHi}` : `Ruler: ${item.ruler} · Deity: ${item.deity}`}
                      </Text>
                    </View>
                  </View>
                  {isSelected ? <Feather name="check" size={18} color={theme.brand} /> : null}
                </PressableSurface>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
