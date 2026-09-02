import { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
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

import { PressableSurface } from '@/components/ui/PressableSurface';
import { BackButton } from '@/components/ui/BackButton';
import { useAiChat, DAILY_LIMITS, type ChatMessage } from '@/hooks/useAiChat';
import { COLORS, FONTS } from '@/lib/constants';
import { getTraditionPrompts } from '@/lib/dharma-mitra-content';

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

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      userBubble: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    }),
    [isDark]
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={{
          alignItems: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 12,
        }}
      >
        <View
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
          <Text
            style={{
              color: isUser ? COLORS.ink : theme.text,
              fontFamily: FONTS.sans,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {item.text || (streaming && !isUser ? '...' : '')}
          </Text>
        </View>
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
