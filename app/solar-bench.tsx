import { useCallback, useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SolarBenchWebView } from '@/components/panchang/solar/SolarBenchWebView';
import { isAllowedBenchUrl, type SolarBenchResult } from '@/lib/solarBenchMessage';
import { FONTS, SPACING, TYPE, themeColor } from '@/lib/constants';

// Phase-1 spike screen: runs the Solar Horizon 3D benchmark inside the app's WebView.
// Nothing links here; it is reached by typing /solar-bench in a development build.
// The page address comes from EXPO_PUBLIC_SOLAR_BENCH_URL and is not set in production.
const BENCH_URL = process.env.EXPO_PUBLIC_SOLAR_BENCH_URL;

export default function SolarBenchScreen() {
  const theme = themeColor(useColorScheme() === 'dark');
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<SolarBenchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const onResult = useCallback((r: SolarBenchResult) => setResult(r), []);
  const onFailure = useCallback(() => setFailed(true), []);

  if (!__DEV__ || !isAllowedBenchUrl(BENCH_URL)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, padding: SPACING.lg }}>
        <Text style={[TYPE.cardHeading, { color: theme.text, flexShrink: 1 }]}>
          This benchmark is available in development builds only.
        </Text>
      </SafeAreaView>
    );
  }

  const line = (label: string, value: string) => (
    <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md }}>
      <Text style={{ fontFamily: FONTS.sans, color: theme.dim, flexShrink: 1 }}>{label}</Text>
      <Text style={{ fontFamily: FONTS.sansSemiBold, color: theme.text }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <View style={{ flex: 1 }}>
        <SolarBenchWebView uri={BENCH_URL} onResult={onResult} onFailure={onFailure} />
      </View>
      <View style={{ padding: SPACING.md, paddingBottom: insets.bottom + SPACING.md, gap: SPACING.xs }}>
        {failed ? <Text style={{ fontFamily: FONTS.sans, color: theme.text }}>The page could not be loaded.</Text> : null}
        {result ? (
          <>
            {line('Run', result.validRun ? 'valid' : 'INVALID (do not use)')}
            {line('Frames per second', result.fpsAvg.toFixed(1))}
            {line('Frame time p95', `${result.frameMsP95.toFixed(1)} ms`)}
            {line('Frames over 33 ms', `${result.pctOver33ms.toFixed(1)}%`)}
            {line('Draw calls / triangles', `${result.drawCallsPerFrame} / ${result.trianglesPerFrame}`)}
            {line('GPU', result.gpu)}
          </>
        ) : null}
      </View>
    </View>
  );
}
