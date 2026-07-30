import { useCallback, useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, KATHA_VIEW_ACCENT, RADII, TRADITION_ACCENT, TYPE, themeColor } from '@/lib/constants';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';

// New Reader Foundation imports
import { ReaderShell } from '@/components/reader/ReaderShell';
import { useReaderControls } from '@/hooks/useReaderControls';
import { buildReadableCapabilities } from '@/lib/readable-content';
import { resolveReadablePreferences } from '@/lib/readable-preferences';

type FullKatha = {
  id: string;
  tradition: string;
  occasion: string;
  deity?: string;
  title: string;
  titleHi?: string;
  titlePa?: string;
  preview: string;
  body: string[];
  bodyHi?: string[];
  bodyPa?: string[];
  phal: string;
  phalHi?: string;
  phalPa?: string;
  durationMin: number;
  tags: string[];
  portrait?: string;
  relatedJapaMantra?: string;
};

const TRADITION_COLOR: Record<string, string> = TRADITION_ACCENT;

const TRADITION_LABEL: Record<string, string> = {
  hindu: 'Katha', sikh: 'Sakhi', buddhist: 'Dhamma Story', jain: 'Katha',
};

const LIKE_ACCENT = '#F47888';

const OCCASION_LABEL: Record<string, string> = {
  ekadashi: 'Ekadashi', purnima: 'Purnima', amavasya: 'Amavasya',
  pradosh: 'Pradosh', chaturthi: 'Chaturthi', shivaratri: 'Shivaratri',
  navratri: 'Navratri', diwali: 'Diwali', holi: 'Holi',
  janmashtami: 'Janmashtami', ramnavami: 'Ram Navami',
  'ganesh-chaturthi': 'Ganesh Chaturthi', 'karva-chauth': 'Karva Chauth',
  teej: 'Teej', gurpurab: 'Gurpurab', baisakhi: 'Baisakhi',
  vesak: 'Vesak', paryushana: 'Paryushana', general: 'General',
};

function bestView(k: FullKatha): string {
  if (k.tags.includes('panchatantra')) return 'panchatantra';
  if (k.tags.some((t) => ['warriors', 'saints', 'heroes', 'martyrdom', 'seva', 'sacrifice'].includes(t))) return 'heroes';
  if (k.tradition === 'sikh') return 'bani';
  if (k.tradition === 'buddhist') return 'dhamma';
  if (k.tradition === 'jain') return 'jain';
  return 'puranic';
}

type FontSize = 'sm' | 'md' | 'lg' | 'xl';
const FONT_PRESETS = [
  { label: 'A-', value: 'sm' },
  { label: 'A', value: 'md' },
  { label: 'A+', value: 'lg' },
  { label: 'A++', value: 'xl' },
];
const FONT_STYLES: Record<FontSize, { fontSize: number; lineHeight: number }> = {
  sm: { fontSize: 13, lineHeight: 22 },
  md: { fontSize: 15, lineHeight: 26 },
  lg: { fontSize: 18, lineHeight: 30 },
  xl: { fontSize: 22, lineHeight: 34 },
};

