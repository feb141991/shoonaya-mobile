import { useCallback, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, useFocusEffect, type Href } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE } from '@/lib/constants';
import { resolveNativeRoute } from '@/lib/routes';
import { getFirstWeekGuideKeys } from '@/lib/firstWeekGuideStorage';
import { computeActStepStatuses } from '@/lib/firstWeekGuideSequence';
import { useAppIdentity } from '@/lib/appIdentity';

/**
 * FirstWeekGuide — warm cold-start onboarding for brand-new users.
 *
 * Native port of the PWA's src/components/home/FirstWeekGuide.tsx. Shown
 * only when the new `firstWeek` flag from `/api/native/home-summary` is
 * true — that flag was added to the API (this task's one small backend
 * change) using the identical formula the PWA's own `showFirstTimeGuidance`
 * already uses server-side: no shloka streak, no last-shloka-read date, and
 * no guided-path progress rows. Native and web now agree on who counts as
 * "new" rather than each guessing independently.
 *
 * Acts route through the same `resolveNativeRoute` helper the rest of Home
 * already uses (MoodCheckin, notification tap handling, etc.) rather than
 * hardcoding a second set of route strings — the one exception is the
 * sacred-text act, which links to the real native shloka detail screen
 * (app/shloka.tsx) since native — unlike the PWA, where the shloka card
 * lives inline on Home itself — has a dedicated screen for it.
 *
 * Progress is stored in AsyncStorage (native's equivalent of the PWA's
 * localStorage) so checked items stay checked after completion; the card
 * disappears once all 5 acts are done or the user dismisses it.
 *
 * Sequential unlock (all 5 rows stay visible, only one is live at a time):
 * flattening five equally-weighted options into one open list raises choice
 * overload (Iyengar & Lepper) and dilutes time-to-first-completed-action,
 * which activation research (Facebook's "7 friends" metric, Reforge/Brian
 * Balfour's activation-metric work) ties directly to D1/D7 return. Headspace's
 * "Basics" course uses the same lock-ahead shape for the same reason: one
 * session live, the rest visible-but-locked, so the path stays motivating
 * (goal-gradient — Kivetz/Urminsky/Zeelenberg's stamp-card studies show
 * seeing the whole remaining path speeds completion more than a bare single
 * step does) without asking a brand-new user to pick among five unfamiliar
 * practices at once. Order already runs lowest-friction first (reading a
 * shloka) before heavier asks (Mandali) — biggest quick win first, so the
 * earliest "current" step is the one most likely to actually get finished.
 * "Current" is derived from completion state, not a day/calendar gate — a
 * motivated user can clear all five in one sitting; nothing here makes
 * them wait.
 */


interface GuideAct {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  href: Href;
}

function getTraditionActs(tradition: string | null | undefined): GuideAct[] {
  const t = tradition ?? 'hindu';

  const sacredText: GuideAct = {
    id: 'sacred_text',
    icon: 'sun',
    title:
      t === 'sikh'
        ? "Read today's Shabad"
        : t === 'buddhist'
          ? "Read today's Dhamma Verse"
          : t === 'jain'
            ? "Read today's Sutra"
            : "Read today's Shloka",
    desc: t === 'sikh' ? 'Start your Shabad streak' : t === 'buddhist' ? 'Start a Dhamma reading streak' : t === 'jain' ? 'Start a Sutra reading streak' : 'Start a reading streak',
    href: '/shloka',
  };

  const japa: GuideAct = {
    id: 'japa',
    icon: 'circle',
    title:
      t === 'sikh'
        ? 'Begin Waheguru Simran'
        : t === 'buddhist'
          ? 'Recite Om Mani Padme Hum'
          : t === 'jain'
            ? 'Recite the Namokar Mantra'
            : 'Complete one round of Japa',
    desc: '108 beads, one mantra, complete presence',
    href: resolveNativeRoute('/japa'),
  };

  const nitya: GuideAct = {
    id: 'nitya',
    icon: 'sunrise',
    title:
      t === 'sikh'
        ? 'Complete your Nitnem once'
        : t === 'buddhist'
          ? 'Complete your Morning Sadhana'
          : t === 'jain'
            ? 'Complete Pratikramana once'
            : 'Do your Nitya Karma once',
    desc: 'The morning routine that anchors your whole day',
    href: resolveNativeRoute('/nitya-karma'),
  };

  const pathshala: GuideAct = {
    id: 'pathshala',
    icon: 'book-open',
    title:
      t === 'sikh'
        ? 'Explore Gurbani in Pathshala'
        : t === 'buddhist'
          ? 'Study the Dhamma texts'
          : t === 'jain'
            ? 'Study the Agamas'
            : 'Start a Pathshala lesson',
    desc: 'Deepen your understanding of scripture and dharma',
    href: resolveNativeRoute('/pathshala'),
  };

  const mandali: GuideAct = {
    id: 'mandali',
    icon: 'users',
    title:
      t === 'sikh'
        ? 'Find your Sangat'
        : t === 'buddhist'
          ? 'Find your Sangha'
          : t === 'jain'
            ? 'Connect with your Samaj'
            : 'Find your Mandali',
    desc: 'Connect with seekers near you',
    href: resolveNativeRoute('/mandali'),
  };

  return [sacredText, japa, nitya, pathshala, mandali];
}

