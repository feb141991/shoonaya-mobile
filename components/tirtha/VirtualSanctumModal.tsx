import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { TempleSanctumNode } from '@/lib/yatra-data';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FlowerShowerOverlay } from '@/components/ui/FlowerShowerOverlay';

interface VirtualSanctumModalProps {
  temple: TempleSanctumNode | null;
  visible: boolean;
  onClose: () => void;
}

export function VirtualSanctumModal({ temple, visible, onClose }: VirtualSanctumModalProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const router = useRouter();

  const [diyaLit, setDiyaLit] = useState(false);
  const [flowersCount, setFlowersCount] = useState(0);
  const [bellRungCount, setBellRungCount] = useState(0);
  const [parikramaCount, setParikramaCount] = useState(0);
  const [showFlowerShower, setShowFlowerShower] = useState(false);

  if (!temple) return null;

  const handleLightDiya = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDiyaLit((prev) => !prev);
  };

  const handleOfferFlower = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlowersCount((prev) => prev + 1);
    setShowFlowerShower(false);
    requestAnimationFrame(() => {
      setShowFlowerShower(true);
    });
  };

  const handleRingBell = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setBellRungCount((prev) => prev + 1);
  };

  const handleParikrama = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setParikramaCount((prev) => prev + 1);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: theme.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleBarContainer}>
            <View style={[styles.handleBar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleColumn}>
              <Text style={[styles.nodeTitle, { color: theme.text }]}>
                {temple.name}
              </Text>
              <Text style={[styles.sanskritSubtitle, { color: theme.brand }]}>
                {temple.sanskritName}
              </Text>
              <Text style={[styles.deityText, { color: theme.dim }]}>
                {temple.deity} · {temple.stateOrRegion}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: theme.borderSoft },
              ]}
              accessibilityLabel="Close temple darshan"
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Virtual Sanctum Interactive Ritual Bar */}
            <View
              style={[
                styles.sanctumRitualCard,
                {
                  backgroundColor: isDark ? 'rgba(217, 119, 6, 0.1)' : '#FEF3C7',
                  borderColor: theme.brandSoft,
                },
              ]}
            >
              <View style={styles.ritualHeaderRow}>
                <View style={styles.ritualBadge}>
                  <Feather name="sun" size={13} color={theme.brand} />
                  <Text style={[styles.ritualBadgeText, { color: theme.brand }]}>
                    VIRTUAL SANCTUM OFFERINGS
                  </Text>
                </View>
                {parikramaCount > 0 ? (
                  <View style={styles.parikramaBadge}>
                    <Text style={[styles.parikramaBadgeText, { color: theme.brand }]}>
                      {parikramaCount} {parikramaCount === 1 ? 'Parikrama' : 'Parikramas'}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.ritualButtonsRow}>
                {/* Diya Lighting */}
                <PressableSurface
                  onPress={handleLightDiya}
                  style={[
                    styles.actionPill,
                    {
                      backgroundColor: diyaLit
                        ? isDark
                          ? 'rgba(217, 119, 6, 0.35)'
                          : '#FDE68A'
                        : isDark
                        ? '#1F2937'
                        : '#FFFFFF',
                      borderColor: diyaLit ? COLORS.brandGold : theme.borderSoft,
                    },
                  ]}
                  accessibilityLabel="Light Ghee Diya"
                >
                  <Feather
                    name="sun"
                    size={16}
                    color={diyaLit ? COLORS.brandGold : theme.dim}
                  />
                  <Text
                    style={[
                      styles.actionPillText,
                      { color: diyaLit ? theme.brand : theme.text },
                    ]}
                  >
                    {diyaLit ? 'Diya Lit ✦' : 'Light Diya'}
                  </Text>
                </PressableSurface>

                {/* Flower Offering */}
                <PressableSurface
                  onPress={handleOfferFlower}
                  style={[
                    styles.actionPill,
                    {
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                      borderColor: flowersCount > 0 ? COLORS.brandGold : theme.borderSoft,
                    },
                  ]}
                  accessibilityLabel="Offer Flowers"
                >
                  <Feather name="heart" size={15} color="#EC4899" />
                  <Text style={[styles.actionPillText, { color: theme.text }]}>
                    Offer Pushpam {flowersCount > 0 ? `(${flowersCount})` : ''}
                  </Text>
                </PressableSurface>

                {/* Ring Bell */}
                <PressableSurface
                  onPress={handleRingBell}
                  style={[
                    styles.actionPill,
                    {
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                      borderColor: bellRungCount > 0 ? COLORS.brandGold : theme.borderSoft,
                    },
                  ]}
                  accessibilityLabel="Ring Temple Bell"
                >
                  <Feather name="bell" size={15} color={theme.brand} />
                  <Text style={[styles.actionPillText, { color: theme.text }]}>
                    Ring Bell {bellRungCount > 0 ? `(${bellRungCount})` : ''}
                  </Text>
                </PressableSurface>

                {/* Parikrama */}
                <PressableSurface
                  onPress={handleParikrama}
                  style={[
                    styles.actionPill,
                    {
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                      borderColor: parikramaCount > 0 ? COLORS.brandGold : theme.borderSoft,
                    },
                  ]}
                  accessibilityLabel="Perform Parikrama"
                >
                  <Feather name="rotate-cw" size={15} color="#10B981" />
                  <Text style={[styles.actionPillText, { color: theme.text }]}>
                    +1 Parikrama
                  </Text>
                </PressableSurface>
              </View>
            </View>

            {/* Geographical & Architectural Tags */}
            <View style={styles.tagsRow}>
              <View style={[styles.tag, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: theme.borderSoft }]}>
                <Feather name="map-pin" size={12} color={theme.brand} />
                <Text style={[styles.tagText, { color: theme.text }]}>{temple.location}</Text>
              </View>
              {temple.sacredRiverOrKund ? (
                <View style={[styles.tag, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: theme.borderSoft }]}>
                  <Feather name="droplet" size={12} color="#3B82F6" />
                  <Text style={[styles.tagText, { color: theme.text }]}>{temple.sacredRiverOrKund}</Text>
                </View>
              ) : null}
              {temple.architecturalStyle ? (
                <View style={[styles.tag, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: theme.borderSoft }]}>
                  <Feather name="shield" size={12} color={theme.brand} />
                  <Text style={[styles.tagText, { color: theme.text }]}>{temple.architecturalStyle}</Text>
                </View>
              ) : null}
            </View>

            {/* Sthala Purana Card */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: theme.brand }]}>
                STHALA PURANA & SACRED HISTORY
              </Text>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                {temple.sthalaPurana}
              </Text>
            </View>

            {/* Spiritual Significance */}
            <View style={[styles.significanceCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.borderSoft }]}>
              <Text style={[styles.significanceLabel, { color: theme.brand }]}>
                SPIRITUAL SIGNIFICANCE
              </Text>
              <Text style={[styles.significanceText, { color: theme.text }]}>
                {temple.significance}
              </Text>
            </View>

            {/* Traditional Offerings */}
            {temple.offerings.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: theme.brand }]}>
                  SACRED OFFERINGS & RITUALS
                </Text>
                {temple.offerings.map((item, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: theme.brand }]} />
                    <Text style={[styles.bulletText, { color: theme.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Stotra / Audio Section */}
            {temple.stotraOrChant ? (
              <View style={[styles.stotraCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.border }]}>
                <View style={styles.stotraHeader}>
                  <Feather name="volume-2" size={18} color={theme.brand} />
                  <Text style={[styles.stotraTitle, { color: theme.text }]}>
                    {temple.stotraOrChant.title}
                  </Text>
                </View>
                <Text style={[styles.stotraDesc, { color: theme.dim }]}>
                  {temple.stotraOrChant.description}
                </Text>
              </View>
            ) : null}

            {/* Live Darshan CTA */}
            <PressableSurface
              style={[styles.liveDarshanBtn, { backgroundColor: theme.brand }]}
              onPress={() => {
                onClose();
                router.push('/live-darshan');
              }}
              accessibilityLabel="Open Live Darshan Stream"
            >
              <Feather name="tv" size={16} color="#FFFFFF" />
              <Text style={styles.liveDarshanBtnText}>Watch Live Shrines on Shoonaya</Text>
            </PressableSurface>
          </ScrollView>

          {/* Pushpa Vrishti — Sacred Flower Petal Shower */}
          <FlowerShowerOverlay
            show={showFlowerShower}
            onComplete={() => setShowFlowerShower(false)}
            count={36}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderWidth: 1,
    maxHeight: '84%',
    paddingBottom: 28,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 12,
  },
  nodeTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 20,
    lineHeight: 26,
  },
  sanskritSubtitle: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    marginTop: 2,
  },
  deityText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  scrollBody: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sanctumRitualCard: {
    borderRadius: RADII.lg,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
  },
  ritualHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ritualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ritualBadgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  parikramaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
  },
  parikramaBadgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10.5,
  },
  ritualButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: 36,
  },
  actionPillText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
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
  sectionBlock: {
    marginTop: 12,
  },
  sectionHeading: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  summaryText: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 21,
  },
  significanceCard: {
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginVertical: 10,
  },
  significanceLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  significanceText: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    lineHeight: 18,
  },
  stotraCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: RADII.lg,
    borderWidth: 1,
  },
  stotraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stotraTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 14,
  },
  stotraDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
  },
  liveDarshanBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADII.pill,
  },
  liveDarshanBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
