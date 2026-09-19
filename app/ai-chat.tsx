import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { BackButton } from '@/components/ui/BackButton';
import { useAiChat, DAILY_LIMITS, type ChatMessage } from '@/hooks/useAiChat';
import { reportAiChatResponse, type AiReportReason } from '@/lib/ai-safety';
import { parseAiMessageCitations } from '@/lib/ai-citations';
import { COLORS, FONTS, SHADOWS, themeColor } from '@/lib/constants';
import { getTraditionGreeting, getTraditionPrompts } from '@/lib/dharma-mitra-content';

function TypingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 420,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 180);
    const a3 = pulse(dot3, 360);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 4 }}>
      {[dot1, dot2, dot3].map((anim, idx) => (
        <Animated.View
          key={idx}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: color,
            opacity: anim,
            transform: [
              {
                scale: anim.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [0.85, 1.25],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

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

type ChatItemProps = {
  item: ChatMessage;
  theme: ReturnType<typeof themeColor> & { userBubble: string };
  isDark: boolean;
  streaming: boolean;
  isReported: boolean;
  isCopied: boolean;
  onReport: (msg: ChatMessage) => void;
  onCopy: (msg: ChatMessage) => void;
};

const ChatMessageBubble = memo(function ChatMessageBubble({
  item,
  theme,
  isDark,
  streaming,
  isReported,
  isCopied,
  onReport,
  onCopy,
}: ChatItemProps) {
  const isUser = item.role === 'user';

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: isUser ? '82%' : '86%',
        marginBottom: 14,
      }}
    >
      <Pressable
        onLongPress={async () => {
          if (item.text) {
            await Clipboard.setStringAsync(item.text);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onCopy(item);
          }
        }}
        disabled={!item.text}
        style={({ pressed }) => ({
          borderRadius: 20,
          borderBottomRightRadius: isUser ? 4 : 20,
          borderBottomLeftRadius: isUser ? 20 : 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: isUser ? theme.userBubble : theme.card,
          borderWidth: isUser ? 0 : 1,
          borderColor: isUser ? 'transparent' : theme.premiumBorder,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
          opacity: pressed && !isUser ? 0.92 : 1,
        })}
      >
        {isUser ? (
          <Text
            style={{
              color: COLORS.ink,
              fontFamily: FONTS.sansMedium,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {item.text}
          </Text>
        ) : item.text ? (
          renderFormattedMessage(item.text, theme)
        ) : streaming ? (
          <TypingDots color={theme.brand} />
        ) : null}
      </Pressable>

      {!isUser && Boolean(item.text) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            marginLeft: 6,
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => onCopy(item)}
            accessibilityLabel="Copy response"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              opacity: 0.75,
            }}
          >
            <Feather name={isCopied ? 'check' : 'copy'} size={12} color={isCopied ? COLORS.success : theme.dim} />
            <Text
              style={{
                fontFamily: FONTS.sans,
                fontSize: 11,
                color: isCopied ? COLORS.success : theme.dim,
              }}
            >
              {isCopied ? 'Copied' : 'Copy'}
            </Text>
          </Pressable>

          {!streaming && (
            isReported ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="check" size={11} color={theme.dim} />
                <Text
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 11,
                    color: theme.dim,
                  }}
                >
                  Reported
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => onReport(item)}
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
              </Pressable>
            )
          )}
        </View>
      )}
    </View>
  );
});

