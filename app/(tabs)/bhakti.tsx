import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS } from '@/lib/constants';
import { getMalaSkin, MALA_SKINS } from '@/lib/mala-skins';
import { supabase } from '@/lib/supabase';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

type ProfileRow = {
  active_symbol_id: string | null;
  tradition: string | null;
};

type MalaSessionRow = {
  id: string;
  mantra: string | null;
  count: number | null;
  completed_at: string | null;
};

type ToastState = {
  visible: boolean;
  message: string;
};

const MANTRAS = [
  { key: 'om_namah_shivaya', label: 'Om Namah Shivaya' },
  { key: 'hare_krishna', label: 'Hare Krishna' },
  { key: 'gayatri', label: 'Gayatri Mantra' },
  { key: 'waheguru', label: 'Waheguru' },
  { key: 'om_mani_padme_hum', label: 'Om Mani Padme Hum' },
  { key: 'namokar', label: 'Namokar Mantra' },
] as const;

const HISTORY_LIMIT = 12;
const SVG_SIZE = 320;
const CENTER = SVG_SIZE / 2;
const RADIUS = 120;
const MANTRA_AUDIO_KEY = 'shoonaya.japa.mantraAudio';

export default function BhaktiScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [mantraIndex, setMantraIndex] = useState(0);
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);
  const [tradition, setTradition] = useState<string | null>('hindu');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<MalaSessionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const [completionVisible, setCompletionVisible] = useState(false);
  const [mantraAudioEnabled, setMantraAudioEnabled] = useState(false);
  const [mantraAudioLoading, setMantraAudioLoading] = useState(false);

  const malaSkin = useMemo(() => getMalaSkin(activeSymbolId), [activeSymbolId]);
  const mantra = MANTRAS[mantraIndex] ?? MANTRAS[0];

  const audioPlayer = useAudioPlayer();
  const mantraAudioActive = useRef(false);

  // Load saved mantra audio preference
  useEffect(() => {
    AsyncStorage.getItem(MANTRA_AUDIO_KEY)
      .then((val) => { if (val === 'true') setMantraAudioEnabled(true); })
      .catch(() => {});
  }, []);

  const loadContext = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [profileResult, historyResult] = await Promise.all([
      supabase.from('profiles').select('active_symbol_id, tradition').eq('id', user.id).single(),
      supabase
        .from('mala_sessions')
        .select('id, mantra, count, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(HISTORY_LIMIT),
    ]);

    const profile = profileResult.data as ProfileRow | null;
    setActiveSymbolId(profile?.active_symbol_id ?? null);
    setTradition(profile?.tradition ?? 'hindu');
    setHistory((historyResult.data as MalaSessionRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => setToast({ visible: false, message: '' }), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!completionVisible) return;
    const timer = setTimeout(() => setCompletionVisible(false), 1400);
    return () => clearTimeout(timer);
  }, [completionVisible]);

  // ── Mantra background audio ───────────────────────────────────────
  const startMantraAudio = useCallback(async () => {
    if (mantraAudioLoading || mantraAudioActive.current) return;
    setMantraAudioLoading(true);
    try {
      const response = await apiFetch('/api/tts/generate', {
        method: 'POST',
        body: JSON.stringify({ text: mantra.label }),
      });
      if (!response.ok) throw new Error('tts-failed');
      const data = (await response.json()) as { url?: string; audioUrl?: string };
      const audioUrl = data.url ?? data.audioUrl;
      if (!audioUrl) throw new Error('tts-no-url');
      await audioPlayer.loadAndPlay(audioUrl, true); // loop = true
      mantraAudioActive.current = true;
    } catch {
      // Graceful offline fallback — audio unavailable, continue counting silently
    } finally {
      setMantraAudioLoading(false);
    }
  }, [audioPlayer, mantra.label, mantraAudioLoading]);

  const stopMantraAudio = useCallback(async () => {
    mantraAudioActive.current = false;
    await audioPlayer.stop();
  }, [audioPlayer]);

  // Toggle mantra audio preference
  const toggleMantraAudio = useCallback(async () => {
    const next = !mantraAudioEnabled;
    setMantraAudioEnabled(next);
    void AsyncStorage.setItem(MANTRA_AUDIO_KEY, String(next));

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (next && count > 0 && count < 108) {
      await startMantraAudio();
    } else if (!next) {
      await stopMantraAudio();
    }
  }, [count, mantraAudioEnabled, startMantraAudio, stopMantraAudio]);

  // Start/stop audio when mantra changes and audio is enabled
  useEffect(() => {
    if (mantraAudioEnabled && mantraAudioActive.current) {
      mantraAudioActive.current = false;
      void audioPlayer.stop().then(() => { void startMantraAudio(); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mantraIndex]);

  const completeRound = useCallback(async () => {
    setSaving(true);
    const nextRounds = completedRounds + 1;
    setCompletedRounds(nextRounds);
    setCount(0);
    setToast({ visible: true, message: '108 complete' });
    setCompletionVisible(true);

    // Stop mantra loop on round complete
    await stopMantraAudio();

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    try {
      const response = await apiFetch('/api/japa/complete', {
        method: 'POST',
        body: JSON.stringify({
          mantra: mantra.label,
          count: 108,
          rounds: 1,
          tradition,
          activeSymbolId,
        }),
      });

      if (!response.ok) {
        throw new Error('missing-japa-route');
      }
    } catch {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const insert = await supabase.from('mala_sessions').insert({
          user_id: user.id,
          mantra: mantra.label,
          count: 108,
          target_count: 108,
          duration_seconds: 0,
          share_scope: 'private',
          completed_at: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
          rounds: 1,
          bead_count: 108,
          mantra_id: mantra.key,
          duration_secs: 0,
          mala_id: activeSymbolId,
          tradition,
          practice_type: 'mala',
          completion_type: 'completed',
          completed_rounds: 1,
          source_route: '/bhakti',
        });

        if (insert.error) {
          Alert.alert('Could not save japa session');
        }
      }
    }

    setSaving(false);
    await loadContext();
  }, [activeSymbolId, completedRounds, loadContext, mantra.key, mantra.label, stopMantraAudio, tradition]);

  const increment = useCallback(async () => {
    if (saving) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setCount((current) => {
      const next = current >= 108 ? 108 : current + 1;

      // Start audio on first bead if enabled
      if (next === 1 && mantraAudioEnabled && !mantraAudioActive.current) {
        void startMantraAudio();
      }

      return next;
    });
  }, [mantraAudioEnabled, saving, startMantraAudio]);

  useEffect(() => {
    if (count === 108 && !saving) {
      void completeRound();
    }
  }, [completeRound, count, saving]);

  const beadElements = useMemo(() => {
    const activeIndex = count >= 108 ? 107 : count;
    return Array.from({ length: 108 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 108 - Math.PI / 2;
      const x = CENTER + Math.cos(angle) * RADIUS;
      const y = CENTER + Math.sin(angle) * RADIUS;
      const isActive = index === activeIndex;

      return (
        <Circle
          key={`bead-${index}`}
          cx={x}
          cy={y}
          r={index === 0 ? 9 : 7}
          fill={isActive ? COLORS.brandGold : malaSkin.beadColor}
          stroke={isActive ? COLORS.brandGold : malaSkin.beadBorder}
          strokeWidth={1.5}
        />
      );
    });
  }, [count, malaSkin.beadBorder, malaSkin.beadColor]);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 20, paddingBottom: 36, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>Japa</Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>{malaSkin.label} mala</Text>
          </View>
          <Pressable
            onPress={() => router.push('/kosh')}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: cardBg,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: text }}>Kosh</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.brandGold} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Pressable
              onPress={() => { void increment(); }}
              style={{
                borderRadius: 30,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={SVG_SIZE} height={SVG_SIZE}>
                <Line
                  x1={CENTER}
                  y1={CENTER}
                  x2={CENTER}
                  y2={CENTER - RADIUS}
                  stroke={malaSkin.threadColor}
                  strokeWidth={2}
                />
                {beadElements}
              </Svg>
              <View
                style={{
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: 34, color: text }}>
                  {count} / 108
                </Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
                  {completedRounds} completed rounds
                </Text>
              </View>
            </Pressable>

            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 16,
                gap: 14,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold }}>
                CONTROLS
              </Text>

              {/* Mantra audio toggle */}
              <Pressable
                onPress={() => { void toggleMantraAudio(); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: mantraAudioEnabled ? COLORS.brandGold : border,
                  backgroundColor: mantraAudioEnabled ? cardBg : 'transparent',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {mantraAudioLoading ? (
                    <ActivityIndicator color={COLORS.brandGold} size="small" />
                  ) : (
                    <Feather
                      name={mantraAudioEnabled ? 'volume-2' : 'volume-x'}
                      size={16}
                      color={mantraAudioEnabled ? COLORS.brandGold : dim}
                    />
                  )}
                  <Text
                    style={{
                      fontFamily: FONTS.sansMedium,
                      fontSize: 13,
                      color: mantraAudioEnabled ? COLORS.brandGold : dim,
                    }}
                  >
                    Background mantra audio
                  </Text>
                </View>
                <View
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: mantraAudioEnabled ? COLORS.brandGold : border,
                    alignItems: mantraAudioEnabled ? 'flex-end' : 'flex-start',
                    justifyContent: 'center',
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: mantraAudioEnabled ? COLORS.ink : COLORS.creamBg,
                    }}
                  />
                </View>
              </Pressable>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {MANTRAS.map((item, index) => (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setMantraIndex(index);
                    }}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: index === mantraIndex ? COLORS.brandGold : border,
                      backgroundColor: index === mantraIndex ? cardBg : 'transparent',
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.sansMedium,
                        fontSize: 12,
                        color: index === mantraIndex ? COLORS.brandGold : dim,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setCount(0)}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: border,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>Reset</Text>
                </Pressable>

                <Pressable
                  onPress={() => setHistoryOpen(true)}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: border,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>Session history</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal transparent visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              gap: 14,
              maxHeight: '68%',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 24, color: text }}>Recent sessions</Text>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {history.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
                  <Text style={{ fontSize: 32 }}>📿</Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                    No sessions yet
                  </Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
                    Complete your first mala and your practice history will appear here.
                  </Text>
                </View>
              ) : (
                history.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: border,
                      backgroundColor: cardBg,
                      padding: 14,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>
                      {item.mantra ?? 'Mantra'}
                    </Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                      {item.count ?? 0} beads · {item.completed_at ? new Date(item.completed_at).toLocaleString('en-GB') : 'Unknown'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable
              onPress={() => setHistoryOpen(false)}
              style={{
                borderRadius: 18,
                backgroundColor: COLORS.brandGold,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: bg }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {toast.visible ? (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
            borderRadius: 16,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: COLORS.brandGold,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>{toast.message}</Text>
        </View>
      ) : null}

      {completionVisible ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.18)',
          }}
        >
          <View
            style={{
              borderRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: COLORS.brandGold,
              paddingHorizontal: 28,
              paddingVertical: 24,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: COLORS.brandGold }}>108</Text>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>Mala complete</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
