import { useCallback, useEffect, useRef, useState } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { RADII } from '@/lib/constants';
import type { SolarDay, SolarWindowId } from '@/lib/solarDay';
import { SOLAR_SCENE_HTML } from '@/lib/solarScene.generated';
import { dayMessage, parseSolarSceneMessage, sceneInjection, type SolarSceneOutbound } from '@/lib/solarSceneMessage';

type Props = {
  day: SolarDay;
  minutes: number;
  motion: boolean;
  windowColors: Record<SolarWindowId, string>;
  /** Read aloud by screen readers in place of the picture. */
  description: string;
  onDragMinutes: (deltaMinutes: number) => void;
  onStep: (deltaMinutes: number) => void;
  onUnsupported: () => void;
};

/**
 * The 3D sky for the Solar Day screen: an offline page (lib/solarScene.generated.ts) in the
 * app's WebView. The page draws only; the screen owns the time and shows every fact as text.
 * Screen readers get one adjustable element with a spoken description, not the canvas.
 */
export function SolarSceneView({ day, minutes, motion, windowColors, description, onDragMinutes, onStep, onUnsupported }: Props) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const send = useCallback((message: SolarSceneOutbound) => {
    ref.current?.injectJavaScript(sceneInjection(message));
  }, []);

  // The day goes before the time, and both go again whenever the page reloads.
  useEffect(() => {
    if (ready) send(dayMessage(day, windowColors));
  }, [ready, day, windowColors, send]);
  useEffect(() => {
    if (ready) send({ type: 'time', minutes });
  }, [ready, minutes, day, send]);
  useEffect(() => {
    if (ready) send({ type: 'motion', on: motion });
  }, [ready, motion, send]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseSolarSceneMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === 'ready') setReady(true);
      else if (message.type === 'unsupported') onUnsupported();
      else onDragMinutes(message.deltaMinutes);
    },
    [onDragMinutes, onUnsupported],
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') onStep(15);
      if (event.nativeEvent.actionName === 'decrement') onStep(-15);
    },
    [onStep],
  );

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Sky picture"
      accessibilityValue={{ text: description }}
      accessibilityHint="Swipe up or down to move the time by 15 minutes."
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      style={{ width: '100%', aspectRatio: 1.6, borderRadius: RADII.lg, overflow: 'hidden' }}
      testID="solar-scene"
    >
      <WebView
        ref={ref}
        source={{ html: SOLAR_SCENE_HTML }}
        originWhitelist={['about:*']}
        // The page is self-contained: refuse any navigation away from it.
        onShouldStartLoadWithRequest={(request) => request.url.startsWith('about:')}
        javaScriptEnabled
        allowFileAccess={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onMessage={onMessage}
        onError={onUnsupported}
        onLoadStart={() => setReady(false)}
        // iOS can end the page's process under memory pressure; load it again.
        onContentProcessDidTerminate={() => ref.current?.reload()}
        onRenderProcessGone={onUnsupported}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
