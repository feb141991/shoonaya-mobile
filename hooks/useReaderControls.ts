import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { apiFetch } from '@/lib/api';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { trackReaderEvent } from '@/lib/analytics/reader-events';
import type { ReadableCapabilities, PramanaPipelineTags } from '@/lib/readable-content';

export interface ReaderControlsState {
  showTransliteration: boolean;
  showLocalLanguage: boolean;
  showMeaning: boolean;
  isGeneratingTTS: boolean;
  isSpeaking: boolean;
  ttsError: string | null;
  isCopied: boolean;
}

export interface TTSRequestOptions {
  quality?: 'standard' | 'pandit';
  language?: string;
  voice?: 'male' | 'female';
  speed?: number;
  rate?: number;
  pipelineTags?: Partial<PramanaPipelineTags>;
}

export interface ExplainContext {
  source?: string;
  title?: string;
  tradition?: string;
  language?: string;
  contentType?: string;
  responseMode?: string;
  transliteration?: string;
  translation?: string;
  pipelineTags?: Partial<PramanaPipelineTags>;
}

export interface ExplainResult {
  raw?: string;
  explanation?: {
    word_by_word: string;
    meaning: string;
    commentary: string;
    daily_application: string;
    contemplation: string;
    related_text: string;
  };
  teacher?: string;
  tradition?: string;
  source?: string;
  title?: string;
  ai?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ReaderControlsHandlers {
  toggleTransliteration: () => void;
  toggleLocalLanguage: () => void;
  toggleMeaning: () => void;
  resetDisplayState: () => void;
  toggleTTS: (text: string, options?: TTSRequestOptions) => Promise<void>;
  stopTTS: () => Promise<void>;
  copyText: (text: string, label?: string) => Promise<void>;
  share: (text: string, title?: string, url?: string) => Promise<void>;
  requestExplain: (text: string, context?: ExplainContext) => Promise<ExplainResult | null>;
}

export function useReaderControls(capabilities: ReadableCapabilities) {
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [showLocalLanguage, setShowLocalLanguage] = useState(false);
  const [showMeaning, setShowMeaning] = useState(capabilities.canShowMeaning);

  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const [isCopied, setIsCopied] = useState(false);
  const copiedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const ttsRequestIdRef = useRef(0);

  const { loadAndPlay, stop } = useAudioPlayer();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ttsRequestIdRef.current += 1;
      if (copiedResetTimerRef.current) clearTimeout(copiedResetTimerRef.current);
      void stop();
    };
  }, [stop]);

  const toggleTransliteration = useCallback(() => {
    if (capabilities.canToggleTransliteration) {
      setShowTransliteration(prev => {
        trackReaderEvent('transliteration_toggled', { has_transliteration: !prev });
        return !prev;
      });
    }
  }, [capabilities.canToggleTransliteration]);

  const toggleLocalLanguage = useCallback(() => {
    if (capabilities.canToggleLocalLanguage) {
      setShowLocalLanguage(prev => {
        trackReaderEvent('language_toggled');
        return !prev;
      });
    }
  }, [capabilities.canToggleLocalLanguage]);

  const toggleMeaning = useCallback(() => {
    if (capabilities.canShowMeaning) {
      setShowMeaning(prev => !prev);
    }
  }, [capabilities.canShowMeaning]);

  const resetDisplayState = useCallback(() => {
    setShowTransliteration(false);
    setShowLocalLanguage(false);
    setShowMeaning(capabilities.canShowMeaning);
  }, [capabilities.canShowMeaning]);

  const stopTTS = useCallback(async () => {
    ttsRequestIdRef.current += 1;
    await stop();
    if (mountedRef.current) {
      setIsSpeaking(false);
      setIsGeneratingTTS(false);
    }
  }, [stop]);

  const toggleTTS = useCallback(async (
    text: string,
    options?: TTSRequestOptions
  ) => {
    if (!capabilities.canGenerateTTS || !text) return;

    if (isSpeaking) {
      await stopTTS();
      return;
    }

    trackReaderEvent('tts_requested', { language: options?.language });

    const requestId = ++ttsRequestIdRef.current;
    setIsGeneratingTTS(true);
    setTtsError(null);

    try {
      const ttsText = text.length > 4600 ? `${text.slice(0, 4550)}.` : text;
      const res = await apiFetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: ttsText,
          quality: options?.quality ?? 'standard',
          language: options?.language,
          voice: options?.voice,
          speed: options?.speed,
          rate: options?.rate,
          pipelineTags: options?.pipelineTags,
        })
      });

      if (!res.ok) {
        throw new Error(`TTS request failed: ${res.status}`);
      }

      const data = await res.json();
      
      if (requestId !== ttsRequestIdRef.current || !mountedRef.current) return;

      if (data.audioContent) {
        const uri = `data:audio/mp3;base64,${data.audioContent}`;
        await loadAndPlay(uri, false, () => setIsSpeaking(false));
        if (requestId === ttsRequestIdRef.current && mountedRef.current) setIsSpeaking(true);
      } else if (data.error) {
        throw new Error(data.error as string);
      } else {
        throw new Error('No audio content in response');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      if (mountedRef.current && requestId === ttsRequestIdRef.current) setTtsError(message);
      console.error('[useReaderControls] TTS error:', err);
      Alert.alert("Audio failed", "We could not load the audio at this time.");
    } finally {
      if (mountedRef.current && requestId === ttsRequestIdRef.current) setIsGeneratingTTS(false);
    }
  }, [capabilities.canGenerateTTS, isSpeaking, stopTTS, loadAndPlay]);

  const copyText = useCallback(async (text: string, label = 'Text') => {
    try {
      await Clipboard.setStringAsync(text);
      setIsCopied(true);
      trackReaderEvent('content_copied', { content_type: label });
      Alert.alert("Copied", `${label} copied to clipboard.`);
      if (copiedResetTimerRef.current) clearTimeout(copiedResetTimerRef.current);
      copiedResetTimerRef.current = setTimeout(() => {
        setIsCopied(false);
        copiedResetTimerRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('[useReaderControls] Copy failed:', err);
      Alert.alert("Error", "Failed to copy to clipboard.");
    }
  }, []);

  const share = useCallback(async (text: string, title = 'Shoonaya', url?: string) => {
    const shareText = text || title;
    try {
      trackReaderEvent('content_shared', { content_type: title });
      await Share.share({ message: shareText, url, title });
    } catch (err) {
      console.error('[useReaderControls] Share failed:', err);
    }
  }, []);

  const requestExplain = useCallback(async (
    text: string,
    context?: ExplainContext
  ): Promise<ExplainResult | null> => {
    if (!capabilities.canShowExplain || !text) {
      return null;
    }

    trackReaderEvent('explain_requested', { source: context?.source });

    try {
      const res = await apiFetch('/api/pathshala/explain', {
        method: 'POST',
        body: JSON.stringify({
          originalText: text,
          source: context?.source,
          title: context?.title,
          tradition: context?.tradition,
          language: context?.language,
          transliteration: context?.transliteration,
          translation: context?.translation,
          responseMode: context?.responseMode,
          pipelineTags: context?.pipelineTags ?? {
            content_type: context?.contentType,
            response_mode: context?.responseMode,
            tradition: context?.tradition,
          },
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message = typeof data?.error === 'string'
          ? data.error
          : `Explain request failed: ${res.status}`;
        const err = new Error(message) as Error & { upgrade_required?: boolean };
        if (data?.upgrade_required) err.upgrade_required = true;
        throw err;
      }

      if (typeof data?.error === 'string') {
        throw new Error(data.error);
      }

      return data as ExplainResult;
    } catch (err) {
      console.error('[useReaderControls] Explain request failed:', err);
      throw err instanceof Error ? err : new Error('Explain request failed');
    }
  }, [capabilities.canShowExplain]);

  const state: ReaderControlsState = {
    showTransliteration,
    showLocalLanguage,
    showMeaning,
    isGeneratingTTS,
    isSpeaking,
    ttsError,
    isCopied,
  };

  const handlers: ReaderControlsHandlers = {
    toggleTransliteration,
    toggleLocalLanguage,
    toggleMeaning,
    resetDisplayState,
    toggleTTS,
    stopTTS,
    copyText,
    share,
    requestExplain,
  };

  return { state, handlers };
}