export default function KathaReaderScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [katha, setKatha] = useState<FullKatha | null>(null);
  const [showPhal, setShowPhal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [marking, setMarking] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi' | 'pa'>('en');
  const [fontStep, setFontStep] = useState(1); // 'md'
  const [ttsRate, setTtsRate] = useState(1);

  const load = useCallback(async () => {
    if (!id) { setLoadError(true); setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    try {
      const response = await apiFetch(`/api/bhakti/katha/${id}`);
      if (!response.ok) { setLoadError(true); return; }
      const json = await response.json();
      const loadedKatha = (json?.katha ?? null) as FullKatha | null;
      setKatha(loadedKatha);
      if (!loadedKatha) {
        setLoadError(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_language, meaning_language')
          .eq('id', user.id)
          .maybeSingle();
        const preferences = resolveReadablePreferences({
          appLanguage: profile?.app_language,
          meaningLanguage: profile?.meaning_language,
        });
        if (preferences.effectiveMeaningLanguage === 'hi' && loadedKatha.bodyHi?.length) {
          setLang('hi');
        } else if (preferences.effectiveMeaningLanguage === 'pa' && loadedKatha.bodyPa?.length) {
          setLang('pa');
        }
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const markDone = useCallback(async () => {
    setMarking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const today = spiritualDate(tz);
        await supabase.rpc('complete_katha', { p_user_id: user.id, p_date: today });
      }
    } catch {
      // non-fatal bonus tracking
    } finally {
      setMarking(false);
      if (router.canGoBack()) router.back();
      else router.push('/bhakti/katha' as Href);
    }
  }, [router]);

  const isPanchatantra = katha?.tags.includes('panchatantra');
  const isHero = katha?.tradition !== 'sikh' && katha?.tags.some((t) => ['warriors', 'saints', 'heroes', 'martyrdom', 'seva', 'sacrifice'].includes(t)) && !isPanchatantra;
  const accent = isPanchatantra ? KATHA_VIEW_ACCENT.panchatantra : isHero ? KATHA_VIEW_ACCENT.heroes : (TRADITION_COLOR[katha?.tradition ?? 'hindu'] ?? COLORS.brandGold);
  const badge = isPanchatantra ? 'Wisdom Tale' : isHero ? 'Hero Legend' : (TRADITION_LABEL[katha?.tradition ?? 'hindu'] ?? 'Katha');

  const hasHindi = Boolean(katha?.titleHi && katha?.bodyHi?.length && katha?.phalHi);
  const hasPunjabi = Boolean(katha?.titlePa && katha?.bodyPa?.length && katha?.phalPa);
  const titleToShow = lang === 'hi' && katha?.titleHi
    ? katha.titleHi
    : lang === 'pa' && katha?.titlePa
      ? katha.titlePa
      : katha?.title ?? '';
  const bodyToShow = lang === 'hi' && katha?.bodyHi?.length
    ? katha.bodyHi
    : lang === 'pa' && katha?.bodyPa?.length
      ? katha.bodyPa
      : katha?.body ?? [];
  const phalToShow = lang === 'hi' && katha?.phalHi
    ? katha.phalHi
    : lang === 'pa' && katha?.phalPa
      ? katha.phalPa
      : katha?.phal ?? '';
  const textToCopy = katha ? `${titleToShow}\n\n${bodyToShow.join('\n\n')}\n\nPhal:\n${phalToShow}` : '';
  const textToShare = katha ? `Read ${titleToShow} on the Shoonaya App.` : '';

  const capabilities = useMemo(() => buildReadableCapabilities({
    original: katha ? [katha.title, ...katha.body, katha.phal].join('\n\n') : '',
    meaning: hasHindi ? katha?.bodyHi?.join('\n\n') : undefined,
    language: 'en',
    script: 'latin',
    pipelineTags: {
      content_type: 'katha',
      response_mode: 'conversational',
      audio_mode: isPanchatantra ? 'story' : 'meditative',
      tradition: katha?.tradition === 'all' ? 'generic' : katha?.tradition as 'hindu' | 'buddhist' | 'jain' | 'sikh' | undefined,
      script: 'latin',
      delivery_intent: 'live_user',
    },
  }, {
    canToggleLocalLanguage: hasHindi || hasPunjabi,
    canShowExplain: false,
  }), [hasHindi, hasPunjabi, isPanchatantra, katha]);

  const { state, handlers } = useReaderControls(capabilities);

  const fontSizeToken = FONT_PRESETS[fontStep].value as FontSize;
  const fs = FONT_STYLES[fontSizeToken];

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (loadError || !katha) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>Could not load this story.</Text>
          <Button label="Retry" onPress={() => void load()} />
        </View>
      </Screen>
    );
  }

  return (
    <ReaderShell
      title={titleToShow}
      subtitle={badge}
      fallbackBackUrl="/bhakti/katha"
      themeColor={accent}
      ambientGlowColor={accent}
      fontPresets={FONT_PRESETS}
      fontStep={fontStep}
      setFontStep={setFontStep}
      languages={[
        { code: 'en' as const, label: 'EN' },
        ...(hasHindi ? [{ code: 'hi' as const, label: 'हिं' }] : []),
        ...(hasPunjabi ? [{ code: 'pa' as const, label: 'ਪੰ' }] : []),
      ]}
      currentLanguage={lang}
      setLanguage={setLang}
      onTTS={() => handlers.toggleTTS(textToCopy, {
        quality: 'pandit',
        language: lang === 'hi' ? 'hi-IN' : lang === 'pa' ? 'pa-IN' : 'en-IN',
        speed: isPanchatantra ? 0.86 : 0.78,
        rate: ttsRate,
        pipelineTags: {
          content_type: 'katha',
          audio_mode: isPanchatantra ? 'story' : 'meditative',
          delivery_intent: 'live_user',
        },
      })}
      ttsRate={ttsRate}
      onTTSRateChange={setTtsRate}
      isSpeaking={state.isSpeaking}
      isTTSGenerating={state.isGeneratingTTS}
      onCopy={() => handlers.copyText(textToCopy, 'Story')}
      isCopied={state.isCopied}
      onShare={() => handlers.share(textToShare)}
    >
      <View style={{ gap: 8, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ ...TYPE.micro, letterSpacing: 1.2, textTransform: 'uppercase', color: accent, borderWidth: 1, borderColor: `${accent}30`, backgroundColor: `${accent}10`, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
            {badge}
          </Text>
          <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
            {katha.durationMin} min · {OCCASION_LABEL[katha.occasion] ?? katha.occasion}
          </Text>
        </View>
        <Text style={{ ...TYPE.hero, fontSize: 28, color: theme.text }}>{titleToShow}</Text>
      </View>

      <View style={{ gap: 16 }}>
        {bodyToShow.map((para, idx) => (
          <Text key={idx} style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: fs.fontSize, lineHeight: fs.lineHeight, opacity: 0.9 }}>
            {para}
          </Text>
        ))}
      </View>

      {/* Phal / blessing */}
      <View style={{ marginTop: 24 }}>
        <PressableSurface haptic="selection" onPress={() => setShowPhal((s) => !s)} style={{ borderRadius: RADII.lg }}>
          <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: `${accent}28`, backgroundColor: `${accent}0c`, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${accent}18`, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="star" size={16} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.chip, letterSpacing: 1, textTransform: 'uppercase', color: accent }}>Fruit of the Katha</Text>
              <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>Tap to reveal the blessing</Text>
            </View>
            <Feather name={showPhal ? 'chevron-up' : 'chevron-down'} size={16} color={accent} />
          </View>
        </PressableSurface>

        {showPhal && (
          <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: `${accent}22`, backgroundColor: `${accent}08`, padding: 16, marginTop: 8 }}>
            <Text style={{ ...TYPE.cardHeading, fontSize: 15, color: accent, marginBottom: 8 }}>Phal Shruti</Text>
            <Text style={{ ...TYPE.body, color: theme.dim, lineHeight: 24 }}>{phalToShow}</Text>
          </View>
        )}
      </View>

      {/* Continue practice */}
      <View style={{ gap: 10, marginTop: 24 }}>
        <Text style={{ ...TYPE.chip, letterSpacing: 1, textTransform: 'uppercase', color: theme.dim }}>Continue Practice</Text>

        {katha.relatedJapaMantra ? (
          <PressableSurface haptic="selection" onPress={() => router.push('/japa' as Href)} style={{ borderRadius: RADII.lg }}>
            <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${accent}12`, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="circle" size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.body, color: theme.text, fontWeight: '600' }}>Start Japa</Text>
                <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 1 }}>{katha.relatedJapaMantra}</Text>
              </View>
              <Feather name="external-link" size={13} color={accent} />
            </View>
          </PressableSurface>
        ) : null}

        <PressableSurface haptic="selection" onPress={() => router.push(`/bhakti/katha?view=${bestView(katha)}` as Href)} style={{ borderRadius: RADII.lg }}>
          <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="book-open" size={18} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.body, color: theme.text, fontWeight: '600' }}>More Stories</Text>
              <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 1 }}>Explore the sacred library</Text>
            </View>
            <Feather name="external-link" size={13} color={accent} />
          </View>
        </PressableSurface>
      </View>

      {/* Like & Done */}
      <View style={{ alignItems: 'center', marginTop: 32, gap: 16 }}>
        <PressableSurface haptic="selection" onPress={() => setLiked((l) => !l)} style={{ borderRadius: 999 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: liked ? `${LIKE_ACCENT}50` : theme.border,
              backgroundColor: liked ? `${LIKE_ACCENT}18` : theme.card,
            }}
          >
            <Feather name="heart" size={14} color={liked ? LIKE_ACCENT : theme.dim} />
            <Text style={{ ...TYPE.caption, color: liked ? LIKE_ACCENT : theme.dim, fontWeight: '600' }}>
              {liked ? 'Jai Shri Hari' : 'Appreciate this Katha'}
            </Text>
          </View>
        </PressableSurface>

        <Button style={{ minWidth: 200 }} label={marking ? 'Marking…' : 'Done'} onPress={() => void markDone()} disabled={marking} />
      </View>
    </ReaderShell>
  );
}
