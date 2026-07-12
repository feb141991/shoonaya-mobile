import { useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';
import { resolveNativeRoute } from '@/lib/routes';

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
 */

const STORAGE_KEY = 'shoonaya-first-week-guide';
const DISMISS_KEY = 'shoonaya-first-week-dismissed';

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
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(true); // hidden until AsyncStorage check resolves
  const [loaded, setLoaded] = useState(false);

  const acts = getTraditionActs(tradition);

  useEffect(() => {
    let cancelled = false;
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
  }, []);

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

  const firstName = userName?.split(' ')[0];

  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: isDark ? `${accent}0a` : `${accent}08`,
          borderWidth: 1,
          borderColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
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
            <Text
              style={{
                fontFamily: FONTS.sansSemiBold,
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: accent,
                marginBottom: 3,
              }}
            >
              Your first week
            </Text>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 16, color: isDark ? COLORS.creamBg : COLORS.ink }}>
              {firstName ? `Welcome, ${firstName} 🙏` : 'Begin your journey'}
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
          {acts.map((act) => {
            const done = completed.has(act.id);
            return (
              <PressableSurface
                key={act.id}
                accessibilityLabel={`${act.title}${done ? ', completed' : ''}`}
                onPress={() => {
                  markDone(act.id);
                  router.push(act.href);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  minHeight: MIN_TOUCH_TARGET,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
                }}
              >
                <Feather
                  name={done ? 'check-circle' : 'circle'}
                  size={18}
                  color={done ? accent : isDark ? COLORS.textDimDark : COLORS.textDimLight}
                />
                <Feather name={act.icon} size={16} color={isDark ? COLORS.textDimDark : COLORS.textDimLight} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 13,
                      color: done ? (isDark ? COLORS.textDimDark : COLORS.textDimLight) : isDark ? COLORS.creamBg : COLORS.ink,
                      textDecorationLine: done ? 'line-through' : 'none',
                    }}
                  >
                    {act.title}
                  </Text>
                  {!done ? (
                    <Text
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 11,
                        marginTop: 1,
                        color: isDark ? COLORS.textDimDark : COLORS.textDimLight,
                      }}
                    >
                      {act.desc}
                    </Text>
                  ) : null}
                </View>
                {!done ? (
                  <Feather name="chevron-right" size={14} color={isDark ? COLORS.textDimDark : COLORS.textDimLight} />
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
