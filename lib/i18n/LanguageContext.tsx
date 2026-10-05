import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type AppLanguage,
  isAppLanguage,
} from '@/lib/language-runtime';
import { supabase } from '@/lib/supabase';
import { useAppIdentity, getAppIdentity, captureAppIdentity } from '@/lib/appIdentity';
import { getLanguageStorageKey } from '@/lib/i18n/language-storage';

/** Legacy unscoped key retained for migration references; never read or written. */
export const APP_LANGUAGE_STORAGE_KEY = '@shoonaya/app_language';
export const LEGACY_CHAT_LANGUAGE_KEY = '@shoonaya/chat_language';
export const PWA_STORAGE_KEY = 'shoonaya-app-lang';

export interface LanguageContextValue {
  language: AppLanguage;
  lang: AppLanguage;
  setLanguage: (newLang: AppLanguage, options?: { syncProfile?: boolean }) => Promise<void>;
  setLang: (newLang: AppLanguage, options?: { syncProfile?: boolean }) => Promise<void>;
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
  const identity = useAppIdentity();
  const identityKey = identity.kind === 'authenticated'
    ? `user:${identity.userId}`
    : identity.kind === 'loading'
      ? 'loading'
      : 'guest';
  const [languageState, setLanguageState] = useState<{ owner: string; language: AppLanguage }>({
    owner: 'loading',
    language: initialLanguage,
  });
  // Do not render the previous account's locale during the one render before
  // its identity-scoped cache/profile has loaded.
  const language = languageState.owner === identityKey ? languageState.language : initialLanguage;
  const languageWriteRevision = useRef(0);

  // Hydrate only the active identity's preference. The former device-wide
  // key could leak one account's language to another on shared devices.
  useEffect(() => {
    if (identity.kind === 'loading') return;
    let cancelled = false;
    const { isCurrent } = captureAppIdentity();
    const storageKey = getLanguageStorageKey(identity);
    if (!storageKey) return;
    const revisionAtStart = languageWriteRevision.current;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored && isAppLanguage(stored)) {
          if (!cancelled && isCurrent() && revisionAtStart === languageWriteRevision.current) {
            setLanguageState({ owner: identityKey, language: stored });
          }
        }
      } catch {
        // Failsafe: remain on default language without crashing
      }

      if (identity.kind !== 'authenticated') return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('app_language')
          .eq('id', identity.userId)
          .single();

        if (!cancelled && isCurrent() && revisionAtStart === languageWriteRevision.current
          && data?.app_language && isAppLanguage(data.app_language)) {
          setLanguageState({ owner: identityKey, language: data.app_language });
          void AsyncStorage.setItem(storageKey, data.app_language).catch(() => {});
        }
      } catch {
        // Keep the identity-scoped cached preference when offline.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, identityKey]);

  const setLanguage = useCallback(async (newLang: AppLanguage, options?: { syncProfile?: boolean }) => {
    if (!isAppLanguage(newLang)) return;

    languageWriteRevision.current += 1;
    const currentIdentity = getAppIdentity();
    const owner = currentIdentity.kind === 'authenticated'
      ? `user:${currentIdentity.userId}`
      : currentIdentity.kind === 'loading'
        ? 'loading'
        : 'guest';
    setLanguageState({ owner, language: newLang });

    // Persist within the active identity boundary.
    try {
      const storageKey = getLanguageStorageKey(currentIdentity);
      if (storageKey) await AsyncStorage.setItem(storageKey, newLang);
    } catch {
      // ignore
    }

    // Sync to Supabase profile in the background -- reads the root-owned
    // identity synchronously instead of a third redundant getUser() call.
    if (options?.syncProfile !== false && currentIdentity.kind === 'authenticated') {
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
