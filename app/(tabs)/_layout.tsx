import { Tabs } from 'expo-router';
import { Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { COLORS, FONTS, SHADOWS, themeColor } from '@/lib/constants';

// 5-tab bar matching PWA's BottomNav.tsx member layout: Home / Japa /
// Bhakti (center, elevated) / Pathshala / Mandali — Profile is not a tab
// there either (reached via the avatar on Home, same as native's existing
// `navigate('/(tabs)/profile')` from the hero header). Previously native
// had 4 tabs (Home/Pathshala/Bhakti/Profile) where "Bhakti" actually
// rendered the Japa/mala-counter screen — that screen is now correctly
// named app/(tabs)/japa.tsx, and a real (deliberately minimal)
// app/(tabs)/bhakti.tsx hub takes the elevated center slot instead.
// app/(tabs)/mandali.tsx moved in from app/mandali.tsx — Expo Router
// strips route-group folder names from the URL, so `/mandali` still
// resolves exactly as it did before (confirmed against this file's own
// pathshala/bhakti/profile/tirtha entries, which already show the same
// `{'/(tabs)'}/x` | `/x` dual-path pattern). Profile stays a real,
// reachable route (href: null keeps it out of the tab bar without removing
// it), same treatment tirtha.tsx already had.
export default function TabsLayout() {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const tabBg = theme.glass;
  const tabBorder = theme.premiumBorder;
  const tabShadow = isDark ? SHADOWS.tabBar.dark : SHADOWS.tabBar.light;
  const inactiveColor = theme.dim;
  const brand = theme.brand;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopWidth: 1,
          borderTopColor: tabBorder,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          boxShadow: tabShadow,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="bhakti"
        options={{
          title: 'Bhakti',
          // Elevated center pill, matching PWA's NavTab isCenter treatment
          // (BottomNav.tsx: a raised gold circle sitting above the bar's own
          // line, `marginTop: -22px` there). Expo Router's tab bar doesn't
          // support a taller custom center button without replacing
          // tabBarButton entirely, so this approximates the same visual —
          // a raised gold circle — within the standard icon slot instead.
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                marginTop: -20,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? brand : theme.card,
                borderWidth: focused ? 0 : 1,
                borderColor: tabBorder,
                boxShadow: focused
                  ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light)
                  : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light),
              }}
            >
              <Feather name="sun" size={22} color={focused ? COLORS.ink : brand} />
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 11, fontWeight: '600', marginTop: -6, color: focused ? brand : inactiveColor }}>
              Bhakti
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="pathshala"
        options={{
          title: 'Pathshala',
          tabBarIcon: ({ color, size }) => <Feather name="book-open" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mandali"
        options={{
          title: 'Mandali',
          tabBarIcon: ({ color, size }) => <Feather name="users" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="tirtha"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
