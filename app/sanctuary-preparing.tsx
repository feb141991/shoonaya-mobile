import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, type ImageSourcePropType } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SanctuaryPreparationScene } from '@/components/onboarding/SanctuaryPreparationScene';
import { getAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { apiFetch } from '@/lib/api';
import { API_BASE } from '@/lib/constants';
import { getHeroPick, LOCAL_HERO_ASSETS } from '@/lib/heroPreference';
import { getGreetingPick } from '@/lib/greetingPreference';
import { selectStartupScene } from '@/lib/startup-scenes/selector';
import { resolveHomeGreeting } from '@/lib/greetings';
import { writeHomeCache } from '@/lib/homeCache';
import { clearSanctuaryPreparation, getSanctuaryPreparation, prepareSanctuaryHome, sanctuaryFirstName } from '@/lib/sanctuaryPreparation';

const SYMBOLS: Record<string, ImageSourcePropType> = {
  hindu: require('@/assets/relics/om.png'),
  sikh: require('@/assets/relics/khanda-gold.png'),
  buddhist: require('@/assets/relics/dharma-wheel.png'),
};

export default function SanctuaryPreparingScreen() {
  const router = useRouter();
  const identity = useAppIdentity();
  const identityUserId = identity.kind === 'authenticated' ? identity.userId : null;
  const context = useRef(getSanctuaryPreparation()).current;
  const finished = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const fallback = useRef(selectStartupScene({ tradition: context?.tradition })).current;
  const [artwork, setArtwork] = useState<ImageSourcePropType>(fallback.source);
  const [artworkLabel, setArtworkLabel] = useState(fallback.accessibilityLabel[context?.language ?? 'en']);
  const [greetingOverride, setGreetingOverride] = useState<string | null>(null);
  const greeting = resolveHomeGreeting({ override: greetingOverride, tradition: context?.tradition ?? null });
  const isCurrent = useCallback(() => {
    const current = getAppIdentity();
    return !!context && context.isCurrent() && current.kind === 'authenticated' && current.userId === context.userId;
  }, [context]);

  const finish = useCallback(() => {
    if (finished.current || !isCurrent()) return;
    finished.current = true;
    controller.current?.abort();
    if (context) clearSanctuaryPreparation(context);
    router.replace((context?.destination ?? '/(tabs)') as Href);
  }, [context, isCurrent, router]);

  useEffect(() => {
    if (identity.kind === 'loading') return;
    if (!isCurrent()) {
      if (context) clearSanctuaryPreparation(context);
      router.replace(identity.kind === 'authenticated' || identity.kind === 'guest' ? '/(tabs)' : '/(auth)/login');
      return;
    }
    let active = true;
    const abort = new AbortController();
    controller.current = abort;
    void getHeroPick().then(pick => {
      if (!active || !isCurrent() || !pick) return;
      const local = LOCAL_HERO_ASSETS[pick.id];
      const uri = /^https?:\/\//i.test(pick.imageUrl) ? pick.imageUrl : `${API_BASE}${pick.imageUrl.startsWith('/') ? '' : '/'}${pick.imageUrl}`;
      setArtwork(local ?? { uri });
      setArtworkLabel(context!.language === 'hi' ? 'आपकी चुनी हुई शरणस्थली की कलाकृति' : 'Your chosen sanctuary artwork');
    });
    void getGreetingPick().then(pick => { if (active && isCurrent()) setGreetingOverride(pick); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { finish(); return true; });
    const lifecycle = AppState.addEventListener('change', state => { if (state === 'background') abort.abort(); });
    void prepareSanctuaryHome({
      signal: abort.signal,
      isCurrent,
      fetchSummary: signal => apiFetch('/api/native/home-summary', { signal, timeoutMs: 8000, expectedUserId: context!.userId }),
      cacheHome: payload => writeHomeCache(
        { kind: 'authenticated', userId: context!.userId }, payload,
        payload.date.timezone, payload.date.iso,
        payload.panchang.calendarStatus === 'ready' ? Date.now() : 0,
      ),
    }).then(() => { if (active) finish(); });
    return () => {
      active = false;
      abort.abort();
      back.remove();
      lifecycle.remove();
    };
  }, [context, identity.kind, identityUserId, isCurrent, finish, router]);

  if (!context || !isCurrent()) return null;
  return (
    <>
      <StatusBar style="light" />
      <SanctuaryPreparationScene
        artwork={artwork} artworkLabel={artworkLabel}
        symbol={SYMBOLS[context.tradition] ?? null}
        symbolText={context.tradition === 'jain' ? 'अहिंसा' : undefined}
        greeting={greeting} firstName={sanctuaryFirstName(context.displayName, context.language)}
        isHindi={context.language === 'hi'} onContinue={finish}
        onArtworkError={() => { setArtwork(fallback.source); setArtworkLabel(fallback.accessibilityLabel[context.language]); }}
      />
    </>
  );
}
