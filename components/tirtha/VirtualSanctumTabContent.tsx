import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import type { TempleSanctumNode } from '@/lib/yatra-data';
import { FEATURE_COLORS, OVERLAYS, FONTS, RADII, type themeColor } from '@/lib/constants';

type VirtualSanctumTabContentProps = {
  activeTab: 'darshan' | 'purana' | 'rituals';
  audioState: 'idle' | 'loading' | 'playing' | 'paused';
  goldAccent: string;
  handleToggleAudio: () => Promise<void>;
  isDark: boolean;
  temple: TempleSanctumNode;
  theme: ReturnType<typeof themeColor>;
};

export function VirtualSanctumTabContent({
  activeTab,
  audioState,
  goldAccent,
  handleToggleAudio,
  isDark,
  temple,
  theme,
}: VirtualSanctumTabContentProps) {
  return (
    <>
      {/* Tab 1: Darshan & Sacred Geography */}
      {activeTab === 'darshan' ? (
        <View style={styles.tabContentBlock}>
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: isDark ? OVERLAYS.white[0.06] : OVERLAYS.black[0.04], borderColor: theme.borderSoft }]}>
              <Feather name="map-pin" size={12} color={goldAccent} />
              <Text style={[styles.tagText, { color: theme.text }]}>{temple.location}</Text>
            </View>
            {temple.sacredRiverOrKund ? (
              <View style={[styles.tag, { backgroundColor: isDark ? OVERLAYS.white[0.06] : OVERLAYS.black[0.04], borderColor: theme.borderSoft }]}>
                <Feather name="droplet" size={12} color={FEATURE_COLORS.virtualSanctumModal.dropletText} />
                <Text style={[styles.tagText, { color: theme.text }]}>{temple.sacredRiverOrKund}</Text>
              </View>
            ) : null}
            {temple.architecturalStyle ? (
              <View style={[styles.tag, { backgroundColor: isDark ? OVERLAYS.white[0.06] : OVERLAYS.black[0.04], borderColor: theme.borderSoft }]}>
                <Feather name="shield" size={12} color={goldAccent} />
                <Text style={[styles.tagText, { color: theme.text }]}>{temple.architecturalStyle}</Text>
              </View>
            ) : null}
          </View>

          {/* Significance Card */}
          <View style={[styles.significanceCard, { backgroundColor: isDark ? OVERLAYS.gold[0.06] : OVERLAYS.gold[0.08], borderColor: OVERLAYS.gold[0.2] }]}>
            <Text style={[styles.significanceLabel, { color: goldAccent }]}>
              SPIRITUAL SIGNIFICANCE
            </Text>
            <Text style={[styles.significanceText, { color: theme.text }]}>
              {temple.significance}
            </Text>
          </View>

          {/* Stotra / Audio Section */}
          {temple.stotraOrChant ? (
            <View style={[styles.stotraCard, { backgroundColor: isDark ? OVERLAYS.white[0.04] : OVERLAYS.black[0.02], borderColor: theme.borderSoft }]}>
              <View style={styles.stotraHeader}>
                <View style={styles.stotraHeaderLeft}>
                  <Feather name="volume-2" size={18} color={goldAccent} />
                  <Text style={[styles.stotraTitle, { color: theme.text }]} numberOfLines={1}>
                    {temple.stotraOrChant.title}
                  </Text>
                </View>
                <Pressable
                  onPress={handleToggleAudio}
                  accessibilityRole="button"
                  accessibilityLabel={audioState === 'playing' ? 'Pause stotra audio' : 'Play stotra audio'}
                  hitSlop={8}
                  style={[
                    styles.stotraPlayBtn,
                    {
                      backgroundColor: audioState === 'playing' ? goldAccent : isDark ? OVERLAYS.gold[0.18] : OVERLAYS.gold[0.12],
                      borderColor: goldAccent,
                    },
                  ]}
                >
                  {audioState === 'loading' ? (
                    <ActivityIndicator size="small" color={goldAccent} />
                  ) : (
                    <>
                      <Feather
                        name={audioState === 'playing' ? 'pause' : 'play'}
                        size={13}
                        color={audioState === 'playing' ? FEATURE_COLORS.virtualSanctumModal.sanctumBgDarkStart : goldAccent}
                      />
                      <Text
                        style={[
                          styles.stotraPlayText,
                          { color: audioState === 'playing' ? FEATURE_COLORS.virtualSanctumModal.sanctumBgDarkStart : goldAccent },
                        ]}
                      >
                        {audioState === 'playing' ? 'Pause' : audioState === 'paused' ? 'Resume' : 'Chant'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
              <Text style={[styles.stotraDesc, { color: theme.dim }]}>
                {temple.stotraOrChant.description}
              </Text>
              {temple.stotraOrChant.audioUrl ? (
                <View style={styles.stotraProvenance}>
                  <Feather name="disc" size={11} color={goldAccent} />
                  <Text style={[styles.stotraProvenanceText, { color: goldAccent }]}>
                    Authentic Chanting Recording
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Tab 2: Sthala Purana & History */}
      {activeTab === 'purana' ? (
        <View style={styles.tabContentBlock}>
          <Text style={[styles.sectionHeading, { color: goldAccent }]}>
            STHALA PURANA & SACRED ORIGINS
          </Text>
          <Text style={[styles.puranaParagraph, { color: theme.text }]}>
            {temple.sthalaPurana}
          </Text>
        </View>
      ) : null}

      {/* Tab 3: Offerings & Traditional Rituals */}
      {activeTab === 'rituals' ? (
        <View style={styles.tabContentBlock}>
          <Text style={[styles.sectionHeading, { color: goldAccent }]}>
            TRADITIONAL OFFERINGS & RITUALS
          </Text>
          {temple.offerings.map((item, idx) => (
            <View key={idx} style={styles.offeringRow}>
              <View style={[styles.bulletDot, { backgroundColor: goldAccent }]} />
              <Text style={[styles.offeringItemText, { color: theme.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  tabContentBlock: {
    marginTop: 8,
    gap: 12,
  },
  /* ── Detail Content Styles ── */
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
  },
  sectionHeading: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  puranaParagraph: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 22,
  },
  significanceCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  significanceLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  significanceText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  offeringRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  offeringItemText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  stotraCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  stotraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stotraHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stotraTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 14,
    flexShrink: 1,
  },
  stotraPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: 30,
  },
  stotraPlayText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  stotraDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  stotraProvenance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  stotraProvenanceText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
