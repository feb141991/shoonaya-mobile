import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { parseSolarBenchMessage, type SolarBenchResult } from '@/lib/solarBenchMessage';

type Props = {
  uri: string;
  onResult: (result: SolarBenchResult) => void;
  onFailure: () => void;
};

/**
 * Loads the Solar Horizon benchmark page inside the app's own WebView so frame rate is measured
 * on the engine real users would get, not in a browser. Spike only: it loads a page by address
 * and reads one message back. It stores nothing and reaches no private data.
 */
export function SolarBenchWebView({ uri, onResult, onFailure }: Props) {
  const [loaded, setLoaded] = useState(false);
  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const result = parseSolarBenchMessage(event.nativeEvent.data);
      if (result) onResult(result);
    },
    [onResult],
  );
  return (
    <View style={styles.fill} testID="solar-bench-webview">
      <WebView
        source={{ uri }}
        style={styles.fill}
        originWhitelist={['http://*', 'https://*']}
        javaScriptEnabled
        allowFileAccess={false}
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoaded(true)}
        onError={onFailure}
        onHttpError={onFailure}
        onMessage={onMessage}
        accessibilityLabel={loaded ? 'Solar Horizon benchmark scene' : 'Loading benchmark scene'}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
