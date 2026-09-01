import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
  Modal,
  Switch,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { DHARM_VEERS, TRADITION_META, type DharmVeer } from '@/lib/dharm-veer';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import { AuthGate } from '@/components/ui/AuthGate';

// New Reader Foundation imports
import { ReaderShell } from '@/components/reader/ReaderShell';
import { useReaderControls } from '@/hooks/useReaderControls';
import { buildReadableCapabilities } from '@/lib/readable-content';
import { getInitialReaderDisplayMode, resolveReadablePreferences } from '@/lib/readable-preferences';

function getLocalSpiritualDate(tz: string, rolloverHour: number = 4): string {
  try {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: 'numeric', hourCycle: 'h23',
    }).formatToParts(d);

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const dayStr = parts.find(p => p.type === 'day')?.value;
    const hourStr = parts.find(p => p.type === 'hour')?.value;

    if (year && month && dayStr && hourStr) {
      let day = parseInt(dayStr, 10);
      const hour = parseInt(hourStr, 10);
      if (hour < rolloverHour) {
         const temp = new Date(`${year}-${month}-${dayStr}T12:00:00Z`);
         temp.setUTCDate(temp.getUTCDate() - 1);
         return temp.toISOString().split('T')[0];
      }
      return `${year}-${month}-${dayStr}`;
    }
  } catch {}
  const fallback = new Date(Date.now() - rolloverHour * 3600 * 1000);
  return fallback.toISOString().split('T')[0];
}

type FontSize = 'sm' | 'md' | 'lg' | 'xl';
const FONT_PRESETS = [
  { label: 'A-', value: 'sm' },
  { label: 'A', value: 'md' },
  { label: 'A+', value: 'lg' },
  { label: 'A++', value: 'xl' },
];

