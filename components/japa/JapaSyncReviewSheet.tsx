import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';
import { parsePendingCompletionMantra } from '@/lib/japaCompletionReconciliation';
import type { PendingJapaCompletion } from '@/lib/japaPendingCompletion';

export function JapaSyncReviewSheet({
  visible,
  onClose,
  failedItems,
  retryingCompletionId,
  onRetry,
  onDiscard,
  cardBg,
  border,
  text,
  dim,
  isDark,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  failedItems: PendingJapaCompletion[];
  retryingCompletionId: string | null;
  onRetry: (item: PendingJapaCompletion) => void;
  onDiscard: (item: PendingJapaCompletion) => void;
  cardBg: string;
  border: string;
  text: string;
  dim: string;
  isDark: boolean;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: cardBg, borderWidth: 1, borderColor: border, padding: 24, gap: 16, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: COLORS.danger }}>Couldn't save</Text>
              <Text style={{ ...TYPE.metric, color: text }}>{failedItems.length} {failedItems.length === 1 ? 'round' : 'rounds'}</Text>
            </View>
            <PressableSurface haptic="selection" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={{ width: 32, height: 32, minHeight: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
              <Feather name="x" size={16} color={dim} />
            </PressableSurface>
          </View>
          <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
            {failedItems.map((item) => {
              const mantraName = parsePendingCompletionMantra(item.requestBody);
              const isRetrying = retryingCompletionId === item.clientCompletionId;
              const completedAt = item.createdAt ? new Date(item.createdAt) : null;
              const completedAtLabel = completedAt && !Number.isNaN(completedAt.getTime())
                ? completedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                : null;
              return (
                <View key={item.clientCompletionId} style={{ borderRadius: 18, borderWidth: 1, borderColor: border, padding: 14, gap: 10 }}>
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>{mantraName ?? 'Japa round'}</Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>{completedAtLabel ? `Completed ${completedAtLabel} · ` : ''}Not saved</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <PressableSurface haptic="selection" disabled={isRetrying} onPress={() => onRetry(item)} style={{ flex: 1, borderRadius: 14, minHeight: 40, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', opacity: isRetrying ? 0.6 : 1 }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: isDark ? COLORS.darkBg : COLORS.creamBg }}>{isRetrying ? 'Retrying…' : 'Retry'}</Text>
                    </PressableSurface>
                    <PressableSurface haptic="selection" disabled={isRetrying} onPress={() => onDiscard(item)} style={{ flex: 1, borderRadius: 14, minHeight: 40, borderWidth: 1, borderColor: COLORS.dangerBorder, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.danger }}>Discard</Text>
                    </PressableSurface>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