interface Props {
  tradition: string | null;
  userName?: string;
}

export function FirstWeekGuide({ tradition, userName }: Props) {
  const identity = useAppIdentity();
  const { progress: STORAGE_KEY, dismissed: DISMISS_KEY } = getFirstWeekGuideKeys(identity);
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(true); // hidden until AsyncStorage check resolves
  const [loaded, setLoaded] = useState(false);

  const acts = getTraditionActs(tradition);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoaded(false);
    setCompleted(new Set());
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(DISMISS_KEY)])
      .then(([storedProgress, storedDismiss]) => {
        if (cancelled) return;
        if (storedProgress) {
          try {
            setCompleted(new Set(JSON.parse(storedProgress) as string[]));
          } catch {
            // ignore malformed cache
          }
        }
        setDismissed(storedDismiss === 'true');
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [STORAGE_KEY, DISMISS_KEY]));

  function markDone(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function dismiss() {
    void AsyncStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  }

  if (!loaded || dismissed) return null;

  const doneCount = acts.filter((a) => completed.has(a.id)).length;
  if (doneCount === acts.length) return null;
  const stepStatuses = computeActStepStatuses(acts.map((a) => a.id), completed);

  const firstName = userName?.split(' ')[0];

  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          borderRadius: 22,
          overflow: 'hidden',
          backgroundColor: isDark ? `${accent}0a` : `${accent}08`,
          borderWidth: 1,
          borderColor: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
        }}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...TYPE.chip, letterSpacing: 1.25, textTransform: 'uppercase', color: accent, marginBottom: 3 }}>
              Your first week
            </Text>
            <Text style={{ ...TYPE.cardHeading, color: isDark ? COLORS.creamBg : COLORS.ink }}>
              {firstName ? `Welcome, ${firstName} 🙏` : 'Begin your journey'}
            </Text>
            <Text style={{ ...TYPE.caption, marginTop: 2, color: isDark ? COLORS.textDimDark : COLORS.textDimLight }}>
              One practice at a time — the next four wait their turn.
            </Text>
          </View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: accent }}>
              {doneCount}/{acts.length}
            </Text>
          </View>
        </View>

        <View>
          {acts.map((act, index) => {
            const status = stepStatuses[index];
            const done = status === 'done';
            const isCurrent = status === 'current';
            const isLocked = status === 'locked';
            return (
              <PressableSurface
                key={act.id}
                disabled={isLocked}
                accessibilityLabel={`${act.title}${done ? ', completed' : isLocked ? ', unlocks after the step above' : ''}`}
                onPress={
                  isLocked
                    ? undefined
                    : () => {
                        markDone(act.id);
                        router.push(act.href);
                      }
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  minHeight: MIN_TOUCH_TARGET,
                  opacity: isLocked ? 0.45 : 1,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
                }}
              >
                <Feather
                  name={done ? 'check-circle' : isLocked ? 'lock' : 'circle'}
                  size={18}
                  color={done || isCurrent ? accent : isDark ? COLORS.textDimDark : COLORS.textDimLight}
                />
                <Feather name={act.icon} size={16} color={isDark ? COLORS.textDimDark : COLORS.textDimLight} />
                <View style={{ flex: 1 }}>
                  {isCurrent ? (
                    <Text style={{ ...TYPE.chip, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: accent, marginBottom: 2 }}>
                      Do this next
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      ...TYPE.label,
                      color: done ? (isDark ? COLORS.textDimDark : COLORS.textDimLight) : isDark ? COLORS.creamBg : COLORS.ink,
                      textDecorationLine: done ? 'line-through' : 'none',
                    }}
                  >
                    {act.title}
                  </Text>
                  {isCurrent ? (
                    <Text style={{ ...TYPE.caption, marginTop: 1, color: isDark ? COLORS.textDimDark : COLORS.textDimLight }}>
                      {act.desc}
                    </Text>
                  ) : null}
                </View>
                {isCurrent ? (
                  <Feather name="chevron-right" size={14} color={accent} />
                ) : null}
              </PressableSurface>
            );
          })}
        </View>

        <PressableSurface
          haptic="selection"
          accessibilityLabel="Dismiss first week guide"
          onPress={dismiss}
          style={{ paddingHorizontal: 16, paddingVertical: 12, alignItems: 'flex-end', minHeight: MIN_TOUCH_TARGET }}
        >
          <Text
            style={{
              fontFamily: FONTS.sans,
              fontSize: 10,
              textDecorationLine: 'underline',
              color: isDark ? COLORS.textDimDark : COLORS.textDimLight,
            }}
          >
            I know the app — dismiss
          </Text>
        </PressableSurface>
      </View>
    </View>
  );
}
