import { Modal, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, themeColor } from '@/lib/constants';

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
  onReport?: (subject: MemberInfoSubject) => void;
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
// interactivity at all). This is deliberately NOT a full profile screen —
// no such screen exists anywhere in this app or the PWA for viewing
// another user's profile, so building one is a bigger, separate project.
// This sheet only surfaces fields already fetched for the members/seekers
// lists today (lib/mandali.ts's MemberRow/NearbySeeker) — no new backend
// call.
export function MemberInfoSheet({ visible, subject, onClose, onReport }: MemberInfoSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  if (!subject) return null;

  const displayName = subject.fullName ?? subject.username ?? 'Seeker';
  const rows: Array<{ icon: keyof typeof Feather.glyphMap; label: string }> = [];

  if (subject.city || subject.country) {
    rows.push({
      icon: 'map-pin',
      label: [subject.city, subject.country].filter(Boolean).join(', '),
    });
  }
  if (subject.distanceKm != null) {
    rows.push({ icon: 'navigation', label: subject.distanceKm < 1 ? 'Less than 1 km away' : `${Math.round(subject.distanceKm)} km away` });
  }
  if (subject.sampradaya || subject.ishtaDevata) {
    rows.push({
      icon: 'sun',
      label: [subject.sampradaya, subject.ishtaDevata].filter(Boolean).join(' · '),
    });
  }
  if (subject.spiritualLevel) {
    rows.push({ icon: 'star', label: subject.spiritualLevel });
  }
  if (subject.sevaScore != null) {
    rows.push({ icon: 'award', label: `${subject.sevaScore} seva` });
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
            {subject.avatarUrl ? (
              <Image source={{ uri: subject.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} contentFit="cover" />
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
              {subject.username ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }} numberOfLines={1}>
                  @{subject.username}
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

          {onReport ? (
            <PressableSurface
              haptic="selection"
              onPress={() => onReport(subject)}
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
