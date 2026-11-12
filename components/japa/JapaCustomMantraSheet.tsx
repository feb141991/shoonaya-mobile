import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, View } from 'react-native';

import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';

type Theme = { brand: string };

type Props = {
  visible: boolean;
  value: string;
  isDark: boolean;
  cardBg: string;
  border: string;
  text: string;
  dim: string;
  bg: string;
  theme: Theme;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function JapaCustomMantraSheet({ visible, value, isDark, cardBg, border, text, dim, bg, theme, onChange, onClose, onSave }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'center', padding: 22 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ borderRadius: 28, backgroundColor: cardBg, borderWidth: 1, borderColor: border, padding: 22, gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ ...TYPE.screenTitle, color: text }}>Personal mantra</Text>
            <Text style={{ ...TYPE.caption, color: dim }}>Use this for a guru-given mantra or a short name you repeat privately.</Text>
          </View>
          <TextInput value={value} onChangeText={onChange} placeholder="Enter mantra" placeholderTextColor={dim} autoCapitalize="none" style={{ minHeight: 54, borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight, paddingHorizontal: 14, color: text, fontFamily: FONTS.sansMedium, fontSize: 15 }} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableSurface haptic="selection" onPress={onClose} style={{ flex: 1, borderRadius: 18, borderWidth: 1, borderColor: border, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...TYPE.label, color: text }}>Cancel</Text>
            </PressableSurface>
            <PressableSurface onPress={onSave} style={{ flex: 1, borderRadius: 18, backgroundColor: theme.brand, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...TYPE.label, color: bg }}>Save</Text>
            </PressableSurface>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
