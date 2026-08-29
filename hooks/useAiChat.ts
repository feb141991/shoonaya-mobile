import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export type ProfileContext = {
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

export const DAILY_LIMITS = {
  free: 20,
  pro: 20,
} as const;

const DEFAULT_ERROR_MESSAGE = 'Could not reach Dharma Mitra right now.';

type UseAiChatOptions = {
  // Auto-sent once, as soon as the profile finishes loading.
  initialPrompt?: string;
  // Called instead of a hardcoded redirect when there's no signed-in user —
  // callers embedding this in an overlay (rather than a dedicated screen)
  // shouldn't be forced into a full navigation.
  onUnauthenticated?: () => void;
  errorMessage?: string;
};

export function useAiChat(options: UseAiChatOptions = {}) {
  const { initialPrompt, onUnauthenticated, errorMessage = DEFAULT_ERROR_MESSAGE } = options;

  const [initialSent, setInitialSent] = useState(false);
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [usageLabel, setUsageLabel] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

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
      // Non-blocking — fall back to the static label the caller renders.
    }
  }, []);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onUnauthenticated?.();
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
  }, [onUnauthenticated]);

  useEffect(() => {
    loadProfile()
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
    void refreshUsage();
  }, [loadProfile, refreshUsage]);

  const appendModelChunk = (id: string, chunk: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, text: `${message.text}${chunk}` } : message
      )
    );
  };

  const sendMessage = useCallback(
    async (promptText?: string) => {
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
            appLanguage: language ?? profile.appLanguage,
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
            message.id === modelMessageId ? { ...message, text: errorMessage } : message
          )
        );
      } finally {
        setStreaming(false);
      }
    },
    [input, messages, profile, streaming, refreshUsage, language, errorMessage]
  );

  useEffect(() => {
    if (profile && initialPrompt && !initialSent) {
      setInitialSent(true);
      void sendMessage(initialPrompt);
    }
  }, [profile, initialPrompt, initialSent, sendMessage]);

  return {
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
  };
}
