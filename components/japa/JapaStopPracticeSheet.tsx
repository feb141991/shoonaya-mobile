import { Modal, Pressable, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { OVERLAYS, COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';

type Theme = {
  brand: string;
  premiumBorder: string;
};

type JapaStopPracticeSheetProps = {
  visible: boolean;
  hasProgress: boolean;
  saving: boolean;
  saveFailed: boolean;
  isDark: boolean;
  cardBg: string;
  border: string;
  text: string;
  dim: string;
  theme: Theme;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

export function JapaStopPracticeSheet({
  visible,
  hasProgress,
  saving,
  saveFailed,
  isDark,
  cardBg,
  border,
  text,
  dim,
  theme,
  onClose,
  onSave,
  onDiscard,
}: JapaStopPracticeSheetProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: cardBg, borderWidth: 1, borderColor: border, padding: 24, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.brand }}>
                Focused mala
              </Text>
              <Text style={{ ...TYPE.metric, color: text }}>{saveFailed ? 'Save your counted beads' : 'Stop this session?'}</Text>
            </View>
            {!saving && !saveFailed ? <PressableSurface
              haptic="selection"
              accessibilityLabel="Continue practice"
              onPress={onClose}
              hitSlop={10}
              style={{ width: 32, height: 32, minHeight: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? OVERLAYS.white[0.05] : OVERLAYS.black[0.04] }}
            >
              <Feather name="x" size={16} color={dim} />
            </PressableSurface> : null}
          </View>

          <Text style={{ fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20, color: dim }}>
            {saveFailed
              ? 'The beads are still here. Retry saving, or discard them and leave.'
              : hasProgress
              ? 'Save your current beads before leaving, or discard this unfinished session.'
              : 'No beads have been counted yet. You can leave setup or continue practice.'}
          </Text>

          {hasProgress ? (
            <PressableSurface
              haptic="selection"
              disabled={saving}
              onPress={onSave}
              style={{ borderRadius: 999, minHeight: MIN_TOUCH_TARGET, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light, opacity: saving ? 0.6 : 1 }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: isDark ? COLORS.darkBg : COLORS.creamBg }}>
                {saving ? 'Saving...' : saveFailed ? 'Retry save' : 'End & save'}
              </Text>
            </PressableSurface>
          ) : null}

          {!saving && !saveFailed ? <PressableSurface
            haptic="selection"
            onPress={onClose}
            style={{ borderRadius: 999, minHeight: MIN_TOUCH_TARGET, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: isDark ? OVERLAYS.white[0.05] : OVERLAYS.black[0.04], alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.brand }}>Continue practice</Text>
          </PressableSurface> : null}

          <PressableSurface haptic="selection" disabled={saving} onPress={onDiscard} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.danger }}>
              {hasProgress ? 'Discard and leave' : 'Leave setup'}
            </Text>
          </PressableSurface>
        </View>
      </View>
    </Modal>
  );
}
