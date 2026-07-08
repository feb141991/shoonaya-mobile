import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';
import { findMoodConfig, MOODS_CONFIG } from '@/lib/mood-registry';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';

// Small native mood check-in — see docs/NATIVE_MOOD_PARITY_PLAN.md's v1
// scope decision (Home card, not a full-screen modal takeover). This is a
// deliberately minimal slice of that plan: log today's mood from a compact
// card and show an already-checked-in state. It does NOT implement the
// plan's full `/mood` screen (context/time selection, recommendations,
// AI reflection) — those remain a later, separate slice, per the plan's own
// "Deferred to a later slice, not v1" list.
//
// Data: reuses the existing GET/POST /api/mood/checkin contract as-is
// (mood_registry.ts's plan section: "reuse existing web API contracts
// where possible"). Both routes were switched from cookie-only auth to
// getApiUser (Bearer + cookie) as part of this same change — see that
// route's own header comment. The user_id written is always the
// server-resolved, JWT-verified id from getApiUser; this component never
// sends a user id itself.
//
// "Already checked in today": the route's pre-existing hasCompletedToday
// field only reflects a session explicitly closed via /api/mood/complete
// (the deferred recommendations flow), which this minimal card never calls
// — so this component uses the route's additive hasLoggedMoodToday/lastMood
// fields instead (added alongside the auth fix), which reflect "did the
// user tell us a mood today" regardless of session_status. See that route's
// own comment for why.
//
// Product integrity: this component never writes to daily_sadhana and has
// no path into /api/sadhana/perfect-day — mood is not a rewarded
// completion, per the parity plan's explicit rule.

type CheckinStatus = 'loading' | 'ready' | 'error';

type CheckinResponse = {
  hasLoggedMoodToday?: boolean;
  lastMood?: string | null;
};

export function MoodCheckin() {
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

  const [status, setStatus] = useState<CheckinStatus>('loading');
  const [hasLoggedMoodToday, setHasLoggedMoodToday] = useState(false);
  const [lastMood, setLastMood] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastAttemptedMood, setLastAttemptedMood] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await apiFetch('/api/mood/checkin');
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = (await response.json()) as CheckinResponse;
      setHasLoggedMoodToday(Boolean(payload.hasLoggedMoodToday));
      setLastMood(payload.lastMood ?? null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadStatus().catch(() => {});
  }, [loadStatus]);

  const logMood = useCallback(async (key: string) => {
    setSubmitting(key);
    setSubmitError(null);
    setLastAttemptedMood(key);
    try {
      const response = await apiFetch('/api/mood/checkin', {
        method: 'POST',
        body: JSON.stringify({ before_mood: key, source_surface: 'native_home', dismissed: true }),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setHasLoggedMoodToday(true);
      setLastMood(key);
      setChanging(false);
    } catch {
      setSubmitError('Could not save — check your connection and try again.');
    } finally {
      setSubmitting(null);
    }
  }, []);

  const moods = MOODS_CONFIG[isDark ? 'dark' : 'light'];
  const loggedMoodConfig = findMoodConfig(isDark, lastMood);

  if (status === 'loading') {
    return <SkeletonRow style={{ marginTop: 0 }} />;
  }

  if (status === 'error') {
    return (
      <View
        style={{
          borderRadius: 18,
          padding: 16,
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
          Couldn&apos;t load your mood check-in.
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry loading mood check-in" onPress={loadStatus}>
          <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (hasLoggedMoodToday && !changing && loggedMoodConfig) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`You logged feeling ${loggedMoodConfig.label} today. Tap to change your mood.`}
        onPress={() => setChanging(true)}
        style={{
          borderRadius: 18,
          padding: 16,
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: loggedMoodConfig.bg,
          }}
        >
          <Feather name="smile" size={18} color={loggedMoodConfig.colour} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: dim }}>
            Today&apos;s mood
          </Text>
          <Text style={{ marginTop: 2, fontFamily: FONTS.sansSemiBold, fontSize: 15, color: loggedMoodConfig.colour }}>
            Feeling {loggedMoodConfig.label}
          </Text>
        </View>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: dim }}>Change</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        borderRadius: 18,
        padding: 16,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: border,
        gap: 12,
      }}
    >
      <View>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: COLORS.brandGold }}>
          How are you feeling?
        </Text>
        <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
          Pick what&apos;s closest — this stays private to you.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {moods.map((mood) => {
          const isSubmittingThis = submitting === mood.key;
          return (
            <Pressable
              key={mood.key}
              accessibilityRole="button"
              accessibilityLabel={`Log mood: ${mood.label}`}
              onPress={() => logMood(mood.key)}
              disabled={submitting !== null}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                minWidth: MIN_TOUCH_TARGET,
                paddingHorizontal: 14,
                borderRadius: 16,
                backgroundColor: mood.bg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: submitting !== null && !isSubmittingThis ? 0.5 : 1,
              }}
            >
              {isSubmittingThis ? (
                <ActivityIndicator color={mood.colour} size="small" />
              ) : (
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: mood.colour }}>
                  {mood.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {submitError ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: dim, fontFamily: FONTS.sans, fontSize: 12, flex: 1 }}>{submitError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={() => (lastAttemptedMood ? logMood(lastAttemptedMood) : undefined)}
          >
            <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