export default function DharmVeerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hero, setHero] = useState<DharmVeer | null>(null);

  const [isGuest, setIsGuest] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const [profile, setProfile] = useState<{
    userId: string;
    timezone: string;
    appLanguage: string | null;
    meaningLanguage: string | null;
  } | null>(null);

  const [lang, setLang] = useState<'en' | 'local'>('en');
  const [fontStep, setFontStep] = useState(1); // 'md'

  // Explicit Inspiration state
  const [pendingCheckIn, setPendingCheckIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [privacyCommunity, setPrivacyCommunity] = useState(false);
  const [intention, setIntention] = useState('');
  const [mood, setMood] = useState<'gratitude' | 'devotion' | 'peace' | 'courage'>('gratitude');

  // Ask AI state
  const [askMoreQuery, setAskMoreQuery] = useState('');
  const [askMoreResponse, setAskMoreResponse] = useState('');
  const [askMoreLoading, setAskMoreLoading] = useState(false);

  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const surface = isDark ? COLORS.darkBg : COLORS.creamBg;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const gold = brand;

  const fontStyles: Record<FontSize, { fontSize: number; lineHeight: number }> = {
    sm: { fontSize: 13, lineHeight: 20 },
    md: { fontSize: 15, lineHeight: 24 },
    lg: { fontSize: 18, lineHeight: 28 },
    xl: { fontSize: 22, lineHeight: 32 },
  };

  const load = useCallback(async () => {
    setLoadError(false);
    setNotFound(false);

    if (!id) {
      setNotFound(true);
      return;
    }

    try {
      const guest = await isGuestMode();
      setIsGuest(guest);

      let tz = 'UTC';
      let uid = 'guest';
      let appLanguage: string | null = null;
      let meaningLanguage: string | null = null;
      if (!guest) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          uid = user.id;
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('timezone, app_language, meaning_language')
            .eq('id', user.id)
            .single();
          if (profileRow?.timezone) tz = profileRow.timezone;
          appLanguage = profileRow?.app_language ?? null;
          meaningLanguage = profileRow?.meaning_language ?? null;
        }
      }
      setProfile({ userId: uid, timezone: tz, appLanguage, meaningLanguage });

      let roster: DharmVeer[] = [];
      if (guest) {
        roster = DHARM_VEERS;
      } else {
        const response = await apiFetch('/api/dharm-veer/roster');
        if (!response.ok) {
          setLoadError(true);
          return;
        }
        const json = await response.json();
        roster = Array.isArray(json?.roster) ? json.roster : [];
      }

      if (roster.length === 0) {
        setLoadError(true);
        return;
      }

      const match = roster.find((candidate) => candidate.id === id) ?? null;

      if (!match) {
        setNotFound(true);
        return;
      }

      setHero(match);
      const hasLocalContent = Boolean(
        match.nameLocal
        && match.taglineLocal
        && match.journeyLocal
        && match.trialLocal
        && match.teachingLocal
        && match.moralLocal,
      );
      setLang(getInitialReaderDisplayMode(
        resolveReadablePreferences({ appLanguage, meaningLanguage }),
        hasLocalContent,
      ));
    } catch {
      setLoadError(true);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // Silent 30-second completion, matching the PWA reader rule.
  useEffect(() => {
    if (!hero || !profile) return;

    const timer = setTimeout(async () => {
      try {
        const tz = profile.timezone;
        const today = getLocalSpiritualDate(tz, 4);
        const dailyKey = `shoonaya-dharmveer-done-${today}-${profile.userId}-${hero.id}`;

        const alreadyDoneToday = await AsyncStorage.getItem(dailyKey);
        if (alreadyDoneToday) return;

        let ok = false;
        if (!isGuest) {
          const res = await apiFetch('/api/dharm-veer/submit', {
            method: 'POST',
            body: JSON.stringify({
              heroId: hero.id,
              decision: 'inspired',
              privacy: 'private',
            }),
          });
          ok = res.ok;
        } else {
          ok = true; // For guests, we only care about local cache
        }

        if (ok) {
          await AsyncStorage.setItem(dailyKey, 'true');
          const historyRaw = await AsyncStorage.getItem('shoonaya-dharmveer-history');
          const historyArr = historyRaw ? (JSON.parse(historyRaw) as string[]) : [];
          if (!historyArr.includes(hero.id)) {
            historyArr.push(hero.id);
            const newHistory = historyArr.slice(-14);
            await AsyncStorage.setItem('shoonaya-dharmveer-history', JSON.stringify(newHistory));
          }
        }
      } catch (e) {}
    }, 30_000);

    return () => clearTimeout(timer);
  }, [hero, isGuest, profile]);

  const confirmCheckIn = useCallback(async () => {
    if (!hero || !profile) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/dharm-veer/submit', {
        method: 'POST',
        body: JSON.stringify({
          heroId: hero.id,
          decision: 'inspired',
          mood,
          intention,
          privacy: privacyCommunity ? 'community' : 'private',
        }),
      });

      if (!res.ok) throw new Error();

      const tz = profile.timezone;
      const today = getLocalSpiritualDate(tz, 4);
      const dailyKey = `shoonaya-dharmveer-done-${today}-${profile.userId}-${hero.id}`;
      await AsyncStorage.setItem(dailyKey, 'true');

      const historyRaw = await AsyncStorage.getItem('shoonaya-dharmveer-history');
      const historyArr = historyRaw ? (JSON.parse(historyRaw) as string[]) : [];
      if (!historyArr.includes(hero.id)) {
        historyArr.push(hero.id);
        const newHistory = historyArr.slice(-14);
        await AsyncStorage.setItem('shoonaya-dharmveer-history', JSON.stringify(newHistory));
      }

      setPendingCheckIn(false);
      setMood('gratitude');
      setIntention('');
      setPrivacyCommunity(false);
      Alert.alert("Reflection Saved", "Your reflection has been safely stored.");
    } catch {
      Alert.alert("Could not save your reflection", "Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }, [hero, mood, intention, privacyCommunity, profile]);

  const handleAskMore = async () => {
    if (!askMoreQuery.trim() || !hero) return;
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }
    setAskMoreLoading(true);
    setAskMoreResponse('');
    try {
      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: askMoreQuery,
          mode: 'dharam_veer_reflection',
          figure_id: hero.id
        }),
      });
      if (res.ok) {
        const text = await res.text();
        setAskMoreResponse(text);
      } else {
        setAskMoreResponse('Failed to fetch response.');
      }
    } catch(err) {
      setAskMoreResponse('An error occurred.');
    } finally {
      setAskMoreLoading(false);
    }
  };

  const title = lang === 'local' && hero?.nameLocal ? hero.nameLocal : hero?.name;
  const era = lang === 'local' && hero?.eraLocal ? hero.eraLocal : hero?.era;
  const region = lang === 'local' && hero?.regionLocal ? hero.regionLocal : hero?.region;
  const tagline = lang === 'local' && hero?.taglineLocal ? hero.taglineLocal : hero?.tagline;
  const journeyText = lang === 'local' && hero?.journeyLocal ? hero.journeyLocal : hero?.journey;
  const trialText = lang === 'local' && hero?.trialLocal ? hero.trialLocal : hero?.trial;
  const teachingText = lang === 'local' && hero?.teachingLocal ? hero.teachingLocal : hero?.teaching;
  const moralText = lang === 'local' && hero?.moralLocal ? hero.moralLocal : hero?.moral;
  const quoteText = lang === 'local' && hero?.quoteLocal?.text ? hero.quoteLocal.text : hero?.quote?.text;
  const quoteAttribution = lang === 'local' && hero?.quoteLocal?.attribution ? hero.quoteLocal.attribution : hero?.quote?.attribution;

  const textToCopy = hero ? `${title}
${tagline}

[Journey]
${journeyText}

[Trial]
${trialText}

[Teaching]
${teachingText}

[Moral]
${moralText}` : '';

  const textToShare = hero ? `🙏 Jai Shri Hari! Read this inspiring Dharm Veer story of '${title}' on the Shoonaya App. Download now to grow your Sadhana.` : '';

  const hasCompleteLocalContent = !!hero?.nameLocal && !!hero?.taglineLocal && !!hero?.journeyLocal && !!hero?.trialLocal && !!hero?.teachingLocal && !!hero?.moralLocal;
  const meta = hero ? TRADITION_META[hero.tradition] : null;
  const accent = meta?.color.replace('0.12', isDark ? '0.2' : '0.4') ?? 'rgba(197,160,89,0.2)';

  const capabilities = useMemo(() => buildReadableCapabilities({
    original: hero?.journey ?? '',
    meaning: hero?.journeyLocal,
    script: 'latin',
    pipelineTags: {
      content_type: 'instruction',
      audio_mode: 'none',
    },
  }, {
    canToggleLocalLanguage: hasCompleteLocalContent,
    canShowExplain: false,
  }), [hasCompleteLocalContent, hero?.journey, hero?.journeyLocal]);

  const { state, handlers } = useReaderControls(capabilities);

  const fontSizeToken = FONT_PRESETS[fontStep].value as FontSize;
  const fs = fontStyles[fontSizeToken];

  if (loading) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={brand} />
        </View>
      </Screen>
    );
  }

  if (loadError || notFound || !hero) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <View style={{ padding: 20 }}>
          <BackButton variant="glass" fallbackHref="/dharm-veer" handleHardwareBack />
          <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 30, marginTop: 20 }}>Dharm Veer</Text>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 15, marginTop: 10 }}>
            {notFound ? 'Story not found.' : 'Failed to load story.'}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <>
      <ReaderShell
        title={title ?? 'Dharm Veer'}
        subtitle={meta?.dharmVeerLocal || 'Dharm Veer'}
        fallbackBackUrl="/dharm-veer"
        themeColor={brand}
        ambientGlowColor={brand}
        fontPresets={FONT_PRESETS}
        fontStep={fontStep}
        setFontStep={setFontStep}
        languages={hasCompleteLocalContent ? [{ code: 'en', label: 'EN' }, { code: 'local', label: 'हिं/Local' }] : undefined}
        currentLanguage={lang}
        setLanguage={setLang}
        onCopy={() => handlers.copyText(textToCopy, 'Story')}
        isCopied={state.isCopied}
        onShare={() => handlers.share(textToShare)}
      >
        {/* Identity Section */}
        <View style={{ alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: accent, borderColor: brand, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 40 }}>{hero.emoji}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 28, textAlign: 'center' }}>{title}</Text>
            <Text style={{ color: gold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 }}>{era} · {region}</Text>
          </View>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: fs.fontSize, fontStyle: 'italic', textAlign: 'center' }}>
            "{tagline}"
          </Text>
        </View>

        {/* Narrative Sections */}
        <View style={{ gap: 24 }}>
          {/* Journey */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.5 }}>
              <Feather name="book-open" size={14} color={text} />
              <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>The Journey</Text>
            </View>
            <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: fs.fontSize, lineHeight: fs.lineHeight }}>{journeyText}</Text>
          </View>

          {/* Trial */}
          <View style={{ backgroundColor: 'rgba(197, 160, 89,0.05)', borderColor: 'rgba(197, 160, 89,0.1)', borderWidth: 1, borderRadius: 24, padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="shield" size={14} color={brand} />
              <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Test of Dharma</Text>
            </View>
            <Text style={{ color: text, fontFamily: FONTS.sansMedium, fontStyle: 'italic', fontSize: fs.fontSize, lineHeight: fs.lineHeight }}>{trialText}</Text>
          </View>

          {/* Teaching */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.5 }}>
              <Feather name="target" size={14} color={text} />
              <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Wisdom</Text>
            </View>
            <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: fs.fontSize, lineHeight: fs.lineHeight }}>{teachingText}</Text>
          </View>

          {/* Quote */}
          {quoteText ? (
            <View style={{ paddingVertical: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: border, alignItems: 'center', gap: 16 }}>
              <Feather name="feather" size={24} color={brand} style={{ opacity: 0.4 }} />
              <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: fs.fontSize + 2, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 16 }}>
                {quoteText}
              </Text>
              <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>— {quoteAttribution}</Text>
            </View>
          ) : null}

          {/* Moral */}
          <View style={{ alignItems: 'center', paddingTop: 16, gap: 12 }}>
            <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 3, opacity: 0.5 }}>Essence</Text>
            <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: fs.fontSize + 2, lineHeight: fs.lineHeight + 4, textAlign: 'center' }}>
              {moralText}
            </Text>
          </View>
        </View>

        {/* Ask Dharma Mitra */}
        <View style={{ marginTop: 40, borderTopWidth: 1, borderTopColor: border, paddingTop: 24, gap: 16 }}>
          <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 18 }}>Ask more about this Dharam Veer</Text>
          <View style={{ gap: 12 }}>
            <TextInput
              value={askMoreQuery}
              onChangeText={setAskMoreQuery}
              placeholder="Ask a question..."
              placeholderTextColor={textDim}
              style={{
                backgroundColor: surface,
                borderColor: border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                color: text,
                fontFamily: FONTS.sans,
                fontSize: 15
              }}
            />
            <PressableSurface
              haptic="selection"
              onPress={handleAskMore}
              disabled={askMoreLoading || !askMoreQuery.trim()}
              style={{
                backgroundColor: brand,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 16,
                alignSelf: 'flex-end',
                opacity: (askMoreLoading || !askMoreQuery.trim()) ? 0.5 : 1
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{askMoreLoading ? 'Asking...' : 'Ask AI'}</Text>
            </PressableSurface>
          </View>
          {askMoreResponse ? (
            <View style={{ marginTop: 16, padding: 16, backgroundColor: 'rgba(197,160,89,0.05)', borderRadius: 16, borderWidth: 1, borderColor: border }}>
              <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>{askMoreResponse}</Text>
            </View>
          ) : null}
        </View>

        {/* Take Inspiration Button */}
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <PressableSurface
            haptic="selection"
            onPress={() => {
              if (isGuest) {
                setAuthGateVisible(true);
              } else {
                setPendingCheckIn(true);
              }
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 999,
              paddingVertical: 14,
              paddingHorizontal: 32,
              backgroundColor: brand,
              shadowColor: brand,
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 }
            }}
          >
            <Feather name="heart" size={16} color={COLORS.ink} />
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
              Share reflection
            </Text>
          </PressableSurface>
        </View>
      </ReaderShell>

      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Dharm Veer"
        message="Sign in to save your reflections and share with the community."
      />

      <Modal transparent visible={pendingCheckIn} animationType="slide" onRequestClose={() => setPendingCheckIn(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              paddingBottom: 34,
              gap: 16,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>

            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 20 }}>
              What are you taking from {hero?.name}?
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { key: 'gratitude', label: 'Gratitude', emoji: '✨' },
                { key: 'devotion', label: 'Devotion', emoji: '🙏' },
                { key: 'peace', label: 'Peace', emoji: '🕊️' },
                { key: 'courage', label: 'Courage', emoji: '🦁' },
              ].map((option) => {
                const active = mood === option.key;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => setMood(option.key as typeof mood)}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: active ? brand : isDark ? border : COLORS.homeBorderSoftLight,
                      backgroundColor: active
                        ? brand
                        : isDark ? COLORS.cardBgDark : COLORS.homeRaisedLight,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{option.emoji}</Text>
                    <Text
                      style={{
                        color: active
                          ? (isDark ? COLORS.textOnBrandDark : COLORS.textOnBrandLight)
                          : text,
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 13,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={intention}
              onChangeText={setIntention}
              placeholder="A word or two (optional)"
              placeholderTextColor={textDim}
              multiline
              style={{
                minHeight: 80,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: surface,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: text,
                fontFamily: FONTS.sans,
                fontSize: 14,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13 }}>Share with community</Text>
              <Switch value={privacyCommunity} onValueChange={setPrivacyCommunity} trackColor={{ true: brand }} />
            </View>

            <PressableSurface
              haptic="selection"
              onPress={confirmCheckIn}
              disabled={submitting}
              style={{
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: brand,
              }}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Save & continue</Text>
              )}
            </PressableSurface>

            <PressableSurface haptic="selection" onPress={() => setPendingCheckIn(false)} disabled={submitting} style={{ alignItems: 'center', minHeight: 0 }}>
              <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Cancel</Text>
            </PressableSurface>
          </View>
        </View>
      </Modal>
    </>
  );
}
