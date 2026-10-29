import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, SPACING, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { captureAppIdentity } from '@/lib/appIdentity';
import { loadMandaliNotificationTarget, type MandaliTargetContent } from '@/lib/mandaliNotificationTarget';
import type { MandaliNotificationTarget } from '@/lib/notificationDestination';

type Props = {
  target: MandaliNotificationTarget | null;
  userId: string;
  onClose: () => void;
  onAccept: (request: { id: string }) => Promise<void>;
  onReject: (request: { id: string }) => Promise<void>;
};

/** Dedicated focused view: the linked post need not be in the feed's first page. */
export function NotificationTargetSheet({ target, userId, onClose, onAccept, onReject }: Props) {
  const theme = themeColor(useColorScheme() === 'dark');
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState<MandaliTargetContent | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const targetKey = JSON.stringify(target);

  useEffect(() => {
    if (!target) return;
    let active = true;
    const lease = captureAppIdentity();
    setContent(null);
    setState('loading');
    void loadMandaliNotificationTarget(target, userId, apiFetch).then((result) => {
      if (!active || !lease.isCurrent()) return;
      setContent(result);
      setState(result ? 'ready' : 'unavailable');
    }).catch(() => {
      if (active && lease.isCurrent()) setState('error');
    });
    return () => { active = false; };
    // targetKey is the complete primitive identity, avoiding refetches on unrelated feed renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, userId, revision]);

  const respond = async (action: 'accept' | 'reject') => {
    if (content?.kind !== 'request' || busy) return;
    setBusy(true);
    try {
      await (action === 'accept' ? onAccept(content.request) : onReject(content.request));
      setRevision((current) => current + 1);
    } catch {
      setState('error');
    } finally { setBusy(false); }
  };

  return (
    <Modal transparent visible={target !== null} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <Card tone="auto" style={{ maxHeight: '85%', paddingBottom: insets.bottom + SPACING.lg, gap: SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <Text style={{ flex: 1, fontFamily: FONTS.serifBold, fontSize: 20, lineHeight: 26, color: theme.text }}>
              {target?.kind === 'request' ? 'Connection request' : 'Mandali post'}
            </Text>
            <PressableSurface accessibilityLabel="Close notification item" onPress={onClose}
              style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={20} color={theme.dim} />
            </PressableSurface>
          </View>
          <ScrollView>
            {state === 'loading' ? <EmptyState icon="clock" title="Opening your notification…" subtitle="Checking current access to this item." /> : null}
            {state === 'unavailable' ? <EmptyState icon="info" title="This item is unavailable"
              subtitle="It may have been removed, resolved, or you may no longer have access. Your Mandali is still available."
              ctaLabel="Back to Mandali" onCta={onClose} /> : null}
            {state === 'error' ? <EmptyState icon="cloud-off" title="Could not open this item"
              subtitle="Please try again. Your notification has not been lost."
              ctaLabel="Retry" onCta={() => setRevision((current) => current + 1)} /> : null}
            {state === 'ready' && content?.kind === 'post' ? (
              <View style={{ gap: SPACING.md }}>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 14, lineHeight: 20 }}>
                  {content.post.profiles?.full_name || content.post.profiles?.username || 'A fellow seeker'}
                </Text>
                <Text selectable style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 16, lineHeight: 24 }}>{content.post.content}</Text>
                {content.comment ? <Card tone="auto" style={{ borderColor: theme.brand, gap: SPACING.sm }}>
                  <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 14, lineHeight: 20 }}>Comment</Text>
                  <Text selectable style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 23 }}>{content.comment.body}</Text>
                </Card> : null}
              </View>
            ) : null}
            {state === 'ready' && content?.kind === 'request' ? (
              <View style={{ gap: SPACING.md }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16, lineHeight: 24 }}>
                  {content.request.counterparty?.full_name || content.request.counterparty?.username || 'A fellow seeker'}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 21 }}>
                  {content.request.status === 'pending' ? 'This connection request is pending.' : `This connection request was ${content.request.status}.`}
                </Text>
                {content.request.status === 'pending' && content.request.recipient_id === userId ? (
                  <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                    <PressableSurface disabled={busy} accessibilityLabel="Accept connection request" onPress={() => void respond('accept')}
                      style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft }}>
                      <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold }}>{busy ? 'Updating…' : 'Accept'}</Text>
                    </PressableSurface>
                    <PressableSurface disabled={busy} accessibilityLabel="Decline connection request" onPress={() => void respond('reject')}
                      style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold }}>Decline</Text>
                    </PressableSurface>
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}
