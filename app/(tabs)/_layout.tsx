import { Tabs } from 'expo-router';
import { Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { SacredIcon } from '@/components/ui/SacredIcon';
import { COLORS, SHADOWS, themeColor } from '@/lib/constants';

// 5-tab bar matching PWA's BottomNav.tsx member layout: Home / Japa /
// Bhakti (center, elevated) / Pathshala / Mandali — Profile is not a tab
// there either (reached via the avatar on Home, same as native's existing
// `navigate('/(tabs)/profile')` from the hero header). app/japa.tsx has
// moved in as app/(tabs)/japa.tsx (it previously lived outside the (tabs)
// route group entirely, which meant it silently had no tab-bar entry
// despite this file's own comment claiming 5-tab parity). Its Tabs.Screen
// below is registered normally so it stays inside the tab navigator's
// swipe/back-stack model and keeps a title for accessibility/headers.
//
// The built-in tab bar is hidden (tabBarStyle: {display:'none'}). The custom
// floating bottom nav is rendered once from app/_layout.tsx so it is available
// on tab screens and standalone feature screens such as Shloka, Quiz, Vrat,
// Sankalpa and settings.
export default function TabsLayout() {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const tabBorder = theme.premiumBorder;
  const inactiveColor = theme.dim;
  const brand = theme.brand;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: brand,
          tabBarInactiveTintColor: inactiveColor,
          // Built-in bar hidden — the app-level CollapsibleBottomNav replaces
          // it so standalone feature screens can keep the same nav affordance.
          tabBarStyle: { display: 'none' },
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
          name="japa"
          options={{
            title: 'Japa',
            tabBarIcon: ({ color, size }) => <SacredIcon name="japa" fallbackGlyph="heart" color={color} size={size} />,
          }}
        />

        <Tabs.Screen
          name="bhakti"
          options={{
            title: 'Bhakti',
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
                <SacredIcon name="bhakti" fallbackGlyph="sun" size={22} color={focused ? COLORS.ink : brand} />
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
            tabBarIcon: ({ color, size }) => <SacredIcon name="pathshala" fallbackGlyph="book-open" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="mandali"
          options={{
            title: 'Mandali',
            tabBarIcon: ({ color, size }) => <SacredIcon name="mandali" fallbackGlyph="users" color={color} size={size} />,
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
    </View>
  );
}
