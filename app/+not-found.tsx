import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';

export default function UnavailableLinkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <Screen style={{ justifyContent: 'center', paddingBottom: insets.bottom }}>
      <EmptyState icon="link" title="This link is unavailable"
        subtitle="You can find your reminders in Notifications."
        ctaLabel="Open notifications" onCta={() => router.replace('/notifications')} />
    </Screen>
  );
}
