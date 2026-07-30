import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon } from '@/components/ui/SacredIcon';
import { COLORS, FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { subscribeNavScroll } from '@/lib/navScrollBus';

// Custom-rendered bottom nav replacing Expo Router's built-in tab bar
// (hidden via tabBarStyle:{display:'none'} in app/(tabs)/_layout.tsx).
// Rendered once from app/_layout.tsx so standalone feature screens keep the
// same app navigation affordance as tab screens.
//
// Why not a `tabBar` render prop on <Tabs>: Expo Router 56's public `Tabs`
// component (build/layouts/TabsClient) explicitly omits `layout` from the
// props it forwards to the underlying navigator, and there is no `tabBar`
// prop on its public surface either — so there is no supported hook to wrap
// the built-in bar in an Animated.View from inside <Tabs>. Rendering our own
// bar as an absolutely-positioned sibling and driving navigation directly
// via useRouter()/usePathname() is the standard, documented workaround for
// custom Expo Router tab bars, and avoids depending on expo-router's
// internal, version-fragile build/react-navigation/bottom-tabs/* paths.
//
// Behavior mirrors PWA's BottomNav.tsx (src/components/layout/BottomNav.tsx):
// - Expanded: floating glass pill, 70px tall, centered, current tab labeled.
// - Collapsed: 58px circular pill, left-aligned, shows only the active tab's
//   icon; tapping it re-expands.
// - Collapses whenever the route isn't Home; on Home, expands by default and
//   then collapses on scroll-down / expands on scroll-up or near-top, via the
//   navScrollBus any opted-in screen's ScrollView reports into.
const HOME_PATHS = new Set(['/', '/index']);

function matchesAny(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

type TabDef = {
  key: string;
  href: Href;
  label: string;
  match: (pathname: string) => boolean;
  renderIcon: (color: string, size: number) => React.ReactNode;
  isCenter?: boolean;
};

export function CollapsibleBottomNav() {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(!HOME_PATHS.has(pathname));
  const [reducedMotion, setReducedMotion] = useState(false);
  const collapseProgress = useRef(new Animated.Value(HOME_PATHS.has(pathname) ? 0 : 1)).current;
  const lastYRef = useRef(0);
  const lastToggleAtRef = useRef(0);
  const readyRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReducedMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReducedMotion);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  // Route changes: mirror PWA's `setCollapsed(!(pathname === home))` effect,
  // and re-arm the scroll-settle guard so a screen's initial layout pass
  // doesn't get misread as a user scroll.
  useEffect(() => {
    readyRef.current = false;
    lastYRef.current = 0;
    setCollapsed(!HOME_PATHS.has(pathname));
    const timer = setTimeout(() => {
      readyRef.current = true;
    }, 350);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Scroll-driven collapse, thresholds matched to PWA's BottomNav.tsx onScroll.
  useEffect(() => {
    return subscribeNavScroll((y) => {
      if (!readyRef.current) return;
      const diff = y - lastYRef.current;
      if (Math.abs(diff) < 14) return;

      const now = Date.now();
      const canToggle = now - lastToggleAtRef.current > 220;
      if (y < 36) {
        setCollapsed(false);
        lastToggleAtRef.current = now;
      } else if (canToggle && diff > 0 && y > 140) {
        setCollapsed(true);
        lastToggleAtRef.current = now;
      } else if (canToggle && diff < -40) {
        setCollapsed(false);
        lastToggleAtRef.current = now;
      }
      lastYRef.current = y;
    });
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      collapseProgress.setValue(collapsed ? 1 : 0);
      return;
    }
    Animated.timing(collapseProgress, {
      toValue: collapsed ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [collapsed, reducedMotion, collapseProgress]);

  const TABS: TabDef[] = useMemo(
    () => [
      {
        key: 'home',
        href: '/',
        label: 'Home',
        match: (p) => HOME_PATHS.has(p),
        renderIcon: (color, size) => <Feather name="home" color={color} size={size} />,
      },
      {
        key: 'japa',
        href: '/japa',
        label: 'Japa',
        match: (p) => matchesAny(p, ['/japa', '/japa-insights']),
        renderIcon: (color, size) => <SacredIcon name="japa" fallbackGlyph="heart" color={color} size={size} />,
      },
      {
        key: 'bhakti',
        href: '/bhakti',
        label: 'Bhakti',
        match: (p) =>
          matchesAny(p, [
            '/bhakti',
            '/shloka',
            '/quiz',
            '/vrat',
            '/panchang',
            '/dharm-veer',
            '/nitya-karma',
            '/nitya-dincharya',
            '/nitya-plans',
            '/nitya-ashrama',
          ]),
        isCenter: true,
        renderIcon: (color, size) => <SacredIcon name="bhakti" fallbackGlyph="star" color={color} size={size} />,
      },
      {
        key: 'pathshala',
        href: '/pathshala',
        label: 'Pathshala',
        match: (p) => matchesAny(p, ['/pathshala']),
        renderIcon: (color, size) => <SacredIcon name="pathshala" fallbackGlyph="book-open" color={color} size={size} />,
      },
      {
        key: 'mandali',
        href: '/mandali',
        label: 'Mandali',
        match: (p) => matchesAny(p, ['/mandali']),
        renderIcon: (color, size) => <SacredIcon name="mandali" fallbackGlyph="users" color={color} size={size} />,
      },
    ],
    []
  );

  const activeTab = TABS.find((tab) => tab.match(pathname)) ?? TABS[0];

  const EXPANDED_HEIGHT = 78;
  const COLLAPSED_WIDTH = 58;
  const COLLAPSED_HEIGHT = 58;
  const EXPANDED_WIDTH = Math.min(windowWidth - 30, 430);
  const expandedLeft = (windowWidth - EXPANDED_WIDTH) / 2;
  const collapsedLeft = Math.max(16, insets.left);
  const bottom = insets.bottom + 12;
  const collapsedBottom = bottom + 22;

  const animatedWidth = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [EXPANDED_WIDTH, COLLAPSED_WIDTH],
  });
  const animatedHeight = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [EXPANDED_HEIGHT, COLLAPSED_HEIGHT],
  });
  const animatedRadius = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [37, 29],
  });
  const animatedLeft = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [expandedLeft, collapsedLeft],
  });
  const animatedBottom = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [bottom, collapsedBottom],
  });
  const expandedOpacity = collapseProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0],
  });
  const collapsedOpacity = collapseProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: animatedBottom,
        left: animatedLeft,
        width: animatedWidth,
        height: animatedHeight,
        borderRadius: animatedRadius,
        overflow: 'hidden',
        backgroundColor: isDark ? COLORS.premiumGlassDark : COLORS.premiumGlassLight,
        borderWidth: 1,
        borderColor: theme.premiumBorder,
        boxShadow: isDark ? SHADOWS.navFloating.dark : SHADOWS.navFloating.light,
        zIndex: 50,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? [COLORS.navGlassTopDark, COLORS.navGlassMidDark, COLORS.navGlassBottomDark]
            : [COLORS.navGlassTopLight, COLORS.navGlassMidLight, COLORS.navGlassBottomLight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -28,
          bottom: -42,
          width: 150,
          height: 92,
          borderRadius: 80,
          backgroundColor: isDark ? COLORS.navGlowGoldDark : COLORS.navGlowGoldLight,
          opacity: expandedOpacity,
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 34,
          top: -34,
          width: 112,
          height: 72,
          borderRadius: 70,
          backgroundColor: isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowIvoryLight,
          opacity: expandedOpacity,
        }}
      />
      {/* Expanded: full tab row */}
      <Animated.View
        pointerEvents={collapsed ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          inset: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 7,
          opacity: expandedOpacity,
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab.key;
          const color = isActive ? theme.brand : theme.dim;

          if (tab.isCenter) {
            return (
              <PressableSurface
                key={tab.key}
                haptic="selection"
                accessibilityLabel={tab.label}
                onPress={() => router.navigate(tab.href)}
                style={{ flex: 1, minHeight: 0, alignItems: 'center', marginTop: -10 }}
              >
                <LinearGradient
                  colors={
                    isActive
                      ? [theme.brand, isDark ? COLORS.brandPrimaryStrongDark : COLORS.brandPrimaryStrongLight]
                      : [theme.card, isDark ? COLORS.surfaceSoftDark : COLORS.surfaceSoftLight]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    boxShadow: isActive
                      ? (isDark ? SHADOWS.navCenterActive.dark : SHADOWS.navCenterActive.light)
                      : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light),
                  }}
                >
                  {tab.renderIcon(isActive ? COLORS.ink : theme.brand, 24)}
                </LinearGradient>
                <Text
                  style={{
                    ...TYPE.chip,
                    fontFamily: FONTS.sansSemiBold,
                    marginTop: 2,
                    color,
                  }}
                >
                  {tab.label}
                </Text>
              </PressableSurface>
            );
          }

          return (
            <PressableSurface
              key={tab.key}
              haptic="selection"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => router.navigate(tab.href)}
              style={{ flex: 1, minHeight: 0, alignItems: 'center', paddingVertical: 8 }}
            >
              <View
                style={{
                  minWidth: isActive ? 50 : 42,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive
                    ? (isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight)
                    : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? theme.premiumBorder : 'transparent',
                }}
              >
                {tab.renderIcon(color, isActive ? 22 : 20)}
              </View>
              <Text
                style={{
                  ...TYPE.chip,
                  fontFamily: FONTS.sansSemiBold,
                  marginTop: 3,
                  color,
                }}
              >
                {tab.label}
              </Text>
              {isActive ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    width: 16,
                    height: 3,
                    borderRadius: 999,
                    backgroundColor: theme.brand,
                  }}
                />
              ) : null}
            </PressableSurface>
          );
        })}
      </Animated.View>

      {/* Collapsed: single icon pill, tap to expand */}
      <Animated.View
        pointerEvents={collapsed ? 'auto' : 'none'}
        style={{ position: 'absolute', inset: 0, opacity: collapsedOpacity }}
      >
        <PressableSurface
          haptic="selection"
          accessibilityLabel="Expand navigation"
          onPress={() => setCollapsed(false)}
          style={{
            flex: 1,
            borderRadius: COLLAPSED_HEIGHT / 2,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
            }}
          >
            {activeTab.renderIcon(theme.brand, 23)}
          </View>
        </PressableSurface>
      </Animated.View>
    </Animated.View>
  );
}
