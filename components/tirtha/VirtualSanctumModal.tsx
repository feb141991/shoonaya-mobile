import React, { useState, useRef, useEffect } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { TempleSanctumNode } from '@/lib/yatra-data';
import { FEATURE_COLORS, OVERLAYS, COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FlowerShowerOverlay } from '@/components/ui/FlowerShowerOverlay';
import { VirtualSanctumStage } from '@/components/tirtha/VirtualSanctumStage';
import { VirtualSanctumActions } from '@/components/tirtha/VirtualSanctumActions';
import { VirtualSanctumTabBar } from '@/components/tirtha/VirtualSanctumTabBar';
import { VirtualSanctumTabContent } from '@/components/tirtha/VirtualSanctumTabContent';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { apiFetch } from '@/lib/api';

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

  // Audio player state
  const audioPlayer = useAudioPlayer();
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const currentAudioUrl = useRef<string | null>(null);

  // Animation values for Bell & Diya Glow
  const bellAnim = useRef(new Animated.Value(0)).current;
  const diyaGlowAnim = useRef(new Animated.Value(0)).current;

  // Stop audio on dismiss or temple switch
  useEffect(() => {
    if (!visible) {
      void audioPlayer.stop();
      setAudioState('idle');
      currentAudioUrl.current = null;
    }
  }, [visible, audioPlayer]);

  useEffect(() => {
    return () => {
      void audioPlayer.stop();
      setAudioState('idle');
      currentAudioUrl.current = null;
    };
  }, [temple?.id, audioPlayer]);

  const handleClose = () => {
    void audioPlayer.stop();
    setAudioState('idle');
    currentAudioUrl.current = null;
    onClose();
  };

  const handleToggleAudio = async () => {
    if (!temple?.stotraOrChant) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (audioState === 'playing') {
      await audioPlayer.pause();
      setAudioState('paused');
      return;
    }

    if (audioState === 'paused') {
      await audioPlayer.resume();
      setAudioState('playing');
      return;
    }

    setAudioState('loading');
    try {
      if (temple.stotraOrChant.audioUrl) {
        currentAudioUrl.current = temple.stotraOrChant.audioUrl;
        await audioPlayer.loadAndPlay(temple.stotraOrChant.audioUrl, false, () => {
          setAudioState('idle');
        });
        setAudioState('playing');
      } else {
        const textToRecite = `${temple.stotraOrChant.title}. ${temple.stotraOrChant.description}`;
        const response = await apiFetch('/api/tts', {
          method: 'POST',
          body: JSON.stringify({
            text: textToRecite,
            language: 'sa-IN',
            speed: 0.85,
            pipelineTags: {
              content_type: 'stotram',
              delivery_intent: 'recitation',
            },
          }),
        });

        if (!response.ok) throw new Error('tts-failed');
        const data = (await response.json()) as { audioContent?: string };
        if (!data.audioContent) throw new Error('tts-no-audio');

        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        currentAudioUrl.current = audioUrl;
        await audioPlayer.loadAndPlay(audioUrl, false, () => {
          setAudioState('idle');
        });
        setAudioState('playing');
      }
    } catch {
      setAudioState('idle');
    }
  };

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
  const cardSurface = isDark ? FEATURE_COLORS.virtualSanctumModal.cardSurfaceDark : OVERLAYS.white[0.98];
  const sanctumBg: [string, string] = isDark ? [FEATURE_COLORS.virtualSanctumModal.sanctumBgDarkStart, FEATURE_COLORS.virtualSanctumModal.sanctumBgDarkEnd] : [FEATURE_COLORS.virtualSanctumModal.sanctumBgLightStart, FEATURE_COLORS.virtualSanctumModal.sanctumBgLightEnd];

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: cardSurface,
              borderColor: isDark ? OVERLAYS.gold[0.3] : OVERLAYS.gold[0.4],
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleBarContainer}>
            <View style={[styles.handleBar, { backgroundColor: isDark ? FEATURE_COLORS.virtualSanctumModal.handleBarSurfaceDark : FEATURE_COLORS.virtualSanctumModal.handleBarSurfaceLight }]} />
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
              onPress={handleClose}
              hitSlop={12}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? OVERLAYS.white[0.08] : OVERLAYS.black[0.05],
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
            <VirtualSanctumStage
              bellRotation={bellRotation}
              diyaLit={diyaLit}
              handleLightDiya={handleLightDiya}
              handleRingBell={handleRingBell}
              parikramaCount={parikramaCount}
              sanctumBg={sanctumBg}
              temple={temple}
            />

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SACRED ACTION CONTROLS                                        */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <VirtualSanctumActions
              bellRungCount={bellRungCount}
              diyaLit={diyaLit}
              flowersCount={flowersCount}
              goldAccent={goldAccent}
              handleLightDiya={handleLightDiya}
              handleOfferFlower={handleOfferFlower}
              handleParikrama={handleParikrama}
              handleRingBell={handleRingBell}
              isDark={isDark}
              parikramaCount={parikramaCount}
              theme={theme}
            />

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SEGMENTED CONTENT TABS                                         */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <VirtualSanctumTabBar
              activeTab={activeTab}
              goldAccent={goldAccent}
              isDark={isDark}
              setActiveTab={setActiveTab}
              theme={theme}
            />

            <VirtualSanctumTabContent
              activeTab={activeTab}
              audioState={audioState}
              goldAccent={goldAccent}
              handleToggleAudio={handleToggleAudio}
              isDark={isDark}
              temple={temple}
              theme={theme}
            />

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
    backgroundColor: OVERLAYS.black[0.75],
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

  /* ── Action Pills Grid ── */

  /* ── Segmented Tabs ── */

  /* ── Detail Content Styles ── */
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
