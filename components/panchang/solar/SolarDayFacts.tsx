import { Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { SPACING, TYPE, themeColor } from '@/lib/constants';
import type { SolarMomentText } from '@/lib/solarDayText';

type Props = { text: SolarMomentText; isDark: boolean };

/** The facts for the chosen minute, as text: the picture never carries them alone. */
export function SolarDayFacts({ text, isDark }: Props) {
  const theme = themeColor(isDark);
  return (
    <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: SPACING.xs }}>
      <Text accessibilityRole="header" style={[TYPE.display, { color: theme.text }]}>{text.clock}</Text>
      <Text style={[TYPE.cardHeading, { color: theme.text }]}>{text.height}</Text>
      <Text style={[TYPE.body, { color: theme.dim }]}>{text.now}</Text>
      {text.next ? <Text style={[TYPE.body, { color: theme.text }]}>{text.next}</Text> : null}
    </Card>
  );
}
