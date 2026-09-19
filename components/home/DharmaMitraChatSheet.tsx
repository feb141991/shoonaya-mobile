import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { ScrollUnrollPanel } from '@/components/home/ScrollUnrollPanel';
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
  theme: ReturnType<typeof themeColor>,
  isDark: boolean
) {
  if (!text) return null;

  const parts = parseAiMessageCitations(text);

  return (
    <Text
      style={{
        color: theme.text,
        fontFamily: FONTS.sans,
        fontSize: 15,
        lineHeight: 23,
      }}
    >
      {parts.map((p, idx) =>
        p.isCitation ? (
          <Text
            key={idx}
            style={{
              fontFamily: FONTS.serifBold,
              color: theme.brandStrong,
              backgroundColor: isDark ? 'rgba(197, 160, 89, 0.20)' : 'rgba(197, 160, 89, 0.14)',
            }}
          >
            {` 📜 ${p.text} `}
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
  theme: ReturnType<typeof themeColor>;
  isDark: boolean;
  streaming: boolean;
  isReported: boolean;
  isCopied: boolean;
  onReport: (msg: ChatMessage) => void;
  onCopy: (msg: ChatMessage) => void;
};

const ScrollChatMessageBubble = memo(function ScrollChatMessageBubble({
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
  const animY = useRef(new Animated.Value(12)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(animY, {
        toValue: 0,
        damping: 18,
        stiffness: 240,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animOpacity, animY]);

  return (
    <Animated.View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: isUser ? '84%' : '88%',
        marginBottom: 12,
        opacity: animOpacity,
        transform: [{ translateY: animY }],
      }}
    >
      <Pressable
        onLongPress={() => onCopy(item)}
        disabled={!item.text}
        style={({ pressed }) => ({
          borderRadius: 22,
          borderBottomRightRadius: isUser ? 5 : 22,
          borderBottomLeftRadius: isUser ? 22 : 5,
          overflow: 'hidden',
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
          opacity: pressed && !isUser ? 0.92 : 1,
        })}
      >
        {isUser ? (
          <LinearGradient
            colors={isDark ? [theme.brand, COLORS.brandGoldDark] : [COLORS.brandGoldLight, theme.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 22,
              borderBottomRightRadius: 6,
              borderBottomLeftRadius: 22,
            }}
          >
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
          </LinearGradient>
        ) : (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.055)' : 'rgba(255, 255, 255, 0.94)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(218, 165, 32, 0.22)' : 'rgba(218, 165, 32, 0.32)',
              borderRadius: 22,
              borderBottomLeftRadius: 5,
            }}
          >
            {/* Sacred Assistant Insignia Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                opacity: 0.9,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: theme.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 11, lineHeight: 13 }}>🕉️</Text>
              </View>
              <Text
                style={{
                  fontFamily: FONTS.serifBold,
                  fontSize: 12,
                  color: theme.brandStrong,
                  letterSpacing: 0.3,
                }}
              >
                Dharma Mitra
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 11,
                  color: theme.dim,
                  fontStyle: 'italic',
                }}
              >
                · दिव्य वाणी
              </Text>
            </View>

            {item.text ? (
              <>
                {renderFormattedMessage(item.text, theme, isDark)}
                {!streaming && (
                  <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 2, opacity: 0.65 }}>
                    <Text
                      style={{
                        fontFamily: FONTS.serif,
                        fontSize: 11,
                        color: theme.brandStrong,
                        letterSpacing: 3,
                      }}
                    >
                      — ॐ —
                    </Text>
                  </View>
                )}
              </>
            ) : streaming ? (
              <TypingDots color={theme.brand} />
            ) : null}
          </View>
        )}
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
                <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim }}>Reported</Text>
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
                <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim }}>Report</Text>
              </Pressable>
            )
          )}
        </View>
      )}
    </Animated.View>
  );
});

type DharmaMitraChatSheetProps = {
  visible: boolean;
  origin: { x: number; y: number };
  onClose: () => void;
  tradition: string | null;
};

export function DharmaMitraChatSheet({ visible, origin, onClose, tradition }: DharmaMitraChatSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
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
  } = useAiChat({ onUnauthenticated: onClose });

  const greeting = getTraditionGreeting(tradition);
  const prompts = getTraditionPrompts(tradition);
  const activeLanguage = language ?? profile?.appLanguage ?? 'en';

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
      <ScrollChatMessageBubble
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

  return (
    <ScrollUnrollPanel visible={visible} origin={origin} onClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
          {/* Sacred ambient background glow */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 20,
              right: -70,
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: theme.brandSoft,
              opacity: isDark ? 0.40 : 0.60,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 320,
              left: -80,
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowGoldLight,
              opacity: isDark ? 0.30 : 0.45,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24 }}>
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
              <Text numberOfLines={1} style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, marginTop: 1 }}>
                {greeting}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {messages.length > 0 && (
                <Pressable
                  onPress={handleClearChat}
                  accessibilityLabel="New conversation"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: theme.cardSoft,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="plus" size={16} color={theme.dim} />
                </Pressable>
              )}

              <PressableSurface
                accessibilityRole="button"
                accessibilityLabel="Close Dharma Mitra"
                haptic="selection"
                onPress={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
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
          </View>

          {/* Sub-bar: Usage & Language */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              gap: 12,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: theme.borderSoft,
            }}
          >
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, flex: 1 }}>
              {usageLabel ?? `Free tier · ${profile?.isPro ? DAILY_LIMITS.pro : DAILY_LIMITS.free} messages/day`}
            </Text>
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
              {(['en', 'hi', 'pa'] as const).map((option) => {
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
                      paddingVertical: 3,
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
          </View>

          {/* Messages or Prompts */}
          {loadingProfile ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={theme.brand} />
            </View>
          ) : messages.length === 0 ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 }}>
                Ask me anything — dharmic wisdom, spiritual practice, life questions.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                {prompts.map((prompt) => (
                  <PressableSurface
                    key={prompt}
                    haptic="selection"
                    onPress={() => handleSend(prompt)}
                    style={{ width: '48%', minHeight: 78 }}
                  >
                    <LinearGradient
                      colors={[theme.card, isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.premiumBorder,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        numberOfLines={3}
                        style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 18 }}
                      >
                        {prompt}
                      </Text>
                      <Feather
                        name="arrow-up-right"
                        size={13}
                        color={theme.brand}
                        style={{ alignSelf: 'flex-end', marginTop: 4 }}
                      />
                    </LinearGradient>
                  </PressableSurface>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, position: 'relative' }}>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingTop: 6, paddingBottom: 12 }}
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
                    bottom: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="chevron-down" size={16} color={theme.text} />
                </Pressable>
              )}
            </View>
          )}

          {/* Composer */}
          <View
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.card,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              paddingHorizontal: 12,
              paddingVertical: 7,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 8,
              marginTop: 6,
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
                maxHeight: 100,
                minHeight: 24,
                color: theme.text,
                fontFamily: FONTS.sans,
                fontSize: 15,
                lineHeight: 20,
                paddingTop: Platform.OS === 'ios' ? 4 : 2,
                paddingBottom: Platform.OS === 'ios' ? 4 : 2,
              }}
            />
            <Pressable
              onPress={() => handleSend()}
              disabled={streaming || !input.trim()}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: input.trim() ? theme.brand : theme.cardSoft,
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
                  size={17}
                  color={input.trim() ? COLORS.ink : theme.dim}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScrollUnrollPanel>
  );
}
