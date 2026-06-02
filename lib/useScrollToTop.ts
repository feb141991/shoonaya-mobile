import { useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';
import type { ScrollView } from 'react-native';

/**
 * Scroll-to-top on tab re-tap.
 *
 * Usage:
 *   const scrollRef = useScrollToTop();
 *   <ScrollView ref={scrollRef} ...>
 *
 * When the user taps the already-active tab, the scroll view smoothly
 * returns to the top.
 */
export function useScrollToTop() {
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as never, () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return unsubscribe;
  }, [navigation]);

  return scrollRef;
}
