import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS } from '@/lib/constants';

// Styling only — tab structure/routes below are unchanged. Previously the
// tab bar was hardcoded to the light palette regardless of device theme
// (unlike most screens, which each hand-roll their own isDark check); this
// adds that awareness plus a soft upward shadow for "warm layering" depth
// instead of a flat border line.
export default function TabsLayout() {
  const isDark = useColorScheme() === 'dark';
  const tabBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const tabBorder = isDark ? COLORS.borderDark : COLORS.borderLight;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brandGold,
        tabBarInactiveTintColor: isDark ? COLORS.textDimDark : COLORS.textDimLight,
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopWidth: 1,
          borderTopColor: tabBorder,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          shadowColor: COLORS.borderDark,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.28 : 0.06,
          shadowRadius: 10,
          elevation: 8,
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
        name="pathshala"
        options={{
          title: 'Pathshala',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-page-variant-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="bhakti"
        options={{
          title: 'Bhakti',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hands-pray" color={color} size={size} />,
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
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
