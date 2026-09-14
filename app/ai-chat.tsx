import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { BackButton } from '@/components/ui/BackButton';
import { useAiChat, DAILY_LIMITS, type ChatMessage } from '@/hooks/useAiChat';
import { reportAiChatResponse, type AiReportReason } from '@/lib/ai-safety';
import { parseAiMessageCitations } from '@/lib/ai-citations';
import { COLORS, FONTS, themeColor } from '@/lib/constants';
import { getTraditionPrompts } from '@/lib/dharma-mitra-content';

function renderFormattedMessage(
  text: string,
  theme: ReturnType<typeof themeColor> & { userBubble: string }
) {
  if (!text) return null;

  const parts = parseAiMessageCitations(text);

  return (
    <Text
      style={{
        color: theme.text,
        fontFamily: FONTS.sans,
        fontSize: 15,
        lineHeight: 22,
      }}
    >
      {parts.map((p, idx) =>
        p.isCitation ? (
          <Text
            key={idx}
            style={{
              fontFamily: FONTS.serifBold,
              color: theme.brandStrong,
            }}
          >
            {p.text}
          </Text>
        ) : (
          p.text
        )
      )}
    </Text>
  );
}

export default function AiChatScreen() {
  const router = useRouter();
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();
  const initialPrompt = useMemo(
    () => (Array.isArray(initialMessage) ? initialMessage[0] : initialMessage),
    [initialMessage]
  );
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const {
    messages,
    input,
    setInput,
    streaming,
    usageLabel,
    profile,
    loadingProfile,
    sendMessage,
  } = useAiChat({
    initialPrompt,
    onUnauthenticated: () => router.replace('/(auth)/login'),
  });

  const suggestedPrompts = getTraditionPrompts(profile?.tradition);

  const theme = useMemo(() => {
    const base = themeColor(isDark);
    return {
      ...base,
      userBubble: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    };
  }, [isDark]);

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
      <View
        style={{
          alignItems: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 12,
        }}
      >
        <PressableSurface
          onLongPress={async () => {
            if (item.text) {
              await Clipboard.setStringAsync(item.text);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
          }}
          disabled={!item.text}
          style={{
            maxWidth: '86%',
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: isUser ? theme.userBubble : theme.card,
            borderWidth: isUser ? 0 : 1,
            borderColor: theme.border,
          }}
        >
          {isUser ? (
            <Text
              style={{
                color: COLORS.ink,
                fontFamily: FONTS.sans,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {item.text}
            </Text>
          ) : (
            renderFormattedMessage(item.text || (streaming ? '...' : ''), theme)
          )}
        </PressableSurface>

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

  if (loadingProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.userBubble} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
        <BackButton fallbackHref="/(tabs)" handleHardwareBack style={{ marginBottom: 16 }} />

        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharma Mitra</Text>
        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, marginTop: 4 }}>
          {usageLabel ?? `Free tier · ${profile?.isPro ? DAILY_LIMITS.pro : DAILY_LIMITS.free} messages/day`}
        </Text>

        {messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 15 }}>
              Ask a direct question. The response streams as it is generated.
            </Text>
            {suggestedPrompts.map((prompt) => (
              <PressableSurface
                key={prompt}
                haptic="selection"
                onPress={() => {
                  void sendMessage(prompt);
                }}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 15 }}>{prompt}</Text>
              </PressableSurface>
            ))}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingTop: 18, paddingBottom: 12 }}
            style={{ flex: 1 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
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
            style={{
              flex: 1,
              maxHeight: 110,
              color: theme.text,
              fontFamily: FONTS.sans,
              fontSize: 15,
              paddingTop: 4,
            }}
          />
          <PressableSurface
            onPress={() => {
              void sendMessage();
            }}
            disabled={streaming || !input.trim()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: input.trim() ? theme.userBubble : theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {streaming ? (
              <ActivityIndicator size="small" color={COLORS.ink} />
            ) : (
              <Feather name="send" size={18} color={COLORS.ink} />
            )}
          </PressableSurface>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
