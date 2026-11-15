import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OVERLAYS, COLORS, FONTS, type themeColor } from '@/lib/constants';

type VirtualSanctumTabBarProps = {
  activeTab: 'darshan' | 'purana' | 'rituals';
  goldAccent: string;
  isDark: boolean;
  setActiveTab: (tab: 'darshan' | 'purana' | 'rituals') => void;
  theme: ReturnType<typeof themeColor>;
};

export function VirtualSanctumTabBar({
  activeTab,
  goldAccent,
  isDark,
  setActiveTab,
  theme,
}: VirtualSanctumTabBarProps) {
  return (
    <View style={styles.tabsRow}>
      {[
        { key: 'darshan', label: 'Darshan' },
        { key: 'purana', label: 'Sthala Purana' },
        { key: 'rituals', label: 'Offerings' },
      ].map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={[
              styles.tabPill,
              {
                backgroundColor: active
                  ? goldAccent
                  : isDark
                  ? OVERLAYS.white[0.05]
                  : OVERLAYS.black[0.04],
              },
            ]}
          >
            <Text
              style={[
                styles.tabPillText,
                { color: active ? COLORS.ink : theme.dim },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Segmented Tabs ── */
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
});
