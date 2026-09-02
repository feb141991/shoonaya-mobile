import { useEffect, useState } from 'react';
import { Modal, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, themeColor } from '@/lib/constants';

type SheetScreen = 'actions' | 'report' | 'confirm-delete' | 'confirm-block';

type PostOptionsSheetProps = {
  visible: boolean;
  isOwnPost: boolean;
  authorName: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: (reason: string) => void;
  onBlock: () => void;
};

const REPORT_REASONS = [
  { label: 'Spam or commercial content', value: 'Spam/Commercial' },
  { label: 'Harassment or hate speech', value: 'Harassment/Hate Speech' },
  { label: 'Inappropriate or offensive', value: 'Inappropriate/Offensive' },
] as const;

export function PostOptionsSheet({
  visible,
  isOwnPost,
  authorName,
  onClose,
  onEdit,
  onDelete,
  onReport,
  onBlock,
}: PostOptionsSheetProps) {
  const theme = themeColor(useColorScheme() === 'dark');
  const [screen, setScreen] = useState<SheetScreen>('actions');

  useEffect(() => {
    if (!visible) setScreen('actions');
  }, [visible]);

  const title = screen === 'report'
    ? 'Report post'
    : screen === 'confirm-delete'
      ? 'Delete post?'
      : screen === 'confirm-block'
        ? `Block ${authorName}?`
        : isOwnPost
          ? 'Your post'
          : 'Post options';

  const subtitle = screen === 'report'
    ? 'Choose the reason that best describes the issue.'
    : screen === 'confirm-delete'
      ? 'This cannot be undone.'
      : screen === 'confirm-block'
        ? 'Their posts and member entries will be hidden on every device.'
        : isOwnPost
          ? 'Manage this post.'
          : 'Choose an action for this post or member.';

  const closeAnd = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.bottomSheetScrim }}>
        <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: theme.border, padding: 22, paddingBottom: 34, gap: 14 }}>
          <View style={{ width: 48, height: 4, borderRadius: 99, backgroundColor: theme.borderSoft, alignSelf: 'center' }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: theme.cardSoft, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={screen === 'report' ? 'flag' : screen.startsWith('confirm') ? 'alert-triangle' : 'more-horizontal'} size={18} color={theme.brand} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 21 }}>{title}</Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 19 }}>{subtitle}</Text>
            </View>
            <PressableSurface accessibilityLabel="Close post options" haptic="selection" onPress={onClose} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={20} color={theme.dim} />
            </PressableSurface>
          </View>

          {screen === 'actions' && isOwnPost ? (
            <View style={{ gap: 8 }}>
              <OptionRow icon="edit-3" label="Edit post" color={theme.text} onPress={() => closeAnd(onEdit)} theme={theme} />
              <OptionRow icon="trash-2" label="Delete post" color={COLORS.danger} onPress={() => setScreen('confirm-delete')} theme={theme} />
            </View>
          ) : null}

          {screen === 'actions' && !isOwnPost ? (
            <View style={{ gap: 8 }}>
              <OptionRow icon="flag" label="Report post" color={theme.text} onPress={() => setScreen('report')} theme={theme} />
              <OptionRow icon="slash" label="Block user" color={COLORS.danger} onPress={() => setScreen('confirm-block')} theme={theme} />
            </View>
          ) : null}

          {screen === 'report' ? (
            <View style={{ gap: 8 }}>
              {REPORT_REASONS.map((reason) => (
                <OptionRow key={reason.value} icon="flag" label={reason.label} color={theme.text} onPress={() => closeAnd(() => onReport(reason.value))} theme={theme} />
              ))}
              <SecondaryButton label="Back" onPress={() => setScreen('actions')} theme={theme} />
            </View>
          ) : null}

          {screen === 'confirm-delete' || screen === 'confirm-block' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SecondaryButton label="Cancel" onPress={() => setScreen('actions')} theme={theme} style={{ flex: 1 }} />
              <PressableSurface haptic="selection" onPress={() => closeAnd(screen === 'confirm-delete' ? onDelete : onBlock)} style={{ flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{screen === 'confirm-delete' ? 'Delete post' : 'Block user'}</Text>
              </PressableSurface>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function OptionRow({ icon, label, color, onPress, theme }: { icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void; theme: ReturnType<typeof themeColor> }) {
  return (
    <PressableSurface haptic="selection" onPress={onPress} style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.cardSoft, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Feather name={icon} size={17} color={color} />
      <Text style={{ color, fontFamily: FONTS.sansSemiBold, fontSize: 14, flex: 1 }}>{label}</Text>
      <Feather name="chevron-right" size={16} color={theme.dim} />
    </PressableSurface>
  );
}

function SecondaryButton({ label, onPress, theme, style }: { label: string; onPress: () => void; theme: ReturnType<typeof themeColor>; style?: object }) {
  return (
    <PressableSurface haptic="selection" onPress={onPress} style={[{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{label}</Text>
    </PressableSurface>
  );
}
