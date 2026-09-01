import { useEffect, useRef, useSyncExternalStore, type PropsWithChildren } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { usePathname } from "expo-router";

type MotionViewProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  animationKey?: string | number;
  delay?: number;
  distance?: number;
  duration?: number;
  enabled?: boolean;
}>;

// Singleton module-level subscription to AccessibilityInfo (zero duplicate listeners across 67+ usages)
let isReduceMotionActive = false;
let isInitialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function initReduceMotion() {
  if (isInitialized) return;
  isInitialized = true;

  AccessibilityInfo.isReduceMotionEnabled()
    .then((enabled) => {
      isReduceMotionActive = enabled;
      notify();
    })
    .catch(() => {});

  AccessibilityInfo.addEventListener?.("reduceMotionChanged", (enabled) => {
    isReduceMotionActive = enabled;
    notify();
  });
}

function subscribe(callback: () => void) {
  initReduceMotion();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): boolean {
  return isReduceMotionActive;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function MotionView({
  children,
  style,
  animationKey,
  delay = 0,
  distance = 8,
  duration = 220,
  enabled = true,
}: MotionViewProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled || reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(distance);

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animationKey, delay, distance, duration, enabled, opacity, reducedMotion, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function RouteTransition({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  return (
    <MotionView
      animationKey={pathname}
      distance={6}
      duration={180}
      enabled={hasMounted.current}
      style={{ flex: 1 }}
    >
      {children}
    </MotionView>
  );
}
