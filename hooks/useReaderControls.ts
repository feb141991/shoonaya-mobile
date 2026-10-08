import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from '@/lib/api';
import { useAudioPlayer, type AudioPlaybackOptions } from '@/hooks/useAudioPlayer';
import { trackReaderEvent } from '@/lib/analytics/reader-events';
import type { ReadableCapabilities, PramanaPipelineTags } from '@/lib/readable-content';
import { createReaderAudioCacheIdentity } from '@/lib/readerAudioCache';

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
  backgroundPlayback?: boolean;
  lockScreenMetadata?: AudioPlaybackOptions['lockScreenMetadata'];
  onComplete?: () => void;
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
  playTTS: (text: string, options?: TTSRequestOptions) => Promise<void>;
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
  const generatedAudioCacheRef = useRef(new Map<string, { signature: string; uri: string }>());
  const generatedAudioFilesRef = useRef(new Set<string>());

  const { loadAndPlay, stop } = useAudioPlayer();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ttsRequestIdRef.current += 1;
      if (copiedResetTimerRef.current) clearTimeout(copiedResetTimerRef.current);
      void stop().finally(async () => {
        const files = [...generatedAudioFilesRef.current];
        generatedAudioFilesRef.current.clear();
        await Promise.all(files.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {})));
      });
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

  const playTTS = useCallback(async (
    text: string,
    options?: TTSRequestOptions
  ) => {
    if (!capabilities.canGenerateTTS || !text) return;

    trackReaderEvent('tts_requested', { language: options?.language });

    const requestId = ++ttsRequestIdRef.current;
    setIsGeneratingTTS(true);
    setTtsError(null);

    try {
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

      const identity = createReaderAudioCacheIdentity(ttsText, {
        quality: options?.quality,
        language: options?.language,
        voice: options?.voice,
        speed: options?.speed,
        rate: options?.rate,
        pipelineTags: options?.pipelineTags,
      });
      const cachedAudio = generatedAudioCacheRef.current.get(identity.key);
      let audioUri = cachedAudio?.signature === identity.signature ? cachedAudio.uri : null;

      if (!audioUri) {
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
        if (!data.audioContent) {
          if (data.error) throw new Error(data.error as string);
          throw new Error('No audio content in response');
        }
        // Detect format: Sarvam returns WAV (base64 starting with 'UklGR' for RIFF header)
        const isWav = typeof data.audioContent === 'string' && data.audioContent.startsWith('UklGR');

        if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
          const ext = isWav ? 'wav' : 'mp3';
          const localPath = `${FileSystem.cacheDirectory}${identity.key}.${ext}`;
          await FileSystem.writeAsStringAsync(localPath, data.audioContent, {
            encoding: FileSystem.EncodingType.Base64,
          });
          audioUri = localPath;
          generatedAudioFilesRef.current.add(localPath);
        } else {
          const mime = isWav ? 'audio/wav' : 'audio/mp3';
          audioUri = `data:${mime};base64,${data.audioContent}`;
        }

        // Keep the bounded cache local to this reader session. This matters
        // for 11×/21×/108× recitations: repeat cycles replay the generated
        // audio without repeating a paid TTS request.
        const cache = generatedAudioCacheRef.current;
        if (cache.size >= 256) {
          const oldest = cache.entries().next().value as [string, { signature: string; uri: string }] | undefined;
          if (oldest) {
            cache.delete(oldest[0]);
            if (oldest[1].uri.startsWith(FileSystem.cacheDirectory ?? '\u0000')) {
              generatedAudioFilesRef.current.delete(oldest[1].uri);
              void FileSystem.deleteAsync(oldest[1].uri, { idempotent: true }).catch(() => {});
            }
          }
        }
        cache.set(identity.key, { signature: identity.signature, uri: audioUri });
      }

      await loadAndPlay(
        audioUri,
        false,
        () => {
          if (!mountedRef.current || requestId !== ttsRequestIdRef.current) return;
          setIsSpeaking(false);
          options?.onComplete?.();
        },
        {
          backgroundPlayback: options?.backgroundPlayback,
          lockScreenMetadata: options?.lockScreenMetadata,
        },
      );
      if (requestId === ttsRequestIdRef.current && mountedRef.current) setIsSpeaking(true);
    } catch (err) {
      if (!mountedRef.current || requestId !== ttsRequestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      setTtsError(message);
      console.error('[useReaderControls] TTS error:', err);
      Alert.alert("Audio failed", "We could not load the audio at this time.");
    } finally {
      if (mountedRef.current && requestId === ttsRequestIdRef.current) setIsGeneratingTTS(false);
    }
  }, [capabilities.canGenerateTTS, loadAndPlay]);

  const toggleTTS = useCallback(async (text: string, options?: TTSRequestOptions) => {
    if (isSpeaking || isGeneratingTTS) {
      await stopTTS();
      return;
    }
    await playTTS(text, options);
  }, [isSpeaking, isGeneratingTTS, stopTTS, playTTS]);

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
    stopTTS,
    copyText,
    share,
    requestExplain,
  };

  return { state, handlers };
}