export default function AiChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();
  const initialPrompt = useMemo(
    () => (Array.isArray(initialMessage) ? initialMessage[0] : initialMessage),
    [initialMessage]
  );
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    clearMessages,
  } = useAiChat({
    initialPrompt,
    onUnauthenticated: () => router.replace('/(auth)/login'),
  });

  const activeLanguage = language ?? profile?.appLanguage ?? 'en';
  const greeting = getTraditionGreeting(profile?.tradition);
  const suggestedPrompts = getTraditionPrompts(profile?.tradition);

  const theme = useMemo(() => {
    const base = themeColor(isDark);
    return {
      ...base,
      userBubble: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    };
  }, [isDark]);

  const [reportedMessageIds, setReportedMessageIds] = useState<Set<string>>(new Set());

  const handleCopyMessage = useCallback(async (message: ChatMessage) => {
    if (!message.text) return;
    await Clipboard.setStringAsync(message.text);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCopiedId(message.id);
    setTimeout(() => setCopiedId((curr) => (curr === message.id ? null : curr)), 2000);
  }, []);

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
          { text: 'Factually incorrect', onPress: () => void submit('incorrect') },
          { text: 'Harmful or dangerous', onPress: () => void submit('harmful') },
          { text: 'Religiously inaccurate', onPress: () => void submit('religiously_inaccurate') },
          { text: 'Offensive content', onPress: () => void submit('offensive') },
          { text: 'Other concern', onPress: () => void submit('other') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    },
    [messages, profile?.userId, reportedMessageIds]
  );

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) return;
    Alert.alert('New Conversation', 'Start a fresh conversation with Dharma Mitra?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start New',
        style: 'destructive',
        onPress: () => {
          clearMessages();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        },
      },
    ]);
  }, [messages.length, clearMessages]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceToBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const isNear = distanceToBottom < 60;
    isNearBottomRef.current = isNear;
    setShowScrollBottom(distanceToBottom > 160);
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (isNearBottomRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
  }, []);

  const handleSend = useCallback(
    (promptText?: string) => {
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
      void sendMessage(promptText);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [sendMessage]
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatMessageBubble
        item={item}
        theme={theme}
        isDark={isDark}
        streaming={streaming && item.role === 'model' && !item.text}
        isReported={reportedMessageIds.has(item.id)}
        isCopied={copiedId === item.id}
        onReport={handleReportAiMessage}
        onCopy={handleCopyMessage}
      />
    ),
    [theme, isDark, streaming, reportedMessageIds, copiedId, handleReportAiMessage, handleCopyMessage]
  );

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 6, 20),
          paddingBottom: Math.max(insets.bottom, 10),
        }}
      >
        {/* Header Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderSoft,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <BackButton fallbackHref="/(tabs)" handleHardwareBack style={{ marginBottom: 0 }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 22, lineHeight: 28 }}>
                  Dharma Mitra
                </Text>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: COLORS.success,
                  }}
                />
              </View>
              <Text
                numberOfLines={1}
                style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 1 }}
              >
                {usageLabel ?? (greeting || `Wisdom Guide · ${DAILY_LIMITS.free}/day`)}
              </Text>
            </View>
          </View>

          {/* Action pills: EN/HI & Clear */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: theme.cardSoft,
                borderRadius: 999,
                padding: 2,
                borderWidth: 1,
                borderColor: theme.borderSoft,
              }}
            >
              {(['en', 'hi'] as const).map((option) => {
                const active = activeLanguage === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setLanguage(option);
                      void Haptics.selectionAsync().catch(() => {});
                    }}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: active ? theme.brand : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 10,
                        color: active ? COLORS.ink : theme.dim,
                      }}
                    >
                      {option.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {messages.length > 0 && (
              <Pressable
                onPress={handleClearChat}
                accessibilityLabel="New conversation"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.cardSoft,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                }}
              >
                <Feather name="plus" size={16} color={theme.dim} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Chat Stream / Empty State */}
        {messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4, gap: 14 }}>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: theme.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Feather name="compass" size={24} color={theme.brand} />
              </View>
              <Text
                style={{
                  color: theme.text,
                  fontFamily: FONTS.serifBold,
                  fontSize: 20,
                  textAlign: 'center',
                  marginBottom: 4,
                }}
              >
                Ask Dharma Mitra
              </Text>
              <Text
                style={{
                  color: theme.dim,
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                  textAlign: 'center',
                  lineHeight: 20,
                  maxWidth: 280,
                }}
              >
                Dharmic guidance grounded in scripture, spiritual inquiry, and daily practice.
              </Text>
            </View>

            <View style={{ gap: 10, marginTop: 6 }}>
              {suggestedPrompts.slice(0, 3).map((prompt) => (
                <PressableSurface
                  key={prompt}
                  haptic="selection"
                  onPress={() => handleSend(prompt)}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    backgroundColor: theme.card,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontFamily: FONTS.sansMedium,
                        fontSize: 14,
                        lineHeight: 20,
                        flex: 1,
                        marginRight: 10,
                      }}
                    >
                      {prompt}
                    </Text>
                    <Feather name="arrow-up-right" size={15} color={theme.brand} />
                  </View>
                </PressableSurface>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, position: 'relative' }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
              style={{ flex: 1 }}
              onScroll={handleScroll}
              scrollEventThrottle={32}
              onContentSizeChange={handleContentSizeChange}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />

            {showScrollBottom && (
              <Pressable
                onPress={scrollToBottom}
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="chevron-down" size={18} color={theme.text} />
              </Pressable>
            )}
          </View>
        )}

        {/* Composer Bar */}
        <View
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            backgroundColor: theme.card,
            paddingHorizontal: 14,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 10,
            marginTop: 8,
            boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Dharma Mitra..."
            placeholderTextColor={theme.dim}
            multiline
            style={{
              flex: 1,
              maxHeight: 110,
              minHeight: 24,
              color: theme.text,
              fontFamily: FONTS.sans,
              fontSize: 15,
              lineHeight: 20,
              paddingTop: Platform.OS === 'ios' ? 6 : 2,
              paddingBottom: Platform.OS === 'ios' ? 6 : 2,
            }}
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={streaming || !input.trim()}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: input.trim() ? theme.userBubble : theme.cardSoft,
              borderWidth: input.trim() ? 0 : 1,
              borderColor: theme.borderSoft,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {streaming ? (
              <ActivityIndicator size="small" color={COLORS.ink} />
            ) : (
              <Feather
                name="arrow-up"
                size={18}
                color={input.trim() ? COLORS.ink : theme.dim}
              />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
