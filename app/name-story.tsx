import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, RADII, SPACING, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAppIdentity } from '@/lib/appIdentity';

const STORAGE_KEY = 'shoonaya:last_name_story';

export type NameStoryData = {
  id?: string;
  name_input: string;
  display_name?: string;
  name_native_script?: string;
  tradition?: string;
  language?: string;
  sacred_meaning: string;
  scripture_connection?: string | null;
  inner_quality?: string | null;
  deity_connection?: string | null;
  name_mantra?: string | null;
  practice_suggestion?: string | null;
  name_story?: string | null;
  etymology?: string | null;
  root_syllable?: string | null;
  numerology_number?: number | null;
  scripture_original?: string | null;
  scripture_translation?: string | null;
  scripture_source?: string | null;
  share_slug?: string | null;
  created_at?: string;
};

const TRADITION_OPTIONS: Array<{ key: string; label: string; emoji: string }> = [
  { key: 'hindu', label: 'Sanatan / Hindu', emoji: '🕉️' },
  { key: 'sikh', label: 'Sikh', emoji: '☬' },
  { key: 'buddhist', label: 'Buddhist', emoji: '☸️' },
  { key: 'jain', label: 'Jain', emoji: '🤲' },
  { key: 'none', label: 'Universal / Exploring', emoji: '✨' },
];

