import { Tabs } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS } from '@/lib/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brandGold,
        tabBarInactiveTintColor: COLORS.textDimLight,
        tabBarStyle: {
          backgroundColor: COLORS.cardBgLight,
          borderTopColor: COLORS.borderLight,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
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
          title: 'Tirtha',
          tabBarIcon: ({ color, size }) => <Feather name="map-pin" color={color} size={size} />,
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
