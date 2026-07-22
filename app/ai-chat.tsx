import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

type ProfileContext = {
  tradition: string | null;
  sampradaya: string | null;
  city: string | null;
  country: string | null;
  seeking: string[];
  appLanguage: string | null;
  meaningLanguage: string | null;
  transliterationLanguage: string | null;
  isPro: boolean;
};

const SUGGESTED_PROMPTS = [
  'Explain this shloka',
  'What is dharma?',
  'Guide my meditation',
];

const DAILY_LIMITS = {
  free: 5,
  pro: 200,
} as const;

export default function AiChatScreen() {
  const router = useRouter();
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();
  const initialPrompt = useMemo(
    () => (Array.isArray(initialMessage) ? initialMessage[0] : initialMessage),
    [initialMessage]
  );
  const [initialSent, setInitialSent] = useState(false);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [usageLabel, setUsageLabel] = useState<string | null>(null);

  // Real used/limit, fetched from the same route the PWA's AIChatClient
  // reads (/api/ai/chat/usage) — replaces a previously hardcoded, incorrect
  // "5/200" label that didn't reflect the actual tiered (seva-score-aware)
  // daily limit the backend enforces.
  const refreshUsage = useCallback(async () => {
    try {
      const response = await apiFetch('/api/ai/chat/usage');
      if (!response.ok) return;
      const data = (await response.json()) as { used?: number; limit?: number; isPro?: boolean };
      if (typeof data.used === 'number' && typeof data.limit === 'number') {
        setUsageLabel(`${data.used} / ${data.limit} today`);
      }
    } catch {
      // Non-blocking — fall back to the static label below.
    }
  }, []);

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

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('tradition, sampradaya, city, country, seeking, app_language, meaning_language, transliteration_language, is_pro')
      .eq('id', user.id)
      .single();

    setProfile({
      tradition: data?.tradition ?? null,
      sampradaya: data?.sampradaya ?? null,
      city: data?.city ?? null,
      country: data?.country ?? null,
      seeking: data?.seeking ?? [],
      appLanguage: data?.app_language ?? 'en',
      meaningLanguage: data?.meaning_language ?? 'en',
      transliterationLanguage: data?.transliteration_language ?? 'en',
      isPro: data?.is_pro ?? false,
    });
  }, [router]);

  useEffect(() => {
    loadProfile()
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
    void refreshUsage();
  }, [loadProfile, refreshUsage]);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const appendModelChunk = (id: string, chunk: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, text: `${message.text}${chunk}` } : message
      )
    );
  };

  const sendMessage = useCallback(async (promptText?: string) => {
    const content = (promptText ?? input).trim();
    if (!content || streaming || !profile) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: content,
    };
    const modelMessageId = `model-${Date.now() + 1}`;
    const modelPlaceholder: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      text: '',
    };

    setMessages((current) => [...current, userMessage, modelPlaceholder]);
    setInput('');
    setStreaming(true);
    setUsageLabel(null);

    try {
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: content,
          history: messages.map((message) => ({
            role: message.role,
            text: message.text,
          })),
          tradition: profile.tradition,
          sampradaya: profile.sampradaya,
          city: profile.city,
          country: profile.country,
          seeking: profile.seeking,
          appLanguage: profile.appLanguage,
          meaningLanguage: profile.meaningLanguage,
          transliterationLanguage: profile.transliterationLanguage,
        }),
      });

      if (response.status === 429) {
        const limitData = (await response.json()) as { used?: number; limit?: number };
        setUsageLabel(`Daily limit reached · ${limitData.used ?? DAILY_LIMITS.free}/${limitData.limit ?? DAILY_LIMITS.free}`);
        setMessages((current) => current.filter((message) => message.id !== modelMessageId));
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error('chat failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          appendModelChunk(modelMessageId, chunk);
        }
      }

      void refreshUsage();
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === modelMessageId
            ? { ...message, text: 'Could not reach Dharma Mitra right now.' }
            : message
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [input, messages, profile, streaming, refreshUsage]);

  useEffect(() => {
    if (profile && initialPrompt && !initialSent) {
      setInitialSent(true);
      void sendMessage(initialPrompt);
    }
  }, [profile, initialPrompt, initialSent, sendMessage]);

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
        <PressableSurface haptic="selection" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, minHeight: 0 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </PressableSurface>

        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharma Mitra</Text>
        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, marginTop: 4 }}>
          {usageLabel ?? `Free tier · ${profile?.isPro ? DAILY_LIMITS.pro : DAILY_LIMITS.free} messages/day`}
        </Text>

        {messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 15 }}>
              Ask a direct question. The response streams as it is generated.
            </Text>
            {SUGGESTED_PROMPTS.map((prompt) => (
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
