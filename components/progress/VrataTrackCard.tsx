import { memo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { FONTS, RADII, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';

type Theme = ReturnType<typeof themeColor>;

interface VrataTrackCardProps {
  totalVrats: number;
  recentVrats?: Array<{ id: string; occurrence_date: string; vrat_id: string; vrat_name: string | null }>;
  isDark: boolean;
  theme: Theme;
}

export const VrataTrackCard = memo(function VrataTrackCard({
  totalVrats,
  recentVrats = [],
  isDark,
  theme,
}: VrataTrackCardProps) {
  const router = useRouter();

  // Sacred numerology milestones: 1, 3, 11, 24, 54, 108
  const MILESTONES = [
    { target: 1, name: 'Prārambha', emoji: '🌱' },
    { target: 3, name: 'Trigunātīta', emoji: '🌿' },
    { target: 11, name: 'Ekādaśa Tejas', emoji: '📿' },
    { target: 24, name: 'Samvatsara', emoji: '☀️' },
    { target: 54, name: 'Ardha Shataka', emoji: '🌕' },
    { target: 108, name: 'Pūrṇa Mahāvrata', emoji: '👑' },
  ];

  const currentMilestone = [...MILESTONES].reverse().find((m) => totalVrats >= m.target) ?? null;
  const nextMilestone = MILESTONES.find((m) => totalVrats < m.target) ?? null;

  const progressPct = nextMilestone
    ? Math.min(100, Math.round((totalVrats / nextMilestone.target) * 100))
    : 100;

  const handleOpenVratCalendar = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/vrat' as Href);
  };

  const handleOpenShields = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/my-progress/shields' as Href);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(28, 22, 16, 0.65)' : 'rgba(255, 252, 246, 0.88)',
          borderColor: isDark ? 'rgba(212, 175, 55, 0.22)' : 'rgba(180, 130, 40, 0.18)',
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Image
            source={require('@/assets/relics/tulsi-leaf.png')}
            style={styles.relic}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.eyebrow, { color: theme.brand }]}>
              VRATA SĀDHANA TRACK
            </Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Sacred Fasting Armor
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleOpenShields}
          hitSlop={8}
          style={[
            styles.shieldPill,
            {
              backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(180, 130, 40, 0.08)',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.28)' : 'rgba(180, 130, 40, 0.2)',
            },
          ]}
        >
          <Text style={styles.shieldEmoji}>{currentMilestone?.emoji ?? '🛡️'}</Text>
          <Text style={[styles.shieldPillText, { color: theme.brand }]}>
            {currentMilestone?.name ?? 'Shields'}
          </Text>
          <Feather name="chevron-right" size={12} color={theme.brand} />
        </Pressable>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricNumeral, { color: theme.text }]}>
            {totalVrats}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.dim }]}>
            Vrats Observed
          </Text>
        </View>

        <View style={[styles.metricDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.metricItem}>
          <Text style={[styles.metricNumeral, { color: theme.brand }]}>
            {nextMilestone ? `${totalVrats}/${nextMilestone.target}` : 'Pūrṇa'}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.dim }]}>
            {nextMilestone ? `To ${nextMilestone.name}` : 'All Vows Complete'}
          </Text>
        </View>

        <View style={[styles.metricDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.metricItem}>
          <Text style={[styles.metricNumeral, { color: theme.text }]}>
            {recentVrats.length > 0 ? 'Active' : 'Begin'}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.dim }]}>
            Vow Rhythm
          </Text>
        </View>
      </View>

      {/* Slender Progress Line */}
      {nextMilestone ? (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: theme.brand,
                },
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={[styles.progressMetaText, { color: theme.dim }]}>
              {totalVrats === 0 ? 'Take your first fasting vow' : `${nextMilestone.target - totalVrats} more for next armor shield`}
            </Text>
            <Text style={[styles.progressMetaText, { color: theme.brand }]}>
              {progressPct}%
            </Text>
          </View>
        </View>
      ) : null}

      {/* CTA to Vrat Calendar */}
      <PressableSurface
        onPress={handleOpenVratCalendar}
        style={[
          styles.actionButton,
          {
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(180, 130, 40, 0.08)',
            borderColor: isDark ? 'rgba(212, 175, 55, 0.22)' : 'rgba(180, 130, 40, 0.16)',
          },
        ]}
      >
        <Feather name="calendar" size={14} color={theme.brand} />
        <Text style={[styles.actionButtonText, { color: theme.brand }]}>
          Explore Fasting Calendar & Guidelines
        </Text>
        <Feather name="arrow-up-right" size={14} color={theme.brand} />
      </PressableSurface>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  relic: {
    width: 28,
    height: 28,
  },
  eyebrow: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: FONTS.serif,
    fontSize: 17,
    marginTop: 1,
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  shieldEmoji: {
    fontSize: 12,
  },
  shieldPillText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricNumeral: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    marginTop: 3,
  },
  metricDivider: {
    width: 1,
    height: 26,
  },
  progressContainer: {
    marginTop: 12,
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressMetaText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  actionButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
});
