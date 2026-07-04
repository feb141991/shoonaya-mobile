import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

type AppLanguage = 'en' | 'hi' | 'pa';
type ThemePref = 'light' | 'dark' | 'system';

type SettingsState = {
  wants_festival_reminders: boolean;
  wants_shloka_reminders: boolean;
  wants_nitya_reminders: boolean;
  wants_community_notifications: boolean;
  wants_family_notifications: boolean;
  app_language: AppLanguage;
  transliteration_language: AppLanguage;
  meaning_language: AppLanguage;
  consent_religious_data: boolean;
};

const SETTINGS_STORAGE_KEY = 'shoonaya_mobile_settings';
const THEME_STORAGE_KEY = 'sangam_theme_preference';

const INITIAL_SETTINGS: SettingsState = {
  wants_festival_reminders: true,
  wants_shloka_reminders: true,
  wants_nitya_reminders: true,
  wants_community_notifications: true,
  wants_family_notifications: true,
  app_language: 'en',
  transliteration_language: 'en',
  meaning_language: 'en',
  consent_religious_data: true,
};

function toSettingsState(value: Partial<SettingsState> | null | undefined): SettingsState {
  return {
    wants_festival_reminders: value?.wants_festival_reminders ?? INITIAL_SETTINGS.wants_festival_reminders,
    wants_shloka_reminders: value?.wants_shloka_reminders ?? INITIAL_SETTINGS.wants_shloka_reminders,
    wants_nitya_reminders: value?.wants_nitya_reminders ?? INITIAL_SETTINGS.wants_nitya_reminders,
    wants_community_notifications: value?.wants_community_notifications ?? INITIAL_SETTINGS.wants_community_notifications,
    wants_family_notifications: value?.wants_family_notifications ?? INITIAL_SETTINGS.wants_family_notifications,
    app_language: value?.app_language ?? INITIAL_SETTINGS.app_language,
    transliteration_language: value?.transliteration_language ?? INITIAL_SETTINGS.transliteration_language,
    meaning_language: value?.meaning_language ?? INITIAL_SETTINGS.meaning_language,
    consent_religious_data: value?.consent_religious_data ?? INITIAL_SETTINGS.consent_religious_data,
  };
}

export default function SettingsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(INITIAL_SETTINGS);
  const [themePref, setThemePref] = useState<ThemePref>('system');

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
    }),
    [isDark]
  );

  const loadSettings = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const [profileRes, localSettings, localTheme] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'wants_festival_reminders, wants_shloka_reminders, wants_nitya_reminders, wants_community_notifications, wants_family_notifications, app_language, transliteration_language, meaning_language, consent_religious_data'
        )
        .eq('id', user.id)
        .single(),
      AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
      AsyncStorage.getItem(THEME_STORAGE_KEY),
    ]);

    const remote = toSettingsState(profileRes.data ?? INITIAL_SETTINGS);
    const local = localSettings ? toSettingsState(JSON.parse(localSettings) as Partial<SettingsState>) : {};
    const merged = toSettingsState({ ...remote, ...local });

    setSettings(merged);
    if (localTheme === 'light' || localTheme === 'dark' || localTheme === 'system') {
      setThemePref(localTheme);
    }
  }, [router]);

  useEffect(() => {
    loadSettings()
      .catch(() => {
        Alert.alert('Could not load settings');
      })
      .finally(() => setLoading(false));
  }, [loadSettings]);

  const persistSettings = async (nextState: SettingsState) => {
    setSettings(nextState);
    setSaving(true);
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextState));
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const profileUpdate = toSettingsState(nextState);
      const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
      if (error) throw error;
    } catch {
      Alert.alert('Could not save settings');
      await loadSettings();
    } finally {
      setSaving(false);
    }
  };

  const persistTheme = async (nextTheme: ThemePref) => {
    setThemePref(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const handleDelete = () => {
    Alert.alert('Delete account', 'This permanently deletes your account and data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Final confirmation', 'Type-level double confirmation is not available here. Continue with permanent deletion?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete permanently',
              style: 'destructive',
              onPress: async () => {
                try {
                  const response = await apiFetch('/api/user/delete', { method: 'POST' });
                  if (!response.ok) throw new Error('delete failed');
                  await supabase.auth.signOut();
                } catch {
                  Alert.alert('Could not delete account');
                }
              },
            },
          ]);
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Settings</Text>
        {saving ? <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>Saving...</Text> : null}

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>Notifications</Text>
          {[
            ['Festival reminders', 'wants_festival_reminders'],
            ['Daily wisdom reminders', 'wants_shloka_reminders'],
            ['Nitya reminders', 'wants_nitya_reminders'],
            ['Community notifications', 'wants_community_notifications'],
            ['Family notifications', 'wants_family_notifications'],
          ].map(([label, key]) => (
            <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 14 }}>{label}</Text>
              <Switch
                value={settings[key as keyof SettingsState] as boolean}
                onValueChange={(value) => {
                  void persistSettings({ ...settings, [key]: value } as SettingsState);
                }}
                trackColor={{ true: COLORS.brandGold }}
              />
            </View>
          ))}
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>Language</Text>
          {[
            ['App language', 'app_language'],
            ['Meaning language', 'meaning_language'],
            ['Transliteration', 'transliteration_language'],
          ].map(([label, key]) => (
            <View key={key} style={{ gap: 10 }}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>{label}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['en', 'hi', 'pa'] as AppLanguage[]).map((language) => {
                  const active = settings[key as keyof SettingsState] === language;
                  return (
                    <Pressable
                      key={language}
                      onPress={() => {
                        void persistSettings({ ...settings, [key]: language } as SettingsState);
                      }}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: active ? COLORS.brandGold : theme.border,
                        backgroundColor: active ? COLORS.brandGold : theme.bg,
                        paddingVertical: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                        {language.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>Appearance</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['light', 'dark', 'system'] as ThemePref[]).map((pref) => {
              const active = themePref === pref;
              return (
                <Pressable
                  key={pref}
                  onPress={() => {
                    void persistTheme(pref);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: active ? COLORS.brandGold : theme.border,
                    backgroundColor: active ? COLORS.brandGold : theme.bg,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                    {pref.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>Privacy</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 14 }}>
                Allow tradition-aware personalization
              </Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 4 }}>
                Uses your spiritual preference data to tailor recommendations.
              </Text>
            </View>
            <Switch
              value={settings.consent_religious_data}
              onValueChange={(value) => {
                void persistSettings({ ...settings, consent_religious_data: value });
              }}
              trackColor={{ true: COLORS.brandGold }}
            />
          </View>
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 12 }}>
          <Pressable
            onPress={handleDelete}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Delete account</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void handleSignOut();
            }}
            disabled={signingOut}
            style={{
              borderRadius: 16,
              backgroundColor: COLORS.brandGold,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: signingOut ? 0.7 : 1,
            }}
          >
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
              {signingOut ? 'Signing out...' : 'Sign out'}
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}
