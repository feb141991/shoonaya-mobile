import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { ScrollUnrollPanel } from '@/components/home/ScrollUnrollPanel';
import { useAiChat, DAILY_LIMITS, type ChatMessage } from '@/hooks/useAiChat';
import { reportAiChatResponse, type AiReportReason } from '@/lib/ai-safety';
import { COLORS, FONTS, SHADOWS, themeColor } from '@/lib/constants';
import { getTraditionGreeting, getTraditionPrompts } from '@/lib/dharma-mitra-content';

type DharmaMitraChatSheetProps = {
  visible: boolean;
  origin: { x: number; y: number };
  onClose: () => void;
  tradition: string | null;
};

export function DharmaMitraChatSheet({ visible, origin, onClose, tradition }: DharmaMitraChatSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const {
    messages,
    input,
    setInput,
    streaming,
    usageLabel,
    profile,
    loadingProfile,
    language,
    setLanguage,
    sendMessage,
  } = useAiChat({ onUnauthenticated: onClose });

  const greeting = getTraditionGreeting(tradition);
  const prompts = getTraditionPrompts(tradition);
  const activeLanguage = language ?? profile?.appLanguage ?? 'en';

  const [reportedMessageIds, setReportedMessageIds] = useState<Set<string>>(new Set());

  const handleReportAiMessage = useCallback(
    (message: ChatMessage) => {
      if (reportedMessageIds.has(message.id)) {
        Alert.alert('Already Reported', 'You have already reported this response.');
        return;
      }

      const msgIndex = messages.findIndex((m) => m.id === message.id);
      const userPrompt =
        msgIndex > 0
          ? messages
              .slice(0, msgIndex)
              .reverse()
              .find((m) => m.role === 'user')?.text
          : undefined;

      const submit = async (reason: AiReportReason) => {
        try {
          await reportAiChatResponse({
            userId: profile?.userId,
            messageId: message.id,
            aiText: message.text,
            userPrompt,
            reason,
          });
          setReportedMessageIds((prev) => new Set(prev).add(message.id));
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Alert.alert(
            'Report Submitted',
            'Thank you for your feedback. Our team reviews reported responses to ensure accuracy and safety.'
          );
        } catch (error) {
          Alert.alert(
            'Could not submit report',
            error instanceof Error ? error.message : 'Please check your connection and try again.'
          );
        }
      };

      Alert.alert(
        'Report AI Response',
        'Help us improve Dharma Mitra by selecting an issue with this response:',
        [
          {
            text: 'Factually incorrect',
            onPress: () => void submit('incorrect'),
          },
          {
            text: 'Harmful or dangerous',
            onPress: () => void submit('harmful'),
          },
          {
            text: 'Religiously inaccurate',
            onPress: () => void submit('religiously_inaccurate'),
          },
          {
            text: 'Offensive content',
            onPress: () => void submit('offensive'),
          },
          {
            text: 'Other concern',
            onPress: () => void submit('other'),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    },
    [messages, profile?.userId, reportedMessageIds]
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isReported = reportedMessageIds.has(item.id);

    return (
      <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
        {isUser ? (
          <LinearGradient
            colors={[theme.brand, isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              maxWidth: '86%',
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 12,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 22 }}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <View
            style={{
              maxWidth: '86%',
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: theme.glass,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
            }}
          >
            <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 22 }}>
              {item.text || (streaming ? '...' : '')}
            </Text>
          </View>
        )}

        {!isUser && Boolean(item.text) && !streaming && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4,
              marginLeft: 8,
              gap: 8,
            }}
          >
            {isReported ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="check" size={11} color={theme.dim} />
                <Text
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 11,
                    color: theme.dim,
                  }}
                >
                  Reported · Under review
                </Text>
              </View>
            ) : (
              <PressableSurface
                onPress={() => handleReportAiMessage(item)}
                accessibilityLabel="Report response"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  opacity: 0.65,
                }}
              >
                <Feather name="flag" size={11} color={theme.dim} />
                <Text
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 11,
                    color: theme.dim,
                  }}
                >
                  Report
                </Text>
              </PressableSurface>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollUnrollPanel visible={visible} origin={origin} onClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 26 }}>Dharma Mitra</Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, marginTop: 2 }}>{greeting}</Text>
            </View>
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel="Close Dharma Mitra"
              haptic="selection"
              onPress={onClose}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.glass,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="x" size={18} color={theme.text} />
            </PressableSurface>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, flex: 1 }}>
              {usageLabel ?? `Free tier · ${profile?.isPro ? DAILY_LIMITS.pro : DAILY_LIMITS.free} messages/day`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['en', 'hi'] as const).map((option) => {
                const active = activeLanguage === option;
                return (
                  <PressableSurface
                    key={option}
                    onPress={() => setLanguage(option)}
                    haptic="selection"
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: active ? theme.brand : theme.borderSoft,
                      backgroundColor: active ? theme.glass : 'transparent',
                      boxShadow: active ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: active ? theme.brand : theme.dim }}>
                      {option.toUpperCase()}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>
          </View>

          {loadingProfile ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={theme.brand} />
            </View>
          ) : messages.length === 0 ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 15 }}>
                Ask me anything — dharmic wisdom, spiritual practice, life questions.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {prompts.map((prompt) => (
                  <PressableSurface
                    key={prompt}
                    haptic="selection"
                    onPress={() => {
                      void sendMessage(prompt);
                    }}
                    style={{ width: '47%', minHeight: 84 }}
                  >
                    <LinearGradient
                      colors={[theme.card, isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: theme.premiumBorder,
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                      }}
                    >
                      <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 19 }}>{prompt}</Text>
                    </LinearGradient>
                  </PressableSurface>
                ))}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 6, paddingBottom: 12 }}
              style={{ flex: 1 }}
            />
          )}

          <View
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.glass,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 10,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Dharma Mitra"
              placeholderTextColor={theme.dim}
              multiline
              style={{ flex: 1, maxHeight: 110, color: theme.text, fontFamily: FONTS.sans, fontSize: 15, paddingTop: 4 }}
            />
            <PressableSurface
              onPress={() => {
                void sendMessage();
              }}
              disabled={streaming || !input.trim()}
              style={{ width: 42, height: 42 }}
            >
              <LinearGradient
                colors={
                  input.trim()
                    ? [theme.brand, isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight]
                    : [theme.border, theme.border]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: input.trim() ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
                }}
              >
                {streaming ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="send" size={18} color={COLORS.ink} />}
              </LinearGradient>
            </PressableSurface>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScrollUnrollPanel>
  );
}