export default function NameStoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; tradition?: string }>();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);
  const appIdentity = useAppIdentity();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [story, setStory] = useState<NameStoryData | null>(null);
  const [copiedMantra, setCopiedMantra] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [sharingText, setSharingText] = useState(false);

  // Form states for creating or re-analyzing
  const [showForm, setShowForm] = useState(false);
  const [inputName, setInputName] = useState(params.name || '');
  const [selectedTradition, setSelectedTradition] = useState<string>(params.tradition || 'hindu');
  const [formError, setFormError] = useState<string | null>(null);

  const shareCardRef = useRef<View | null>(null);

  // Load existing story on mount
  useEffect(() => {
    let active = true;

    async function loadStory() {
      try {
        // 1. Try local cache first for instant rendering
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached && active) {
          try {
            const parsed = JSON.parse(cached) as NameStoryData;
            if (parsed && parsed.sacred_meaning) {
              setStory(parsed);
              setInputName(parsed.name_input || parsed.display_name || '');
              if (parsed.tradition) setSelectedTradition(parsed.tradition);
            }
          } catch {}
        }

        // 2. If user is logged in, query remote Supabase
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id && active) {
          const { data, error } = await supabase
            .from('name_stories')
            .select('*')
            .eq('user_id', authData.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && data && active) {
            setStory(data as NameStoryData);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn('[NameStory] Failed to load story', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStory();
    return () => {
      active = false;
    };
  }, []);

  const handleGenerate = async () => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      setFormError('Please enter a name to explore its sacred meaning.');
      return;
    }

    setFormError(null);
    setGenerating(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      const response = await apiFetch('/api/name-story/generate', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmed,
          tradition: selectedTradition,
          translationLanguage: 'en',
          intent: [
            'sacred_meaning',
            'scripture_connection',
            'inner_quality',
            'name_mantra',
            'name_story',
            'etymology',
            'practice_suggestion',
          ],
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || 'Could not generate Dharmic Name Story. Please try again.');
      }

      const generatedStory = (body?.data || null) as NameStoryData | null;
      if (!generatedStory) {
        throw new Error('No story data returned.');
      }

      setStory(generatedStory);
      setShowForm(false);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(generatedStory));

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (err: any) {
      setFormError(err?.message || 'Unable to connect to sacred knowledge service.');
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyMantra = async () => {
    if (!story?.name_mantra) return;
    try {
      await Haptics.selectionAsync();
      await Clipboard.setStringAsync(story.name_mantra);
      setCopiedMantra(true);
      setTimeout(() => setCopiedMantra(false), 2000);
    } catch {}
  };

  const handleShareImage = async () => {
    if (!story || sharingImage) return;
    setSharingImage(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await shareCapturedShoonayaCard(shareCardRef, {
        fileName: `${(story.display_name || story.name_input || 'name').toLowerCase()}-dharmic-story.png`,
        dialogTitle: `Share ${story.display_name || story.name_input}'s Dharmic Name Story`,
      });
    } catch (err) {
      console.warn('[NameStory] Image share error', err);
    } finally {
      setSharingImage(false);
    }
  };

  const handleShareText = async () => {
    if (!story || sharingText) return;
    setSharingText(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const name = story.display_name || story.name_input;
      const shareUrl = story.share_slug
        ? `https://www.shoonaya.com/name/${story.share_slug}`
        : 'https://www.shoonaya.com';

      const lines = [
        `✨ Sacred Meaning of ${name}`,
        story.sacred_meaning ? `"${story.sacred_meaning}"` : null,
        story.name_mantra ? `\n🪔 Name Mantra:\n${story.name_mantra}` : null,
        story.scripture_source ? `\n📖 Scripture Connection (${story.scripture_source}):\n${story.scripture_translation || story.scripture_original}` : null,
        story.name_story ? `\n🧘 Reflection:\n${story.name_story}` : null,
        `\nDiscover your Dharmic Name Story on Shoonaya:\n${shareUrl}`,
      ].filter(Boolean);

      await Share.share({
        title: `${name} — Dharmic Name Story`,
        message: lines.join('\n'),
      });
    } catch (err) {
      console.warn('[NameStory] Text share error', err);
    } finally {
      setSharingText(false);
    }
  };

  const displayName = story?.display_name || story?.name_input || '';
  const nativeScript = story?.name_native_script;
  const traditionMeta = useMemo(() => {
    return TRADITION_OPTIONS.find((t) => t.key === (story?.tradition || 'hindu')) || TRADITION_OPTIONS[0];
  }, [story?.tradition]);

  return (
    <Screen entrance="fade-up" style={{ backgroundColor: theme.bg }}>
      {/* Top Navigation Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.md,
          paddingVertical: 12,
        }}
      >
        <BackButton fallbackHref="/(tabs)/profile" variant="glass" style={{ marginHorizontal: 0, marginBottom: 0 }} />

        <Text
          style={{
            fontFamily: FONTS.serifBold,
            fontSize: 18,
            color: theme.text,
            letterSpacing: 0.3,
          }}
        >
          Dharmic Name Story
        </Text>

        {story && !showForm ? (
          <PressableSurface
            haptic="selection"
            accessibilityLabel="Share Dharmic Name Story"
            onPress={() => { void handleShareText(); }}
            style={{
              width: 44,
              height: 44,
              borderRadius: RADII.pill,
              backgroundColor: theme.glass,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="share-2" size={19} color={theme.text} />
          </PressableSurface>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SacredLoader
            title="Invoking Sacred Meaning"
            subtitle="Unveiling scriptural roots and custom mantra..."
            icon="pathshala"
          />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: SPACING.lg,
              paddingBottom: 60,
              gap: 20,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {story && !showForm ? (
              <>
                {/* Hero Card */}
                <Card
                  elevated
                  tone="auto"
                  style={{
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                    padding: 24,
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  {/* Tradition Badge */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: RADII.pill,
                      backgroundColor: theme.brandSoft,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{traditionMeta.emoji}</Text>
                    <Text
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 11,
                        color: theme.brand,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      {traditionMeta.label}
                    </Text>
                  </View>

                  {/* Name Header */}
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text
                      style={{
                        fontFamily: FONTS.serifBold,
                        fontSize: 34,
                        lineHeight: 40,
                        color: theme.text,
                        textAlign: 'center',
                      }}
                    >
                      {displayName}
                    </Text>
                    {nativeScript ? (
                      <Text
                        style={{
                          fontFamily: FONTS.devanagariBold,
                          fontSize: 22,
                          lineHeight: 28,
                          color: theme.brand,
                          textAlign: 'center',
                        }}
                      >
                        {nativeScript}
                      </Text>
                    ) : null}
                  </View>

                  {/* Sacred Meaning */}
                  <View
                    style={{
                      width: '100%',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: RADII.lg,
                      backgroundColor: theme.glass,
                      borderLeftWidth: 3,
                      borderLeftColor: theme.brand,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.serif,
                        fontSize: 18,
                        lineHeight: 26,
                        color: theme.text,
                        fontStyle: 'italic',
                        textAlign: 'center',
                      }}
                    >
                      "{story.sacred_meaning}"
                    </Text>
                  </View>

                  {/* Inner Qualities Chip Group */}
                  {story.inner_quality ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                      {story.inner_quality.split(',').map((q, idx) => (
                        <View
                          key={idx}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: RADII.pill,
                            backgroundColor: theme.brandSoft,
                          }}
                        >
                          <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: theme.brand }}>
                            ✨ {q.trim()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>

                {/* Name Mantra Card */}
                {story.name_mantra ? (
                  <Card
                    tone="auto"
                    style={{
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                      padding: 20,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="sun" size={17} color={theme.brand} />
                        <Text
                          style={{
                            fontFamily: FONTS.sansSemiBold,
                            fontSize: 12,
                            color: theme.brand,
                            textTransform: 'uppercase',
                            letterSpacing: 1.2,
                          }}
                        >
                          Sacred Name Mantra
                        </Text>
                      </View>

                      <PressableSurface
                        haptic="selection"
                        accessibilityLabel="Copy Mantra"
                        onPress={() => { void handleCopyMantra(); }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: RADII.pill,
                          backgroundColor: theme.brandSoft,
                        }}
                      >
                        <Feather name={copiedMantra ? 'check' : 'copy'} size={13} color={theme.brand} />
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand }}>
                          {copiedMantra ? 'Copied' : 'Copy'}
                        </Text>
                      </PressableSurface>
                    </View>

                    <View
                      style={{
                        padding: 16,
                        borderRadius: RADII.lg,
                        backgroundColor: theme.glass,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONTS.devanagariBold,
                          fontSize: 22,
                          lineHeight: 32,
                          color: theme.text,
                          textAlign: 'center',
                        }}
                      >
                        {story.name_mantra}
                      </Text>
                    </View>

                    <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim, lineHeight: 19 }}>
                      Chanting this custom root mantra aligns your breath with the spiritual vibrations encoded within your name.
                    </Text>
                  </Card>
                ) : null}

                {/* Scripture Connection */}
                {story.scripture_connection || story.scripture_original ? (
                  <Card
                    tone="auto"
                    style={{
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                      padding: 20,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="book" size={17} color={theme.brand} />
                      <Text
                        style={{
                          fontFamily: FONTS.sansSemiBold,
                          fontSize: 12,
                          color: theme.brand,
                          textTransform: 'uppercase',
                          letterSpacing: 1.2,
                        }}
                      >
                        Scripture Connection
                      </Text>
                    </View>

                    {story.scripture_source ? (
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                        Source: {story.scripture_source}
                      </Text>
                    ) : null}

                    {story.scripture_original ? (
                      <View
                        style={{
                          padding: 14,
                          borderRadius: RADII.md,
                          backgroundColor: theme.glass,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.devanagariBold,
                            fontSize: 17,
                            lineHeight: 26,
                            color: theme.text,
                            textAlign: 'center',
                          }}
                        >
                          {story.scripture_original}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: theme.text, lineHeight: 22 }}>
                      {story.scripture_translation || story.scripture_connection}
                    </Text>
                  </Card>
                ) : null}

                {/* Spiritual Story & Reflection */}
                {story.name_story ? (
                  <Card
                    tone="auto"
                    style={{
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                      padding: 20,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="feather" size={17} color={theme.brand} />
                      <Text
                        style={{
                          fontFamily: FONTS.sansSemiBold,
                          fontSize: 12,
                          color: theme.brand,
                          textTransform: 'uppercase',
                          letterSpacing: 1.2,
                        }}
                      >
                        Spiritual Story & Reflection
                      </Text>
                    </View>

                    <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: theme.text, lineHeight: 23 }}>
                      {story.name_story}
                    </Text>
                  </Card>
                ) : null}

                {/* Practice Suggestion */}
                {story.practice_suggestion ? (
                  <Card
                    tone="auto"
                    style={{
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                      padding: 20,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="compass" size={17} color={theme.brand} />
                      <Text
                        style={{
                          fontFamily: FONTS.sansSemiBold,
                          fontSize: 12,
                          color: theme.brand,
                          textTransform: 'uppercase',
                          letterSpacing: 1.2,
                        }}
                      >
                        Daily Sadhana Suggestion
                      </Text>
                    </View>

                    <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: theme.dim, lineHeight: 21 }}>
                      {story.practice_suggestion}
                    </Text>
                  </Card>
                ) : null}

                {/* Share & Explore Actions */}
                <View style={{ gap: 12, marginTop: 8 }}>
                  <PressableSurface
                    haptic="selection"
                    accessibilityLabel="Share Story Card Image"
                    onPress={() => { void handleShareImage(); }}
                    disabled={sharingImage}
                    style={{
                      minHeight: 52,
                      borderRadius: RADII.pill,
                      backgroundColor: theme.brand,
                      paddingHorizontal: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    {sharingImage ? (
                      <ActivityIndicator size="small" color={isDark ? COLORS.darkBg : COLORS.ink} />
                    ) : (
                      <>
                        <Feather name="image" size={18} color={isDark ? COLORS.darkBg : COLORS.ink} />
                        <Text
                          style={{
                            fontFamily: FONTS.sansSemiBold,
                            fontSize: 15,
                            color: isDark ? COLORS.darkBg : COLORS.ink,
                          }}
                        >
                          Share Story Card Image
                        </Text>
                      </>
                    )}
                  </PressableSurface>

                  <PressableSurface
                    haptic="selection"
                    accessibilityLabel="Share Story Link"
                    onPress={() => { void handleShareText(); }}
                    disabled={sharingText}
                    style={{
                      minHeight: 50,
                      borderRadius: RADII.pill,
                      backgroundColor: theme.glass,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                      paddingHorizontal: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    <Feather name="share-2" size={17} color={theme.text} />
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.text }}>
                      Share as Text / Link
                    </Text>
                  </PressableSurface>

                  <PressableSurface
                    haptic="selection"
                    accessibilityLabel="Analyze Another Name"
                    onPress={() => {
                      setShowForm(true);
                      setInputName('');
                    }}
                    style={{
                      minHeight: 46,
                      borderRadius: RADII.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 20,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: theme.dim }}>
                      Analyze Another Name
                    </Text>
                  </PressableSurface>
                </View>
              </>
            ) : (
              /* Name Story Generator Form */
              <Card
                elevated
                tone="auto"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  padding: 24,
                  gap: 20,
                  marginTop: 8,
                }}
              >
                <View style={{ gap: 6, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: theme.brandSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Feather name="book-open" size={26} color={theme.brand} />
                  </View>
                  <Text
                    style={{
                      fontFamily: FONTS.serifBold,
                      fontSize: 24,
                      color: theme.text,
                      textAlign: 'center',
                    }}
                  >
                    Discover Your Name's Dharmic Meaning
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: 14,
                      color: theme.dim,
                      textAlign: 'center',
                      lineHeight: 20,
                    }}
                  >
                    Explore etymology, scriptural roots, inner qualities, and a custom chanting mantra.
                  </Text>
                </View>

                {/* Input Field */}
                <View style={{ gap: 8 }}>
                  <Text style={{ ...TYPE.label, color: theme.text }}>Name</Text>
                  <TextInput
                    value={inputName}
                    onChangeText={setInputName}
                    placeholder="Enter first or full name..."
                    placeholderTextColor={theme.dim}
                    autoCapitalize="words"
                    autoCorrect={false}
                    style={{
                      minHeight: 52,
                      borderRadius: RADII.md,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                      backgroundColor: theme.glass,
                      paddingHorizontal: 16,
                      fontFamily: FONTS.sansMedium,
                      fontSize: 16,
                      color: theme.text,
                    }}
                  />
                </View>

                {/* Tradition Selector */}
                <View style={{ gap: 10 }}>
                  <Text style={{ ...TYPE.label, color: theme.text }}>Tradition Lens</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {TRADITION_OPTIONS.map((t) => {
                      const selected = selectedTradition === t.key;
                      return (
                        <PressableSurface
                          key={t.key}
                          haptic="selection"
                          accessibilityLabel={t.label}
                          onPress={() => setSelectedTradition(t.key)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: RADII.pill,
                            backgroundColor: selected ? theme.brand : theme.glass,
                            borderWidth: 1,
                            borderColor: selected ? theme.brand : theme.borderSoft,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
                          <Text
                            style={{
                              fontFamily: FONTS.sansSemiBold,
                              fontSize: 13,
                              color: selected
                                ? isDark
                                  ? COLORS.darkBg
                                  : COLORS.ink
                                : theme.text,
                            }}
                          >
                            {t.label}
                          </Text>
                        </PressableSurface>
                      );
                    })}
                  </View>
                </View>

                {formError ? (
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: theme.accent }}>
                    {formError}
                  </Text>
                ) : null}

                {/* Submit Button */}
                <PressableSurface
                  haptic="selection"
                  accessibilityLabel="Unveil Dharmic Meaning"
                  onPress={() => { void handleGenerate(); }}
                  disabled={generating}
                  style={{
                    minHeight: 54,
                    borderRadius: RADII.pill,
                    backgroundColor: theme.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color={isDark ? COLORS.darkBg : COLORS.ink} />
                  ) : (
                    <>
                      <Feather name="compass" size={19} color={isDark ? COLORS.darkBg : COLORS.ink} />
                      <Text
                        style={{
                          fontFamily: FONTS.sansSemiBold,
                          fontSize: 16,
                          color: isDark ? COLORS.darkBg : COLORS.ink,
                        }}
                      >
                        Unveil Dharmic Meaning
                      </Text>
                    </>
                  )}
                </PressableSurface>

                {story ? (
                  <PressableSurface
                    haptic="selection"
                    accessibilityLabel="Cancel"
                    onPress={() => setShowForm(false)}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: theme.dim }}>
                      Back to Saved Story
                    </Text>
                  </PressableSurface>
                ) : null}
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Hidden view for capturing high-res ShoonayaShareCard */}
      {story ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -10000,
            top: 0,
            width: 360,
            height: 640,
          }}
        >
          <View collapsable={false}>
            <ShoonayaShareCard
              ref={shareCardRef}
              data={{
                tradition: story.tradition || 'universal',
                layout: 'sacredText',
                title: `${displayName}'s Sacred Meaning`,
                headlineValue: story.sacred_meaning,
                subtitle: story.name_mantra || undefined,
                source: story.scripture_source || 'Dharmic Wisdom',
                caption: story.scripture_translation || story.name_story || undefined,
                userName: displayName,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                footer: 'Shoonaya Dharmic Name Story',
              }}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
