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
import { useAppIdentity, getAppIdentity, captureAppIdentity } from '@/lib/appIdentity';

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
  const identity = useAppIdentity();

  // Instant paint from whichever local cache has a value -- offline-first,
  // zero mount flicker. Runs once; the identity-driven effect below is what
  // reconciles with the actual source of truth (the profile row).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
      } catch {
        // Failsafe: remain on default language without crashing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // F03 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md): this used to run
  // its own one-shot Supabase user lookup plus its own dedicated auth-state
  // subscription, duplicating the root's already-published identity
  // (app/_layout.tsx). That had two real bugs, not just an architecture
  // smell: (1) the mount-only lookup never re-ran on a later account
  // switch except via the separate subscription, which itself (2) had no
  // generation guard, so a slow profile read from an earlier
  // identity could resolve after a newer one and overwrite it with stale
  // data -- and did nothing at all on sign-out (`if (session?.user?.id)`
  // skipped the null-session case), leaving a just-signed-out user's
  // app_language visible to whoever uses the device next.
  useEffect(() => {
    if (identity.kind === 'loading') return;

    if (identity.kind !== 'authenticated') {
      // Signed out or guest: stop showing a just-signed-out user's synced
      // language. Falls back to the device cache (the same source the
      // mount effect above reads), not a hardcoded default, so an explicit
      // guest-set language survives sign-out. This does not fully
      // identity-scope language storage the way Home/Profile/Mandali
      // caches are scoped -- APP_LANGUAGE_STORAGE_KEY remains one
      // device-wide key that every authenticated reconciliation below
      // overwrites, so a second account signing in right after a first
      // can still see a brief flash of the first account's language until
      // its own reconciliation resolves. Tracked as a residual gap in
      // docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md, not silently
      // dropped -- a full fix needs identity-scoped storage, out of scope
      // for this pass.
      (async () => {
        const stored = await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY).catch(() => null);
        if (stored && isAppLanguage(stored)) setLanguageState(stored);
      })();
      return;
    }

    const { isCurrent } = captureAppIdentity();
    const userId = identity.userId;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('app_language')
          .eq('id', userId)
          .single();

        if (!isCurrent()) return;
        if (data?.app_language && isAppLanguage(data.app_language)) {
          setLanguageState(data.app_language);
          void AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, data.app_language).catch(() => {});
        }
      } catch {
        // ignore
      }
    })();
  }, [identity]);

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

    // Sync to Supabase profile in the background -- reads the root-owned
    // identity synchronously instead of a third redundant getUser() call.
    const currentIdentity = getAppIdentity();
    if (currentIdentity.kind === 'authenticated') {
      try {
        await supabase
          .from('profiles')
          .update({
            app_language: newLang,
            meaning_language: newLang,
          })
          .eq('id', currentIdentity.userId);
      } catch {
        // Non-blocking sync
      }
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
