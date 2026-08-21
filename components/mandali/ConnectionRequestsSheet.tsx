import { useState } from 'react';
import { ActivityIndicator, Modal, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS, FONTS, themeColor } from '@/lib/constants';
import type { ConnectionRequestRow } from '@/lib/mandali';

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type ConnectionRequestsSheetProps = {
  visible: boolean;
  requests: ConnectionRequestRow[];
  onClose: () => void;
  onAccept: (request: ConnectionRequestRow) => Promise<void>;
  onReject: (request: ConnectionRequestRow) => Promise<void>;
};

// Dedicated management surface for incoming connection requests (paired
// with the "X wants to connect" notification the DB trigger already sends
// — this is where that notification's action_url lands). Each row resolves
// its own busy state independently so accepting one request doesn't
// disable the others while its own write is in flight.
export function ConnectionRequestsSheet({ visible, requests, onClose, onAccept, onReject }: ConnectionRequestsSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Always clears busyId via finally, regardless of whether the write
  // succeeded -- onAccept/onReject already swallow their own errors (they
  // show an Alert), so a rejected promise here would only ever come from
  // an unexpected bug, not the handled failure path.
  const handleAccept = async (request: ConnectionRequestRow) => {
    setBusyId(request.id);
    try {
      await onAccept(request);
    } finally {
      setBusyId(null);
    }
  };
  const handleReject = async (request: ConnectionRequestRow) => {
    setBusyId(request.id);
    try {
      await onReject(request);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <View
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 22,
            paddingBottom: 34,
            gap: 16,
            maxHeight: '78%',
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: theme.borderSoft }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="user-plus" size={20} color={theme.brand} />
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: theme.text }}>Connection Requests</Text>
            </View>
            <PressableSurface
              haptic="selection"
              onPress={onClose}
              accessibilityLabel="Close"
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardSoft }}
            >
              <Feather name="x" size={16} color={theme.dim} />
            </PressableSurface>
          </View>

          {requests.length === 0 ? (
            <EmptyState icon="user-plus" title="No pending requests" subtitle="When a fellow seeker wants to connect, their request appears here." />
          ) : (
            <View style={{ gap: 10 }}>
              {requests.map((request) => {
                const name = request.requester?.full_name ?? request.requester?.username ?? 'A fellow seeker';
                const isBusy = busyId === request.id;
                return (
                  <View
                    key={request.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: theme.premiumBorder,
                      padding: 12,
                    }}
                  >
                    {request.requester?.avatar_url ? (
                      <Image source={{ uri: request.requester.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
                    ) : (
                      <LinearGradient
                        colors={[theme.brand, COLORS.brandGoldLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>{getInitials(name)}</Text>
                      </LinearGradient>
                    )}
                    <Text style={{ flex: 1, fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }} numberOfLines={1}>
                      {name}
                    </Text>
                    <PressableSurface
                      haptic="selection"
                      disabled={isBusy}
                      onPress={() => handleAccept(request)}
                      style={{ width: 36, height: 36, minHeight: 0, borderRadius: 18, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', opacity: isBusy ? 0.6 : 1 }}
                    >
                      {isBusy ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="check" size={16} color={COLORS.ink} />}
                    </PressableSurface>
                    <PressableSurface
                      haptic="selection"
                      disabled={isBusy}
                      onPress={() => handleReject(request)}
                      style={{ width: 36, height: 36, minHeight: 0, borderRadius: 18, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center', opacity: isBusy ? 0.6 : 1 }}
                    >
                      <Feather name="x" size={16} color={theme.dim} />
                    </PressableSurface>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
