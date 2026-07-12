import { Tabs } from 'expo-router';
import { Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { CollapsibleBottomNav } from '@/components/ui/CollapsibleBottomNav';
import { SacredIcon } from '@/components/ui/SacredIcon';
import { COLORS, FONTS, SHADOWS, themeColor } from '@/lib/constants';

// 5-tab bar matching PWA's BottomNav.tsx member layout: Home / Japa /
// Bhakti (center, elevated) / Pathshala / Mandali — Profile is not a tab
// there either (reached via the avatar on Home, same as native's existing
// `navigate('/(tabs)/profile')` from the hero header). app/japa.tsx has
// moved in as app/(tabs)/japa.tsx (it previously lived outside the (tabs)
// route group entirely, which meant it silently had no tab-bar entry
// despite this file's own comment claiming 5-tab parity). Its Tabs.Screen
// below is registered with href:null — real navigation to it goes through
// CollapsibleBottomNav, not the built-in bar (see next paragraph) — but the
// entry keeps the route inside the tab navigator's swipe/back-stack model
// and gives it a title for accessibility/headers.
//
// The built-in tab bar is hidden (tabBarStyle: {display:'none'}) and
// replaced by <CollapsibleBottomNav/>, a custom-rendered floating pill that
// collapses to a small circular icon on scroll-down / off the Home route,
// matching PWA's BottomNav.tsx. Expo Router 56's public <Tabs> doesn't
// expose a `tabBar` or `layout` render prop to wrap the built-in bar in an
// Animated.View (both are stripped from what TabsClient forwards to the
// underlying navigator), so rendering our own bar as an absolutely
// positioned sibling — driven by useRouter()/usePathname() instead of the
// navigator's own tab state — is the supported way to get custom animated
// tab-bar behavior here.
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
          // Built-in bar hidden — CollapsibleBottomNav (rendered below,
          // absolutely positioned) replaces it entirely.
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
      <CollapsibleBottomNav />
    </View>
  );
}
