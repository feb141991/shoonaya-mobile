import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, themeColor } from '@/lib/constants';
import type { ConnectionStatus } from '@/lib/mandali';

export type MemberInfoSubject = {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  city?: string | null;
  country?: string | null;
  sampradaya?: string | null;
  ishtaDevata?: string | null;
  spiritualLevel?: string | null;
  sevaScore?: number | null;
  distanceKm?: number | null;
};

type MemberInfoSheetProps = {
  visible: boolean;
  subject: MemberInfoSubject | null;
  onClose: () => void;
  onViewProfile?: (subject: MemberInfoSubject) => void;
  onReport?: (subject: MemberInfoSubject) => void;
  connectionStatus?: ConnectionStatus;
  connectionBusy?: boolean;
  onConnect?: (subject: MemberInfoSubject) => void;
  onCancelConnection?: (subject: MemberInfoSubject) => void;
  onAcceptConnection?: (subject: MemberInfoSubject) => void;
  onRejectConnection?: (subject: MemberInfoSubject) => void;
};

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Lightweight "who is this" sheet — the first version of a much-requested
// gap: tapping a Mandali member or a nearby seeker previously did nothing
// (only the "..." Report action existed for members; seekers had zero
// interactivity at all). This sheet still only surfaces fields already
// fetched for the members/seekers lists today (lib/mandali.ts's
// MemberRow/NearbySeeker) — no new backend call for the sheet itself — but
// its "View full profile" action now opens app/profile/[id].tsx, the app's
// first full "view another user's profile" screen.
export function MemberInfoSheet({
  visible,
  subject,
  onClose,
  onViewProfile,
  onReport,
  connectionStatus,
  connectionBusy,
  onConnect,
  onCancelConnection,
  onAcceptConnection,
  onRejectConnection,
}: MemberInfoSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  // The caller nulls `subject` in the same state update that flips
  // `visible` to false (see mandali.tsx's onClose), so relying on
  // `subject` directly would unmount the Modal outright instead of
  // letting it play its own slide-down close animation with
  // visible={false}. Caching the last non-null subject keeps the Modal
  // (and its content) mounted through that transition.
  const [cachedSubject, setCachedSubject] = useState(subject);
  useEffect(() => {
    if (subject) setCachedSubject(subject);
  }, [subject]);

  const displaySubject = subject ?? cachedSubject;
  if (!displaySubject) return null;

  const displayName = displaySubject.fullName ?? displaySubject.username ?? 'Seeker';
  const rows: Array<{ icon: keyof typeof Feather.glyphMap; label: string }> = [];

  if (displaySubject.city || displaySubject.country) {
    rows.push({
      icon: 'map-pin',
      label: [displaySubject.city, displaySubject.country].filter(Boolean).join(', '),
    });
  }
  if (displaySubject.distanceKm != null) {
    rows.push({ icon: 'navigation', label: displaySubject.distanceKm < 1 ? 'Less than 1 km away' : `${Math.round(displaySubject.distanceKm)} km away` });
  }
  if (displaySubject.sampradaya || displaySubject.ishtaDevata) {
    rows.push({
      icon: 'sun',
      label: [displaySubject.sampradaya, displaySubject.ishtaDevata].filter(Boolean).join(' · '),
    });
  }
  if (displaySubject.spiritualLevel) {
    rows.push({ icon: 'star', label: displaySubject.spiritualLevel });
  }
  if (displaySubject.sevaScore != null) {
    rows.push({ icon: 'award', label: `${displaySubject.sevaScore} seva` });
  }

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
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: theme.borderSoft }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {displaySubject.avatarUrl ? (
              <Image source={{ uri: displaySubject.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={[theme.brand, COLORS.brandGoldLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 18 }}>
                  {getInitials(displayName)}
                </Text>
              </LinearGradient>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 19, color: theme.text }} numberOfLines={1}>
                {displayName}
              </Text>
              {displaySubject.username ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }} numberOfLines={1}>
                  @{displaySubject.username}
                </Text>
              ) : null}
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

          {rows.length > 0 ? (
            <View style={{ gap: 10 }}>
              {rows.map((row, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 12,
                      backgroundColor: theme.cardSoft,
                      borderWidth: 1,
                      borderColor: theme.premiumBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name={row.icon} size={14} color={theme.brand} />
                  </View>
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13.5, color: theme.text, flex: 1 }} numberOfLines={1}>
                    {row.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {connectionStatus === 'pending_received' && (onAcceptConnection || onRejectConnection) ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PressableSurface
                haptic="selection"
                disabled={connectionBusy}
                onPress={() => onAcceptConnection?.(displaySubject)}
                style={{ flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: connectionBusy ? 0.6 : 1 }}
              >
                {connectionBusy ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="check" size={14} color={COLORS.ink} />}
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.ink }}>Accept</Text>
              </PressableSurface>
              <PressableSurface
                haptic="selection"
                disabled={connectionBusy}
                onPress={() => onRejectConnection?.(displaySubject)}
                style={{ flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center', opacity: connectionBusy ? 0.6 : 1 }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.dim }}>Decline</Text>
              </PressableSurface>
            </View>
          ) : connectionStatus === 'connected' ? (
            <View style={{ minHeight: 44, borderRadius: 14, backgroundColor: theme.cardSoft, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <Feather name="check-circle" size={14} color={theme.brand} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.brand }}>Connected</Text>
            </View>
          ) : connectionStatus === 'pending_sent' && onCancelConnection ? (
            <PressableSurface
              haptic="selection"
              disabled={connectionBusy}
              onPress={() => onCancelConnection(displaySubject)}
              style={{ minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: connectionBusy ? 0.6 : 1 }}
            >
              {connectionBusy ? <ActivityIndicator size="small" color={theme.dim} /> : <Feather name="clock" size={14} color={theme.dim} />}
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.dim }}>Request sent · Cancel</Text>
            </PressableSurface>
          ) : connectionStatus === 'none' && onConnect ? (
            <PressableSurface
              haptic="selection"
              disabled={connectionBusy}
              onPress={() => onConnect(displaySubject)}
              style={{ minHeight: 44, borderRadius: 14, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: connectionBusy ? 0.6 : 1 }}
            >
              {connectionBusy ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="user-plus" size={14} color={COLORS.ink} />}
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.ink }}>Connect</Text>
            </PressableSurface>
          ) : null}

          {onViewProfile ? (
            <PressableSurface
              haptic="selection"
              onPress={() => onViewProfile(displaySubject)}
              style={{
                minHeight: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Feather name="user" size={14} color={theme.brand} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.brand }}>View full profile</Text>
            </PressableSurface>
          ) : null}

          {onReport ? (
            <PressableSurface
              haptic="selection"
              onPress={() => onReport(displaySubject)}
              style={{
                minHeight: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Feather name="flag" size={14} color={theme.dim} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.dim }}>Report member</Text>
            </PressableSurface>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
