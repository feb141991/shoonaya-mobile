import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, themeColor } from '@/lib/constants';
import { getGreetingPool } from '@/lib/greetings';
import { getGreetingPick, setGreetingPick } from '@/lib/greetingPreference';

type GreetingPickerProps = {
  visible: boolean;
  onClose: () => void;
  tradition: string | null;
  onPickChange: (pick: string | null) => void;
};

// Home's greeting ("Suprabhat, Prince") was previously fully automatic —
// a time-of-day word, or (at midday) a daily-rotating tradition greeting,
// with no user control at all. This lets a user lock in one greeting from
// their tradition's pool, or type their own, replacing the rotating part
// while the time-of-day prefix (Suprabhat/Shubh Sandhya/Shubh Ratri) still
// applies in front of it — see the composition in app/(tabs)/index.tsx.
// Device-local persistence (lib/greetingPreference.ts), matching the hero
// backdrop picker's own AsyncStorage-only precedent.
export function GreetingPicker({ visible, onClose, tradition, onPickChange }: GreetingPickerProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    if (!visible) return;
    getGreetingPick()
      .then((pick) => {
        setSelected(pick);
        setCustomText(pick ?? '');
      })
      .catch(() => {});
  }, [visible]);

  const pool = getGreetingPool(tradition);

  const commit = async (text: string | null) => {
    await setGreetingPick(text);
    setSelected(text);
    onPickChange(text);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <View
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 22,
            paddingBottom: 34,
            gap: 16,
            maxHeight: '78%',
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: theme.borderSoft }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="message-circle" size={20} color={theme.brand} />
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: theme.text }}>
                Choose Your Greeting
              </Text>
            </View>
            <PressableSurface
              haptic="selection"
              onPress={onClose}
              accessibilityLabel="Close"
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardSoft }}
            >
              <Feather name="x" size={16} color={theme.dim} />
            </PressableSurface>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <PressableSurface
              haptic="selection"
              onPress={() => commit(null)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderRadius: 14,
                borderWidth: selected === null ? 2 : 1,
                borderColor: selected === null ? theme.brand : theme.border,
                backgroundColor: theme.cardSoft,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 10,
              }}
            >
              <Feather name="refresh-cw" size={16} color={theme.brand} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>
                Auto (daily rotation)
              </Text>
            </PressableSurface>

            {pool.map((word) => {
              const active = selected === word;
              return (
                <PressableSurface
                  key={word}
                  haptic="selection"
                  onPress={() => commit(word)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 14,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? theme.brand : theme.border,
                    backgroundColor: theme.card,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>{word}</Text>
                  {active ? <Feather name="check" size={16} color={theme.brand} /> : null}
                </PressableSurface>
              );
            })}

            <Text style={{ ...({ fontFamily: FONTS.sansMedium, fontSize: 12 } as const), color: theme.dim, marginTop: 6, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Or write your own
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={customText}
                onChangeText={setCustomText}
                placeholder="e.g. Have a blessed day"
                placeholderTextColor={theme.dim}
                style={{
                  flex: 1,
                  minHeight: MIN_TOUCH_TARGET,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  paddingHorizontal: 14,
                  color: theme.text,
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                }}
              />
              <PressableSurface
                haptic="selection"
                disabled={!customText.trim()}
                onPress={() => commit(customText)}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  paddingHorizontal: 18,
                  borderRadius: 14,
                  backgroundColor: theme.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: customText.trim() ? 1 : 0.5,
                }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.ink }}>Save</Text>
              </PressableSurface>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
