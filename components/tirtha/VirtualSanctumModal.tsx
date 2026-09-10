import React, { useState, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [activeTab, setActiveTab] = useState<'darshan' | 'purana' | 'rituals'>('darshan');

  // Animation values for Bell & Diya Glow
  const bellAnim = useRef(new Animated.Value(0)).current;
  const diyaGlowAnim = useRef(new Animated.Value(0)).current;

  if (!temple) return null;

  const handleLightDiya = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextState = !diyaLit;
    setDiyaLit(nextState);
    Animated.timing(diyaGlowAnim, {
      toValue: nextState ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
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

    // Bell swing animation sequence
    bellAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bellAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: -1, duration: 160, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: 0.5, duration: 120, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: -0.5, duration: 120, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleParikrama = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setParikramaCount((prev) => prev + 1);
  };

  const bellRotation = bellAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  const goldAccent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const cardSurface = isDark ? 'rgba(30, 26, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)';
  const sanctumBg: [string, string] = isDark ? ['#1a120b', '#0d0a07'] : ['#2c1a0e', '#150d07'];

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
              backgroundColor: cardSurface,
              borderColor: isDark ? 'rgba(197, 160, 89, 0.3)' : 'rgba(197, 160, 89, 0.4)',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleBarContainer}>
            <View style={[styles.handleBar, { backgroundColor: isDark ? '#4A3B2C' : '#D1C4B2' }]} />
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleColumn}>
              <View style={styles.traditionTag}>
                <Feather name="shield" size={11} color={goldAccent} />
                <Text style={[styles.traditionTagText, { color: goldAccent }]}>
                  {temple.stateOrRegion.toUpperCase()} · SACRED TIRTHA
                </Text>
              </View>
              <Text style={[styles.nodeTitle, { color: theme.text }]}>
                {temple.name}
              </Text>
              <Text style={[styles.sanskritSubtitle, { color: goldAccent }]}>
                {temple.sanskritName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderColor: theme.borderSoft,
                },
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
            {/* ══════════════════════════════════════════════════════════════ */}
            {/* MAJESTIC VIRTUAL SANCTUM (GARBHAGRIHA) SHRINE EXPERIENCE       */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <View style={styles.sanctumOuterFrame}>
              <LinearGradient
                colors={sanctumBg}
                style={styles.sanctumStage}
              >
                {/* Temple Hanging Bell (Interactive) */}
                <Animated.View
                  style={[
                    styles.hangingBellContainer,
                    { transform: [{ rotate: bellRotation }] },
                  ]}
                >
                  <Pressable
                    onPress={handleRingBell}
                    hitSlop={10}
                    accessibilityLabel="Ring sanctum bell"
                    style={styles.bellTouchArea}
                  >
                    <View style={styles.bellChain} />
                    <View style={styles.bellDome}>
                      <Text style={styles.bellGlyph}>🔔</Text>
                    </View>
                  </Pressable>
                </Animated.View>

                {/* Cosmic Sanctum Aura & Halo */}
                <View style={styles.deityAuraRing}>
                  <View style={styles.deityInnerGlow}>
                    <Text style={styles.deitySymbolGlyph}>🕉️</Text>
                    <Text style={styles.deityTitleText}>{temple.deity}</Text>
                  </View>
                </View>

                {/* Left & Right Brass Ghee Diyas */}
                <View style={styles.diyasRow}>
                  {/* Left Diya */}
                  <Pressable
                    onPress={handleLightDiya}
                    style={styles.diyaTouchTarget}
                    accessibilityLabel="Light left temple diya"
                  >
                    <View style={styles.diyaBase}>
                      <Text style={styles.diyaFlameEmoji}>{diyaLit ? '🔥' : '🪔'}</Text>
                      {diyaLit ? (
                        <View style={styles.diyaGlowCircle} />
                      ) : null}
                    </View>
                    <Text style={styles.diyaLabel}>{diyaLit ? 'Deepam' : 'Tap to Light'}</Text>
                  </Pressable>

                  {/* Center Parikrama Counter Ring */}
                  <View style={styles.parikramaRing}>
                    <Text style={styles.parikramaLabel}>PARIKRAMA</Text>
                    <Text style={styles.parikramaCountNumber}>{parikramaCount}</Text>
                  </View>

                  {/* Right Diya */}
                  <Pressable
                    onPress={handleLightDiya}
                    style={styles.diyaTouchTarget}
                    accessibilityLabel="Light right temple diya"
                  >
                    <View style={styles.diyaBase}>
                      <Text style={styles.diyaFlameEmoji}>{diyaLit ? '🔥' : '🪔'}</Text>
                      {diyaLit ? (
                        <View style={styles.diyaGlowCircle} />
                      ) : null}
                    </View>
                    <Text style={styles.diyaLabel}>{diyaLit ? 'Deepam' : 'Tap to Light'}</Text>
                  </Pressable>
                </View>

                {/* Sanctum Floor Floral Border */}
                <View style={styles.sanctumFloor}>
                  <Text style={styles.sanctumFloorMantra}>
                    ✦ ॐ नमः शिवाय ✦ हर हर महादेव ✦
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SACRED ACTION CONTROLS                                        */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <View style={styles.actionPillsGrid}>
              {/* Light Diya */}
              <PressableSurface
                onPress={handleLightDiya}
                style={[
                  styles.sanctumActionBtn,
                  {
                    backgroundColor: diyaLit
                      ? isDark
                        ? 'rgba(217, 119, 6, 0.25)'
                        : 'rgba(217, 119, 6, 0.15)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.03)',
                    borderColor: diyaLit ? goldAccent : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
                accessibilityLabel="Light Ghee Diya"
              >
                <Text style={styles.actionIcon}>{diyaLit ? '🔥' : '🪔'}</Text>
                <Text style={[styles.actionBtnText, { color: diyaLit ? goldAccent : theme.text }]}>
                  {diyaLit ? 'Diya Lit' : 'Light Diya'}
                </Text>
              </PressableSurface>

              {/* Offer Pushpam */}
              <PressableSurface
                onPress={handleOfferFlower}
                style={[
                  styles.sanctumActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: flowersCount > 0 ? '#EC4899' : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
                accessibilityLabel="Offer Sacred Flowers"
              >
                <Text style={styles.actionIcon}>🌸</Text>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>
                  Offer Pushpam {flowersCount > 0 ? `(${flowersCount})` : ''}
                </Text>
              </PressableSurface>

              {/* Ring Bell */}
              <PressableSurface
                onPress={handleRingBell}
                style={[
                  styles.sanctumActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: bellRungCount > 0 ? goldAccent : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
                accessibilityLabel="Ring Temple Bell"
              >
                <Text style={styles.actionIcon}>🔔</Text>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>
                  Ring Bell {bellRungCount > 0 ? `(${bellRungCount})` : ''}
                </Text>
              </PressableSurface>

              {/* Parikrama */}
              <PressableSurface
                onPress={handleParikrama}
                style={[
                  styles.sanctumActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: parikramaCount > 0 ? '#10B981' : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
                accessibilityLabel="Perform Sacred Parikrama"
              >
                <Text style={styles.actionIcon}>🔄</Text>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>
                  +1 Parikrama
                </Text>
              </PressableSurface>
            </View>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SEGMENTED CONTENT TABS                                         */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <View style={styles.tabsRow}>
              {[
                { key: 'darshan', label: 'Darshan' },
                { key: 'purana', label: 'Sthala Purana' },
                { key: 'rituals', label: 'Offerings' },
              ].map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key as any)}
                    style={[
                      styles.tabPill,
                      {
                        backgroundColor: active
                          ? goldAccent
                          : isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.04)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabPillText,
                        { color: active ? COLORS.ink : theme.dim },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tab 1: Darshan & Sacred Geography */}
            {activeTab === 'darshan' ? (
              <View style={styles.tabContentBlock}>
                <View style={styles.tagsRow}>
                  <View style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.borderSoft }]}>
                    <Feather name="map-pin" size={12} color={goldAccent} />
                    <Text style={[styles.tagText, { color: theme.text }]}>{temple.location}</Text>
                  </View>
                  {temple.sacredRiverOrKund ? (
                    <View style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.borderSoft }]}>
                      <Feather name="droplet" size={12} color="#3B82F6" />
                      <Text style={[styles.tagText, { color: theme.text }]}>{temple.sacredRiverOrKund}</Text>
                    </View>
                  ) : null}
                  {temple.architecturalStyle ? (
                    <View style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.borderSoft }]}>
                      <Feather name="shield" size={12} color={goldAccent} />
                      <Text style={[styles.tagText, { color: theme.text }]}>{temple.architecturalStyle}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Significance Card */}
                <View style={[styles.significanceCard, { backgroundColor: isDark ? 'rgba(197, 160, 89, 0.06)' : 'rgba(197, 160, 89, 0.08)', borderColor: 'rgba(197, 160, 89, 0.2)' }]}>
                  <Text style={[styles.significanceLabel, { color: goldAccent }]}>
                    SPIRITUAL SIGNIFICANCE
                  </Text>
                  <Text style={[styles.significanceText, { color: theme.text }]}>
                    {temple.significance}
                  </Text>
                </View>

                {/* Stotra / Audio Section */}
                {temple.stotraOrChant ? (
                  <View style={[styles.stotraCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: theme.borderSoft }]}>
                    <View style={styles.stotraHeader}>
                      <Feather name="volume-2" size={18} color={goldAccent} />
                      <Text style={[styles.stotraTitle, { color: theme.text }]}>
                        {temple.stotraOrChant.title}
                      </Text>
                    </View>
                    <Text style={[styles.stotraDesc, { color: theme.dim }]}>
                      {temple.stotraOrChant.description}
                    </Text>
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

            {/* Live Darshan CTA */}
            <PressableSurface
              style={[styles.liveDarshanBtn, { backgroundColor: goldAccent }]}
              onPress={() => {
                onClose();
                router.push('/live-darshan');
              }}
              accessibilityLabel="Open Live Darshan Stream"
            >
              <Feather name="tv" size={16} color={COLORS.ink} />
              <Text style={styles.liveDarshanBtnText}>Watch Live Shrines on Shoonaya</Text>
            </PressableSurface>
          </ScrollView>

          {/* Pushpa Vrishti — Sacred Flower Petal Shower */}
          <FlowerShowerOverlay
            show={showFlowerShower}
            onComplete={() => setShowFlowerShower(false)}
            count={40}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderWidth: 1,
    maxHeight: '90%',
    paddingBottom: 28,
    overflow: 'hidden',
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 12,
  },
  traditionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  traditionTagText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  nodeTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 22,
    lineHeight: 28,
  },
  sanskritSubtitle: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    marginTop: 2,
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

  /* ── Sanctum Shrine Stage ── */
  sanctumOuterFrame: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    marginVertical: 10,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
  },
  sanctumStage: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 210,
    justifyContent: 'space-between',
  },
  hangingBellContainer: {
    alignItems: 'center',
  },
  bellTouchArea: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  bellChain: {
    width: 2,
    height: 18,
    backgroundColor: '#C5A059',
  },
  bellDome: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(197, 160, 89, 0.25)',
    borderWidth: 1,
    borderColor: '#C5A059',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellGlyph: {
    fontSize: 20,
  },
  deityAuraRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1.5,
    borderColor: '#C5A059',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  deityInnerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deitySymbolGlyph: {
    fontSize: 32,
  },
  deityTitleText: {
    fontFamily: FONTS.serifBold,
    fontSize: 11,
    color: '#FDE68A',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  diyasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  diyaTouchTarget: {
    alignItems: 'center',
    gap: 4,
  },
  diyaBase: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: '#C5A059',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  diyaFlameEmoji: {
    fontSize: 22,
  },
  diyaGlowCircle: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  diyaLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    color: '#D1C4B2',
  },
  parikramaRing: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  parikramaLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9,
    color: '#C5A059',
    letterSpacing: 1,
  },
  parikramaCountNumber: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  sanctumFloor: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 160, 89, 0.25)',
    width: '100%',
    alignItems: 'center',
  },
  sanctumFloorMantra: {
    fontFamily: FONTS.serif,
    fontSize: 11,
    color: '#C5A059',
    letterSpacing: 1.5,
    opacity: 0.85,
  },

  /* ── Action Pills Grid ── */
  actionPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  sanctumActionBtn: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },

  /* ── Segmented Tabs ── */
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
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
    gap: 8,
  },
  stotraTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 14,
  },
  stotraDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  liveDarshanBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
  },
  liveDarshanBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13.5,
    color: COLORS.ink,
  },
});
