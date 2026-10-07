import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
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
  /** Keep playing with the screen locked (reader listening, Phase 4). */
  background?: boolean;
  /** Title for the lock-screen controls when `background` is set. */
  lockScreenTitle?: string;
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
  /** Always plays (never toggles off); `onFinished` runs only when it plays to the end. */
  playTTS: (text: string, options?: TTSRequestOptions, onFinished?: () => void) => Promise<void>;
  /** Fetches audio ahead of time so the next playTTS starts without a gap. */
  prefetchTTS: (text: string, options?: TTSRequestOptions) => Promise<void>;
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

  // Generated audio, keyed by text + voice settings. Kept small: the verse
  // being played and the next one (prefetched so verse-to-verse playback has
  // no gap, which matters with the screen locked).
  const audioCacheRef = useRef<Map<string, Promise<string>>>(new Map());
  const audioFileCounterRef = useRef(0);

  const fetchTTSAudio = useCallback((text: string, options?: TTSRequestOptions): Promise<string> => {
    const key = JSON.stringify([text, options?.quality, options?.language, options?.voice, options?.speed, options?.rate]);
    const cached = audioCacheRef.current.get(key);
    if (cached) return cached;

    const pending = (async () => {
      // Backend /api/tts enforces MAX_TTS_TEXT_CHARS = 3_000.
      // Safely bound request to 2,800 chars cleanly at sentence / newline boundary.
      const MAX_TTS_LIMIT = 2800;
      let ttsText = text.trim();
      if (ttsText.length > MAX_TTS_LIMIT) {
        const sentenceEnd = Math.max(
          ttsText.lastIndexOf('. ', MAX_TTS_LIMIT),
          ttsText.lastIndexOf('। ', MAX_TTS_LIMIT),
          ttsText.lastIndexOf('\n', MAX_TTS_LIMIT),
          ttsText.lastIndexOf('? ', MAX_TTS_LIMIT),
          ttsText.lastIndexOf('! ', MAX_TTS_LIMIT)
        );
        ttsText = sentenceEnd > 1200 ? ttsText.slice(0, sentenceEnd + 1).trim() : `${ttsText.slice(0, MAX_TTS_LIMIT - 3)}...`;
      }

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
      if (!data.audioContent) {
        throw new Error(typeof data.error === 'string' ? data.error : 'No audio content in response');
      }

      // Detect format: Sarvam returns WAV (base64 starting with 'UklGR' for RIFF header)
      const isWav = typeof data.audioContent === 'string' && data.audioContent.startsWith('UklGR');
      if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
        const ext = isWav ? 'wav' : 'mp3';
        // Rotating file names: the current and the prefetched next verse must not overwrite each other.
        const localPath = `${FileSystem.cacheDirectory}tts_audio_${(audioFileCounterRef.current += 1) % 4}.${ext}`;
        await FileSystem.writeAsStringAsync(localPath, data.audioContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return localPath;
      }
      const mime = isWav ? 'audio/wav' : 'audio/mp3';
      return `data:${mime};base64,${data.audioContent}`;
    })();

    audioCacheRef.current.set(key, pending);
    // Keep at most the 2 most recent entries (current + next); a failed fetch is not cached.
    while (audioCacheRef.current.size > 2) {
      const oldest = audioCacheRef.current.keys().next().value as string;
      audioCacheRef.current.delete(oldest);
    }
    pending.catch(() => { audioCacheRef.current.delete(key); });
    return pending;
  }, []);

  const playTTS = useCallback(async (
    text: string,
    options?: TTSRequestOptions,
    onFinished?: () => void,
  ) => {
    if (!capabilities.canGenerateTTS || !text) return;

    trackReaderEvent('tts_requested', { language: options?.language });

    const requestId = ++ttsRequestIdRef.current;
    setIsGeneratingTTS(true);
    setTtsError(null);

    try {
      const audioUri = await fetchTTSAudio(text, options);
      if (requestId !== ttsRequestIdRef.current || !mountedRef.current) return;

      const started = await loadAndPlay(
        audioUri,
        false,
        () => {
          if (requestId !== ttsRequestIdRef.current) return;
          setIsSpeaking(false);
          onFinished?.();
        },
        {
          background: options?.background,
          lockScreen: options?.background && options.lockScreenTitle ? { title: options.lockScreenTitle } : undefined,
        },
      );
      if (started && requestId === ttsRequestIdRef.current && mountedRef.current) setIsSpeaking(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      if (mountedRef.current && requestId === ttsRequestIdRef.current) setTtsError(message);
      console.error('[useReaderControls] TTS error:', err);
      Alert.alert("Audio failed", "We could not load the audio at this time.");
    } finally {
      if (mountedRef.current && requestId === ttsRequestIdRef.current) setIsGeneratingTTS(false);
    }
  }, [capabilities.canGenerateTTS, fetchTTSAudio, loadAndPlay]);

  const prefetchTTS = useCallback(async (text: string, options?: TTSRequestOptions) => {
    if (!capabilities.canGenerateTTS || !text) return;
    try {
      await fetchTTSAudio(text, options);
    } catch {
      // Prefetch is best-effort; playTTS will retry and surface any error.
    }
  }, [capabilities.canGenerateTTS, fetchTTSAudio]);

  const toggleTTS = useCallback(async (
    text: string,
    options?: TTSRequestOptions
  ) => {
    if (!capabilities.canGenerateTTS || !text) return;

    if (isSpeaking) {
      await stopTTS();
      return;
    }
    await playTTS(text, options);
  }, [capabilities.canGenerateTTS, isSpeaking, stopTTS, playTTS]);

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
        throw new Error(message);
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
    playTTS,
    prefetchTTS,
    stopTTS,
    copyText,
    share,
    requestExplain,
  };

  return { state, handlers };
}
