import { useMemo } from 'react';
import { ScrollView, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';

type SettingsDestination = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  summary: string;
  href: Href;
};

const DESTINATIONS: SettingsDestination[] = [
  { icon: 'user', title: 'Account & Profile', summary: 'Name, birth details, location and account access.', href: '/settings/account' },
  { icon: 'sliders', title: 'Personalisation', summary: 'Tradition, calendar, practice goals and spiritual details.', href: '/settings/personalisation' },
  { icon: 'bell', title: 'Notifications', summary: 'Reminder choices and device permission.', href: '/settings/notifications' },
  { icon: 'type', title: 'Language & Appearance', summary: 'App language, translations and light or dark appearance.', href: '/settings/appearance' },
  { icon: 'shield', title: 'Privacy & Data', summary: 'Personalisation consent, data export and account deletion.', href: '/settings/privacy' },
  { icon: 'heart', title: 'About Shoonaya', summary: 'Support, social channels, terms, privacy and sources.', href: '/settings/about' },
];

function SettingsRow({ item, theme }: { item: SettingsDestination; theme: ReturnType<typeof themeColor> }) {
  const router = useRouter();
  return (
    <PressableSurface
      haptic="selection"
      accessibilityLabel={`${item.title}. ${item.summary}`}
      accessibilityHint="Opens this settings section"
      onPress={() => router.push(item.href)}
      style={{ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14 }}
    >
      <View style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: 16, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={item.icon} size={20} color={theme.brand} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ ...TYPE.label, color: theme.text }}>{item.title}</Text>
        <Text style={{ ...TYPE.caption, color: theme.dim }}>{item.summary}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={theme.dim} />
    </PressableSurface>
  );
}

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 20 }} showsVerticalScrollIndicator={false}>
        <BackButton fallbackHref="/(tabs)/profile" />
        <View style={{ gap: 4 }}>
          <Text style={{ ...TYPE.screenTitle, color: theme.text }}>Settings</Text>
          <Text style={{ ...TYPE.body, color: theme.dim }}>Choose what you would like to manage.</Text>
        </View>
        <View style={{ gap: 12 }}>
          <SectionHeader label="Your Shoonaya" />
          <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 4 }}>
            {DESTINATIONS.map((item, index) => (
              <View key={item.title}>
                {index > 0 ? <View style={{ height: 1, backgroundColor: theme.borderSoft }} /> : null}
                <SettingsRow item={item} theme={theme} />
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
