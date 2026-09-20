import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SUPPORTED_APP_LANGUAGES,
  type AppLanguage,
  isAppLanguage,
} from '@/lib/language-runtime';
import { supabase } from '@/lib/supabase';

export const APP_LANGUAGE_STORAGE_KEY = '@shoonaya/app_language';
export const LEGACY_CHAT_LANGUAGE_KEY = '@shoonaya/chat_language';
export const PWA_STORAGE_KEY = 'shoonaya-app-lang';

export interface LanguageContextValue {
  language: AppLanguage;
  lang: AppLanguage;
  setLanguage: (newLang: AppLanguage) => Promise<void>;
  setLang: (newLang: AppLanguage) => Promise<void>;
  t: (key: string, overrideLang?: AppLanguage) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  initialLanguage?: AppLanguage;
  children: ReactNode;
}

export function LanguageProvider({
  initialLanguage = 'en',
  children,
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);

  useEffect(() => {
    let cancelled = false;

    async function hydrateLanguage() {
      try {
        // 1. Instant paint from whichever local cache has a value -- offline-first,
        // zero mount flicker. This is a first approximation only: it must not be
        // the last word, or a language change made on another device (or by an
        // admin/support action on the profile row) would never reach this device
        // as long as *any* local cache value already existed here.
        const stored = await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
        if (stored && isAppLanguage(stored)) {
          if (!cancelled) setLanguageState(stored);
        } else {
          const chatStored = await AsyncStorage.getItem(LEGACY_CHAT_LANGUAGE_KEY);
          if (chatStored && isAppLanguage(chatStored)) {
            if (!cancelled) setLanguageState(chatStored);
            void AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, chatStored).catch(() => {});
          }
        }

        // 2. Reconcile with the profile -- the actual source of truth -- in the
        // background. Always runs, even when a cached value was just applied
        // above, so a value set on a different device is picked up here instead
        // of being permanently shadowed by a stale local cache.
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('app_language')
            .eq('id', user.id)
            .single();

          if (!cancelled && data?.app_language && isAppLanguage(data.app_language)) {
            setLanguageState(data.app_language);
            void AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, data.app_language).catch(() => {});
          }
        }
      } catch {
        // Failsafe: remain on default language without crashing
      }
    }

    void hydrateLanguage();

    // Listen to auth changes so signing in immediately syncs user's stored language
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.id) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('app_language')
            .eq('id', session.user.id)
            .single();

          if (data?.app_language && isAppLanguage(data.app_language)) {
            setLanguageState(data.app_language);
            void AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, data.app_language).catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const setLanguage = useCallback(async (newLang: AppLanguage) => {
    if (!isAppLanguage(newLang)) return;

    // Synchronous optimistic state update
    setLanguageState(newLang);

    // Persist to storage keys
    try {
      await AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, newLang);
      await AsyncStorage.setItem(LEGACY_CHAT_LANGUAGE_KEY, newLang);
    } catch {
      // ignore
    }

    // Sync to Supabase profile in the background
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            app_language: newLang,
            meaning_language: newLang,
          })
          .eq('id', user.id);
      }
    } catch {
      // Non-blocking sync
    }
  }, []);

  // Lightweight translation lookup for shared UI tags
  const t = useCallback((key: string, overrideLang?: AppLanguage): string => {
    const active = overrideLang ?? language;
    switch (key) {
      case 'meaning':
        return active === 'hi' ? 'अर्थ' : active === 'pa' ? 'ਅਰਥ' : 'Meaning';
      case 'divine_voice':
        return active === 'hi' ? 'दिव्य वाणी' : active === 'pa' ? 'ਦਿਵਯ ਬਾਣੀ' : 'Divine Voice';
      case 'today':
        return active === 'hi' ? 'आज' : active === 'pa' ? 'ਅੱਜ' : 'Today';
      case 'significance':
        return active === 'hi' ? 'महत्व' : active === 'pa' ? 'ਮਹੱਤਵ' : 'Significance';
      case 'rituals':
        return active === 'hi' ? 'पूजा विधि' : active === 'pa' ? 'ਪੂਜਾ ਵਿਧੀ' : 'Rituals';
      case 'mantra':
        return active === 'hi' ? 'मंत्र' : active === 'pa' ? 'ਮੰਤਰ' : 'Mantra';
      default:
        return key;
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    lang: language,
    setLanguage,
    setLang: setLanguage,
    t,
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return safe fallback if rendered outside provider (e.g. isolated test or preview)
    return {
      language: 'en',
      lang: 'en',
      setLanguage: async () => {},
      setLang: async () => {},
      t: (key) => key,
    };
  }
  return context;
}
